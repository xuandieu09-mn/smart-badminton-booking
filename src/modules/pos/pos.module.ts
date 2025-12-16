import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProductsService } from './products.service';
import { SalesService } from './sales.service';
import { ProductsController } from './products.controller';
import { SalesController } from './sales.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ProductsController, SalesController],
  providers: [ProductsService, SalesService],
  exports: [ProductsService, SalesService],
})
export class PosModule {}
