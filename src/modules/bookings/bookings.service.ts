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
} from '@nestjs/common';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.BOOKING_TIMEOUT)
    private bookingQueue: Queue<ExpireBookingJobData>,
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

    // 4️⃣ Calculate total price
    const totalPrice = await this.calculatePrice(courtId, start, end);

    // 5️⃣ Generate booking code
    const bookingCode = await this.generateBookingCode();

    // 6️⃣ Determine booking status and expiration
    // ✅ FIX: Check guestName/guestPhone first (Staff can create guest booking)
    const isGuestBooking = guestName && guestPhone;
    const bookingType = type || BookingType.REGULAR;

    let status: BookingStatus;
    let expiresAt: Date | null = null;
    let finalUserId: number | null = userId;

    if (isGuestBooking) {
      // Guest booking: no userId, must use CASH
      finalUserId = null;
      status = BookingStatus.CONFIRMED;
    } else if (bookingType === BookingType.MAINTENANCE) {
      status = BookingStatus.BLOCKED;
    } else if (paymentMethod === PaymentMethod.CASH) {
      status = BookingStatus.CONFIRMED;
    } else {
      status = BookingStatus.PENDING_PAYMENT;
      expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    }

    // 7️⃣ Create booking in transaction
    const booking = await this.prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          bookingCode,
          courtId,
          userId: finalUserId, // ✅ Use finalUserId (null for guest)
          guestName: isGuestBooking ? guestName : null,
          guestPhone: isGuestBooking ? guestPhone : null,
          startTime: start,
          endTime: end,
          totalPrice,
          status,
          type: bookingType,
          paymentMethod: paymentMethod || null,
          paymentStatus:
            status === BookingStatus.CONFIRMED
              ? PaymentStatus.PAID
              : PaymentStatus.UNPAID,
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

    // Update status to CHECKED_IN
    const updatedBooking = await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: BookingStatus.CHECKED_IN,
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

    return updatedBooking;
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

    // Update status to CANCELLED
    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
      },
    });

    // If booking was CONFIRMED (already paid), process refund with time-based policy
    if (booking.status === BookingStatus.CONFIRMED && booking.userId) {
      // Calculate hours until booking starts
      const now = new Date();
      const bookingStart = new Date(booking.startTime);
      const hoursUntilBooking = (bookingStart.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Determine refund percentage based on cancellation time
      let refundPercentage = 0;
      let refundReason = '';

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

      const refundAmount = new Decimal(
        (Number(booking.totalPrice) * refundPercentage) / 100
      );

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
              where: { userId: booking.userId! },
            });

            if (!walletBefore) {
              throw new NotFoundException('Wallet not found');
            }

            // Refund to wallet
            await tx.wallet.update({
              where: { userId: booking.userId! },
              data: {
                balance: {
                  increment: refundAmount,
                },
              },
            });

            // Get updated wallet
            const walletAfter = await tx.wallet.findUnique({
              where: { userId: booking.userId! },
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
                balanceAfter: walletAfter!.balance,
              },
            });

            // Update payment status
            await tx.payment.update({
              where: { id: payment.id },
              data: {
                status: refundPercentage === 100 ? PaymentStatus.REFUNDED : PaymentStatus.PAID,
              },
            });
          }
        });
      }
    }

    return {
      message: 'Booking cancelled successfully',
      booking: updatedBooking,
    };
  }
}
