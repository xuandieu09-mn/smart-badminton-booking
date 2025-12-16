import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, ProductCategory } from '@prisma/client';

@Controller('pos/products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Post()
  @Roles(Role.ADMIN)
  async createProduct(@Body() dto: CreateProductDto) {
    const product = await this.productsService.createProduct(dto);
    return {
      message: 'Product created successfully',
      product,
    };
  }

  @Get()
  @Roles(Role.STAFF, Role.ADMIN)
  async getAllProducts(@Query('category') category?: ProductCategory) {
    const products = await this.productsService.getAllProducts(category);
    return { products };
  }

  @Get(':id')
  @Roles(Role.STAFF, Role.ADMIN)
  async getProductById(@Param('id', ParseIntPipe) id: number) {
    const product = await this.productsService.getProductById(id);
    return { product };
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  async updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
  ) {
    const product = await this.productsService.updateProduct(id, dto);
    return {
      message: 'Product updated successfully',
      product,
    };
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async deleteProduct(@Param('id', ParseIntPipe) id: number) {
    await this.productsService.deleteProduct(id);
    return {
      message: 'Product deleted successfully',
    };
  }

  @Post(':id/stock')
  @Roles(Role.ADMIN)
  async adjustStock(
    @Param('id', ParseIntPipe) id: number,
    @Body('adjustment', ParseIntPipe) adjustment: number,
  ) {
    const product = await this.productsService.adjustStock(id, adjustment);
    return {
      message: 'Stock adjusted successfully',
      product,
    };
  }
}
