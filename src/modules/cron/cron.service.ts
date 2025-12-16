import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingStatus } from '@prisma/client';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 🕒 Auto-complete bookings that have ended
   * Runs every 5 minutes
   * Finds CHECKED_IN bookings where endTime has passed
   */
  @Cron(CronExpression.EVERY_5_MINUTES, {
    name: 'handleBookingCompletion',
  })
  async handleBookingCompletion() {
    try {
      const now = new Date();

      // Find all CHECKED_IN bookings where endTime < now
      const expiredBookings = await this.prisma.booking.findMany({
        where: {
          status: BookingStatus.CHECKED_IN,
          endTime: {
            lt: now,
          },
        },
        select: {
          id: true,
          bookingCode: true,
          endTime: true,
        },
      });

      if (expiredBookings.length === 0) {
        this.logger.debug('Không có booking nào cần hoàn thành');
        return;
      }

      // Update all expired bookings to COMPLETED
      const result = await this.prisma.booking.updateMany({
        where: {
          id: {
            in: expiredBookings.map((b) => b.id),
          },
        },
        data: {
          status: BookingStatus.COMPLETED,
        },
      });

      this.logger.log(
        `✅ Đã hoàn thành tự động ${result.count} bookings: ${expiredBookings.map((b) => b.bookingCode).join(', ')}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Lỗi khi tự động hoàn thành bookings: ${error.message}`,
        error.stack,
      );
    }
  }
}
