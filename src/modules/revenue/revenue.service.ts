import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class RevenueService {
  private readonly logger = new Logger(RevenueService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 📊 Get Daily Revenue
   *
   * Formula: Total Revenue = A + B - C
   * - A: Booking Revenue (paidAmount của CONFIRMED/COMPLETED/CHECKED_IN bookings)
   * - B: POS Revenue (totalAmount của các đơn bán hàng)
   * - C: Refunds (tổng tiền đã hoàn cho khách)
   */
  async getDailyRevenue(date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // ✅ FIX: Query bookings with paidAmount > 0 (actual money received)
    const [bookings, sales, refunds] = await Promise.all([
      // A: Booking Revenue - Only count PAID bookings with actual payment
      this.prisma.booking.findMany({
        where: {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
          paymentStatus: 'PAID', // ✅ Only count paid bookings
          status: {
            in: ['CONFIRMED', 'CHECKED_IN', 'COMPLETED'], // ✅ Valid booking statuses
          },
        },
        select: {
          id: true,
          bookingCode: true,
          totalPrice: true,
          paidAmount: true, // ✅ Use paidAmount instead of totalPrice
          paymentMethod: true,
          status: true,
          paymentStatus: true,
          createdAt: true,
          guestName: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
      // B: POS Revenue
      this.prisma.sale.findMany({
        where: {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        select: {
          id: true,
          saleCode: true,
          totalAmount: true,
          paymentMethod: true,
          customerName: true,
          createdAt: true,
          staff: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
      // C: Refunds - Money returned to customers
      this.prisma.bookingCancellation.findMany({
        where: {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
          refundAmount: {
            gt: 0, // Only count actual refunds
          },
        },
        select: {
          id: true,
          refundAmount: true,
          refundMethod: true,
          reason: true,
          createdAt: true,
          booking: {
            select: {
              bookingCode: true,
            },
          },
        },
      }),
    ]);

    // ✅ FIX: Calculate booking revenue from paidAmount (actual money received)
    const bookingRevenue = bookings.reduce(
      (sum, b) => sum.add(new Decimal(b.paidAmount || 0)),
      new Decimal(0),
    );

    // B: POS Revenue
    const posRevenue = sales.reduce(
      (sum, s) => sum.add(new Decimal(s.totalAmount)),
      new Decimal(0),
    );

    // C: Total Refunds (to be deducted)
    const totalRefunds = refunds.reduce(
      (sum, r) => sum.add(new Decimal(r.refundAmount)),
      new Decimal(0),
    );

    // ✅ CORRECT FORMULA: Total = Booking + POS - Refunds
    const totalRevenue = bookingRevenue.add(posRevenue).sub(totalRefunds);

    // Breakdown by payment method (using paidAmount)
    const bookingByCash = bookings.filter((b) => b.paymentMethod === 'CASH');
    const bookingByOnline = bookings.filter(
      (b) =>
        b.paymentMethod === 'VNPAY' ||
        b.paymentMethod === 'MOMO' ||
        b.paymentMethod === 'WALLET',
    );

    const salesByCash = sales.filter((s) => s.paymentMethod === 'CASH');
    const salesByOnline = sales.filter(
      (s) =>
        s.paymentMethod === 'VNPAY' ||
        s.paymentMethod === 'MOMO' ||
        s.paymentMethod === 'WALLET',
    );

    // ✅ FIX: Use paidAmount for cash/online breakdown
    const cashRevenue = bookingByCash
      .reduce(
        (sum, b) => sum.add(new Decimal(b.paidAmount || 0)),
        new Decimal(0),
      )
      .add(
        salesByCash.reduce(
          (sum, s) => sum.add(new Decimal(s.totalAmount)),
          new Decimal(0),
        ),
      );

    const onlineRevenue = bookingByOnline
      .reduce(
        (sum, b) => sum.add(new Decimal(b.paidAmount || 0)),
        new Decimal(0),
      )
      .add(
        salesByOnline.reduce(
          (sum, s) => sum.add(new Decimal(s.totalAmount)),
          new Decimal(0),
        ),
      );

    return {
      date: date.toISOString().split('T')[0],
      summary: {
        // ✅ Clear breakdown for admin dashboard
        totalRevenue: Number(totalRevenue), // Final net revenue
        bookingRevenue: Number(bookingRevenue), // A: From bookings
        posRevenue: Number(posRevenue), // B: From POS sales
        refundDeduction: Number(totalRefunds), // C: Money refunded (negative)
        cashRevenue: Number(cashRevenue),
        onlineRevenue: Number(onlineRevenue),
      },
      breakdown: {
        bookings: {
          count: bookings.length,
          cash: bookingByCash.length,
          online: bookingByOnline.length,
          items: bookings,
        },
        sales: {
          count: sales.length,
          cash: salesByCash.length,
          online: salesByOnline.length,
          items: sales,
        },
        refunds: {
          count: refunds.length,
          totalAmount: Number(totalRefunds),
          items: refunds,
        },
      },
    };
  }

  /**
   * 📊 Get Shift Revenue for Staff
   */
  async getShiftRevenue(staffId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [bookings, sales, refunds] = await Promise.all([
      this.prisma.booking.findMany({
        where: {
          createdByStaffId: staffId,
          createdAt: {
            gte: today,
          },
          paymentStatus: 'PAID', // ✅ Only paid bookings
          status: {
            in: ['CONFIRMED', 'CHECKED_IN', 'COMPLETED'],
          },
        },
        select: {
          bookingCode: true,
          totalPrice: true,
          paidAmount: true, // ✅ Use paidAmount
          paymentMethod: true,
          createdAt: true,
        },
      }),
      this.prisma.sale.findMany({
        where: {
          staffId: staffId,
          createdAt: {
            gte: today,
          },
        },
        select: {
          saleCode: true,
          totalAmount: true,
          paymentMethod: true,
          createdAt: true,
        },
      }),
      // Refunds processed by this staff today
      this.prisma.bookingCancellation.findMany({
        where: {
          createdAt: {
            gte: today,
          },
          cancelledBy: staffId,
          refundAmount: {
            gt: 0,
          },
        },
        select: {
          refundAmount: true,
        },
      }),
    ]);

    // ✅ Use paidAmount for booking revenue
    const bookingRevenue = bookings.reduce(
      (sum, b) => sum.add(new Decimal(b.paidAmount || 0)),
      new Decimal(0),
    );

    const posRevenue = sales.reduce(
      (sum, s) => sum.add(new Decimal(s.totalAmount)),
      new Decimal(0),
    );

    const totalRefunds = refunds.reduce(
      (sum, r) => sum.add(new Decimal(r.refundAmount)),
      new Decimal(0),
    );

    // Net revenue = Booking + POS - Refunds
    const netRevenue = bookingRevenue.add(posRevenue).sub(totalRefunds);

    return {
      staffId,
      shiftDate: today.toISOString().split('T')[0],
      bookingsCount: bookings.length,
      salesCount: sales.length,
      refundsCount: refunds.length,
      bookingRevenue: Number(bookingRevenue),
      posRevenue: Number(posRevenue),
      refundDeduction: Number(totalRefunds),
      totalRevenue: Number(netRevenue),
      bookings,
      sales,
    };
  }

  async closeShift(staffId: number) {
    const shiftData = await this.getShiftRevenue(staffId);

    this.logger.log(
      `✅ Shift closed for staff #${staffId}. Net revenue: ${shiftData.totalRevenue} VND (Refunds: -${shiftData.refundDeduction} VND)`,
    );

    return {
      message: 'Shift closed successfully',
      ...shiftData,
    };
  }

  /**
   * 📊 Get Revenue Summary API
   * Endpoint: GET /api/revenue/summary?date=YYYY-MM-DD
   */
  async getRevenueSummary(date: Date) {
    const data = await this.getDailyRevenue(date);

    return {
      date: data.date,
      formula: 'Total Revenue = Booking Revenue + POS Revenue - Refunds',
      bookingRevenue: data.summary.bookingRevenue,
      posRevenue: data.summary.posRevenue,
      refundDeduction: data.summary.refundDeduction,
      total: data.summary.totalRevenue,
      breakdown: {
        cashRevenue: data.summary.cashRevenue,
        onlineRevenue: data.summary.onlineRevenue,
      },
    };
  }
}
