import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingStatus, BookingGroupStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { CancelBookingGroupDto } from './dto/cancel-booking-group.dto';

@Injectable()
export class BookingsAdminService {
  private readonly logger = new Logger(BookingsAdminService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get booking group details with all bookings
   * For admin dashboard to show group info
   */
  async getBookingGroupDetails(groupId: number) {
    const bookingGroup = await this.prisma.bookingGroup.findUnique({
      where: { id: groupId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
          },
        },
        court: {
          select: {
            id: true,
            name: true,
            pricePerHour: true,
          },
        },
        bookings: {
          orderBy: {
            startTime: 'asc',
          },
          select: {
            id: true,
            bookingCode: true,
            startTime: true,
            endTime: true,
            status: true,
            totalPrice: true,
            paidAmount: true,
            paymentStatus: true,
            createdAt: true,
          },
        },
      },
    });

    if (!bookingGroup) {
      throw new NotFoundException(`Booking group #${groupId} not found`);
    }

    // Calculate statistics
    const stats = {
      total: bookingGroup.bookings.length,
      confirmed: bookingGroup.bookings.filter(
        (b) => b.status === BookingStatus.CONFIRMED,
      ).length,
      checkedIn: bookingGroup.bookings.filter(
        (b) => b.status === BookingStatus.CHECKED_IN,
      ).length,
      completed: bookingGroup.bookings.filter(
        (b) => b.status === BookingStatus.COMPLETED,
      ).length,
      cancelled: bookingGroup.bookings.filter(
        (b) => b.status === BookingStatus.CANCELLED,
      ).length,
      upcoming: bookingGroup.bookings.filter(
        (b) => b.startTime > new Date() && b.status !== BookingStatus.CANCELLED,
      ).length,
      past: bookingGroup.bookings.filter(
        (b) => b.startTime < new Date() || b.status === BookingStatus.COMPLETED,
      ).length,
    };

    return {
      ...bookingGroup,
      stats,
    };
  }

  /**
   * Cancel entire booking group
   * Admin/Staff can cancel all bookings in a group
   */
  async cancelBookingGroup(
    groupId: number,
    adminId: number,
    dto: CancelBookingGroupDto,
  ) {
    const { reason, refundToWallet = true, cancelOnlyFuture = false } = dto;

    // 1. Get booking group with all bookings
    const bookingGroup = await this.prisma.bookingGroup.findUnique({
      where: { id: groupId },
      include: {
        user: true,
        bookings: {
          where: cancelOnlyFuture
            ? {
                startTime: { gt: new Date() },
                status: {
                  notIn: [BookingStatus.CANCELLED, BookingStatus.COMPLETED],
                },
              }
            : {
                status: {
                  notIn: [BookingStatus.CANCELLED, BookingStatus.COMPLETED],
                },
              },
        },
      },
    });

    if (!bookingGroup) {
      throw new NotFoundException(`Booking group #${groupId} not found`);
    }

    if (bookingGroup.status === BookingGroupStatus.CANCELLED) {
      throw new BadRequestException('Booking group already cancelled');
    }

    const bookingsToCancel = bookingGroup.bookings;

    if (bookingsToCancel.length === 0) {
      throw new BadRequestException('No bookings to cancel');
    }

    this.logger.log(
      `📋 Cancelling booking group #${groupId} | ${bookingsToCancel.length} bookings | Admin: ${adminId}`,
    );

    // 2. Calculate refund amount
    let totalRefund = new Decimal(0);
    for (const booking of bookingsToCancel) {
      totalRefund = totalRefund.add(new Decimal(booking.paidAmount));
    }

    // 3. Cancel all bookings in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Cancel all bookings
      const cancelledBookings = await tx.booking.updateMany({
        where: {
          id: { in: bookingsToCancel.map((b) => b.id) },
        },
        data: {
          status: BookingStatus.CANCELLED,
        },
      });

      // Update booking group status
      const updatedGroup = await tx.bookingGroup.update({
        where: { id: groupId },
        data: {
          status: BookingGroupStatus.CANCELLED,
          isActive: false,
        },
      });

      // Refund to wallet if requested
      let walletTransaction = null;
      if (refundToWallet && totalRefund.greaterThan(0)) {
        const wallet = await tx.wallet.findUnique({
          where: { userId: bookingGroup.userId },
        });

        if (!wallet) {
          throw new NotFoundException('Wallet not found');
        }

        const balanceBefore = new Decimal(wallet.balance);
        const balanceAfter = balanceBefore.add(totalRefund);

        // Update wallet balance
        await tx.wallet.update({
          where: { userId: bookingGroup.userId },
          data: {
            balance: balanceAfter,
          },
        });

        // Create wallet transaction
        walletTransaction = await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'REFUND',
            amount: totalRefund,
            balanceBefore,
            balanceAfter,
            description: `Refund from cancelled booking group #${groupId} (${bookingsToCancel.length} bookings) - ${reason || 'No reason provided'}`,
          },
        });
      }

      return {
        group: updatedGroup,
        cancelledCount: cancelledBookings.count,
        refund: walletTransaction,
      };
    });

    this.logger.log(
      `✅ Cancelled booking group #${groupId} | ${result.cancelledCount} bookings | Refund: ${totalRefund} VND`,
    );

    return {
      message: `Successfully cancelled booking group #${groupId}`,
      bookingGroup: result.group,
      cancelledBookings: result.cancelledCount,
      refundAmount: Number(totalRefund),
      refunded: refundToWallet,
      reason: reason || 'No reason provided',
    };
  }

  /**
   * Get all booking groups for admin dashboard
   * With filters and pagination
   */
  async getAllBookingGroups(filters?: {
    status?: BookingGroupStatus;
    userId?: number;
    courtId?: number;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const {
      status,
      userId,
      courtId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = filters || {};

    const where: any = {};

    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (courtId) where.courtId = courtId;
    if (startDate || endDate) {
      where.startDate = {};
      if (startDate) where.startDate.gte = startDate;
      if (endDate) where.startDate.lte = endDate;
    }

    const [total, groups] = await Promise.all([
      this.prisma.bookingGroup.count({ where }),
      this.prisma.bookingGroup.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              phone: true,
            },
          },
          court: {
            select: {
              id: true,
              name: true,
            },
          },
          bookings: {
            select: {
              id: true,
              status: true,
              startTime: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: groups.map((group) => ({
        ...group,
        bookingCount: group.bookings.length,
        upcomingCount: group.bookings.filter(
          (b) =>
            b.startTime > new Date() && b.status !== BookingStatus.CANCELLED,
        ).length,
        completedCount: group.bookings.filter(
          (b) => b.status === BookingStatus.COMPLETED,
        ).length,
      })),
    };
  }
}
