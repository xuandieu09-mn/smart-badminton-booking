import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { PosModule } from '../pos/pos.module';
import { BookingsModule } from '../bookings/bookings.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    PosModule, // For ProductsService (get_pos_products tool)
    BookingsModule, // For BookingsService (create_booking tool)
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
