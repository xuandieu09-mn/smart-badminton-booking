import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  // Track which bookings already received "expiring soon" notification
  private expiringSoonNotified = new Set<number>();
  // Track which bookings already received "late check-in" notification
  private lateCheckInNotified = new Set<number>();

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

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

  // ============================================================
  // | #4 | SẮP HẾT HẠN GIỮ CHỖ - EXPIRING SOON (5 min warning)
  // ============================================================

  /**
   * ⏳ Check for bookings expiring in 5 minutes
   * Runs every minute
   */
  @Cron(CronExpression.EVERY_MINUTE, {
    name: 'checkExpiringSoonBookings',
  })
  async checkExpiringSoonBookings() {
    try {
      const now = new Date();
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
      const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);

      // Find PENDING_PAYMENT bookings expiring in 5-10 minutes
      const expiringSoon = await this.prisma.booking.findMany({
        where: {
          status: BookingStatus.PENDING_PAYMENT,
          expiresAt: {
            gte: fiveMinutesFromNow,
            lte: tenMinutesFromNow,
          },
        },
        include: {
          court: true,
          user: { select: { id: true, name: true, email: true } },
        },
      });

      for (const booking of expiringSoon) {
        // Skip if already notified
        if (this.expiringSoonNotified.has(booking.id)) {
          continue;
        }

        // Calculate minutes left
        const minutesLeft = Math.ceil(
          (booking.expiresAt.getTime() - now.getTime()) / 60000,
        );

        // Send notification
        await this.notificationsService.notifyBookingExpiringSoon(
          booking,
          minutesLeft,
        );

        // Mark as notified
        this.expiringSoonNotified.add(booking.id);
        this.logger.log(
          `⏳ Expiring soon notification sent: #${booking.bookingCode} (${minutesLeft}m left)`,
        );
      }

      // Cleanup old entries (remove bookings that have expired)
      void this.cleanupExpiringSoonSet();
    } catch (error) {
      this.logger.error(`❌ checkExpiringSoonBookings: ${error.message}`);
    }
  }

  // ============================================================
  // | #5 | TIMEOUT - HỦY TỰ ĐỘNG (handled by Bull queue, but backup)
  // ============================================================

  /**
   * ⏰ Backup cron to expire bookings (in case Bull queue fails)
   * Runs every minute
   */
  @Cron(CronExpression.EVERY_MINUTE, {
    name: 'expireOverdueBookings',
  })
  async expireOverdueBookings() {
    try {
      const now = new Date();

      // Find PENDING_PAYMENT bookings past their expiry
      const overdueBookings = await this.prisma.booking.findMany({
        where: {
          status: BookingStatus.PENDING_PAYMENT,
          expiresAt: {
            lt: now,
          },
        },
        include: {
          court: true,
          user: { select: { id: true, name: true, email: true } },
        },
      });

      if (overdueBookings.length === 0) {
        return;
      }

      for (const booking of overdueBookings) {
        // Update to EXPIRED
        await this.prisma.booking.update({
          where: { id: booking.id },
          data: { status: BookingStatus.EXPIRED },
        });

        // Send notifications
        await this.notificationsService.notifyBookingTimeout(booking);

        this.logger.log(`⏰ Expired booking: #${booking.bookingCode}`);
      }

      // Cleanup expiring soon set
      overdueBookings.forEach((b) => this.expiringSoonNotified.delete(b.id));
    } catch (error) {
      this.logger.error(`❌ expireOverdueBookings: ${error.message}`);
    }
  }

  // ============================================================
  // | #6 | TRỄ CHECK-IN (>15p) - LATE CHECK-IN
  // ============================================================

  /**
   * 🚨 Check for late check-ins (CONFIRMED bookings 15+ min past start time)
   * Runs every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES, {
    name: 'checkLateCheckIns',
  })
  async checkLateCheckIns() {
    try {
      const now = new Date();
      const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
      const sixtyMinutesAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Find CONFIRMED bookings where startTime is 15-60 min ago and NOT checked in
      const lateBookings = await this.prisma.booking.findMany({
        where: {
          status: BookingStatus.CONFIRMED,
          checkedInAt: null,
          startTime: {
            gte: sixtyMinutesAgo, // Don't notify for very old bookings
            lte: fifteenMinutesAgo,
          },
        },
        include: {
          court: true,
          user: { select: { id: true, name: true, email: true } },
        },
      });

      for (const booking of lateBookings) {
        // Skip if already notified
        if (this.lateCheckInNotified.has(booking.id)) {
          continue;
        }

        // Calculate minutes late
        const minutesLate = Math.floor(
          (now.getTime() - new Date(booking.startTime).getTime()) / 60000,
        );

        // Send notification
        await this.notificationsService.notifyLateCheckIn(booking, minutesLate);

        // Mark as notified
        this.lateCheckInNotified.add(booking.id);
        this.logger.log(
          `🚨 Late check-in notification: #${booking.bookingCode} (${minutesLate}m late)`,
        );
      }

      // Cleanup old entries
      void this.cleanupLateCheckInSet();
    } catch (error) {
      this.logger.error(`❌ checkLateCheckIns: ${error.message}`);
    }
  }

  // ============================================================
  // | #11 | BOOKING REMINDER (1 hour before)
  // ============================================================

  /**
   * 📅 Send booking reminders 1 hour before start time
   * Runs every 10 minutes
   */
  @Cron('*/10 * * * *', {
    name: 'sendBookingReminders',
  })
  async sendBookingReminders() {
    try {
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      const seventyMinFromNow = new Date(now.getTime() + 70 * 60 * 1000);

      // Find CONFIRMED bookings starting in 60-70 minutes
      const upcomingBookings = await this.prisma.booking.findMany({
        where: {
          status: BookingStatus.CONFIRMED,
          startTime: {
            gte: oneHourFromNow,
            lte: seventyMinFromNow,
          },
          // Only for bookings that haven't been reminded yet
          // We could add a 'reminderSent' field, but for simplicity check metadata
        },
        include: {
          court: true,
          user: { select: { id: true, name: true, email: true } },
        },
      });

      for (const booking of upcomingBookings) {
        // Skip guest bookings (no push notification possible)
        if (!booking.userId) continue;

        // Send reminder
        await this.notificationsService.notifyBookingReminder(booking);
        this.logger.log(`📅 Booking reminder sent: #${booking.bookingCode}`);
      }
    } catch (error) {
      this.logger.error(`❌ sendBookingReminders: ${error.message}`);
    }
  }

  // ==================== HELPERS ====================

  /**
   * Cleanup expired entries from expiringSoonNotified set
   */
  private async cleanupExpiringSoonSet() {
    if (this.expiringSoonNotified.size === 0) return;

    const idsToCheck = Array.from(this.expiringSoonNotified);
    const activeBookings = await this.prisma.booking.findMany({
      where: {
        id: { in: idsToCheck },
        status: BookingStatus.PENDING_PAYMENT,
      },
      select: { id: true },
    });

    const activeIds = new Set(activeBookings.map((b) => b.id));

    // Remove IDs that are no longer PENDING_PAYMENT
    idsToCheck.forEach((id) => {
      if (!activeIds.has(id)) {
        this.expiringSoonNotified.delete(id);
      }
    });
  }

  /**
   * Cleanup entries from lateCheckInNotified set
   */
  private async cleanupLateCheckInSet() {
    if (this.lateCheckInNotified.size === 0) return;

    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    const idsToCheck = Array.from(this.lateCheckInNotified);
    const recentBookings = await this.prisma.booking.findMany({
      where: {
        id: { in: idsToCheck },
        status: BookingStatus.CONFIRMED,
        startTime: { gte: twoHoursAgo },
      },
      select: { id: true },
    });

    const recentIds = new Set(recentBookings.map((b) => b.id));

    // Remove IDs for bookings that are checked in or too old
    idsToCheck.forEach((id) => {
      if (!recentIds.has(id)) {
        this.lateCheckInNotified.delete(id);
      }
    });
  }
}
