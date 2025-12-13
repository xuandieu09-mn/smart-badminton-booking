import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { VNPayService } from './gateways/vnpay.service';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, VNPayService],
  exports: [PaymentsService, VNPayService],
})
export class PaymentsModule {}
