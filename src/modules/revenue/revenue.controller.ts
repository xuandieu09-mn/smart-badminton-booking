import { Controller, Get, Post, Query, UseGuards, Req } from '@nestjs/common';
import { RevenueService } from './revenue.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('revenue')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RevenueController {
  constructor(private revenueService: RevenueService) {}

  @Get('daily')
  @Roles(Role.STAFF, Role.ADMIN)
  async getDailyRevenue(@Query('date') date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    return this.revenueService.getDailyRevenue(targetDate);
  }

  @Get('shift')
  @Roles(Role.STAFF, Role.ADMIN)
  async getShiftRevenue(@Req() req: any) {
    return this.revenueService.getShiftRevenue(req.user.sub);
  }

  @Post('close-shift')
  @Roles(Role.STAFF)
  async closeShift(@Req() req: any) {
    return this.revenueService.closeShift(req.user.sub);
  }
}
