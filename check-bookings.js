const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBookings() {
  try {
    const customer = await prisma.user.findFirst({
      where: {
        email: { contains: 'customer1' }
      }
    });

    if (!customer) {
      console.log('❌ Không tìm thấy customer1');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const bookings = await prisma.booking.findMany({
      where: {
        userId: customer.id,
        startTime: {
          gte: today,
          lt: tomorrow
        },
        status: 'CONFIRMED'
      },
      include: {
        court: true,
        payment: true
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    console.log(`\n📋 Danh sách booking hôm nay của ${customer.email}:\n`);
    
    bookings.forEach((b, index) => {
      const startHour = new Date(b.startTime).getHours();
      const endHour = new Date(b.endTime).getHours();
      console.log(`${index + 1}. ${b.bookingCode}`);
      console.log(`   📍 ${b.court.name}`);
      console.log(`   🕐 ${startHour}:00 - ${endHour}:00`);
      console.log(`   💰 ${Number(b.totalPrice).toLocaleString('vi-VN')} VND`);
      console.log(`   ✅ ${b.status} - Đã thanh toán`);
      console.log('');
    });

    console.log(`📊 Tổng cộng: ${bookings.length} booking`);
    console.log(`💵 Tổng tiền: ${bookings.reduce((sum, b) => sum + Number(b.totalPrice), 0).toLocaleString('vi-VN')} VND\n`);

    const wallet = await prisma.wallet.findUnique({
      where: { userId: customer.id }
    });

    console.log(`💰 Số dư ví: ${Number(wallet.balance).toLocaleString('vi-VN')} VND`);

  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkBookings();
