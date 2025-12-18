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
   */
  @Post('test-email')
  @Roles(Role.ADMIN)
  async testEmail(@Query('to') toEmail: string) {
    if (!toEmail) {
      return {
        success: false,
        message: 'Please provide email: ?to=email@example.com',
      };
    }
    return this.notificationsService.sendTestEmail(toEmail);
  }

  /**
   * 🔔 Get user notifications (for CUSTOMER)
   * For STAFF/ADMIN: also includes role-based notifications
   */
  @Get()
  async getUserNotifications(@Request() req, @Query('limit') limit?: string) {
    const userId = req.user.id;
    const userRole = req.user.role;
    const limitNum = limit ? parseInt(limit) : 20;

    // Get user-specific notifications
    const userNotifications =
      await this.notificationsService.getUserNotifications(userId, limitNum);

    // For Staff/Admin, also get role-based notifications
    if (userRole === Role.STAFF || userRole === Role.ADMIN) {
      const roleNotifications =
        await this.notificationsService.getRoleNotifications(
          userRole,
          limitNum,
        );

      // Merge and sort by createdAt
      const allNotifications = [...userNotifications, ...roleNotifications]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, limitNum);

      return allNotifications;
    }

    return userNotifications;
  }

  /**
   * 🔔 Get role-based notifications (STAFF/ADMIN only)
   * These are notifications with userId = null
   */
  @Get('role')
  @Roles(Role.STAFF, Role.ADMIN)
  async getRoleNotifications(@Request() req, @Query('limit') limit?: string) {
    const userRole = req.user.role;
    const limitNum = limit ? parseInt(limit) : 50;
    return this.notificationsService.getRoleNotifications(userRole, limitNum);
  }

  /**
   * 🔔 Get unread count
   */
  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    const userId = req.user.id;
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  /**
   * 🔔 Mark notification as read
   */
  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;
    return this.notificationsService.markAsRead(parseInt(id), userId);
  }

  /**
   * 🔔 Mark all as read
   */
  @Patch('read-all')
  async markAllAsRead(@Request() req) {
    const userId = req.user.id;
    return this.notificationsService.markAllAsRead(userId);
  }
}
