import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBookingDto } from './dto';
import {
  BookingStatus,
  BookingType,
  PaymentStatus,
  PaymentMethod,
  Role,
} from '@prisma/client';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

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
}
