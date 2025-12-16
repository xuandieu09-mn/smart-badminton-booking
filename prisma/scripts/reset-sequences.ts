// Reset PostgreSQL sequences to match current max IDs
// Run this after seeding to fix "Unique constraint failed" errors

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetSequences() {
  console.log('🔄 Resetting database sequences...\n');

  try {
    // Reset Court sequence
    await prisma.$executeRawUnsafe(`
      SELECT setval(
        pg_get_serial_sequence('"Court"', 'id'),
        COALESCE((SELECT MAX(id) FROM "Court"), 1),
        true
      );
    `);
    console.log('✅ Court sequence reset');

    // Reset User sequence
    await prisma.$executeRawUnsafe(`
      SELECT setval(
        pg_get_serial_sequence('"User"', 'id'),
        COALESCE((SELECT MAX(id) FROM "User"), 1),
        true
      );
    `);
    console.log('✅ User sequence reset');

    // Reset Booking sequence
    await prisma.$executeRawUnsafe(`
      SELECT setval(
        pg_get_serial_sequence('"Booking"', 'id'),
        COALESCE((SELECT MAX(id) FROM "Booking"), 1),
        true
      );
    `);
    console.log('✅ Booking sequence reset');

    // Reset Payment sequence
    await prisma.$executeRawUnsafe(`
      SELECT setval(
        pg_get_serial_sequence('"Payment"', 'id'),
        COALESCE((SELECT MAX(id) FROM "Payment"), 1),
        true
      );
    `);
    console.log('✅ Payment sequence reset');

    // Reset Product sequence
    await prisma.$executeRawUnsafe(`
      SELECT setval(
        pg_get_serial_sequence('"Product"', 'id'),
        COALESCE((SELECT MAX(id) FROM "Product"), 1),
        true
      );
    `);
    console.log('✅ Product sequence reset');

    // Reset PricingRule sequence
    await prisma.$executeRawUnsafe(`
      SELECT setval(
        pg_get_serial_sequence('"PricingRule"', 'id'),
        COALESCE((SELECT MAX(id) FROM "PricingRule"), 1),
        true
      );
    `);
    console.log('✅ PricingRule sequence reset');

    // Reset Wallet sequence
    await prisma.$executeRawUnsafe(`
      SELECT setval(
        pg_get_serial_sequence('"Wallet"', 'id'),
        COALESCE((SELECT MAX(id) FROM "Wallet"), 1),
        true
      );
    `);
    console.log('✅ Wallet sequence reset');

    console.log('\n🎉 All sequences reset successfully!');
    console.log('You can now create new records without ID conflicts.\n');
  } catch (error) {
    console.error('❌ Error resetting sequences:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

resetSequences()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
