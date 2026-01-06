const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createDemoBookings() {
  try {
    // 1. Tìm customer1
    const customer = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'customer1@example.com' },
          { email: { contains: 'customer1' } },
          { name: { contains: 'customer1', mode: 'insensitive' } }
        ]
      }
    });

    if (!customer) {
      console.error('❌ Không tìm thấy customer1');
      console.log('Danh sách users:');
      const users = await prisma.user.findMany({
        select: { id: true, email: true, name: true, role: true }
      });
      console.table(users);
      return;
    }

    console.log(`✅ Tìm thấy customer: ${customer.email || customer.username}`);

    // 2. Nạp 90 triệu vào ví
    const updatedWallet = await prisma.wallet.upsert({
      where: { userId: customer.id },
      update: {
        balance: { increment: 90000000 } // +90 triệu
      },
      create: {
        userId: customer.id,
        balance: 90000000
      }
    });

    console.log(`💰 Nạp 90 triệu thành công! Số dư: ${updatedWallet.balance.toLocaleString('vi-VN')} VND`);

    // 3. Lấy danh sách sân
    const courts = await prisma.court.findMany({
      where: { isActive: true }
    });

    if (courts.length === 0) {
      console.error('❌ Không có sân nào active');
      return;
    }

    console.log(`🏸 Tìm thấy ${courts.length} sân`);

    // 4. Tạo booking cho hôm nay từ 16h trở đi
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const timeSlots = [
      { start: 16, end: 18 },
      { start: 18, end: 20 },
      { start: 20, end: 22 },
    ];

    const bookingsToCreate = [];
    
    // Chọn ngẫu nhiên 3-5 booking
    const numBookings = 3 + Math.floor(Math.random() * 3); // 3-5 bookings
    
    for (let i = 0; i < numBookings; i++) {
      const randomCourt = courts[Math.floor(Math.random() * courts.length)];
      const randomSlot = timeSlots[Math.floor(Math.random() * timeSlots.length)];
      
      const startTime = new Date(today);
      startTime.setHours(randomSlot.start, 0, 0, 0);
      
      const endTime = new Date(today);
      endTime.setHours(randomSlot.end, 0, 0, 0);

      bookingsToCreate.push({
        court: randomCourt,
        startTime,
        endTime,
        totalPrice: Number(randomCourt.pricePerHour) * (randomSlot.end - randomSlot.start)
      });
    }

    console.log(`\n📅 Tạo ${bookingsToCreate.length} booking...`);

    const createdBookings = [];

    for (const bookingData of bookingsToCreate) {
      // Kiểm tra xem khung giờ có trống không
      const existingBooking = await prisma.booking.findFirst({
        where: {
          courtId: bookingData.court.id,
          startTime: bookingData.startTime,
          status: { not: 'CANCELLED' }
        }
      });

      if (existingBooking) {
        console.log(`⚠️ Sân ${bookingData.court.name} ${bookingData.startTime.getHours()}h-${bookingData.endTime.getHours()}h đã có người đặt, bỏ qua...`);
        continue;
      }

      // Tạo booking code
      const bookingCode = `BK${Date.now()}${Math.floor(Math.random() * 1000)}`;
      
      const booking = await prisma.booking.create({
        data: {
          userId: customer.id,
          courtId: bookingData.court.id,
          startTime: bookingData.startTime,
          endTime: bookingData.endTime,
          totalPrice: bookingData.totalPrice,
          bookingCode: bookingCode,
          status: 'PENDING_PAYMENT',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 phút
          createdBy: 'CUSTOMER'
        },
        include: {
          court: true
        }
      });

      createdBookings.push(booking);
      console.log(`✅ Tạo booking: ${booking.court.name} | ${bookingData.startTime.getHours()}h-${bookingData.endTime.getHours()}h | ${booking.totalPrice.toLocaleString('vi-VN')} VND`);
    }

    if (createdBookings.length === 0) {
      console.log('❌ Không tạo được booking nào (tất cả đều đã có người đặt)');
      return;
    }

    // 5. Thanh toán tất cả bằng ví
    console.log(`\n💳 Thanh toán ${createdBookings.length} booking...`);

    for (const booking of createdBookings) {
      // Tạo payment
      const payment = await prisma.payment.create({
        data: {
          bookingId: booking.id,
          amount: booking.totalPrice,
          method: 'WALLET',
          status: 'PAID',
          transactionId: `WALLET_${Date.now()}_${booking.id}`,
          paidAt: new Date()
        }
      });

      // Trừ tiền từ ví
      await prisma.wallet.update({
        where: { userId: customer.id },
        data: {
          balance: { decrement: booking.totalPrice }
        }
      });

      // Cập nhật trạng thái booking
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'CONFIRMED',
          expiresAt: null
        }
      });

      console.log(`✅ Thanh toán: ${booking.bookingCode} | ${booking.totalPrice.toLocaleString('vi-VN')} VND`);
    }

    // 6. Kiểm tra số dư cuối
    const finalWallet = await prisma.wallet.findUnique({
      where: { userId: customer.id }
    });

    console.log(`\n✨ HOÀN TẤT!`);
    console.log(`📊 Tổng kết:`);
    console.log(`   - Đã tạo: ${createdBookings.length} booking`);
    const totalSpent = createdBookings.reduce((sum, b) => sum + Number(b.totalPrice), 0);
    console.log(`   - Tổng chi: ${totalSpent.toLocaleString('vi-VN')} VND`);
    console.log(`   - Số dư còn lại: ${finalWallet.balance.toLocaleString('vi-VN')} VND`);
    console.log(`\n🎯 Sẵn sàng demo!`);

  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

createDemoBookings();
