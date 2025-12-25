import { Controller, Get, Post, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { RevenueService } from './revenue.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('revenue')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RevenueController {
  constructor(private revenueService: RevenueService) {}

  // Typed request with JWT payload
  private getUserId(req: Request): number {
    const user = (req as Request & { user?: { sub?: number } }).user;
    return typeof user?.sub === 'number' ? user.sub : Number(user?.sub);
  }

  /**
   * 📊 GET /api/revenue/summary?date=YYYY-MM-DD
   * Returns: { bookingRevenue, posRevenue, refundDeduction, total }
   */
  @Get('summary')
  @Roles(Role.STAFF, Role.ADMIN)
  async getRevenueSummary(@Query('date') date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    return this.revenueService.getRevenueSummary(targetDate);
  }

  @Get('daily')
  @Roles(Role.STAFF, Role.ADMIN)
  async getDailyRevenue(@Query('date') date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    return this.revenueService.getDailyRevenue(targetDate);
  }

  @Get('shift')
  @Roles(Role.STAFF, Role.ADMIN)
  async getShiftRevenue(@Req() req: Request) {
    return this.revenueService.getShiftRevenue(this.getUserId(req));
  }

  @Post('close-shift')
  @Roles(Role.STAFF)
  async closeShift(@Req() req: Request) {
    return this.revenueService.closeShift(this.getUserId(req));
  }
}
