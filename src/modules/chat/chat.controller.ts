import { Controller, Post, Body, Req, Get, Query } from '@nestjs/common';
import { Request } from 'express';
import { ChatService } from './chat.service';
import { ChatMessageDto } from './dto/chat.dto';
import { JwtService } from '@nestjs/jwt';

/**
 * 🔐 Interface for authenticated request user
 */
interface RequestUser {
  id?: number;
  userId?: number;
}

@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

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
    // Extract userId from request user OR from JWT token (optional auth)
    let userId: number | null = null;

    // Try to get userId from req.user (if AuthGuard was used)
    if (req.user) {
      const user = req.user as RequestUser;
      userId = this.extractUserId(user);
      console.log('✅ UserId from req.user:', userId);
    }
    // Otherwise, try to parse JWT token manually (optional authentication)
    else {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          const payload = this.jwtService.verify(token);
          userId = payload.sub || payload.userId || null;
          console.log('✅ UserId from JWT token:', userId);
          console.log('📦 JWT Payload:', payload);
        } catch (error) {
          // Invalid token - continue without userId (anonymous chat)
          console.log('⚠️ Invalid JWT token, continuing as anonymous');
          console.log('❌ Error:', error.message);
        }
      } else {
        console.log('⚠️ No Authorization header found');
      }
    }

    console.log('🔑 Final userId being sent to ChatService:', userId);

    // Generate AI response với history từ frontend
    const startTime = Date.now();
    const reply = await this.chatService.generateResponse(
      body.message,
      userId,
      body.history || [],
    );
    const responseTime = Date.now() - startTime;

    // Detect intent and track analytics
    const intent = this.chatService['detectIntent'](body.message);
    const wasResolved = !reply.includes('Xin lỗi') && !reply.includes('chưa hiểu');
    
    // Track analytics
    if (userId) {
      await this.chatService.trackChatAnalytics(
        userId,
        body.message,
        intent,
        wasResolved,
        null, // toolUsed will be enhanced later
        responseTime,
      );
    }

    // Save chat history
    if (userId) {
      await this.chatService.saveChatMessage(userId, 'user', body.message);
      await this.chatService.saveChatMessage(userId, 'bot', reply);
    }

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

  /**
   * 📜 GET /chat/history - Get chat history for user
   */
  @Get('history')
  async getChatHistory(
    @Req() req: Request,
    @Query('limit') limit?: string,
  ): Promise<{ messages: any[] }> {
    let userId: number | null = null;

    // Extract userId from request
    if (req.user) {
      const user = req.user as RequestUser;
      userId = this.extractUserId(user);
    } else {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          const payload = this.jwtService.verify(token);
          userId = payload.sub || payload.userId || null;
        } catch (error) {
          console.log('⚠️ Invalid JWT token');
        }
      }
    }

    if (!userId) {
      return { messages: [] };
    }

    const messages = await this.chatService.getChatHistory(
      userId,
      limit ? parseInt(limit) : 50,
    );

    return { messages };
  }
}
