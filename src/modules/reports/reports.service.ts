import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private getDaysFromRange(range: string): number {
    const match = range.match(/^(\d+)d$/);
    return match ? parseInt(match[1], 10) : 30;
  }

  async getSummary(range: string) {
    const days = this.getDaysFromRange(range);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const bookings = await this.prisma.booking.findMany({
      where: {
        createdAt: { gte: startDate },
        status: { in: ['CONFIRMED', 'COMPLETED', 'CHECKED_IN'] },
      },
      select: {
        totalPrice: true,
        status: true,
      },
    });

    const totalRevenue = bookings.reduce(
      (sum, b) => sum + Number(b.totalPrice),
      0,
    );
    const totalBookings = bookings.length;
    const avgBookingValue =
      totalBookings > 0 ? totalRevenue / totalBookings : 0;

    // Calculate conversion rate (confirmed/completed vs total)
    const allBookings = await this.prisma.booking.count({
      where: { createdAt: { gte: startDate } },
    });
    const conversionRate =
      allBookings > 0 ? (totalBookings / allBookings) * 100 : 0;

    return {
      totalRevenue,
      totalBookings,
      avgBookingValue,
      conversionRate,
    };
  }

  async getRevenueTrend(range: string) {
    const days = this.getDaysFromRange(range);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const bookings = await this.prisma.booking.findMany({
      where: {
        createdAt: { gte: startDate },
        status: { in: ['CONFIRMED', 'COMPLETED', 'CHECKED_IN'] },
      },
      select: {
        createdAt: true,
        totalPrice: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const revenueByDate = new Map<string, number>();
    bookings.forEach((booking) => {
      const date = booking.createdAt.toISOString().split('T')[0];
      const current = revenueByDate.get(date) || 0;
      revenueByDate.set(date, current + Number(booking.totalPrice));
    });

    return Array.from(revenueByDate.entries())
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getCourtRevenue(range: string) {
    const days = this.getDaysFromRange(range);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const bookings = await this.prisma.booking.findMany({
      where: {
        createdAt: { gte: startDate },
        status: { in: ['CONFIRMED', 'COMPLETED', 'CHECKED_IN'] },
      },
      include: {
        court: {
          select: { name: true },
        },
      },
    });

    // Group by court
    const courtStats = new Map<string, { revenue: number; count: number }>();
    bookings.forEach((booking) => {
      const courtName = booking.court.name;
      const stats = courtStats.get(courtName) || { revenue: 0, count: 0 };
      stats.revenue += Number(booking.totalPrice);
      stats.count += 1;
      courtStats.set(courtName, stats);
    });

    return Array.from(courtStats.entries())
      .map(([courtName, stats]) => ({
        courtName,
        revenue: stats.revenue,
        bookings: stats.count,
        avgPerBooking: stats.revenue / stats.count,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  async getPeakHours(range: string) {
    const days = this.getDaysFromRange(range);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const bookings = await this.prisma.booking.findMany({
      where: {
        createdAt: { gte: startDate },
        status: { in: ['CONFIRMED', 'COMPLETED', 'CHECKED_IN'] },
      },
      select: {
        startTime: true,
        totalPrice: true,
      },
    });

    // Group by hour
    const hourlyStats = new Map<number, { revenue: number; count: number }>();
    bookings.forEach((booking) => {
      const hour = new Date(booking.startTime).getHours();
      const stats = hourlyStats.get(hour) || { revenue: 0, count: 0 };
      stats.revenue += Number(booking.totalPrice);
      stats.count += 1;
      hourlyStats.set(hour, stats);
    });

    return Array.from(hourlyStats.entries())
      .map(([hour, stats]) => ({
        hour,
        revenue: stats.revenue,
        bookings: stats.count,
      }))
      .sort((a, b) => a.hour - b.hour);
  }

  async getChatAnalytics(range: string) {
    const days = this.getDaysFromRange(range);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const messages = await this.prisma.chatMessage.findMany({
      where: {
        createdAt: { gte: startDate },
        role: 'user',
      },
      select: {
        content: true,
      },
    });

    // Simple intent detection based on keywords
    const intents = {
      'Đặt sân': 0,
      'Giá cả': 0,
      'Thời gian': 0,
      'Hủy/Hoàn tiền': 0,
      Khác: 0,
    };

    messages.forEach((msg) => {
      const content = msg.content.toLowerCase();
      if (content.includes('đặt') || content.includes('book')) {
        intents['Đặt sân']++;
      } else if (
        content.includes('giá') ||
        content.includes('tiền') ||
        content.includes('price')
      ) {
        intents['Giá cả']++;
      } else if (
        content.includes('giờ') ||
        content.includes('time') ||
        content.includes('khi nào')
      ) {
        intents['Thời gian']++;
      } else if (
        content.includes('hủy') ||
        content.includes('hoàn') ||
        content.includes('refund')
      ) {
        intents['Hủy/Hoàn tiền']++;
      } else {
        intents['Khác']++;
      }
    });

    return Object.entries(intents).map(([intent, count]) => ({
      intent,
      count,
    }));
  }
}
