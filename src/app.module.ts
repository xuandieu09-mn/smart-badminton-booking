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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    QueueModule, // ✅ ensure Bull root config is loaded
    WebsocketModule, // ✅ WebSocket for real-time updates
    AuthModule,
    UsersModule,
    BookingsModule,
    WalletModule,
    CourtsModule, // ✅ Courts CRUD
    PaymentsModule, // ✅ Payments CRUD
    NotificationsModule, // ✅ Email Notifications
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
