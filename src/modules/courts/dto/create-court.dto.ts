import { IsString, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';

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
  @IsBoolean()
  isActive?: boolean;
}
