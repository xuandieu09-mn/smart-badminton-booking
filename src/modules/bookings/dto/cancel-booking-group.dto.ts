import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CancelBookingGroupDto {
  @IsOptional()
  @IsString()
  reason?: string; // Lý do hủy (optional)

  @IsOptional()
  @IsBoolean()
  refundToWallet?: boolean; // Hoàn tiền vào ví (default: true)

  @IsOptional()
  @IsBoolean()
  cancelOnlyFuture?: boolean; // Chỉ hủy các booking trong tương lai (default: false)
}
