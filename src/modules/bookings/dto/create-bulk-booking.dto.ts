import {
  IsInt,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BookingType, PaymentMethod } from '@prisma/client';

/**
 * Item trong bulk booking
 */
export class BulkBookingItemDto {
  @IsInt()
  courtId: number;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;
}

/**
 * Bulk Booking DTO - cho phép đặt nhiều sân, nhiều khung giờ trong 1 lần gửi
 * Ví dụ:
 * {
 *   "bookings": [
 *     { "courtId": 1, "startTime": "2025-12-09T09:00:00Z", "endTime": "2025-12-09T09:30:00Z" },
 *     { "courtId": 2, "startTime": "2025-12-09T10:00:00Z", "endTime": "2025-12-09T10:30:00Z" }
 *   ],
 *   "paymentMethod": "CASH"
 * }
 */
export class CreateBulkBookingDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkBookingItemDto)
  @ArrayMinSize(1, { message: 'Phải chọn ít nhất 1 khung giờ' })
  bookings: BulkBookingItemDto[];

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
