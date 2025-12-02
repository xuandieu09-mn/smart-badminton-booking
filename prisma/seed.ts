// prisma/seed.ts
import { PrismaClient, Role, BookingStatus, BookingType, PaymentMethod, PaymentStatus, User, Court } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to hash password (simple version - in production use bcrypt)
function hashPassword(password: string): string {
  // In production, use bcrypt.hashSync(password, 10)
  // For seed data, we'll use a simple placeholder that should be updated
  return `hashed_${password}`;
}

async function main() {
  console.log('Starting database seeding...');

  // ==================== USERS ====================
  console.log('Creating users...');

  // Admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@badminton.com' },
    update: {},
    create: {
      email: 'admin@badminton.com',
      password: hashPassword('Admin@123'),
      name: 'Admin User',
      role: Role.ADMIN,
      isActive: true,
    },
  });
  console.log(`  Admin: ${admin.email}`);

  // Staff user
  const staff = await prisma.user.upsert({
    where: { email: 'staff@badminton.com' },
    update: {},
    create: {
      email: 'staff@badminton.com',
      password: hashPassword('Staff@123'),
      name: 'Staff User',
      role: Role.STAFF,
      isActive: true,
    },
  });
  console.log(`  Staff: ${staff.email}`);

  // Customer users
  const customers: User[] = [];
  for (let i = 1; i <= 3; i++) {
    const customer = await prisma.user.upsert({
      where: { email: `test${i}@test.com` },
      update: {},
      create: {
        email: `test${i}@test.com`,
        password: hashPassword('Test@123'),
        name: `Test Customer ${i}`,
        role: Role.CUSTOMER,
        isActive: true,
      },
    });
    customers.push(customer);
    console.log(`  Customer: ${customer.email}`);
  }

  // ==================== WALLETS ====================
  console.log('Creating wallets for customers...');

  for (const customer of customers) {
    await prisma.wallet.upsert({
      where: { userId: customer.id },
      update: {},
      create: {
        userId: customer.id,
        balance: 500000, // 500,000 VND initial balance
      },
    });
    console.log(`  Wallet for ${customer.email}: 500,000 VND`);
  }

  // ==================== COURTS ====================
  console.log('Creating courts...');

  const courts: Court[] = [];
  for (let i = 1; i <= 5; i++) {
    const court = await prisma.court.upsert({
      where: { id: i },
      update: {},
      create: {
        id: i,
        name: `Court ${i}`,
        description: `Badminton Court ${i} - Competition standard`,
        pricePerHour: 50000,
        isActive: true,
      },
    });
    courts.push(court);
    console.log(`  ${court.name}`);
  }

  // ==================== PRICING RULES ====================
  console.log('Creating pricing rules...');

  // Normal hours (6:00-17:00) - All days
  await prisma.pricingRule.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'Normal Hours',
      courtId: null, // Applies to all courts
      dayOfWeek: null, // All days
      startTime: '06:00:00',
      endTime: '17:00:00',
      pricePerHour: 50000,
      priority: 0,
      isActive: true,
    },
  });
  console.log('  Normal Hours (6:00-17:00): 50,000 VND/h');

  // Golden hours (17:00-21:00) - All days
  await prisma.pricingRule.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      name: 'Golden Hours',
      courtId: null,
      dayOfWeek: null,
      startTime: '17:00:00',
      endTime: '21:00:00',
      pricePerHour: 80000,
      priority: 1, // Higher priority than normal hours
      isActive: true,
    },
  });
  console.log('  Golden Hours (17:00-21:00): 80,000 VND/h');

  // Weekend - Saturday (dayOfWeek = 6)
  await prisma.pricingRule.upsert({
    where: { id: 3 },
    update: {},
    create: {
      id: 3,
      name: 'Weekend - Saturday',
      courtId: null,
      dayOfWeek: 6, // Saturday
      startTime: '06:00:00',
      endTime: '22:00:00',
      pricePerHour: 60000, // +10k so with base 50k
      priority: 2, // Higher priority than weekday rules
      isActive: true,
    },
  });
  console.log('  Weekend - Saturday: 60,000 VND/h');

  // Weekend - Sunday (dayOfWeek = 0)
  await prisma.pricingRule.upsert({
    where: { id: 4 },
    update: {},
    create: {
      id: 4,
      name: 'Weekend - Sunday',
      courtId: null,
      dayOfWeek: 0, // Sunday
      startTime: '06:00:00',
      endTime: '22:00:00',
      pricePerHour: 60000, // +10k
      priority: 2,
      isActive: true,
    },
  });
  console.log('  Weekend - Sunday: 60,000 VND/h');

  // Golden hours weekend (combined rule - higher price)
  await prisma.pricingRule.upsert({
    where: { id: 5 },
    update: {},
    create: {
      id: 5,
      name: 'Golden Hours Weekend - Saturday',
      courtId: null,
      dayOfWeek: 6,
      startTime: '17:00:00',
      endTime: '21:00:00',
      pricePerHour: 90000, // 80k + 10k weekend
      priority: 3, // Highest priority
      isActive: true,
    },
  });
  console.log('  Golden Hours Weekend - Saturday: 90,000 VND/h');

  await prisma.pricingRule.upsert({
    where: { id: 6 },
    update: {},
    create: {
      id: 6,
      name: 'Golden Hours Weekend - Sunday',
      courtId: null,
      dayOfWeek: 0,
      startTime: '17:00:00',
      endTime: '21:00:00',
      pricePerHour: 90000,
      priority: 3,
      isActive: true,
    },
  });
  console.log('  Golden Hours Weekend - Sunday: 90,000 VND/h');

  // ==================== SAMPLE BOOKINGS ====================
  console.log('Creating sample bookings...');

  // Get tomorrow's date for bookings
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  // Booking 1: Customer 1 books Court 1 from 8:00-10:00 tomorrow
  const booking1StartTime = new Date(tomorrow);
  booking1StartTime.setHours(8, 0, 0, 0);
  const booking1EndTime = new Date(tomorrow);
  booking1EndTime.setHours(10, 0, 0, 0);

  await prisma.booking.upsert({
    where: { bookingCode: 'TEST01' },
    update: {},
    create: {
      bookingCode: 'TEST01',
      courtId: courts[0].id,
      userId: customers[0].id,
      startTime: booking1StartTime,
      endTime: booking1EndTime,
      totalPrice: 100000, // 2 hours * 50000
      status: BookingStatus.CONFIRMED,
      type: BookingType.REGULAR,
      paymentMethod: PaymentMethod.WALLET,
      paymentStatus: PaymentStatus.PAID,
      createdBy: 'CUSTOMER',
    },
  });
  console.log(`  Booking TEST01: Court 1, ${booking1StartTime.toISOString()} - ${booking1EndTime.toISOString()}`);

  // Booking 2: Customer 2 books Court 1 from 10:00-12:00 tomorrow (adjacent to booking 1)
  const booking2StartTime = new Date(tomorrow);
  booking2StartTime.setHours(10, 0, 0, 0);
  const booking2EndTime = new Date(tomorrow);
  booking2EndTime.setHours(12, 0, 0, 0);

  await prisma.booking.upsert({
    where: { bookingCode: 'TEST02' },
    update: {},
    create: {
      bookingCode: 'TEST02',
      courtId: courts[0].id,
      userId: customers[1].id,
      startTime: booking2StartTime,
      endTime: booking2EndTime,
      totalPrice: 100000,
      status: BookingStatus.CONFIRMED,
      type: BookingType.REGULAR,
      paymentMethod: PaymentMethod.VNPAY,
      paymentStatus: PaymentStatus.PAID,
      createdBy: 'CUSTOMER',
    },
  });
  console.log(`  Booking TEST02: Court 1, ${booking2StartTime.toISOString()} - ${booking2EndTime.toISOString()}`);

  // Booking 3: Customer 3 books Court 2 from 8:00-10:00 tomorrow (same time, different court)
  await prisma.booking.upsert({
    where: { bookingCode: 'TEST03' },
    update: {},
    create: {
      bookingCode: 'TEST03',
      courtId: courts[1].id,
      userId: customers[2].id,
      startTime: booking1StartTime,
      endTime: booking1EndTime,
      totalPrice: 100000,
      status: BookingStatus.CONFIRMED,
      type: BookingType.REGULAR,
      paymentMethod: PaymentMethod.MOMO,
      paymentStatus: PaymentStatus.PAID,
      createdBy: 'CUSTOMER',
    },
  });
  console.log(`  Booking TEST03: Court 2, ${booking1StartTime.toISOString()} - ${booking1EndTime.toISOString()}`);

  // Booking 4: Guest booking by Staff on Court 3
  const booking4StartTime = new Date(tomorrow);
  booking4StartTime.setHours(14, 0, 0, 0);
  const booking4EndTime = new Date(tomorrow);
  booking4EndTime.setHours(16, 0, 0, 0);

  await prisma.booking.upsert({
    where: { bookingCode: 'TEST04' },
    update: {},
    create: {
      bookingCode: 'TEST04',
      courtId: courts[2].id,
      userId: null, // Guest booking
      guestName: 'Guest User',
      guestPhone: '0901234567',
      startTime: booking4StartTime,
      endTime: booking4EndTime,
      totalPrice: 100000,
      status: BookingStatus.CONFIRMED,
      type: BookingType.REGULAR,
      paymentMethod: PaymentMethod.CASH,
      paymentStatus: PaymentStatus.PAID,
      createdBy: 'STAFF',
      createdByStaffId: staff.id,
    },
  });
  console.log(`  Booking TEST04 (Guest): Court 3, ${booking4StartTime.toISOString()} - ${booking4EndTime.toISOString()}`);

  // Booking 5: Pending payment booking
  const booking5StartTime = new Date(tomorrow);
  booking5StartTime.setHours(18, 0, 0, 0);
  const booking5EndTime = new Date(tomorrow);
  booking5EndTime.setHours(20, 0, 0, 0);
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 15);

  await prisma.booking.upsert({
    where: { bookingCode: 'TEST05' },
    update: {},
    create: {
      bookingCode: 'TEST05',
      courtId: courts[3].id,
      userId: customers[0].id,
      startTime: booking5StartTime,
      endTime: booking5EndTime,
      totalPrice: 160000, // Golden hours 2h * 80000
      status: BookingStatus.PENDING_PAYMENT,
      type: BookingType.REGULAR,
      paymentStatus: PaymentStatus.UNPAID,
      createdBy: 'CUSTOMER',
      expiresAt: expiresAt,
    },
  });
  console.log(`  Booking TEST05 (Pending): Court 4, ${booking5StartTime.toISOString()} - ${booking5EndTime.toISOString()}`);

  // Booking 6: Maintenance block by Admin
  const booking6StartTime = new Date(tomorrow);
  booking6StartTime.setHours(6, 0, 0, 0);
  const booking6EndTime = new Date(tomorrow);
  booking6EndTime.setHours(22, 0, 0, 0);

  await prisma.booking.upsert({
    where: { bookingCode: 'MAINT1' },
    update: {},
    create: {
      bookingCode: 'MAINT1',
      courtId: courts[4].id,
      userId: admin.id,
      startTime: booking6StartTime,
      endTime: booking6EndTime,
      totalPrice: 0,
      status: BookingStatus.BLOCKED,
      type: BookingType.MAINTENANCE,
      paymentStatus: PaymentStatus.UNPAID,
      createdBy: 'ADMIN',
    },
  });
  console.log(`  Booking MAINT1 (Maintenance): Court 5, ${booking6StartTime.toISOString()} - ${booking6EndTime.toISOString()}`);

  // ==================== ADMIN ACTION LOG ====================
  console.log('Creating admin action log...');

  await prisma.adminAction.create({
    data: {
      adminId: admin.id,
      action: 'BLOCK_COURT',
      targetType: 'Court',
      targetId: courts[4].id,
      reason: 'Scheduled maintenance',
      metadata: { bookingCode: 'MAINT1' },
    },
  });
  console.log('  Admin action: BLOCK_COURT for Court 5');

  console.log('\nSeeding completed successfully!');
  console.log('\nSummary:');
  console.log('  - Users: 1 Admin, 1 Staff, 3 Customers');
  console.log('  - Courts: 5');
  console.log('  - Pricing Rules: 6');
  console.log('  - Bookings: 6 (including 1 maintenance block)');
  console.log('  - Wallets: 3 (for customers)');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
