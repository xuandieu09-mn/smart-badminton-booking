import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSaleDto } from './dto/sale.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(private prisma: PrismaService) {}

  async createSale(dto: CreateSaleDto, staffId: number) {
    const saleCode = await this.generateSaleCode();

    return this.prisma.$transaction(async (tx) => {
      let totalAmount = new Decimal(0);
      const saleItems = [];

      for (const item of dto.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundException(`Product #${item.productId} not found`);
        }

        if (!product.isActive) {
          throw new BadRequestException(
            `Product "${product.name}" is not available`,
          );
        }

        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}`,
          );
        }

        await tx.product.update({
          where: { id: product.id },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });

        const subtotal = new Decimal(product.price).mul(item.quantity);
        totalAmount = totalAmount.add(subtotal);

        saleItems.push({
          productId: product.id,
          quantity: item.quantity,
          unitPrice: product.price,
          subtotal,
        });
      }

      const sale = await tx.sale.create({
        data: {
          saleCode,
          totalAmount,
          paymentMethod: dto.paymentMethod || 'CASH',
          staffId,
          customerName: dto.customerName,
          bookingId: dto.bookingId,
          items: {
            create: saleItems,
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          staff: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      this.logger.log(
        `✅ Sale ${sale.saleCode} created by staff #${staffId}. Total: ${totalAmount.toString()} VND`,
      );

      return sale;
    });
  }

  async getSaleById(id: number) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        staff: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!sale) {
      throw new NotFoundException(`Sale #${id} not found`);
    }

    return sale;
  }

  async getAllSales(startDate?: Date, endDate?: Date) {
    return this.prisma.sale.findMany({
      where: {
        ...(startDate &&
          endDate && {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        staff: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getDailySalesReport(date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const sales = await this.getAllSales(startOfDay, endOfDay);

    const totalRevenue = sales.reduce(
      (sum, sale) => sum.add(new Decimal(sale.totalAmount)),
      new Decimal(0),
    );

    return {
      date: date.toISOString().split('T')[0],
      salesCount: sales.length,
      totalRevenue: Number(totalRevenue),
      sales,
    };
  }

  private async generateSaleCode(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    const prefix = `POS${year}${month}${day}`;

    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const randomSuffix = Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase()
        .padEnd(4, '0');

      const saleCode = `${prefix}-${randomSuffix}`;

      const existing = await this.prisma.sale.findUnique({
        where: { saleCode },
      });

      if (!existing) {
        return saleCode;
      }

      attempts++;
    }

    const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
    return `${prefix}-${timestamp}`;
  }
}
