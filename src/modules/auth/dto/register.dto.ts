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
  @IsNotEmpty({ message: 'Số điện thoại là bắt buộc' })
  @Matches(/^(0|\+84)[0-9]{9,10}$/, {
    message: 'Số điện thoại phải là số điện thoại Việt Nam hợp lệ',
  })
  phone: string; // ✅ Now REQUIRED

  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
