import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUE_NAMES, JOB_NAMES } from '../queue/constants/queue.constants';
import { CreateBookingDto } from './dto';
import {
  BookingStatus,
  BookingType,
  PaymentStatus,
  PaymentMethod,
  Role,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import type { ExpireBookingJobData } from './interfaces';
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsGateway } from '../../common/websocket/events.gateway';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.BOOKING_TIMEOUT)
    private bookingQueue: Queue<ExpireBookingJobData>,
    private notificationsService: NotificationsService,
    private eventsGateway: EventsGateway,
  ) {}

  /**
   * 📅 Create a new booking
   */
  async createBooking(
    dto: CreateBookingDto,
    userId: number | null,
    userRole: Role,
  ) {
    const {
      courtId,
      startTime,
      endTime,
      type,
      paymentMethod,
      guestName,
      guestPhone,
    } = dto;

    // 1️⃣ Validate time
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      throw new BadRequestException('End time must be after start time');
    }

    if (start < new Date()) {
      throw new BadRequestException('Cannot book in the past');
    }

    // 2️⃣ Check court exists
    const court = await this.prisma.court.findUnique({
      where: { id: courtId },
    });

    if (!court) {
      throw new NotFoundException('Court not found');
    }

    if (!court.isActive) {
      throw new BadRequestException('Court is not available');
    }

    // 3️⃣ Check double booking (excluding CANCELLED bookings)
    const conflictBooking = await this.prisma.booking.findFirst({
      where: {
        courtId,
        status: {
          notIn: [BookingStatus.CANCELLED, BookingStatus.EXPIRED],
        },
        OR: [
          {
            startTime: { lt: end },
            endTime: { gt: start },
          },
        ],
      },
    });

    if (conflictBooking) {
      throw new ConflictException(
        `Court is already booked from ${conflictBooking.startTime.toISOString()} to ${conflictBooking.endTime.toISOString()}`,
      );
    }

    // 4️⃣ Determine booking type first
    const bookingType = type || BookingType.REGULAR;
    const isMaintenance = bookingType === BookingType.MAINTENANCE;

    // 5️⃣ Calculate total price (MAINTENANCE = 0)
    const totalPrice = isMaintenance 
      ? new Decimal(0) 
      : await this.calculatePrice(courtId, start, end);

    // 6️⃣ Generate booking code
    const bookingCode = await this.generateBookingCode();

    // 7️⃣ Determine booking status and expiration
    // ✅ FIX: Check guestName/guestPhone first (Staff can create guest booking)
    const isGuestBooking = guestName && guestPhone;

    let status: BookingStatus;
    let expiresAt: Date | null = null;
    let finalUserId: number | null = userId;
    let finalPaymentStatus: PaymentStatus;

    if (isMaintenance) {
      // 🔧 MAINTENANCE: Block time slot, no payment needed
      status = BookingStatus.BLOCKED;
      finalPaymentStatus = PaymentStatus.PAID; // Mark as "paid" to skip payment flow
      finalUserId = null; // No user relation for maintenance
    } else if (isGuestBooking) {
      // Guest booking: no userId, must use CASH
      finalUserId = null;
      status = BookingStatus.CONFIRMED;
      finalPaymentStatus = PaymentStatus.PAID;
    } else if (paymentMethod === PaymentMethod.CASH) {
      status = BookingStatus.CONFIRMED;
      finalPaymentStatus = PaymentStatus.PAID;
    } else {
      status = BookingStatus.PENDING_PAYMENT;
      finalPaymentStatus = PaymentStatus.UNPAID;
      expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    }

    // 8️⃣ Create booking in transaction (MAINTENANCE: no Payment record)
    const booking = await this.prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          bookingCode,
          courtId,
          userId: finalUserId, // ✅ null for maintenance/guest
          guestName: isMaintenance ? 'MAINTENANCE' : (isGuestBooking ? guestName : null),
          guestPhone: isMaintenance ? dto.guestPhone || 'System maintenance' : (isGuestBooking ? guestPhone : null),
          startTime: start,
          endTime: end,
          totalPrice,
          status,
          type: bookingType,
          paymentMethod: isMaintenance ? null : (paymentMethod || null),
          paymentStatus: finalPaymentStatus,
          createdBy:
            userRole === Role.STAFF || userRole === Role.ADMIN
              ? 'STAFF'
              : 'CUSTOMER',
          createdByStaffId:
            userRole === Role.STAFF || userRole === Role.ADMIN ? userId : null,
          expiresAt,
        },
        include: {
          court: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      // 🚫 DO NOT create Payment record for MAINTENANCE
      // Payment is only for customer bookings that require actual payment

      return newBooking;
    });

    // 8️⃣ Add expiration job to queue if PENDING_PAYMENT
    if (status === BookingStatus.PENDING_PAYMENT && expiresAt) {
      const delay = expiresAt.getTime() - Date.now();

      await this.bookingQueue.add(
        JOB_NAMES.EXPIRE_BOOKING,
        { bookingId: booking.id },
        {
          delay,
          jobId: `expire-booking-${booking.id}`,
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      console.log(
        `⏰ Scheduled expiration job for booking #${booking.id} in ${Math.round(delay / 1000)}s`,
      );
    }

    // 9️⃣ Emit WebSocket event for booking created
    if (finalUserId) {
      this.eventsGateway.emitBookingStatusChange(finalUserId, {
        bookingId: booking.id,
        newStatus: booking.status,
        message: `Booking created: ${booking.bookingCode}`,
      });

      this.eventsGateway.broadcastCourtStatusUpdate(booking.courtId, 'booked');
    }

    // � Broadcast new booking to ALL clients for real-time calendar update
    this.eventsGateway.broadcastNewBooking(booking);

    // �🔔 Send notification to staff/admin about new booking (if not maintenance)
    if (!isMaintenance) {
      try {
        this.logger.log(`📤 Calling notifyNewBooking for #${booking.bookingCode}...`);
        await this.notificationsService.notifyNewBooking(booking);
        this.logger.log(`✅ Notification sent successfully`);
      } catch (error) {
        this.logger.error(`❌ Failed to send new booking notification: ${error.message}`);
        this.logger.error(error.stack);
      }
    }

    return {
      message: 'Booking created successfully',
      booking,
    };
  }

  /**
   * 📦 Create bulk bookings (NEW: Multi-court bulk booking support)
   * Creates multiple bookings in one transaction for better performance
   */
  async createBulkBookings(
    bookings: CreateBookingDto[],
    userId: number | null,
    userRole: Role,
  ) {
    if (!bookings || bookings.length === 0) {
      throw new BadRequestException('No bookings provided');
    }

    // Validate each booking and check for conflicts
    const validatedBookings = [];

    for (const dto of bookings) {
      const { courtId, startTime, endTime } = dto;
      const start = new Date(startTime);
      const end = new Date(endTime);

      // Validate time
      if (start >= end) {
        throw new BadRequestException(
          `Invalid time range for court ${courtId}: End time must be after start time`,
        );
      }

      if (start < new Date()) {
        throw new BadRequestException('Cannot book in the past');
      }

      // Check court exists
      const court = await this.prisma.court.findUnique({
        where: { id: courtId },
      });

      if (!court) {
        throw new NotFoundException(`Court ${courtId} not found`);
      }

      if (!court.isActive) {
        throw new BadRequestException(`Court ${courtId} is not available`);
      }

      // Check for conflicts
      const conflictBooking = await this.prisma.booking.findFirst({
        where: {
          courtId,
          status: {
            notIn: [BookingStatus.CANCELLED, BookingStatus.EXPIRED],
          },
          OR: [
            {
              startTime: { lt: end },
              endTime: { gt: start },
            },
          ],
        },
      });

      if (conflictBooking) {
        throw new ConflictException(
          `Court ${courtId} is already booked from ${conflictBooking.startTime.toISOString()} to ${conflictBooking.endTime.toISOString()}`,
        );
      }

      // Calculate price
      const totalPrice = await this.calculatePrice(courtId, start, end);

      validatedBookings.push({
        dto,
        court,
        start,
        end,
        totalPrice,
      });
    }

    // Create all bookings in a single transaction
    const createdBookings = await this.prisma.$transaction(async (tx) => {
      const results = [];

      for (const { dto, start, end, totalPrice } of validatedBookings) {
        const bookingCode = await this.generateBookingCode();
        const isGuestBooking = dto.guestName && dto.guestPhone;
        const bookingType = dto.type || BookingType.REGULAR;

        let status: BookingStatus;
        let expiresAt: Date | null = null;
        let finalUserId: number | null = userId;

        if (isGuestBooking) {
          finalUserId = null;
          status = BookingStatus.CONFIRMED;
        } else if (bookingType === BookingType.MAINTENANCE) {
          status = BookingStatus.BLOCKED;
        } else if (dto.paymentMethod === PaymentMethod.CASH) {
          status = BookingStatus.CONFIRMED;
        } else {
          status = BookingStatus.PENDING_PAYMENT;
          expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        }

        const newBooking = await tx.booking.create({
          data: {
            bookingCode,
            courtId: dto.courtId,
            userId: finalUserId,
            guestName: isGuestBooking ? dto.guestName : null,
            guestPhone: isGuestBooking ? dto.guestPhone : null,
            startTime: start,
            endTime: end,
            totalPrice,
            status,
            type: bookingType,
            paymentMethod: dto.paymentMethod || null,
            paymentStatus:
              status === BookingStatus.CONFIRMED
                ? PaymentStatus.PAID
                : PaymentStatus.UNPAID,
            createdBy:
              userRole === Role.STAFF || userRole === Role.ADMIN
                ? 'STAFF'
                : 'CUSTOMER',
            createdByStaffId:
              userRole === Role.STAFF || userRole === Role.ADMIN
                ? userId
                : null,
            expiresAt,
          },
          include: {
            court: true,
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        });

        // Schedule expiration job if needed
        if (status === BookingStatus.PENDING_PAYMENT && expiresAt) {
          const delay = expiresAt.getTime() - Date.now();
          await this.bookingQueue.add(
            JOB_NAMES.EXPIRE_BOOKING,
            { bookingId: newBooking.id },
            {
              delay,
              jobId: `expire-booking-${newBooking.id}`,
              removeOnComplete: true,
              removeOnFail: false,
            },
          );
        }

        results.push(newBooking);
      }

      return results;
    });

    // 📢 Broadcast to all clients for real-time calendar update
    for (const booking of createdBookings) {
      this.eventsGateway.broadcastNewBooking(booking);
    }

    this.logger.log(`📅 Bulk booking created: ${createdBookings.length} bookings broadcasted`);

    // 🔔 Send notifications to Staff/Admin for each booking
    for (const booking of createdBookings) {
      if (booking.type !== 'MAINTENANCE') {
        try {
          this.logger.log(`📤 [BULK] Calling notifyNewBooking for #${booking.bookingCode}...`);
          await this.notificationsService.notifyNewBooking(booking);
        } catch (error) {
          this.logger.error(`❌ [BULK] Failed to notify: ${error.message}`);
        }
      }
    }

    return createdBookings;
  }

  /**
   * 💰 Calculate price based on pricing rules
   */
  private async calculatePrice(
    courtId: number,
    startTime: Date,
    endTime: Date,
  ): Promise<number> {
    const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

    if (hours <= 0) {
      throw new BadRequestException('Invalid time range');
    }

    // Get applicable pricing rules
    const dayOfWeek = startTime.getDay();
    const timeStr = startTime.toTimeString().slice(0, 8);

    const rules = await this.prisma.pricingRule.findMany({
      where: {
        isActive: true,
        AND: [
          {
            OR: [
              { courtId }, // Court-specific rules
              { courtId: null }, // Global rules
            ],
          },
          {
            OR: [
              { dayOfWeek }, // Day-specific rules
              { dayOfWeek: null }, // All days
            ],
          },
          {
            startTime: { lte: timeStr },
            endTime: { gte: timeStr },
          },
        ],
      },
      orderBy: {
        priority: 'desc',
      },
    });

    // Use the highest priority rule, or fallback to court base price
    const pricePerHour =
      rules.length > 0
        ? Number(rules[0].pricePerHour)
        : await this.getCourtBasePrice(courtId);

    return Math.round(pricePerHour * hours);
  }

  /**
   * Get court base price
   */
  private async getCourtBasePrice(courtId: number): Promise<number> {
    const court = await this.prisma.court.findUnique({
      where: { id: courtId },
    });

    if (!court) {
      throw new NotFoundException('Court not found');
    }

    return Number(court.pricePerHour);
  }

  /**
   * 🔢 Generate unique booking code
   * Format: BK241213-XXXX (Date + Random suffix for uniqueness)
   */
  private async generateBookingCode(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    // Format: BK241213-XXXX
    const prefix = `BK${year}${month}${day}`;

    // Generate random 4-character suffix for uniqueness (base36: 0-9, a-z)
    // This allows ~1.6 million unique codes per day
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const randomSuffix = Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase()
        .padEnd(4, '0');

      const bookingCode = `${prefix}-${randomSuffix}`;

      // Check if code already exists
      const existing = await this.prisma.booking.findUnique({
        where: { bookingCode },
      });

      if (!existing) {
        return bookingCode;
      }

      attempts++;
    }

    // Fallback: Use timestamp-based suffix if random fails
    const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
    return `${prefix}-${timestamp}`;
  }

  /**
   * 📋 Get user's bookings
   */
  async getUserBookings(userId: number) {
    return this.prisma.booking.findMany({
      where: { userId },
      include: {
        court: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * 📅 Get bookings by date (for timeline view)
   * Returns all bookings (including non-CANCELLED) on a specific date
   */
  async getBookingsByDate(dateStr: string) {
    // Parse date string "YYYY-MM-DD"
    const [year, month, day] = dateStr.split('-').map(Number);
    const startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endDate = new Date(year, month - 1, day, 23, 59, 59, 999);

    const bookings = await this.prisma.booking.findMany({
      where: {
        startTime: {
          gte: startDate,
          lt: endDate,
        },
        status: {
          notIn: [BookingStatus.CANCELLED, BookingStatus.EXPIRED],
        },
      },
      select: {
        id: true,
        courtId: true,
        startTime: true,
        endTime: true,
        status: true,
        paymentStatus: true,
        bookingCode: true,
        expiresAt: true,
        totalPrice: true,
        userId: true,
        guestName: true,
        guestPhone: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    return bookings;
  }

  /**
   * 🏸 Get bookings for a specific court on a specific date
   */
  async getCourtBookingsByDate(courtId: number, dateStr: string) {
    // Parse date string "YYYY-MM-DD"
    const [year, month, day] = dateStr.split('-').map(Number);
    const startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endDate = new Date(year, month - 1, day, 23, 59, 59, 999);

    const bookings = await this.prisma.booking.findMany({
      where: {
        courtId,
        startTime: {
          gte: startDate,
          lt: endDate,
        },
        status: {
          notIn: [BookingStatus.CANCELLED, BookingStatus.EXPIRED],
        },
      },
      select: {
        id: true,
        courtId: true,
        startTime: true,
        endTime: true,
        status: true,
        paymentStatus: true,
        bookingCode: true,
        expiresAt: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    return bookings;
  }

  /**
   * 🔍 Get booking by ID
   */
  async getBookingById(id: number, userId?: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        court: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // If userId is provided, check ownership (for CUSTOMER role)
    if (userId && booking.userId !== userId) {
      throw new BadRequestException(
        'You do not have permission to view this booking',
      );
    }

    return booking;
  }

  /**
   * 📊 Get all bookings (Staff/Admin only)
   */
  async getAllBookings() {
    return this.prisma.booking.findMany({
      include: {
        court: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        payment: true, // Include payment relation
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * ✅ Check-in booking using booking code (Staff only)
   * Update status from CONFIRMED to CHECKED_IN
   */
  async checkInBooking(bookingCode: string) {
    // Find booking by code
    const booking = await this.prisma.booking.findUnique({
      where: { bookingCode },
      include: {
        court: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking not found: ${bookingCode}`);
    }

    // Check if booking is CONFIRMED
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(
        `Booking cannot be checked in. Current status: ${booking.status}`,
      );
    }

    // Check if booking time is valid (not too early, not expired)
    const now = new Date();
    const startTime = new Date(booking.startTime);
    const endTime = new Date(booking.endTime);

    // Allow check-in 15 minutes before start time
    const earlyCheckInTime = new Date(startTime.getTime() - 15 * 60 * 1000);

    if (now < earlyCheckInTime) {
      throw new BadRequestException(
        'Too early to check in. You can check in 15 minutes before start time.',
      );
    }

    if (now > endTime) {
      throw new BadRequestException('Booking time has expired.');
    }

    // Update status to CHECKED_IN and set check-in timestamp
    const updatedBooking = await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: BookingStatus.CHECKED_IN,
        checkedInAt: now, // ✅ Record check-in time
      },
      include: {
        court: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // 🔔 Notify customer about successful check-in
    try {
      await this.notificationsService.notifyCheckInSuccess(updatedBooking);
    } catch (error) {
      this.logger.error(`Failed to send check-in notification: ${error.message}`);
    }

    return updatedBooking;
  }

  /**
   * ✅ Finish booking (Manual completion by staff)
   * Update status from CHECKED_IN to COMPLETED
   */
  async finishBooking(
    bookingId: number,
  ): Promise<{ message: string; booking: any }> {
    // Get booking
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        court: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking #${bookingId} not found`);
    }

    // Check if booking is CHECKED_IN
    if (booking.status !== BookingStatus.CHECKED_IN) {
      throw new BadRequestException(
        `Booking cannot be completed. Current status: ${booking.status}. Only CHECKED_IN bookings can be completed.`,
      );
    }

    // Update status to COMPLETED
    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.COMPLETED,
      },
      include: {
        court: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Emit WebSocket event for booking completed
    if (booking.userId) {
      this.eventsGateway.emitBookingStatusChange(booking.userId, {
        bookingId: booking.id,
        newStatus: BookingStatus.COMPLETED,
        message: `Booking ${booking.bookingCode} completed`,
      });

      this.eventsGateway.broadcastCourtStatusUpdate(
        booking.courtId,
        'available',
      );
    }

    this.logger.log(
      `✅ Booking #${booking.id} (${booking.bookingCode}) manually completed by staff`,
    );

    return {
      message: 'Booking completed successfully',
      booking: updatedBooking,
    };
  }

  /**
   * ❌ Cancel booking
   */
  async cancelBooking(
    bookingId: number,
    userId?: number,
  ): Promise<{ message: string; booking: any }> {
    // Get booking
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        court: true,
        user: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking #${bookingId} not found`);
    }

    // Verify ownership (if customer)
    if (userId && booking.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own bookings');
    }

    // Check if booking can be cancelled
    if (!['PENDING_PAYMENT', 'CONFIRMED'].includes(booking.status)) {
      throw new BadRequestException(
        `Cannot cancel booking with status: ${booking.status}`,
      );
    }

    // Calculate refund info BEFORE updating booking
    let refundPercentage = 0;
    let refundReason = '';
    let refundAmount = new Decimal(0);

    // If booking was CONFIRMED (already paid), calculate refund with time-based policy
    if (booking.status === BookingStatus.CONFIRMED && booking.userId) {
      // Calculate hours until booking starts
      const now = new Date();
      const bookingStart = new Date(booking.startTime);
      const hoursUntilBooking =
        (bookingStart.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Determine refund percentage based on cancellation time
      if (hoursUntilBooking > 24) {
        refundPercentage = 100;
        refundReason = 'Full refund (cancelled >24h before)';
      } else if (hoursUntilBooking > 12) {
        refundPercentage = 50;
        refundReason = 'Partial refund 50% (cancelled 12-24h before)';
      } else {
        refundPercentage = 0;
        refundReason = 'No refund (cancelled <12h before)';
      }

      refundAmount = new Decimal(
        (Number(booking.totalPrice) * refundPercentage) / 100,
      );
    }

    // Update status to CANCELLED & create cancellation record
    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
        cancellation: {
          create: {
            cancelledBy: userId || booking.userId || 0,
            cancelledByRole: userId ? Role.CUSTOMER : Role.ADMIN,
            reason: refundReason || 'No reason provided',
            refundAmount: refundAmount,
            refundMethod: refundPercentage > 0 ? 'WALLET' : 'NONE',
          },
        },
      },
      include: {
        cancellation: true,
      },
    });

    // Process refund if amount > 0
    if (refundPercentage > 0) {
      await this.prisma.$transaction(async (tx) => {
        // Find payment
        const payment = await tx.payment.findFirst({
          where: {
            bookingId: booking.id,
            status: PaymentStatus.PAID,
          },
        });

        if (payment) {
          // Get wallet before update
          const walletBefore = await tx.wallet.findUnique({
            where: { userId: booking.userId },
          });

          if (!walletBefore) {
            throw new NotFoundException('Wallet not found');
          }

          // Refund to wallet
          await tx.wallet.update({
            where: { userId: booking.userId },
            data: {
              balance: {
                increment: refundAmount,
              },
            },
          });

          // Get updated wallet
          const walletAfter = await tx.wallet.findUnique({
            where: { userId: booking.userId },
          });

          // Create refund transaction
          await tx.walletTransaction.create({
            data: {
              walletId: walletBefore.id,
              type: 'REFUND',
              amount: refundAmount,
              description: `${refundReason} - Booking ${booking.bookingCode}`,
              bookingId: booking.id,
              balanceBefore: walletBefore.balance,
              balanceAfter: walletAfter.balance,
            },
          });

          // Update payment status
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status:
                refundPercentage === 100
                  ? PaymentStatus.REFUNDED
                  : PaymentStatus.PAID,
            },
          });
        }
      });
    }

    // Send cancellation email
    try {
      if (booking.userId) {
        const user = await this.prisma.user.findUnique({
          where: { id: booking.userId },
        });

        if (user?.email) {
          const court = await this.prisma.court.findUnique({
            where: { id: booking.courtId },
          });

          await this.notificationsService.sendBookingCancellation(user.email, {
            bookingId: booking.id,
            customerName: user.name || user.email,
            bookingCode: booking.bookingCode,
            courtName: court?.name || `Court ${booking.courtId}`,
            startTime: booking.startTime,
            endTime: booking.endTime,
            totalPrice: Number(booking.totalPrice),
            cancellationReason:
              updatedBooking.cancellation?.reason || refundReason,
            refundAmount: Number(
              updatedBooking.cancellation?.refundAmount || 0,
            ),
          });
          this.logger.log(
            `Cancellation email queued for booking ${booking.bookingCode}`,
          );
        }
      }
    } catch (emailError) {
      this.logger.error(
        `Failed to queue cancellation email: ${emailError.message}`,
      );
      // Don't fail the cancellation if email fails
    }

    // Emit WebSocket event for booking cancelled
    if (booking.userId) {
      this.eventsGateway.emitBookingStatusChange(booking.userId, {
        bookingId: booking.id,
        newStatus: BookingStatus.CANCELLED,
        message: `Booking ${booking.bookingCode} cancelled`,
      });

      // Emit refund notification if there was a refund
      if (refundPercentage > 0 && booking.userId) {
        // Get updated wallet balance
        const updatedWallet = await this.prisma.wallet.findUnique({
          where: { userId: booking.userId },
        });

        this.eventsGateway.emitRefund(booking.userId, {
          bookingId: booking.id,
          refundAmount: Number(refundAmount),
          refundPercentage,
          newWalletBalance: updatedWallet
            ? Number(updatedWallet.balance)
            : null,
        });

        // 🔔 Send proper refund notification
        await this.notificationsService.notifyRefund(booking, Number(refundAmount));
      }

      this.eventsGateway.broadcastCourtStatusUpdate(
        booking.courtId,
        'available',
      );
    }

    // � Broadcast booking cancelled for real-time calendar update
    this.eventsGateway.broadcast('booking:cancelled', {
      bookingId: booking.id,
      courtId: booking.courtId,
      bookingCode: booking.bookingCode,
    });

    // �🔔 Notify staff & admin about cancellation
    try {
      // Get updated wallet balance after refund
      let walletBalance = 0;
      if (booking.userId) {
        const wallet = await this.prisma.wallet.findUnique({
          where: { userId: booking.userId },
        });
        walletBalance = wallet ? Number(wallet.balance) : 0;
      }

      // Send cancellation notification with refund info
      await this.notificationsService.notifyBookingCancelled(booking, {
        refundAmount: Number(refundAmount),
        refundPercentage,
        walletBalance,
      });
    } catch (error) {
      this.logger.error(`Failed to send cancellation notification: ${error.message}`);
    }

    return {
      message: 'Booking cancelled successfully',
      booking: updatedBooking,
    };
  }
}
