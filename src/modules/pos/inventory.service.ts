import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryActionType } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  // ==================== RESTOCK (Nhập hàng) ====================
  async restockProduct(
    productId: number,
    quantity: number,
    performedBy: number,
  ) {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be positive');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Update stock
    const updatedProduct = await this.prisma.product.update({
      where: { id: productId },
      data: { stock: { increment: quantity } },
    });

    // Log action
    await this.prisma.inventoryAction.create({
      data: {
        productId,
        type: InventoryActionType.RESTOCK,
        quantityChange: quantity,
        performedBy,
      },
    });

    return {
      message: 'Restock successful',
      product: updatedProduct,
    };
  }

  // ==================== UPDATE PRICE (Sửa giá) ====================
  async updateProductPrice(
    productId: number,
    newPrice: number,
    performedBy: number,
  ) {
    if (newPrice < 0) {
      throw new BadRequestException('Price cannot be negative');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const oldPrice = product.price;

    // Update price
    const updatedProduct = await this.prisma.product.update({
      where: { id: productId },
      data: { price: newPrice },
    });

    // Log action
    await this.prisma.inventoryAction.create({
      data: {
        productId,
        type: InventoryActionType.PRICE_UPDATE,
        oldPrice,
        newPrice,
        performedBy,
      },
    });

    return {
      message: 'Price updated successfully',
      product: updatedProduct,
      oldPrice,
      newPrice,
    };
  }

  // ==================== DAMAGE (Hủy hàng do hư tổn) ====================
  async reportDamage(
    productId: number,
    quantity: number,
    reason: string,
    performedBy: number,
  ) {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be positive');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.stock < quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${product.stock}`,
      );
    }

    // Decrease stock
    const updatedProduct = await this.prisma.product.update({
      where: { id: productId },
      data: { stock: { decrement: quantity } },
    });

    // Log action
    await this.prisma.inventoryAction.create({
      data: {
        productId,
        type: InventoryActionType.DAMAGE,
        quantityChange: -quantity,
        reason,
        performedBy,
      },
    });

    return {
      message: 'Damage reported successfully',
      product: updatedProduct,
      damagedQuantity: quantity,
      reason,
    };
  }

  // ==================== GET INVENTORY HISTORY ====================
  async getInventoryHistory(filters?: {
    productId?: number;
    type?: InventoryActionType;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    const where: any = {};

    if (filters?.productId) {
      where.productId = filters.productId;
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const actions = await this.prisma.inventoryAction.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            category: true,
            price: true,
            stock: true,
          },
        },
        performedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        sale: {
          select: {
            id: true,
            saleCode: true,
            totalAmount: true,
            customerName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 100,
    });

    return {
      actions,
      total: actions.length,
    };
  }

  // ==================== GET SALES HISTORY ====================
  async getSalesHistory(filters?: {
    staffId?: number;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    const where: any = {};

    if (filters?.staffId) {
      where.staffId = filters.staffId;
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const sales = await this.prisma.sale.findMany({
      where,
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                category: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 100,
    });

    return {
      sales,
      total: sales.length,
      totalRevenue: sales.reduce(
        (sum, sale) => sum + Number(sale.totalAmount),
        0,
      ),
    };
  }

  // ==================== GET INVENTORY STATS ====================
  async getInventoryStats() {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
    });

    const totalProducts = products.length;
    const lowStock = products.filter((p) => p.stock < 10).length;
    const outOfStock = products.filter((p) => p.stock === 0).length;
    const totalValue = products.reduce(
      (sum, p) => sum + Number(p.price) * p.stock,
      0,
    );

    // Recent actions (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentRestocks = await this.prisma.inventoryAction.count({
      where: {
        type: InventoryActionType.RESTOCK,
        createdAt: { gte: sevenDaysAgo },
      },
    });

    const recentDamages = await this.prisma.inventoryAction.count({
      where: {
        type: InventoryActionType.DAMAGE,
        createdAt: { gte: sevenDaysAgo },
      },
    });

    const recentSales = await this.prisma.sale.count({
      where: {
        createdAt: { gte: sevenDaysAgo },
      },
    });

    return {
      totalProducts,
      lowStock,
      outOfStock,
      totalValue,
      recentActivity: {
        restocks: recentRestocks,
        damages: recentDamages,
        sales: recentSales,
      },
    };
  }
}
