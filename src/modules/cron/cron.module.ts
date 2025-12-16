import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CronService } from './cron.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    ScheduleModule.forRoot(), // Enable scheduling
    PrismaModule,
  ],
  providers: [CronService],
  exports: [CronService],
})
export class CronModule {}
