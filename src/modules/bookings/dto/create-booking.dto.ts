import {
  IsInt,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { BookingType, PaymentMethod } from '@prisma/client';

export class CreateBookingDto {
  @IsInt()
  courtId: number;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsEnum(BookingType)
  @IsOptional()
  type?: BookingType;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  // For guest booking (STAFF only)
  @IsString()
  @IsOptional()
  guestName?: string;

  @IsString()
  @IsOptional()
  guestPhone?: string;
}
