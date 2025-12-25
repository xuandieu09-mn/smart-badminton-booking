import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';
import { ChatMessageDto } from './dto/chat.dto';

/**
 * 🔐 Interface for authenticated request user
 */
interface RequestUser {
  id?: number;
  userId?: number;
}

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * 💬 POST /chat - Send message to AI
   * @param body - ChatMessageDto containing message and optional history
   * @param req - Express Request object
   * @returns JSON { reply: string }
   */
  @Post()
  async chat(
    @Body() body: ChatMessageDto,
    @Req() req: Request,
  ): Promise<{ reply: string }> {
    // Extract userId from request user
    // Không cần userId nếu chưa đăng nhập
    let userId: number | null = null;
    if (req.user) {
      const user = req.user as RequestUser;
      userId = this.extractUserId(user);
    }

    // Generate AI response (history is managed internally by ChatService)
    const reply = await this.chatService.generateResponse(
      body.message,
      userId,
    );

    return { reply };
  }

  /**
   * 🔧 Extract user ID from request user object
   * @param user - Request user object (may have id or userId)
   * @returns User ID as number, or null if not found
   */
  private extractUserId(user: RequestUser): number | null {
    if (!user) {
      return null;
    }

    // Check for 'id' first, then 'userId'
    const rawId = user.id ?? user.userId;

    if (typeof rawId === 'number' && !isNaN(rawId)) {
      return rawId;
    }

    return null;
  }
}
