import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsArray,
  IsOptional,
  ValidateNested,
  IsIn,
  ArrayMinSize,
} from 'class-validator';

/**
 * 📦 Part DTO - Represents a single part of content (text, inline_data, etc.)
 * Maps to Google Gemini SDK Part interface
 */
export class PartDto {
  @IsString()
  @IsNotEmpty({ message: 'Part text không được để trống' })
  text: string;
}

/**
 * 📜 Content DTO - Represents a single message in chat history
 * Maps to Google Gemini SDK Content interface
 */
export class ContentDto {
  @IsString()
  @IsNotEmpty({ message: 'Role không được để trống' })
  @IsIn(['user', 'model'], { message: 'Role phải là "user" hoặc "model"' })
  role: 'user' | 'model';

  @IsArray({ message: 'Parts phải là một mảng' })
  @ArrayMinSize(1, { message: 'Parts phải có ít nhất 1 phần tử' })
  @ValidateNested({ each: true })
  @Type(() => PartDto)
  parts: PartDto[];
}

/**
 * 💬 Chat Message DTO - Main DTO for chat request
 */
export class ChatMessageDto {
  @IsString({ message: 'Message phải là chuỗi' })
  @IsNotEmpty({ message: 'Message không được để trống' })
  @MaxLength(1000, { message: 'Message không được vượt quá 1000 ký tự' })
  message: string;

  @IsOptional()
  @IsArray({ message: 'History phải là một mảng' })
  @ValidateNested({ each: true })
  @Type(() => ContentDto)
  history?: ContentDto[];
}
