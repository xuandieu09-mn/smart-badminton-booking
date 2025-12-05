import { IsNumber, IsEnum } from 'class-validator';
import { PaymentStatus } from '@prisma/client';

export class CreatePaymentDto {
  @IsNumber()
  bookingId: number;

  @IsNumber()
  amount: number;

  @IsEnum(['WALLET', 'VNPAY', 'MOMO'])
  method: 'WALLET' | 'VNPAY' | 'MOMO';
}

export class UpdatePaymentStatusDto {
  @IsEnum(PaymentStatus)
  status: PaymentStatus;
}

export class PaymentResponseDto {
  id: number;
  bookingId: number;
  amount: number;
  method: string;
  status: string;
  transactionCode: string;
  paidAt: Date | null;
  refundedAt: Date | null;
  createdAt: Date;
}
