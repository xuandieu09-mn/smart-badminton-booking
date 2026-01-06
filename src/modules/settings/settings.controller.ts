import { Controller, Get, Put, Body, UseGuards, Post } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateOperatingHoursDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('settings')
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  /**
   * GET /settings/operating-hours
   * Get current operating hours (public - everyone can see)
   */
  @Public()
  @Get('operating-hours')
  async getOperatingHours() {
    return this.settingsService.getOperatingHours();
  }

  /**
   * PUT /settings/operating-hours
   * Update operating hours (Admin only)
   */
  @Put('operating-hours')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async updateOperatingHours(
    @Body() dto: UpdateOperatingHoursDto,
    @CurrentUser() user: any,
  ) {
    const result = await this.settingsService.updateOperatingHours(
      dto,
      user.email || user.name || 'Admin',
    );

    return {
      message: 'Cập nhật giờ hoạt động thành công',
      data: result,
    };
  }

  /**
   * POST /settings/operating-hours/reset
   * Reset to default hours: 6:00 - 21:00 (Admin only)
   */
  @Post('operating-hours/reset')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async resetOperatingHours(@CurrentUser() user: any) {
    const result = await this.settingsService.resetOperatingHours(
      user.email || user.name || 'Admin',
    );

    return {
      message: 'Đặt lại giờ hoạt động về mặc định (6:00 - 21:00)',
      data: result,
    };
  }
}
