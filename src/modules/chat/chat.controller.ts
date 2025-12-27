import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
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
    const reply = await this.chatService.generateResponse(
      body.message,
      userId,
      body.history || [],
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
