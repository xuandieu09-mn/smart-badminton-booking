import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { BookingTimeoutProcessor } from './processors/booking-timeout.processor';
import { QUEUE_NAMES } from '../queue/constants/queue.constants';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUE_NAMES.BOOKING_TIMEOUT,
    }),
  ],
  providers: [BookingsService, BookingTimeoutProcessor],
  controllers: [BookingsController],
})
export class BookingsModule {}
