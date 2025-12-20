import {
  IsOptional,
  IsDateString,
  IsInt,
  IsBoolean,
  IsString,
  IsEnum,
  Min,
} from 'class-validator';
import { BookingStatus, PaymentStatus } from '@prisma/client';

/**
 * DTO for Admin "God Mode" booking update
 * Allows admin to override any booking field regardless of business rules
 */
export class AdminUpdateBookingDto {
  // ==================== TIME OVERRIDE ====================

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  // ==================== COURT TRANSFER ====================

  @IsOptional()
  @IsInt()
  @Min(1)
  courtId?: number;

  // ==================== STATUS OVERRIDE ====================

  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  // ==================== FORCE OPTIONS ====================

  @IsOptional()
  @IsBoolean()
  forceOverwrite?: boolean; // Force update even if conflicts exist

  @IsOptional()
  @IsBoolean()
  refundToWallet?: boolean; // Refund to wallet when cancelling

  @IsOptional()
  @IsBoolean()
  recalculatePrice?: boolean; // Recalculate price after time change

  // NOTE: chargeExtraToWallet removed - extra payment collected at venue by staff

  // ==================== METADATA ====================

  @IsOptional()
  @IsString()
  adminNote?: string; // Admin reason for the change
}

/**
 * Response for admin update with conflict info
 */
export interface AdminUpdateResult {
  success: boolean;
  message: string;
  booking: any;
  priceChange?: {
    oldPrice: number;
    newPrice: number;
    difference: number;
    refunded?: boolean;
    pendingCollection?: boolean; // Extra payment to be collected at venue
  };
  conflicts?: {
    bookingId: number;
    bookingCode: string;
    startTime: string;
    endTime: string;
    status: string;
    overwritten?: boolean;
  }[];
  adminAction?: any;
}
