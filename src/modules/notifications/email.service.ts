import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import { FixedScheduleEmailData } from './dto/send-fixed-schedule-email.dto';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    // Initialize email transporter
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST', 'smtp.gmail.com'),
      port: this.configService.get('SMTP_PORT', 587),
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });

    // Register Handlebars helpers
    Handlebars.registerHelper('increment', function (value: unknown) {
      return parseInt(value as string) + 1;
    });
  }

  /**
   * Send fixed schedule booking confirmation email
   * Single email with all bookings in a table
   */
  async sendFixedScheduleConfirmation(
    data: FixedScheduleEmailData,
  ): Promise<void> {
    try {
      // Load HTML template
      const templatePath = path.join(
        __dirname,
        'templates',
        'fixed-schedule-confirmation.html',
      );
      const templateSource = fs.readFileSync(templatePath, 'utf-8');

      // Compile template with Handlebars
      const template = Handlebars.compile(templateSource);
      const htmlContent = template(data);

      // Email options
      const mailOptions = {
        from: `"SmartCourt Booking" <${this.configService.get('SMTP_USER')}>`,
        to: data.customerEmail,
        subject: `🎉 Xác nhận đặt lịch cố định - ${data.totalSessions} buổi tại ${data.courtName}`,
        html: htmlContent,
        // Optional: Add text version for email clients that don't support HTML
        text: this.generateTextVersion(data),
      };

      // Send email
      const info = await this.transporter.sendMail(mailOptions);

      this.logger.log(
        `✅ Fixed schedule email sent to ${data.customerEmail} | MessageId: ${info.messageId}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to send fixed schedule email to ${data.customerEmail}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Generate plain text version of the email
   * For email clients that don't support HTML
   */
  private generateTextVersion(data: FixedScheduleEmailData): string {
    let text = `🎉 ĐẶT LỊCH CỐ ĐỊNH THÀNH CÔNG\n\n`;
    text += `Kính chào ${data.customerName},\n\n`;
    text += `Chúng tôi xác nhận đã nhận được đặt lịch cố định của bạn.\n\n`;
    text += `THÔNG TIN ĐẶT LỊCH:\n`;
    text += `- Sân chơi: ${data.courtName}\n`;
    text += `- Mã nhóm: #${data.groupId}\n`;
    text += `- Lịch chơi: ${data.schedule}\n`;
    text += `- Thời gian: ${data.timeRange}\n`;
    text += `- Khoảng thời gian: ${data.period}\n`;
    text += `- Tổng số buổi: ${data.totalSessions} buổi\n\n`;

    text += `THANH TOÁN:\n`;
    text += `- Tổng tiền gốc: ${data.originalPrice}\n`;
    if (data.hasDiscount) {
      text += `- Giảm giá (${data.discountRate}%): -${data.discountAmount}\n`;
    }
    text += `- Thành tiền: ${data.finalPrice}\n\n`;

    text += `DANH SÁCH CÁC BUỔI ĐÃ ĐẶT:\n`;
    data.bookings.forEach((booking, index) => {
      text += `${index + 1}. ${booking.date} (${booking.dayName}) | ${booking.time} | ${booking.bookingCode}\n`;
    });

    text += `\n⚠️ LƯU Ý QUAN TRỌNG:\n`;
    text += `- Vui lòng đến sân trước 10 phút để làm thủ tục check-in\n`;
    text += `- Mang theo mã đặt chỗ hoặc email này khi đến sân\n`;
    text += `- Nếu muốn hủy lịch, vui lòng thông báo ít nhất 24 giờ trước\n`;
    text += `- Liên hệ hotline 1900-xxxx nếu cần hỗ trợ\n\n`;

    text += `Xem lịch đặt của bạn: ${data.dashboardUrl}\n\n`;
    text += `Cảm ơn bạn đã tin tưởng SmartCourt! 🏸\n`;

    return text;
  }

  /**
   * Test email configuration
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('✅ SMTP connection successful');
      return true;
    } catch (error) {
      this.logger.error('❌ SMTP connection failed', error.stack);
      return false;
    }
  }
}
