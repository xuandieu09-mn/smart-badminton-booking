import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { BookingsService } from '../src/modules/bookings/bookings.service';
import { Role, PaymentMethod } from '@prisma/client';

/**
 * Script test thủ công cho Booking Timeout
 * Chạy: ts-node test/manual-booking-timeout.test.ts
 */
async function testBookingTimeout() {
  console.log('🚀 Starting Booking Timeout Test...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const bookingsService = app.get(BookingsService);

  try {
    // 1. Tạo booking PENDING_PAYMENT
    console.log('📝 Step 1: Creating PENDING_PAYMENT booking...');

    const result = await bookingsService.createBooking(
      {
        courtId: 1,
        startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 giờ sau
        endTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), // 3 giờ sau
        paymentMethod: PaymentMethod.VNPAY,
      },
      1, // userId
      Role.CUSTOMER,
    );

    console.log('✅ Booking created:');
    console.log('   - ID:', result.booking.id);
    console.log('   - Code:', result.booking.bookingCode);
    console.log('   - Status:', result.booking.status);
    console.log('   - Expires at:', result.booking.expiresAt);
    console.log('\n⏰ Timeout job scheduled!');
    console.log('   Wait 15 minutes to see auto-expiration...');
    console.log(
      '   Or check logs for: [BookingTimeoutProcessor] Processing expiration',
    );

    // 2. Hướng dẫn kiểm tra
    console.log('\n📋 Next Steps:');
    console.log('   1. Check Redis queue:');
    console.log('      redis-cli');
    console.log('      KEYS bull:booking-timeout:*');
    console.log('');
    console.log('   2. Monitor logs:');
    console.log('      npm run start:dev');
    console.log('');
    console.log('   3. Query database after 15 min:');
    console.log(
      `      SELECT id, booking_code, status FROM "Booking" WHERE id = ${result.booking.id};`,
    );
    console.log('');
    console.log('   4. Expected result:');
    console.log('      status = EXPIRED');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await app.close();
  }
}

// Run test
testBookingTimeout()
  .then(() => {
    console.log('\n✅ Test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
