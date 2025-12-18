import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class RevenueService {
  private readonly logger = new Logger(RevenueService.name);

  constructor(private prisma: PrismaService) {}

  async getDailyRevenue(date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [bookings, sales] = await Promise.all([
      this.prisma.booking.findMany({
        where: {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
          status: {
            notIn: ['CANCELLED', 'EXPIRED', 'BLOCKED'], // Exclude maintenance
          },
        },
        select: {
          id: true,
          bookingCode: true,
          totalPrice: true,
          paymentMethod: true,
          status: true,
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
    ]);

    const bookingRevenue = bookings.reduce(
      (sum, b) => sum.add(new Decimal(b.totalPrice)),
      new Decimal(0),
    );

    const posRevenue = sales.reduce(
      (sum, s) => sum.add(new Decimal(s.totalAmount)),
      new Decimal(0),
    );

    const totalRevenue = bookingRevenue.add(posRevenue);

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

    const cashRevenue = bookingByCash
      .reduce((sum, b) => sum.add(new Decimal(b.totalPrice)), new Decimal(0))
      .add(
        salesByCash.reduce(
          (sum, s) => sum.add(new Decimal(s.totalAmount)),
          new Decimal(0),
        ),
      );

    const onlineRevenue = bookingByOnline
      .reduce((sum, b) => sum.add(new Decimal(b.totalPrice)), new Decimal(0))
      .add(
        salesByOnline.reduce(
          (sum, s) => sum.add(new Decimal(s.totalAmount)),
          new Decimal(0),
        ),
      );

    return {
      date: date.toISOString().split('T')[0],
      summary: {
        totalRevenue: Number(totalRevenue),
        bookingRevenue: Number(bookingRevenue),
        posRevenue: Number(posRevenue),
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
      },
    };
  }

  async getShiftRevenue(staffId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [bookings, sales] = await Promise.all([
      this.prisma.booking.findMany({
        where: {
          createdByStaffId: staffId,
          createdAt: {
            gte: today,
          },
          status: {
            notIn: ['CANCELLED', 'EXPIRED'],
          },
        },
        select: {
          bookingCode: true,
          totalPrice: true,
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
    ]);

    const bookingRevenue = bookings.reduce(
      (sum, b) => sum.add(new Decimal(b.totalPrice)),
      new Decimal(0),
    );

    const posRevenue = sales.reduce(
      (sum, s) => sum.add(new Decimal(s.totalAmount)),
      new Decimal(0),
    );

    return {
      staffId,
      shiftDate: today.toISOString().split('T')[0],
      bookingsCount: bookings.length,
      salesCount: sales.length,
      bookingRevenue: Number(bookingRevenue),
      posRevenue: Number(posRevenue),
      totalRevenue: Number(bookingRevenue.add(posRevenue)),
      bookings,
      sales,
    };
  }

  async closeShift(staffId: number) {
    const shiftData = await this.getShiftRevenue(staffId);

    this.logger.log(
      `✅ Shift closed for staff #${staffId}. Total revenue: ${shiftData.totalRevenue} VND`,
    );

    return {
      message: 'Shift closed successfully',
      ...shiftData,
    };
  }
}
