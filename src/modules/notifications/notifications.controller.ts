import { Controller, Post, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  /**
   * 📧 Test email configuration (Admin only)
   * Usage: POST /api/notifications/test-email?to=your-email@gmail.com
   */
  @Post('test-email')
  @Roles(Role.ADMIN)
  async testEmail(@Query('to') toEmail: string) {
    if (!toEmail) {
      return {
        success: false,
        message:
          'Please provide email address in query param: ?to=email@example.com',
      };
    }

    return this.notificationsService.sendTestEmail(toEmail);
  }
}
