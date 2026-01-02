import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  async getSummary(@Query('range') range: string = '30d') {
    return this.reportsService.getSummary(range);
  }

  @Get('revenue')
  async getRevenue(@Query('range') range: string = '30d') {
    return this.reportsService.getRevenueTrend(range);
  }

  @Get('court-revenue')
  async getCourtRevenue(@Query('range') range: string = '30d') {
    return this.reportsService.getCourtRevenue(range);
  }

  @Get('peak-hours')
  async getPeakHours(@Query('range') range: string = '30d') {
    return this.reportsService.getPeakHours(range);
  }

  @Get('chat-analytics')
  async getChatAnalytics(@Query('range') range: string = '30d') {
    return this.reportsService.getChatAnalytics(range);
  }
}
