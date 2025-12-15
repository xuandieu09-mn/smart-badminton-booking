import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { NotificationsService } from '../notifications.service';
import { EMAIL_QUEUE, EMAIL_JOBS } from '../queue.constants';
import { SendEmailJobData } from '../dto/send-email.dto';

@Processor(EMAIL_QUEUE)
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private notificationsService: NotificationsService) {}

  @Process(EMAIL_JOBS.SEND_EMAIL)
  async handleSendEmail(job: Job<SendEmailJobData>) {
    this.logger.log(`Processing email job ${job.id} for ${job.data.to}`);

    try {
      const result = await this.notificationsService.sendEmail(job.data);

      if (result) {
        this.logger.log(`Email sent successfully - Job ${job.id}`);
      } else {
        this.logger.warn(`Email sending skipped (disabled) - Job ${job.id}`);
      }

      return { success: result };
    } catch (error) {
      this.logger.error(
        `Failed to process email job ${job.id}: ${error.message}`,
        error.stack,
      );
      throw error; // Re-throw to trigger retry
    }
  }
}
