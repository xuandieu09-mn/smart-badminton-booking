import { PrismaClient, ProductCategory } from '@prisma/client';

const prisma = new PrismaClient();

const products = [
  // Shuttlecocks
  {
    name: 'Yonex AS-50',
    description: 'Ống cầu Yonex AS-50 chính hãng, bay chuẩn',
    category: ProductCategory.SHUTTLECOCK,
    price: 180000,
    stock: 50,
  },
  {
    name: 'Yonex AS-30',
    description: 'Ống cầu Yonex AS-30 tập luyện',
    category: ProductCategory.SHUTTLECOCK,
    price: 150000,
    stock: 30,
  },
  {
    name: 'Victor Gold Medal',
    description: 'Ống cầu Victor Gold Medal chuyên nghiệp',
    category: ProductCategory.SHUTTLECOCK,
    price: 200000,
    stock: 20,
  },

  // Beverages
  {
    name: 'Nước suối Aquafina',
    description: 'Chai 500ml',
    category: ProductCategory.BEVERAGE,
    price: 10000,
    stock: 100,
  },
  {
    name: 'Nước tăng lực Red Bull',
    description: 'Lon 250ml',
    category: ProductCategory.BEVERAGE,
    price: 15000,
    stock: 50,
  },
  {
    name: 'Gatorade',
    description: 'Chai 500ml',
    category: ProductCategory.BEVERAGE,
    price: 20000,
    stock: 40,
  },
  {
    name: 'Nước cam ép',
    description: 'Ly 300ml tươi mát',
    category: ProductCategory.BEVERAGE,
    price: 25000,
    stock: 30,
  },

  // Accessories
  {
    name: 'Quấn cán Yonex AC102',
    description: 'Quấn cán chống trơn cao cấp',
    category: ProductCategory.ACCESSORY,
    price: 40000,
    stock: 60,
  },
  {
    name: 'Băng quấn cổ tay',
    description: 'Băng thấm mồ hôi',
    category: ProductCategory.ACCESSORY,
    price: 15000,
    stock: 80,
  },
  {
    name: 'Túi đựng vợt Yonex',
    description: 'Túi đựng 2-3 cây vợt',
    category: ProductCategory.ACCESSORY,
    price: 350000,
    stock: 15,
  },
  {
    name: 'Dây cước Yonex BG65',
    description: 'Dây căng vợt chính hãng',
    category: ProductCategory.ACCESSORY,
    price: 120000,
    stock: 25,
  },

  // Equipment
  {
    name: 'Vợt Yonex Nanoray',
    description: 'Vợt tập luyện/dự phòng',
    category: ProductCategory.EQUIPMENT,
    price: 800000,
    stock: 10,
  },
  {
    name: 'Giày Yonex SHB 65Z',
    description: 'Giày cầu lông chuyên nghiệp',
    category: ProductCategory.EQUIPMENT,
    price: 1500000,
    stock: 8,
  },

  // Other
  {
    name: 'Khăn lau mặt',
    description: 'Khăn thấm hút tốt',
    category: ProductCategory.OTHER,
    price: 30000,
    stock: 50,
  },
  {
    name: 'Dầu xoa bóp',
    description: 'Dầu massage thư giãn cơ bắp',
    category: ProductCategory.OTHER,
    price: 50000,
    stock: 20,
  },
];

async function seedProducts() {
  console.log('🌱 Seeding products...');

  for (const product of products) {
    const created = await prisma.product.create({
      data: product,
    });
    console.log(`✅ Created: ${created.name} (${created.category})`);
  }

  console.log(`✅ ${products.length} products seeded successfully!`);
}

seedProducts()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
