// prisma/scripts/fix-paid-amount.ts
// Script to fix paidAmount for existing bookings that were paid but have paidAmount = 0

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Starting paidAmount fix script...\n');

  // Find all bookings that are CONFIRMED/CHECKED_IN/COMPLETED with PAID status but paidAmount = 0
  const brokenBookings = await prisma.booking.findMany({
    where: {
      paymentStatus: 'PAID',
      status: {
        in: ['CONFIRMED', 'CHECKED_IN', 'COMPLETED'],
      },
      paidAmount: 0, // Bug: Should have been updated when payment was made
    },
    select: {
      id: true,
      bookingCode: true,
      totalPrice: true,
      paidAmount: true,
      paymentMethod: true,
      status: true,
      paymentStatus: true,
      createdAt: true,
    },
  });

  console.log(
    `📊 Found ${brokenBookings.length} bookings with paidAmount = 0 but status = PAID\n`,
  );

  if (brokenBookings.length === 0) {
    console.log('✅ No broken bookings found. All data is consistent!');
    return;
  }

  console.log('Bookings to fix:');
  console.log('─'.repeat(80));

  for (const booking of brokenBookings) {
    console.log(
      `  #${booking.bookingCode} | ` +
        `totalPrice: ${Number(booking.totalPrice).toLocaleString()}đ | ` +
        `paidAmount: ${Number(booking.paidAmount).toLocaleString()}đ | ` +
        `method: ${booking.paymentMethod} | ` +
        `status: ${booking.status}`,
    );
  }

  console.log('─'.repeat(80));
  console.log('\n🔄 Fixing paidAmount for all affected bookings...\n');

  // Update all broken bookings: set paidAmount = totalPrice
  const updateResult = await prisma.booking.updateMany({
    where: {
      id: {
        in: brokenBookings.map((b) => b.id),
      },
    },
    data: {
      paidAmount: {
        // This is a workaround - we need to update each booking individually
        // because Prisma doesn't support setting a field to another field's value in updateMany
      },
    },
  });

  // Actually, we need to update each booking individually
  let fixedCount = 0;
  for (const booking of brokenBookings) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        paidAmount: booking.totalPrice,
      },
    });
    fixedCount++;
    console.log(
      `  ✅ Fixed #${booking.bookingCode}: paidAmount = ${Number(booking.totalPrice).toLocaleString()}đ`,
    );
  }

  console.log(`\n🎉 Successfully fixed ${fixedCount} bookings!`);

  // Verify the fix
  const stillBroken = await prisma.booking.count({
    where: {
      paymentStatus: 'PAID',
      status: {
        in: ['CONFIRMED', 'CHECKED_IN', 'COMPLETED'],
      },
      paidAmount: 0,
    },
  });

  if (stillBroken === 0) {
    console.log(
      '✅ Verification passed: All paid bookings now have correct paidAmount',
    );
  } else {
    console.log(
      `⚠️ Warning: ${stillBroken} bookings still have paidAmount = 0`,
    );
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
