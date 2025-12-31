import { IsInt, IsDateString, IsArray, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFixedBookingDto {
  @IsInt()
  @Min(1)
  courtId: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsArray()
  @IsInt({ each: true })
  daysOfWeek: number[]; // [2, 4] = Thứ 3 và Thứ 5 (0=Sunday, 1=Monday, ...)

  @IsString()
  startTime: string; // Format: "HH:mm" (e.g., "18:00")

  @IsString()
  endTime: string; // Format: "HH:mm" (e.g., "20:00")
}
