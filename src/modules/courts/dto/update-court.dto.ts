import { IsString, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';

export class UpdateCourtDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerHour?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  peakPricePerHour?: number; // Peak price (17:00 - closing)

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
