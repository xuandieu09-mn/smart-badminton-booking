import { IsInt, IsDateString, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CheckAvailabilityDto {
  @IsInt()
  @Type(() => Number)
  courtId: number;

  @IsInt()
  @Min(0)
  @Max(6)
  @Type(() => Number)
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  @IsInt()
  @Min(0)
  @Max(23)
  @Type(() => Number)
  hour: number;

  @IsDateString()
  startDate: string;

  @IsInt()
  @Min(1)
  @Max(6)
  @Type(() => Number)
  durationMonths: number;
}
