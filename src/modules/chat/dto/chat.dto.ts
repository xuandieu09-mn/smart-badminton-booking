import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class ChatMessageDto {
  /**
   * Tin nhắn từ người dùng
   * @example 'Tôi muốn đặt sân vào thứ 7 tuần này'
   */
  @IsString()
  @IsNotEmpty({ message: 'Tin nhắn không được để trống' })
  @MaxLength(1000, { message: 'Tin nhắn không được vượt quá 1000 ký tự' })
  message: string;
}

export class ChatResponseDto {
  /**
   * Phản hồi từ AI
   */
  reply: string;

  /**
   * Thời gian xử lý (ms)
   */
  processingTime?: number;
}
