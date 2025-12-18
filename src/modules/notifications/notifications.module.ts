import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { EmailProcessor } from './processors/email.processor';
import { EMAIL_QUEUE } from './queue.constants';
import { PrismaModule } from '../../prisma/prisma.module';
import { WebsocketModule } from '../../common/websocket/websocket.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    forwardRef(() => WebsocketModule),
    BullModule.registerQueue({
      name: EMAIL_QUEUE,
    }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, EmailProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule {}
