import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { PosModule } from '../pos/pos.module';
import { BookingsModule } from '../bookings/bookings.module';

@Module({
  imports: [PosModule, BookingsModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
