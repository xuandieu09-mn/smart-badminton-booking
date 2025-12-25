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
import { GenerateInvoiceDto } from './dto/invoice.dto';
import { InvoiceService } from './invoice.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('pos/sales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalesController {
  constructor(
    private salesService: SalesService,
    private invoiceService: InvoiceService,
  ) {}

  @Post('generate-invoice')
  @Roles(Role.STAFF, Role.ADMIN)
  async generateInvoice(@Body() dto: GenerateInvoiceDto, @Req() req: any) {
    const staffId = req.user?.sub || req.user?.id;
    if (!staffId) {
      throw new Error('Staff ID not found in request');
    }

    const invoice = await this.invoiceService.generateInvoicePreview(dto, staffId);
    const printFormat = this.invoiceService.formatInvoiceForPrint(invoice);

    return {
      message: 'Invoice generated successfully',
      invoice,
      printFormat,
    };
  }

  @Post()
  @Roles(Role.STAFF, Role.ADMIN)
  async createSale(@Body() dto: CreateSaleDto, @Req() req: any) {
    const staffId = req.user?.sub || req.user?.id;
    if (!staffId) {
      throw new Error('Staff ID not found in request');
    }
    const sale = await this.salesService.createSale(dto, staffId);
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
