import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { ProductCategory } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async createProduct(dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        price: dto.price,
        stock: dto.stock,
        imageUrl: dto.imageUrl,
      },
    });
  }

  async getAllProducts(category?: ProductCategory) {
    return this.prisma.product.findMany({
      where: {
        isActive: true,
        ...(category && { category }),
      },
      orderBy: { name: 'asc' },
    });
  }

  async getProductById(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product #${id} not found`);
    }

    return product;
  }

  async updateProduct(id: number, dto: UpdateProductDto) {
    await this.getProductById(id);

    return this.prisma.product.update({
      where: { id },
      data: dto,
    });
  }

  async deleteProduct(id: number) {
    await this.getProductById(id);

    return this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async adjustStock(id: number, adjustment: number) {
    const product = await this.getProductById(id);

    if (product.stock + adjustment < 0) {
      throw new BadRequestException('Insufficient stock');
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        stock: {
          increment: adjustment,
        },
      },
    });
  }
}
