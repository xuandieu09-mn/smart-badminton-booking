import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProductsService } from './products.service';
import { SalesService } from './sales.service';
import { InventoryService } from './inventory.service';
import { InvoiceService } from './invoice.service';
import { ProductsController } from './products.controller';
import { SalesController } from './sales.controller';
import { InventoryController } from './inventory.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [ProductsController, SalesController, InventoryController],
  providers: [ProductsService, SalesService, InventoryService, InvoiceService],
  exports: [ProductsService, SalesService, InventoryService, InvoiceService],
})
export class PosModule {}
