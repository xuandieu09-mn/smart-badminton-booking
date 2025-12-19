import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  Matches,
} from 'class-validator';
import { Role } from '@prisma/client';

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  @Matches(/^(0|\+84)[0-9]{9,10}$/, {
    message: 'Phone number must be a valid Vietnamese phone number',
  })
  phone?: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
