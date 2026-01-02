import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './modules/queue/queue.module';
import { WebsocketModule } from './common/websocket/websocket.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { CourtsModule } from './modules/courts/courts.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CronModule } from './modules/cron/cron.module';
import { PosModule } from './modules/pos/pos.module';
import { RevenueModule } from './modules/revenue/revenue.module';
import { ChatModule } from './modules/chat/chat.module';
import { ReportsModule } from './modules/reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    QueueModule, // ✅ ensure Bull root config is loaded
    WebsocketModule, // ✅ WebSocket for real-time updates
    CronModule, // ✅ Cron jobs for auto-completion
    AuthModule,
    UsersModule,
    BookingsModule,
    WalletModule,
    CourtsModule, // ✅ Courts CRUD
    PaymentsModule, // ✅ Payments CRUD
    NotificationsModule, // ✅ Email Notifications
    PosModule, // ✅ POS System (Products & Sales)
    RevenueModule, // ✅ Revenue Tracking & Shift Closing
    ChatModule, // ✅ AI Chat Assistant (Gemini)
    ReportsModule, // ✅ Admin Reports & Analytics
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
