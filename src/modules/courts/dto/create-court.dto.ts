import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
} from 'class-validator';

export class CreateCourtDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  pricePerHour: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  peakPricePerHour?: number; // Peak price (17:00 - closing), defaults to 100000

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
