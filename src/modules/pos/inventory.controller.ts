import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { InventoryService } from './inventory.service';
import { InventoryActionType } from '@prisma/client';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  // ==================== RESTOCK ====================
  @Post('restock')
  @Roles('ADMIN')
  async restock(
    @Body() body: { productId: number; quantity: number },
    @Req() req: any,
  ) {
    return this.inventoryService.restockProduct(
      body.productId,
      body.quantity,
      req.user.id,
    );
  }

  // ==================== UPDATE PRICE ====================
  @Post('update-price')
  @Roles('ADMIN')
  async updatePrice(
    @Body() body: { productId: number; newPrice: number },
    @Req() req: any,
  ) {
    return this.inventoryService.updateProductPrice(
      body.productId,
      body.newPrice,
      req.user.id,
    );
  }

  // ==================== REPORT DAMAGE ====================
  @Post('damage')
  @Roles('ADMIN')
  async reportDamage(
    @Body() body: { productId: number; quantity: number; reason: string },
    @Req() req: any,
  ) {
    return this.inventoryService.reportDamage(
      body.productId,
      body.quantity,
      body.reason,
      req.user.id,
    );
  }

  // ==================== GET HISTORY ====================
  @Get('history')
  @Roles('ADMIN')
  async getHistory(
    @Query('productId', new ParseIntPipe({ optional: true }))
    productId?: number,
    @Query('type') type?: InventoryActionType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.inventoryService.getInventoryHistory({
      productId,
      type,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit,
    });
  }

  // ==================== GET SALES HISTORY ====================
  @Get('sales')
  @Roles('ADMIN')
  async getSalesHistory(
    @Query('staffId', new ParseIntPipe({ optional: true })) staffId?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.inventoryService.getSalesHistory({
      staffId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit,
    });
  }

  // ==================== GET STATS ====================
  @Get('stats')
  @Roles('ADMIN')
  async getStats() {
    return this.inventoryService.getInventoryStats();
  }
}
