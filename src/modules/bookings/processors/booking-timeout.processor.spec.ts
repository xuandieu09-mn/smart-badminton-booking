import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import { QUEUE_NAMES, JOB_NAMES } from '../../queue/constants/queue.constants';
import type {
  ExpireBookingJobData,
  ExpireBookingJobResult,
} from '../interfaces/booking-job.interface'; // ✅ Import từ file mới

@Processor(QUEUE_NAMES.BOOKING_TIMEOUT)
export class BookingTimeoutProcessor {
  private readonly logger = new Logger(BookingTimeoutProcessor.name);

  constructor(private prisma: PrismaService) {}

  @Process(JOB_NAMES.EXPIRE_BOOKING)
  async handleBookingExpiration(
    job: Job<ExpireBookingJobData>,
  ): Promise<ExpireBookingJobResult> {
    const { bookingId } = job.data;

    this.logger.log(`⏰ Processing booking expiration for ID: ${bookingId}`);

    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        select: {
          id: true,
          bookingCode: true,
          status: true,
          paymentStatus: true,
          expiresAt: true,
        },
      });

      if (!booking) {
        this.logger.warn(`⚠️ Booking ${bookingId} not found`);
        return {
          success: false,
          bookingId,
          reason: 'Booking not found',
        };
      }

      if (booking.status !== BookingStatus.PENDING_PAYMENT) {
        this.logger.log(
          `ℹ️ Booking ${booking.bookingCode} already ${booking.status}, skipping expiration`,
        );
        return {
          success: false,
          bookingId,
          bookingCode: booking.bookingCode,
          reason: `Already ${booking.status}`,
        };
      }

      if (booking.paymentStatus === PaymentStatus.PAID) {
        this.logger.log(
          `✅ Booking ${booking.bookingCode} already paid, skipping expiration`,
        );
        return {
          success: false,
          bookingId,
          bookingCode: booking.bookingCode,
          reason: 'Already paid',
        };
      }

      const updated = await this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.EXPIRED },
        select: { id: true, bookingCode: true, status: true },
      });

      this.logger.log(`✅ Booking ${updated.bookingCode} expired successfully`);

      return {
        success: true,
        bookingId: updated.id,
        bookingCode: updated.bookingCode,
        newStatus: updated.status,
      };
    } catch (error) {
      this.logger.error(
        `❌ Error expiring booking ${bookingId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
