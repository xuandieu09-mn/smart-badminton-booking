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

// ==================== INTERFACES ====================

interface CreateNotificationDto {
  userId?: number;
  title: string;
  message: string;
  type: NotificationType;
  metadata?: Record<string, unknown>;
}

interface NotificationPayload {
  id?: number;
  title: string;
  message: string;
  type: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}

// Type for booking objects from Prisma (flexible interface)
interface BookingData {
  id: number;
  bookingCode: string;
  userId: number;
  status: string;
  totalAmount?: unknown;
  startTime: Date | string;
  endTime: Date | string;
  expiresAt?: Date | null;
  court?: { name: string };
  user?: { fullName?: string; name?: string; email: string };
  payment?: { method: string };
}

// ==================== NOTIFICATION MATRIX ====================
/**
 * | STT | Sự kiện                | Đối tượng nhận | Room Socket  | Type    |
 * |-----|------------------------|----------------|--------------|---------|
 * | 1   | Khách đặt lịch mới     | Staff          | staff-room   | INFO    |
 * |     |                        | Customer       | user-{id}    | SUCCESS |
 * | 2   | Thanh toán thành công  | Staff          | staff-room   | SUCCESS |
 * |     |                        | Admin          | admin-room   | SUCCESS |
 * |     |                        | Customer       | user-{id}    | SUCCESS |
 * | 3   | Khách HỦY sân          | Staff          | staff-room   | WARNING |
 * |     |                        | Customer       | user-{id}    | INFO    |
 * | 4   | Sắp hết hạn giữ chỗ    | Customer       | user-{id}    | WARNING |
 * | 5   | Timeout (Hủy tự động)  | Staff          | staff-room   | INFO    |
 * |     |                        | Customer       | user-{id}    | ERROR   |
 * | 6   | Trễ Check-in (>15p)    | Staff          | staff-room   | ERROR   |
 * |     |                        | Customer       | user-{id}    | WARNING |
 * | 7   | Giao dịch POS          | Admin          | admin-room   | INFO    |
 * |-----|------------------------|----------------|--------------|---------|
 * | 8   | Hoàn tiền              | Customer       | user-{id}    | SUCCESS |
 * | 9   | Bảo trì sân            | All            | broadcast    | WARNING |
 * | 10  | Check-in thành công    | Customer       | user-{id}    | SUCCESS |
 * | 11  | Nhắc nhở lịch đặt      | Customer       | user-{id}    | INFO    |
 */

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

  // ==================== EMAIL SETUP ====================

  private initializeEmailTransporter() {
    const emailEnabled =
      this.configService.get<string>('EMAIL_ENABLED', 'false') === 'true';

    if (!emailEnabled) {
      this.logger.warn('📧 Email notifications DISABLED');
      return;
    }

    const emailHost = this.configService.get<string>('EMAIL_HOST');
    const emailPort = this.configService.get<number>('EMAIL_PORT', 587);
    const emailUser = this.configService.get<string>('EMAIL_USER');
    const emailPass = this.configService.get<string>('EMAIL_PASS');
    const emailFrom = this.configService.get<string>('EMAIL_FROM');

    if (!emailHost || !emailUser || !emailPass) {
      this.logger.error('❌ Email configuration incomplete');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: emailHost,
      port: emailPort,
      secure: emailPort === 465,
      auth: { user: emailUser, pass: emailPass },
    });

    this.logger.log(`📧 Email transporter initialized: ${emailFrom}`);
  }

  private loadEmailTemplates() {
    const templatesDir = path.join(__dirname, 'templates');

    if (!fs.existsSync(templatesDir)) {
      this.logger.warn(`⚠️ Templates directory not found: ${templatesDir}`);
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
        this.logger.log(`📄 Loaded template: ${templateName}`);
      }
    });
  }

  // ==================== EMAIL QUEUE ====================

  async queueEmail(data: SendEmailJobData): Promise<void> {
    try {
      await this.emailQueue.add(EMAIL_JOBS.SEND_EMAIL, data, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      });
      this.logger.log(`📧 Email queued: ${data.to}`);
    } catch (error) {
      this.logger.error(`❌ Queue email failed: ${error.message}`);
    }
  }

  async sendEmail(dto: SendEmailDto): Promise<boolean> {
    const emailEnabled =
      this.configService.get<string>('EMAIL_ENABLED', 'false') === 'true';

    if (!emailEnabled || !this.transporter) {
      return false;
    }

    try {
      const template = this.templates.get(dto.template);
      if (!template) {
        this.logger.error(`❌ Template not found: ${dto.template}`);
        return false;
      }

      const html = template(dto.context);
      const emailFrom = this.configService.get<string>(
        'EMAIL_FROM',
        'noreply@badminton.com',
      );

      await this.transporter.sendMail({
        from: `"Smart Badminton" <${emailFrom}>`,
        to: dto.to,
        subject: dto.subject,
        html: html,
      });

      this.logger.log(`✅ Email sent: ${dto.to}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Send email failed: ${error.message}`);
      throw error;
    }
  }

  // ==================== CORE: CREATE & EMIT ====================

  /**
   * 📢 Create notification in DB and emit to specific user
   */
  async createAndEmitNotification(
    dto: CreateNotificationDto,
  ): Promise<unknown> {
    try {
      const notification = await this.prisma.notification.create({
        data: {
          userId: dto.userId,
          title: dto.title,
          message: dto.message,
          type: dto.type,
          metadata: (dto.metadata as object) || {},
        },
      });

      const payload: NotificationPayload = {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        metadata: notification.metadata as Record<string, unknown>,
        createdAt: notification.createdAt,
      };

      if (dto.userId) {
        this.eventsGateway.emitToUser(dto.userId, 'notification:new', payload);
      }

      this.logger.log(`✅ Notification → user ${dto.userId}: "${dto.title}"`);
      return notification;
    } catch (error) {
      this.logger.error(`❌ createAndEmitNotification: ${error.message}`);
      throw error;
    }
  }

  /**
   * 📢 Create notification for role rooms (Staff/Admin) - saves to DB with userId=null
   */
  async createRoleNotification(
    targetRooms: ('staff-room' | 'admin-room')[],
    dto: Omit<CreateNotificationDto, 'userId'>,
  ): Promise<void> {
    try {
      const notification = await this.prisma.notification.create({
        data: {
          userId: null,
          title: dto.title,
          message: dto.message,
          type: dto.type,
          metadata: (dto.metadata as object) || {},
        },
      });

      const payload: NotificationPayload = {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        metadata: notification.metadata as Record<string, unknown>,
        createdAt: notification.createdAt,
      };

      for (const room of targetRooms) {
        if (room === 'staff-room') {
          this.eventsGateway.emitToStaff('notification:new', payload);
        } else if (room === 'admin-room') {
          this.eventsGateway.emitToAdmin('notification:new', payload);
        }
      }

      this.logger.log(
        `✅ Role notification → ${targetRooms.join(', ')}: "${dto.title}"`,
      );
    } catch (error) {
      this.logger.error(`❌ createRoleNotification: ${error.message}`);
    }
  }

  // ============================================================
  // | #1 | KHÁCH ĐẶT LỊCH MỚI - NEW BOOKING
  // ============================================================

  /**
   * 🎯 #1a: Notify STAFF about new booking
   */
  async notifyStaffNewBooking(booking: BookingData): Promise<void> {
    const courtName = booking.court?.name || `Sân #${booking.id}`;
    const customerName =
      booking.user?.fullName || booking.user?.name || 'Khách';
    const startTime = new Date(booking.startTime);
    const timeStr = startTime.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    await this.createRoleNotification(['staff-room'], {
      title: '🎯 Đơn đặt sân mới',
      message: `Mới: ${customerName} vừa đặt ${courtName} lúc ${timeStr} (Chờ thanh toán).`,
      type: NotificationType.INFO,
      metadata: {
        event: 'NEW_BOOKING',
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        courtId: booking.id,
      },
    });
  }

  /**
   * 🎯 #1b: Notify CUSTOMER about booking success
   */
  async notifyCustomerBookingSuccess(booking: BookingData): Promise<void> {
    if (!booking.userId) return;

    const courtName = booking.court?.name || `Sân #${booking.id}`;

    await this.createAndEmitNotification({
      userId: booking.userId,
      title: '✅ Giữ chỗ thành công',
      message: `Giữ chỗ thành công ${courtName}. Vui lòng thanh toán trong 15 phút.`,
      type: NotificationType.SUCCESS,
      metadata: {
        event: 'BOOKING_CREATED',
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        expiresAt: booking.expiresAt,
      },
    });
  }

  /**
   * 🎯 #1 COMBINED: New Booking Event
   */
  async notifyNewBooking(booking: BookingData): Promise<void> {
    this.logger.log(`🎯 notifyNewBooking: #${booking.bookingCode}`);
    await this.notifyStaffNewBooking(booking);
    await this.notifyCustomerBookingSuccess(booking);
  }

  // ============================================================
  // | #2 | THANH TOÁN THÀNH CÔNG - PAYMENT SUCCESS
  // ============================================================

  /**
   * 💰 #2a: Notify STAFF about payment
   */
  async notifyStaffPaymentSuccess(
    payment: { id: number; amount: unknown },
    booking: BookingData,
  ): Promise<void> {
    await this.createRoleNotification(['staff-room'], {
      title: '💰 Thanh toán mới',
      message: `💰 Đã nhận tiền đơn #${booking.bookingCode}. Sân đã confirm.`,
      type: NotificationType.SUCCESS,
      metadata: {
        event: 'PAYMENT_SUCCESS',
        paymentId: payment.id,
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        amount: Number(payment.amount),
      },
    });
  }

  /**
   * 💰 #2b: Notify ADMIN about revenue
   */
  async notifyAdminPaymentSuccess(
    payment: { id: number; amount: unknown },
    booking: BookingData,
  ): Promise<void> {
    const amount = this.formatCurrency(Number(payment.amount));

    await this.createRoleNotification(['admin-room'], {
      title: '💰 Doanh thu mới',
      message: `💰 Doanh thu: +${amount} (Đơn #${booking.bookingCode}).`,
      type: NotificationType.SUCCESS,
      metadata: {
        event: 'REVENUE_RECEIVED',
        paymentId: payment.id,
        bookingId: booking.id,
        amount: Number(payment.amount),
      },
    });
  }

  /**
   * 💰 #2c: Notify CUSTOMER about payment success
   */
  async notifyCustomerPaymentSuccess(
    payment: { id: number; amount: unknown },
    booking: BookingData,
  ): Promise<void> {
    if (!booking.userId) return;

    await this.createAndEmitNotification({
      userId: booking.userId,
      title: '✅ Thanh toán thành công',
      message: `Thanh toán thành công. Mã #${booking.bookingCode} đã xác nhận.`,
      type: NotificationType.SUCCESS,
      metadata: {
        event: 'PAYMENT_SUCCESS',
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        amount: Number(payment.amount),
      },
    });
  }

  /**
   * 💰 #2 COMBINED: Payment Success Event
   */
  async notifyPaymentSuccess(
    payment: { id: number; amount: unknown },
    booking: BookingData,
  ): Promise<void> {
    this.logger.log(`💰 notifyPaymentSuccess: #${booking.bookingCode}`);
    await this.notifyStaffPaymentSuccess(payment, booking);
    await this.notifyAdminPaymentSuccess(payment, booking);
    await this.notifyCustomerPaymentSuccess(payment, booking);
  }

  // ============================================================
  // | #3 | KHÁCH HỦY SÂN - BOOKING CANCELLED
  // ============================================================

  /**
   * ⚠️ #3a: Notify STAFF about cancellation
   */
  async notifyStaffBookingCancelled(booking: BookingData): Promise<void> {
    const courtName = booking.court?.name || `Sân #${booking.id}`;
    const startTime = new Date(booking.startTime);
    const timeStr = startTime.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    await this.createRoleNotification(['staff-room'], {
      title: '⚠️ Hủy lịch - Sân TRỐNG',
      message: `⚠️ Cảnh báo: Booking #${booking.bookingCode} đã hủy. ${courtName} lúc ${timeStr} - SÂN TRỐNG.`,
      type: NotificationType.WARNING,
      metadata: {
        event: 'BOOKING_CANCELLED',
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        courtId: booking.id,
        slotAvailable: true,
      },
    });
  }

  /**
   * ⚠️ #3b: Notify CUSTOMER about their cancellation
   */
  async notifyCustomerBookingCancelled(booking: BookingData): Promise<void> {
    if (!booking.userId) return;

    await this.createAndEmitNotification({
      userId: booking.userId,
      title: 'ℹ️ Đã hủy lịch',
      message: `Hủy thành công đơn #${booking.bookingCode}.`,
      type: NotificationType.INFO,
      metadata: {
        event: 'BOOKING_CANCELLED_BY_USER',
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
      },
    });
  }

  /**
   * ⚠️ #3 COMBINED: Booking Cancelled Event
   */
  async notifyBookingCancelled(booking: BookingData): Promise<void> {
    this.logger.log(`⚠️ notifyBookingCancelled: #${booking.bookingCode}`);
    await this.notifyStaffBookingCancelled(booking);
    await this.notifyCustomerBookingCancelled(booking);
  }

  // ============================================================
  // | #4 | SẮP HẾT HẠN GIỮ CHỖ - EXPIRING SOON
  // ============================================================

  /**
   * ⏳ #4: Notify CUSTOMER about expiring booking
   */
  async notifyBookingExpiringSoon(
    booking: BookingData,
    minutesLeft = 5,
  ): Promise<void> {
    if (!booking.userId) return;

    await this.createAndEmitNotification({
      userId: booking.userId,
      title: '⏳ Sắp hết hạn thanh toán',
      message: `⏳ Còn ${minutesLeft} phút để thanh toán đơn #${booking.bookingCode}.`,
      type: NotificationType.WARNING,
      metadata: {
        event: 'BOOKING_EXPIRING',
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        minutesLeft,
      },
    });

    this.logger.log(`⏳ Expiring soon: #${booking.bookingCode}`);
  }

  // ============================================================
  // | #5 | TIMEOUT - HỦY TỰ ĐỘNG
  // ============================================================

  /**
   * ℹ️ #5a: Notify STAFF about timeout
   */
  async notifyStaffBookingTimeout(booking: BookingData): Promise<void> {
    const courtName = booking.court?.name || `Sân #${booking.id}`;

    await this.createRoleNotification(['staff-room'], {
      title: 'ℹ️ Hết hạn thanh toán',
      message: `ℹ️ Đơn #${booking.bookingCode} bị hủy do quá hạn. ${courtName} - Sân trống.`,
      type: NotificationType.INFO,
      metadata: {
        event: 'BOOKING_EXPIRED',
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        courtId: booking.id,
        slotAvailable: true,
      },
    });
  }

  /**
   * ❌ #5b: Notify CUSTOMER about timeout
   */
  async notifyCustomerBookingTimeout(booking: BookingData): Promise<void> {
    if (!booking.userId) return;

    await this.createAndEmitNotification({
      userId: booking.userId,
      title: '❌ Hết hạn thanh toán',
      message: `Đơn #${booking.bookingCode} đã hủy do hết hạn thanh toán.`,
      type: NotificationType.ERROR,
      metadata: {
        event: 'BOOKING_EXPIRED',
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
      },
    });
  }

  /**
   * ⏰ #5 COMBINED: Booking Timeout Event
   */
  async notifyBookingTimeout(booking: BookingData): Promise<void> {
    this.logger.log(`⏰ notifyBookingTimeout: #${booking.bookingCode}`);
    await this.notifyStaffBookingTimeout(booking);
    await this.notifyCustomerBookingTimeout(booking);
  }

  // ============================================================
  // | #6 | TRỄ CHECK-IN (>15p) - LATE CHECK-IN
  // ============================================================

  /**
   * 🚨 #6a: Notify STAFF about late check-in
   */
  async notifyStaffLateCheckIn(
    booking: BookingData,
    minutesLate: number,
  ): Promise<void> {
    const courtName = booking.court?.name || `Sân #${booking.id}`;

    await this.createRoleNotification(['staff-room'], {
      title: '🚨 Khách trễ check-in',
      message: `🚨 Khách đơn #${booking.bookingCode} chưa đến (Trễ ${minutesLate}p). ${courtName} - Check ngay!`,
      type: NotificationType.ERROR,
      metadata: {
        event: 'LATE_CHECKIN',
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        courtId: booking.id,
        minutesLate,
      },
    });
  }

  /**
   * ⚠️ #6b: Notify CUSTOMER about late check-in
   */
  async notifyCustomerLateCheckIn(
    booking: BookingData,
    minutesLate: number,
  ): Promise<void> {
    if (!booking.userId) return;

    const courtName = booking.court?.name || `Sân #${booking.id}`;

    await this.createAndEmitNotification({
      userId: booking.userId,
      title: '⚠️ Bạn đang trễ check-in',
      message: `Sân ${courtName} đã bắt đầu ${minutesLate} phút. Vui lòng check-in ngay.`,
      type: NotificationType.WARNING,
      metadata: {
        event: 'LATE_CHECKIN',
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        minutesLate,
      },
    });
  }

  /**
   * 🚨 #6 COMBINED: Late Check-in Event
   */
  async notifyLateCheckIn(
    booking: BookingData,
    minutesLate = 15,
  ): Promise<void> {
    this.logger.log(
      `🚨 notifyLateCheckIn: #${booking.bookingCode} (${minutesLate}p)`,
    );
    await this.notifyStaffLateCheckIn(booking, minutesLate);
    await this.notifyCustomerLateCheckIn(booking, minutesLate);
  }

  // ============================================================
  // | #7 | GIAO DỊCH POS - POS SALE
  // ============================================================

  /**
   * 💰 #7: Notify ADMIN about POS sale
   */
  async notifyPOSSale(sale: {
    id: number;
    saleCode: string;
    totalAmount: unknown;
    staffId: number;
    staff?: { name: string };
  }): Promise<void> {
    const amount = this.formatCurrency(Number(sale.totalAmount));
    const staffName = sale.staff?.name || 'Staff';

    await this.createRoleNotification(['admin-room'], {
      title: '💰 Giao dịch POS',
      message: `💰 Doanh thu POS: +${amount}. Nhân viên: ${staffName}.`,
      type: NotificationType.INFO,
      metadata: {
        event: 'POS_SALE',
        saleId: sale.id,
        saleCode: sale.saleCode,
        amount: Number(sale.totalAmount),
        staffId: sale.staffId,
      },
    });

    this.logger.log(`💰 POS sale: ${sale.saleCode}`);
  }

  // ============================================================
  // | BONUS EVENTS
  // ============================================================

  /**
   * 💸 #8: Notify CUSTOMER about refund
   */
  async notifyRefund(
    booking: BookingData,
    refundAmount: number,
  ): Promise<void> {
    if (!booking.userId) return;

    const amount = this.formatCurrency(refundAmount);

    await this.createAndEmitNotification({
      userId: booking.userId,
      title: '💸 Hoàn tiền thành công',
      message: `Hoàn tiền ${amount} cho đơn #${booking.bookingCode} đã chuyển vào ví.`,
      type: NotificationType.SUCCESS,
      metadata: {
        event: 'REFUND_PROCESSED',
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        refundAmount,
      },
    });

    this.logger.log(`💸 Refund: #${booking.bookingCode}`);
  }

  /**
   * 🔧 #9: Notify ALL about court maintenance
   */
  async notifyCourtMaintenance(
    court: { id: number; name: string },
    startTime: Date,
    endTime: Date,
  ): Promise<void> {
    const timeRange = `${startTime.toLocaleString('vi-VN')} - ${endTime.toLocaleString('vi-VN')}`;

    await this.prisma.notification.create({
      data: {
        userId: null,
        title: '🔧 Lịch bảo trì sân',
        message: `🔧 ${court.name} sẽ bảo trì từ ${timeRange}. Vui lòng chọn sân khác.`,
        type: NotificationType.WARNING,
        metadata: {
          event: 'COURT_MAINTENANCE',
          courtId: court.id,
          courtName: court.name,
        },
      },
    });

    this.eventsGateway.broadcast('notification:new', {
      title: '🔧 Lịch bảo trì sân',
      message: `🔧 ${court.name} sẽ bảo trì từ ${timeRange}. Vui lòng chọn sân khác.`,
      type: 'WARNING',
    });

    this.logger.log(`🔧 Maintenance: ${court.name}`);
  }

  /**
   * ✅ #10: Notify CUSTOMER about successful check-in
   */
  async notifyCheckInSuccess(booking: BookingData): Promise<void> {
    if (!booking.userId) return;

    const courtName = booking.court?.name || `Sân #${booking.id}`;

    await this.createAndEmitNotification({
      userId: booking.userId,
      title: '✅ Check-in thành công',
      message: `Check-in thành công! Chúc bạn chơi vui vẻ tại ${courtName}.`,
      type: NotificationType.SUCCESS,
      metadata: {
        event: 'CHECKIN_SUCCESS',
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
      },
    });

    this.logger.log(`✅ Check-in: #${booking.bookingCode}`);
  }

  /**
   * 📅 #11: Notify CUSTOMER about booking reminder (1 hour before)
   */
  async notifyBookingReminder(booking: BookingData): Promise<void> {
    if (!booking.userId) return;

    const courtName = booking.court?.name || `Sân #${booking.id}`;
    const startTime = new Date(booking.startTime);
    const timeStr = startTime.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    await this.createAndEmitNotification({
      userId: booking.userId,
      title: '📅 Nhắc nhở lịch đặt',
      message: `Nhắc nhở: Bạn có lịch đặt ${courtName} lúc ${timeStr}. Đừng quên check-in!`,
      type: NotificationType.INFO,
      metadata: {
        event: 'BOOKING_REMINDER',
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
      },
    });

    this.logger.log(`📅 Reminder: #${booking.bookingCode}`);
  }

  // ==================== DATABASE QUERIES ====================

  async getUserNotifications(userId: number, limit = 20) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getRoleNotifications(role: Role, limit = 50) {
    return this.prisma.notification.findMany({
      where: { userId: null },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getUnreadCount(userId: number) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(notificationId: number, userId: number) {
    return this.prisma.notification.update({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: number) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  // ==================== EMAIL TEMPLATES ====================

  async sendBookingConfirmation(userEmail: string, data: any): Promise<void> {
    await this.queueEmail({
      bookingId: data.bookingId,
      to: userEmail,
      subject: `Xác nhận đặt sân - ${data.bookingCode}`,
      template: 'booking-confirmation',
      context: {
        customerName: data.customerName,
        bookingCode: data.bookingCode,
        courtName: data.courtName,
        startTime: data.startTime.toLocaleString('vi-VN'),
        endTime: data.endTime.toLocaleString('vi-VN'),
        totalPrice: data.totalPrice,
        paymentMethod: data.paymentMethod,
        qrCode: data.qrCode,
      },
    });
  }

  async sendPaymentSuccess(userEmail: string, data: any): Promise<void> {
    await this.queueEmail({
      bookingId: data.bookingId,
      to: userEmail,
      subject: `Thanh toán thành công - ${data.bookingCode}`,
      template: 'payment-success',
      context: {
        customerName: data.customerName,
        bookingCode: data.bookingCode,
        courtName: data.courtName,
        startTime: data.startTime.toLocaleString('vi-VN'),
        endTime: data.endTime.toLocaleString('vi-VN'),
        totalPrice: data.totalPrice,
        paymentMethod: data.paymentMethod,
        qrCode: data.qrCode,
      },
    });
  }

  async sendBookingCancellation(userEmail: string, data: any): Promise<void> {
    await this.queueEmail({
      bookingId: data.bookingId,
      to: userEmail,
      subject: `Hủy đặt sân - ${data.bookingCode}`,
      template: 'booking-cancelled',
      context: {
        customerName: data.customerName,
        bookingCode: data.bookingCode,
        courtName: data.courtName,
        startTime: data.startTime.toLocaleString('vi-VN'),
        endTime: data.endTime.toLocaleString('vi-VN'),
        totalPrice: data.totalPrice,
        cancellationReason: data.cancellationReason || 'Không có lý do',
        refundAmount: data.refundAmount || 0,
      },
    });
  }

  async sendTestEmail(
    toEmail: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.sendEmail({
        to: toEmail,
        subject: 'Test Email - Smart Badminton',
        template: 'booking-confirmation',
        context: {
          customerName: 'Test User',
          bookingCode: 'TEST-123456',
          courtName: 'Sân Test',
          startTime: new Date().toLocaleString('vi-VN'),
          endTime: new Date(Date.now() + 3600000).toLocaleString('vi-VN'),
          totalPrice: 100000,
          paymentMethod: 'WALLET',
        },
      });
      return { success: result, message: result ? 'Sent' : 'Disabled' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // ==================== HELPERS ====================

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(Number(amount));
  }
}
