import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export enum PaymentGateway {
  VNPAY = 'VNPAY',
  MOMO = 'MOMO',
  WALLET = 'WALLET',
}

export class CreatePaymentUrlDto {
  @IsNumber()
  @IsNotEmpty()
  bookingId: number;

  @IsEnum(PaymentGateway)
  @IsNotEmpty()
  gateway: PaymentGateway;

  @IsString()
  @IsOptional()
  returnUrl?: string;
}

export class VNPayCallbackDto {
  @IsString()
  vnp_Amount: string;

  @IsString()
  @IsOptional()
  vnp_BankCode?: string;

  @IsString()
  @IsOptional()
  vnp_BankTranNo?: string;

  @IsString()
  @IsOptional()
  vnp_CardType?: string;

  @IsString()
  vnp_OrderInfo: string;

  @IsString()
  vnp_PayDate: string;

  @IsString()
  vnp_ResponseCode: string;

  @IsString()
  vnp_TmnCode: string;

  @IsString()
  vnp_TransactionNo: string;

  @IsString()
  vnp_TransactionStatus: string;

  @IsString()
  vnp_TxnRef: string;

  @IsString()
  vnp_SecureHash: string;
}
