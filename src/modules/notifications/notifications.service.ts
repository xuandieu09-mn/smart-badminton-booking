import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { EMAIL_QUEUE, EMAIL_JOBS } from './queue.constants';
import { SendEmailDto, SendEmailJobData } from './dto/send-email.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter;
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor(
    @InjectQueue(EMAIL_QUEUE) private emailQueue: Queue<SendEmailJobData>,
    private configService: ConfigService,
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
}
