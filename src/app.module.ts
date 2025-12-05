import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './modules/queue/queue.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { CourtsModule } from './modules/courts/courts.module';
import { PaymentsModule } from './modules/payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    QueueModule, // ✅ ensure Bull root config is loaded
    AuthModule,
    UsersModule,
    BookingsModule,
    WalletModule,
    CourtsModule, // ✅ Courts CRUD
    PaymentsModule, // ✅ Payments CRUD
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
