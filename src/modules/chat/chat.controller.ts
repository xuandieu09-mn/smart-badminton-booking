import {
  Controller,
  Post,
  Body,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
  Req,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatMessageDto, ChatResponseDto } from './dto/chat.dto';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';

@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private readonly chatService: ChatService) {}

  /**
   * 💬 POST /api/chat
   * Gửi tin nhắn cho AI Assistant (Agentic AI with Function Calling)
   * - Nếu đã đăng nhập: userId được truyền cho AI → có thể đặt sân
   * - Nếu chưa đăng nhập: vẫn chat được, nhưng không đặt sân được
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalJwtAuthGuard)
  async chat(
    @Body() dto: ChatMessageDto,
    @Req() req: any,
  ): Promise<ChatResponseDto> {
    const startTime = Date.now();

    // Extract userId if authenticated (can be null for unauthenticated users)
    const userId: number | null = req.user?.id ?? null;
    this.logger.log(
      `📨 Chat request - userId: ${userId}, message: "${dto.message}"`,
    );

    try {
      const reply = await this.chatService.generateResponse(
        dto.message,
        userId,
      );

      const processingTime = Date.now() - startTime;
      this.logger.log(`✅ Chat response sent in ${processingTime}ms`);

      return {
        reply,
        processingTime,
      };
    } catch (error) {
      // ⚠️ CRITICAL: Catch any unhandled errors to prevent 500
      this.logger.error('❌ UNHANDLED CHAT ERROR:', error.message);
      this.logger.error('❌ Stack:', error.stack);

      const processingTime = Date.now() - startTime;
      return {
        reply: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau! 🙏',
        processingTime,
      };
    }
  }

  /**
   * 🔍 GET /api/chat/status
   * Kiểm tra trạng thái AI
   */
  @Get('status')
  getStatus() {
    const available = this.chatService.isAvailable();
    return {
      available,
      message: available
        ? 'AI Assistant đang sẵn sàng phục vụ! 🤖'
        : 'AI Assistant đang bảo trì. Vui lòng thử lại sau.',
    };
  }
}
