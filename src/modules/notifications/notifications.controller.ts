import {
  Controller,
  Post,
  Get,
  Patch,
  Query,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
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

  /**
   * 🔔 Get user notifications
   * Usage: GET /api/notifications?limit=20
   */
  @Get()
  async getUserNotifications(@Request() req, @Query('limit') limit?: string) {
    const userId = req.user.userId;
    const limitNum = limit ? parseInt(limit) : 20;
    return this.notificationsService.getUserNotifications(userId, limitNum);
  }

  /**
   * 🔔 Get unread count
   * Usage: GET /api/notifications/unread-count
   */
  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    const userId = req.user.userId;
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  /**
   * 🔔 Mark notification as read
   * Usage: PATCH /api/notifications/:id/read
   */
  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req) {
    const userId = req.user.userId;
    return this.notificationsService.markAsRead(parseInt(id), userId);
  }

  /**
   * 🔔 Mark all as read
   * Usage: PATCH /api/notifications/read-all
   */
  @Patch('read-all')
  async markAllAsRead(@Request() req) {
    const userId = req.user.userId;
    return this.notificationsService.markAllAsRead(userId);
  }
}
