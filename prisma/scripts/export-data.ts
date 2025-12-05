import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function exportData() {
  const users = await prisma.user.findMany();
  const bookings = await prisma.booking.findMany();
  const courts = await prisma.court.findMany();

  const data = {
    users,
    bookings,
    courts,
  };

  fs.writeFileSync('data-export.json', JSON.stringify(data, null, 2));
  console.log('✅ Exported to data-export.json');
}

exportData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
