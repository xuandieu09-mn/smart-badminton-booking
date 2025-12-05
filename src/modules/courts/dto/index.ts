import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateCourtDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  pricePerHour: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateCourtDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  pricePerHour?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class FilterCourtsDto {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
