import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/sale.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('pos/sales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalesController {
  constructor(private salesService: SalesService) {}

  @Post()
  @Roles(Role.STAFF, Role.ADMIN)
  async createSale(@Body() dto: CreateSaleDto, @Req() req: any) {
    const sale = await this.salesService.createSale(dto, req.user.sub);
    return {
      message: 'Sale created successfully',
      sale,
    };
  }

  @Get()
  @Roles(Role.STAFF, Role.ADMIN)
  async getAllSales(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const sales = await this.salesService.getAllSales(start, end);
    return { sales };
  }

  @Get('report/daily')
  @Roles(Role.STAFF, Role.ADMIN)
  async getDailySalesReport(@Query('date') date?: string) {
    const reportDate = date ? new Date(date) : new Date();
    const report = await this.salesService.getDailySalesReport(reportDate);
    return report;
  }

  @Get(':id')
  @Roles(Role.STAFF, Role.ADMIN)
  async getSaleById(@Param('id', ParseIntPipe) id: number) {
    const sale = await this.salesService.getSaleById(id);
    return { sale };
  }
}
