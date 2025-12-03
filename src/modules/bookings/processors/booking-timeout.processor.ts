import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { PrismaService } from '../../../prisma/prisma.service';
import { QUEUE_NAMES, JOB_NAMES } from '../../queue/constants/queue.constants';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import type {
  ExpireBookingJobData,
  ExpireBookingJobResult,
} from '../interfaces';

@Processor(QUEUE_NAMES.BOOKING_TIMEOUT)
export class BookingTimeoutProcessor {
  private readonly logger = new Logger(BookingTimeoutProcessor.name);

  constructor(private prisma: PrismaService) {}

  @Process(JOB_NAMES.EXPIRE_BOOKING)
  async handleBookingExpiration(
    job: Job<ExpireBookingJobData>,
  ): Promise<ExpireBookingJobResult> {
    const { bookingId } = job.data;

    this.logger.log(`Processing expiration for booking #${bookingId}`);

    try {
      // Get booking from database
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

      // Check if booking exists
      if (!booking) {
        this.logger.warn(
          `Booking #${bookingId} not found - may have been deleted`,
        );
        return { success: false, bookingId, reason: 'Booking not found' };
      }

      // Check if booking is still PENDING_PAYMENT
      if (booking.status !== BookingStatus.PENDING_PAYMENT) {
        this.logger.log(
          `Booking #${bookingId} (${booking.bookingCode}) already ${booking.status} - skipping expiration`,
        );
        return {
          success: false,
          bookingId,
          bookingCode: booking.bookingCode,
          reason: `Already ${booking.status}`,
        };
      }

      // Check if payment is already done
      if (booking.paymentStatus === PaymentStatus.PAID) {
        this.logger.log(
          `Booking #${bookingId} (${booking.bookingCode}) already paid - skipping expiration`,
        );
        return {
          success: false,
          bookingId,
          bookingCode: booking.bookingCode,
          reason: 'Already paid',
        };
      }

      // Update booking status to EXPIRED
      const updatedBooking = await this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.EXPIRED,
        },
        select: {
          id: true,
          bookingCode: true,
          status: true,
        },
      });

      this.logger.log(
        `✅ Successfully expired booking #${bookingId} (${updatedBooking.bookingCode})`,
      );

      return {
        success: true,
        bookingId: updatedBooking.id,
        bookingCode: updatedBooking.bookingCode,
        newStatus: updatedBooking.status,
      };
    } catch (error) {
      this.logger.error(
        `❌ Failed to expire booking #${bookingId}: ${error.message}`,
        error.stack,
      );
      throw error; // Re-throw to trigger Bull retry
    }
  }
}
