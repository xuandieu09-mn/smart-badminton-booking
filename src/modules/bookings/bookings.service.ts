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
import type { ExpireBookingJobData } from './interfaces';
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
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
   */
  private async generateBookingCode(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    // Format: BK241203-0001
    const prefix = `BK${year}${month}${day}`;

    // Get today's booking count
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const count = await this.prisma.booking.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const sequence = (count + 1).toString().padStart(4, '0');

    return `${prefix}-${sequence}`;
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
   * 🎯 Create multiple bookings in a single transaction (Bulk Booking)
   * All-or-Nothing: nếu bất kỳ booking nào lỗi, tất cả rollback
   */
  async createBulkBooking(
    dto: any, // CreateBulkBookingDto
    userId: number | null,
    userRole: Role,
  ) {
    const { bookings: bookingItems, type, paymentMethod, guestName, guestPhone } = dto;

    if (!bookingItems || bookingItems.length === 0) {
      throw new BadRequestException('Phải chọn ít nhất 1 khung giờ');
    }

    // 1️⃣ Pre-validate all bookings before transaction
    const validatedBookings = [];

    for (const item of bookingItems) {
      const start = new Date(item.startTime);
      const end = new Date(item.endTime);

      // Validate time
      if (start >= end) {
        throw new BadRequestException(`Giờ kết thúc phải sau giờ bắt đầu (sân ${item.courtId})`);
      }

      if (start < new Date()) {
        throw new BadRequestException(`Không thể đặt trong quá khứ (sân ${item.courtId})`);
      }

      // Validate court exists
      const court = await this.prisma.court.findUnique({
        where: { id: item.courtId },
      });

      if (!court) {
        throw new NotFoundException(`Sân ${item.courtId} không tồn tại`);
      }

      if (!court.isActive) {
        throw new BadRequestException(`Sân ${item.courtId} không khả dụng`);
      }

      // Check conflict with existing bookings
      const conflict = await this.prisma.booking.findFirst({
        where: {
          courtId: item.courtId,
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

      if (conflict) {
        throw new ConflictException(
          `Sân ${item.courtId} đã bị đặt từ ${conflict.startTime.toISOString()} đến ${conflict.endTime.toISOString()}`,
        );
      }

      // Calculate price
      const totalPrice = await this.calculatePrice(item.courtId, start, end);

      validatedBookings.push({
        ...item,
        start,
        end,
        totalPrice,
        court,
      });
    }

    // 2️⃣ Execute transaction: create all bookings atomically
    const bookingType = type || BookingType.REGULAR;
    const isGuestBooking = guestName && guestPhone;
    const finalUserId = isGuestBooking ? null : userId;

    let status: BookingStatus;
    let paymentStatus: PaymentStatus;
    let expiresAt: Date | null = null;

    if (isGuestBooking) {
      status = BookingStatus.CONFIRMED;
      paymentStatus = PaymentStatus.PAID;
    } else if (bookingType === BookingType.MAINTENANCE) {
      status = BookingStatus.BLOCKED;
      paymentStatus = PaymentStatus.PAID;
    } else if (paymentMethod === PaymentMethod.CASH) {
      status = BookingStatus.CONFIRMED;
      paymentStatus = PaymentStatus.PAID;
    } else {
      status = BookingStatus.PENDING_PAYMENT;
      paymentStatus = PaymentStatus.UNPAID;
      expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    }

    try {
      const createdBookings = await this.prisma.$transaction(async (tx) => {
        const results = [];

        for (const validated of validatedBookings) {
          const bookingCode = await this.generateBookingCode();

          const booking = await tx.booking.create({
            data: {
              bookingCode,
              courtId: validated.courtId,
              userId: finalUserId,
              guestName: isGuestBooking ? guestName : null,
              guestPhone: isGuestBooking ? guestPhone : null,
              startTime: validated.start,
              endTime: validated.end,
              totalPrice: validated.totalPrice,
              status,
              type: bookingType,
              paymentMethod: paymentMethod || null,
              paymentStatus,
              createdBy:
                userRole === Role.STAFF || userRole === Role.ADMIN ? 'STAFF' : 'CUSTOMER',
              createdByStaffId:
                userRole === Role.STAFF || userRole === Role.ADMIN ? userId : null,
              expiresAt,
            },
            include: {
              court: true,
            },
          });

          results.push(booking);

          // Add expiration job if PENDING_PAYMENT
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
          }
        }

        return results;
      });

      // 3️⃣ Return all created bookings
      return {
        message: `Đã tạo ${createdBookings.length} booking thành công`,
        bookings: createdBookings,
        totalPrice: createdBookings.reduce((sum, b) => sum + Number(b.totalPrice), 0),
      };
    } catch (error) {
      // Transaction automatically rolled back on error
      if (error instanceof ConflictException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Lỗi tạo bulk booking: ${error.message}`);
    }
  }

  async getBookingByCode(code: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingCode: code },
      include: {
        court: true,
        user: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  /**
   * Staff/Admin check-in a booking by id
   */
  async checkInBooking(bookingId: number, staffId: number, staffRole: Role) {
    if (![Role.STAFF, Role.ADMIN].includes(staffRole)) {
      throw new ForbiddenException('Only staff/admin can check in bookings');
    }

    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if ([BookingStatus.CANCELLED, BookingStatus.CANCELLED_LATE, BookingStatus.EXPIRED].includes(booking.status)) {
      throw new BadRequestException('Cannot check in a cancelled or expired booking');
    }

    if (booking.status === BookingStatus.COMPLETED) {
      return booking; // already completed
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CHECKED_IN,
        paymentStatus: booking.paymentStatus === PaymentStatus.PAID ? PaymentStatus.PAID : PaymentStatus.PAID,
        checkedInAt: new Date(),
        checkedInByStaffId: staffId,
      },
    });

    return updated;
  }
}

