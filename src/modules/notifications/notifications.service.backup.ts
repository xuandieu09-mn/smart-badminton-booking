import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { EMAIL_QUEUE, EMAIL_JOBS } from './queue.constants';
import { SendEmailDto, SendEmailJobData } from './dto/send-email.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../../common/websocket/events.gateway';
import { NotificationType, Role } from '@prisma/client';

interface CreateNotificationDto {
  userId?: number | null;
  title: string;
  message: string;
  type: NotificationType;
  metadata?: any;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter;
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor(
    @InjectQueue(EMAIL_QUEUE) private emailQueue: Queue<SendEmailJobData>,
    private configService: ConfigService,
    private prisma: PrismaService,
    @Inject(forwardRef(() => EventsGateway))
    private eventsGateway: EventsGateway,
  ) {
    this.initializeEmailTransporter();
    this.loadEmailTemplates();
  }

  /**
   * Initialize Nodemailer transporter
   */
  private initializeEmailTransporter() {
    const emailEnabled =
      this.configService.get<string>('EMAIL_ENABLED', 'false') === 'true';

    if (!emailEnabled) {
      this.logger.warn(
        'Email notifications are DISABLED. Set EMAIL_ENABLED=true to enable.',
      );
      return;
    }

    const emailHost = this.configService.get<string>('EMAIL_HOST');
    const emailPort = this.configService.get<number>('EMAIL_PORT', 587);
    const emailUser = this.configService.get<string>('EMAIL_USER');
    const emailPass = this.configService.get<string>('EMAIL_PASS');
    const emailFrom = this.configService.get<string>('EMAIL_FROM');

    if (!emailHost || !emailUser || !emailPass) {
      this.logger.error(
        'Email configuration is incomplete. Please set EMAIL_HOST, EMAIL_USER, EMAIL_PASS',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: emailHost,
      port: emailPort,
      secure: emailPort === 465, // true for 465, false for other ports
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    this.logger.log(`Email transporter initialized: ${emailFrom}`);
  }

  /**
   * Load Handlebars email templates
   */
  private loadEmailTemplates() {
    const templatesDir = path.join(__dirname, 'templates');

    if (!fs.existsSync(templatesDir)) {
      this.logger.warn(`Templates directory not found: ${templatesDir}`);
      return;
    }

    const templateFiles = [
      'booking-confirmation.hbs',
      'booking-cancelled.hbs',
      'payment-success.hbs',
    ];

    templateFiles.forEach((filename) => {
      const templatePath = path.join(templatesDir, filename);
      if (fs.existsSync(templatePath)) {
        const templateSource = fs.readFileSync(templatePath, 'utf-8');
        const template = handlebars.compile(templateSource);
        const templateName = filename.replace('.hbs', '');
        this.templates.set(templateName, template);
        this.logger.log(`Loaded email template: ${templateName}`);
      } else {
        this.logger.warn(`Template not found: ${templatePath}`);
      }
    });
  }

  /**
   * Queue email for async sending
   */
  async queueEmail(data: SendEmailJobData): Promise<void> {
    try {
      await this.emailQueue.add(EMAIL_JOBS.SEND_EMAIL, data, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000, // 5s → 10s → 20s
        },
        removeOnComplete: true,
        removeOnFail: false,
      });

      this.logger.log(`Email queued for ${data.to} - ${data.subject}`);
    } catch (error) {
      this.logger.error(`Failed to queue email: ${error.message}`, error.stack);
    }
  }

  /**
   * Send email directly (used by processor)
   */
  async sendEmail(dto: SendEmailDto): Promise<boolean> {
    const emailEnabled =
      this.configService.get<string>('EMAIL_ENABLED', 'false') === 'true';

    if (!emailEnabled) {
      this.logger.warn(
        `Email sending skipped (disabled): ${dto.subject} to ${dto.to}`,
      );
      return false;
    }

    if (!this.transporter) {
      this.logger.error('Email transporter not initialized');
      return false;
    }

    try {
      // Get template
      const template = this.templates.get(dto.template);
      if (!template) {
        this.logger.error(`Template not found: ${dto.template}`);
        return false;
      }

      // Compile HTML from template
      const html = template(dto.context);

      // Send email
      const emailFrom = this.configService.get<string>(
        'EMAIL_FROM',
        'noreply@badminton.com',
      );

      const info = await this.transporter.sendMail({
        from: `"Smart Badminton Booking" <${emailFrom}>`,
        to: dto.to,
        subject: dto.subject,
        html: html,
      });

      this.logger.log(
        `Email sent successfully to ${dto.to} - MessageID: ${info.messageId}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${dto.to}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Send booking confirmation email
   */
  async sendBookingConfirmation(
    userEmail: string,
    bookingData: {
      bookingId: number;
      customerName: string;
      bookingCode: string;
      courtName: string;
      startTime: Date;
      endTime: Date;
      totalPrice: number;
      paymentMethod: string;
      qrCode?: string;
    },
  ): Promise<void> {
    const emailData: SendEmailJobData = {
      bookingId: bookingData.bookingId,
      to: userEmail,
      subject: `Xác nhận đặt sân - ${bookingData.bookingCode}`,
      template: 'booking-confirmation',
      context: {
        customerName: bookingData.customerName,
        bookingCode: bookingData.bookingCode,
        courtName: bookingData.courtName,
        startTime: bookingData.startTime.toLocaleString('vi-VN'),
        endTime: bookingData.endTime.toLocaleString('vi-VN'),
        totalPrice: bookingData.totalPrice,
        paymentMethod: bookingData.paymentMethod,
        qrCode: bookingData.qrCode,
      },
    };

    await this.queueEmail(emailData);
  }

  /**
   * Send payment success email
   */
  async sendPaymentSuccess(
    userEmail: string,
    bookingData: {
      bookingId: number;
      customerName: string;
      bookingCode: string;
      courtName: string;
      startTime: Date;
      endTime: Date;
      totalPrice: number;
      paymentMethod: string;
      qrCode?: string;
    },
  ): Promise<void> {
    const emailData: SendEmailJobData = {
      bookingId: bookingData.bookingId,
      to: userEmail,
      subject: `Thanh toán thành công - ${bookingData.bookingCode}`,
      template: 'payment-success',
      context: {
        customerName: bookingData.customerName,
        bookingCode: bookingData.bookingCode,
        courtName: bookingData.courtName,
        startTime: bookingData.startTime.toLocaleString('vi-VN'),
        endTime: bookingData.endTime.toLocaleString('vi-VN'),
        totalPrice: bookingData.totalPrice,
        paymentMethod: bookingData.paymentMethod,
        qrCode: bookingData.qrCode,
      },
    };

    await this.queueEmail(emailData);
  }

  /**
   * Send booking cancellation email
   */
  async sendBookingCancellation(
    userEmail: string,
    bookingData: {
      bookingId: number;
      customerName: string;
      bookingCode: string;
      courtName: string;
      startTime: Date;
      endTime: Date;
      totalPrice: number;
      cancellationReason?: string;
      refundAmount?: number;
    },
  ): Promise<void> {
    const emailData: SendEmailJobData = {
      bookingId: bookingData.bookingId,
      to: userEmail,
      subject: `Hủy đặt sân - ${bookingData.bookingCode}`,
      template: 'booking-cancelled',
      context: {
        customerName: bookingData.customerName,
        bookingCode: bookingData.bookingCode,
        courtName: bookingData.courtName,
        startTime: bookingData.startTime.toLocaleString('vi-VN'),
        endTime: bookingData.endTime.toLocaleString('vi-VN'),
        totalPrice: bookingData.totalPrice,
        cancellationReason: bookingData.cancellationReason || 'Không có lý do',
        refundAmount: bookingData.refundAmount || 0,
      },
    };

    await this.queueEmail(emailData);
  }

  /**
   * Test email configuration (Admin only)
   */
  async sendTestEmail(
    toEmail: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.sendEmail({
        to: toEmail,
        subject: 'Test Email - Smart Badminton Booking',
        template: 'booking-confirmation',
        context: {
          customerName: 'Test User',
          bookingCode: 'TEST-20241214-0000',
          courtName: 'Sân Test',
          startTime: new Date().toLocaleString('vi-VN'),
          endTime: new Date(Date.now() + 3600000).toLocaleString('vi-VN'),
          totalPrice: 100000,
          paymentMethod: 'WALLET',
        },
      });

      if (result) {
        return {
          success: true,
          message: `Test email sent successfully to ${toEmail}`,
        };
      } else {
        return {
          success: false,
          message: 'Email sending is disabled or failed',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to send test email: ${error.message}`,
      };
    }
  }

  // ==================== 🔔 REALTIME NOTIFICATIONS ====================

  /**
   * Create and emit notification to user
   */
  async createAndEmitNotification(dto: CreateNotificationDto) {
    try {
      // Save to database
      const notification = await this.prisma.notification.create({
        data: {
          userId: dto.userId,
          title: dto.title,
          message: dto.message,
          type: dto.type,
          metadata: dto.metadata || {},
        },
      });

      // Emit realtime to user
      if (dto.userId) {
        this.eventsGateway.emitToUser(dto.userId, 'notification:new', {
          id: notification.id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          metadata: notification.metadata,
          createdAt: notification.createdAt,
        });
      }

      this.logger.log(
        `✅ Notification created and emitted: "${dto.title}" to user ${dto.userId || 'ALL'}`,
      );

      return notification;
    } catch (error) {
      this.logger.error(`❌ Failed to create notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🎯 NEW BOOKING - Notify Staff & Admin
   */
  async notifyNewBooking(booking: any) {
    this.logger.log(
      `🎯 [START] notifyNewBooking called for #${booking.bookingCode}`,
    );

    const courtName = booking.court?.name || `Sân ${booking.courtId}`;
    const customerName = booking.guestName || booking.user?.name || 'Khách';

    // Format time
    const startTime = new Date(booking.startTime);
    const endTime = new Date(booking.endTime);
    const timeStr = `${startTime.toLocaleDateString('vi-VN')} ${startTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;

    const message = `Đơn đặt sân mới #${booking.bookingCode}\n📍 ${courtName}\n⏰ ${timeStr}\n👤 ${customerName}`;

    this.logger.log(`🔍 [DEBUG] Creating notification in DB...`);
    await this.createAndEmitNotification({
      userId: null, // Staff/Admin notification (not user-specific)
      title: '🎯 Đơn đặt sân mới',
      message,
      type: NotificationType.SUCCESS,
      metadata: { bookingId: booking.id, bookingCode: booking.bookingCode },
    });

    // Emit to staff room
    this.logger.log(
      `🔍 [DEBUG] Calling emitToStaffAndAdmin('notification:new')...`,
    );
    await this.eventsGateway.emitToStaffAndAdmin('notification:new', {
      title: '🎯 Đơn đặt sân mới',
      message,
      type: 'SUCCESS',
      bookingId: booking.id,
    });

    this.logger.log(`✅ [END] New booking notification sent to staff & admin`);
  }

  /**
   * ⚠️ BOOKING CANCELLED - Notify Staff & Admin (HIGH PRIORITY)
   */
  async notifyBookingCancelled(booking: any, cancelledBy: string) {
    const customerName = booking.guestName || booking.user?.name || 'Khách';
    const courtName = booking.court?.name || `Sân ${booking.courtId}`;

    // Format time
    const startTime = new Date(booking.startTime);
    const endTime = new Date(booking.endTime);
    const timeStr = `${startTime.toLocaleDateString('vi-VN')} ${startTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;

    const message = `🚨 Khách "${customerName}" đã HỦY lịch!\n📍 ${courtName}\n⏰ ${timeStr}\n🔓 Slot này giờ TRỐNG - có thể bán cho khách walk-in!`;

    await this.createAndEmitNotification({
      userId: null,
      title: '⚠️ Hủy lịch đặt sân',
      message,
      type: NotificationType.WARNING,
      metadata: {
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        cancelledBy,
      },
    });

    // Emit to staff & admin (HIGH PRIORITY)
    await this.eventsGateway.emitToStaffAndAdmin('notification:new', {
      title: '🚨 HỦY LỊCH - Slot trống!',
      message,
      type: 'WARNING',
      bookingId: booking.id,
      priority: 'HIGH',
    });

    this.logger.log(`⚠️ Cancellation notification sent to staff & admin`);
  }

  /**
   * 💰 PAYMENT SUCCESS - Notify Staff & Admin
   */
  async notifyPaymentSuccess(payment: any, booking: any) {
    this.logger.log(
      `💰 [START] notifyPaymentSuccess called for booking #${booking.bookingCode}`,
    );

    const amount = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(Number(payment.amount));

    const courtName = booking.court?.name || `Sân ${booking.courtId}`;
    const customerName = booking.guestName || booking.user?.name || 'Khách';
    const paymentMethod = payment.method || 'N/A';

    const message = `💵 Nhận ${amount} từ "${customerName}"\n📍 ${courtName} - #${booking.bookingCode}\n💳 Phương thức: ${paymentMethod}`;

    this.logger.log(`🔍 [DEBUG] Creating payment notification in DB...`);
    await this.createAndEmitNotification({
      userId: null,
      title: '💰 Thanh toán thành công',
      message,
      type: NotificationType.SUCCESS,
      metadata: {
        paymentId: payment.id,
        bookingId: booking.id,
        amount: payment.amount,
      },
    });

    // Emit to staff & admin
    this.logger.log(
      `🔍 [DEBUG] Calling emitToStaffAndAdmin for payment notification...`,
    );
    await this.eventsGateway.emitToStaffAndAdmin('notification:new', {
      title: '💰 Thanh toán thành công',
      message,
      type: 'SUCCESS',
      paymentId: payment.id,
      amount: payment.amount,
    });

    // Also notify customer
    if (booking.userId) {
      this.logger.log(
        `🔍 [DEBUG] Also notifying customer ${booking.userId}...`,
      );
      await this.createAndEmitNotification({
        userId: booking.userId,
        title: '✅ Thanh toán thành công',
        message: `Thanh toán ${amount} cho booking ${booking.bookingCode} đã thành công!`,
        type: NotificationType.SUCCESS,
        metadata: { bookingId: booking.id, amount: payment.amount },
      });

      // Emit to customer's room
      this.eventsGateway.emitToUser(booking.userId, 'notification:new', {
        title: '✅ Thanh toán thành công',
        message: `Thanh toán ${amount} cho booking ${booking.bookingCode} đã thành công!`,
        type: 'SUCCESS',
      });
    }

    this.logger.log(
      `✅ [END] Payment notification sent to staff, admin & customer`,
    );
  }

  /**
   * 💸 REFUND PROCESSED - Notify Customer
   */
  async notifyRefund(booking: any, refundAmount: number) {
    if (!booking.userId) return;

    const amount = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(refundAmount);

    const message = `Yêu cầu hoàn tiền ${amount} cho booking #${booking.bookingCode} đã được xử lý thành công.`;

    await this.createAndEmitNotification({
      userId: booking.userId,
      title: '💸 Hoàn tiền thành công',
      message,
      type: NotificationType.SUCCESS,
      metadata: {
        bookingId: booking.id,
        refundAmount,
      },
    });
  }

  /**
   * 🔧 MAINTENANCE SCHEDULED - Broadcast to All
   */
  async notifyMaintenanceScheduled(court: any, startTime: Date, endTime: Date) {
    const message = `${court.name} sẽ bảo trì từ ${startTime.toLocaleString('vi-VN')} đến ${endTime.toLocaleString('vi-VN')}`;

    await this.createAndEmitNotification({
      userId: null,
      title: '🔧 Lịch bảo trì sân',
      message,
      type: NotificationType.INFO,
      metadata: {
        courtId: court.id,
        startTime,
        endTime,
      },
    });

    // Broadcast to all users
    this.eventsGateway.broadcast('notification:new', {
      title: '🔧 Lịch bảo trì sân',
      message,
      type: NotificationType.INFO,
    });
  }

  /**
   * ⏰ LATE CHECK-IN - Notify Staff
   */
  async notifyLateCheckIn(booking: any) {
    const message = `Booking #${booking.bookingCode} đã quá giờ check-in. Vui lòng liên hệ khách hàng.`;

    await this.createAndEmitNotification({
      userId: null,
      title: '⏰ Booking quá giờ check-in',
      message,
      type: NotificationType.WARNING,
      metadata: {
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
      },
    });

    this.eventsGateway.emitToStaff('notification:new', {
      title: '⏰ Booking quá giờ check-in',
      message,
      type: NotificationType.WARNING,
      bookingId: booking.id,
    });
  }

  /**
   * Get notifications for user
   */
  async getUserNotifications(userId: number, limit = 20) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: number) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: number, userId: number) {
    return this.prisma.notification.update({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Mark all as read
   */
  async markAllAsRead(userId: number) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }
}
