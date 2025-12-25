import { IsArray, ValidateNested, IsNumber, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

class InvoiceItemDto {
  @IsNumber()
  productId: number;

  @IsNumber()
  quantity: number;
}

export class GenerateInvoiceDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];

  @IsString()
  customerName: string;

  @IsEnum(['CASH', 'VNPAY', 'BANK_TRANSFER'])
  paymentMethod: string;
}
