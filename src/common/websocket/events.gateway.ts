import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';

@WebSocketGateway({
  namespace: 'events',
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  },
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private userSocketMap = new Map<number, string>();

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('🚀 WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      // Try JWT auth first
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      if (token) {
        // JWT authentication
        const payload = await this.jwtService.verifyAsync(token);
        const userId = payload.sub;

        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true, name: true, role: true, isActive: true },
        });

        if (!user || !user.isActive) {
          this.logger.warn(`⚠️ Client ${client.id} - Invalid or inactive user`);
          client.disconnect();
          return;
        }

        client.data.user = user;
        this.userSocketMap.set(user.id, client.id);

        // Join role-specific rooms
        await this.joinRoleRooms(client, user);

        this.logger.log(
          `✅ [JWT Auth] Client connected: ${client.id} - ${user.email} (${user.role})`,
        );

        client.emit('connected', {
          message: 'Connected to notification server',
          userId: user.id,
          role: user.role,
        });
      } else {
        // Fallback: Legacy userId from query (for backward compatibility)
        const userId = client.handshake.query.userId as string;
        if (userId) {
          this.userSocketMap.set(Number(userId), client.id);
          this.logger.log(
            `⚠️ [Legacy] Client connected: ${client.id}, userId: ${userId}`,
          );
        } else {
          this.logger.warn(`❌ Client ${client.id} - No auth provided`);
          client.disconnect();
        }
      }
    } catch (error) {
      this.logger.error(`❌ Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const user = client.data.user;
    if (user) {
      this.userSocketMap.delete(user.id);
      this.logger.log(`👋 Client disconnected: ${client.id} - ${user.email}`);
    } else {
      // Legacy cleanup
      const userId = Array.from(this.userSocketMap.entries()).find(
        ([, socketId]) => socketId === client.id,
      )?.[0];
      if (userId) {
        this.userSocketMap.delete(userId);
        this.logger.log(`👋 Client disconnected: ${client.id}, userId: ${userId}`);
      }
    }
  }

  /**
   * Join role-specific rooms
   */
  private async joinRoleRooms(client: Socket, user: any) {
    this.logger.log(`🔍 [DEBUG] User ${user.email} has role: ${user.role}`);
    
    switch (user.role) {
      case Role.ADMIN:
        await client.join('admin-room');
        await client.join('staff-room'); // Admin can see staff notifications too
        this.logger.log(`👑 Admin "${user.email}" joined: admin-room, staff-room`);
        break;
      case Role.STAFF:
        await client.join('staff-room');
        this.logger.log(`👨‍💼 Staff "${user.email}" joined: staff-room`);
        break;
      case Role.CUSTOMER:
        await client.join(`user-${user.id}`);
        this.logger.log(`👤 Customer "${user.email}" joined: user-${user.id}`);
        break;
      default:
        this.logger.warn(`⚠️ Unknown role for ${user.email}: ${user.role}`);
    }
    
    // 🔍 DEBUG: List rooms client is in
    const rooms = Array.from(client.rooms);
    this.logger.log(`🔍 [DEBUG] ${user.email} is now in rooms: ${rooms.join(', ')}`);
  }

  emitBookingStatusChange(
    userId: number,
    payload: {
      bookingId: number;
      newStatus: string;
      message: string;
    },
  ) {
    const socketId = this.userSocketMap.get(userId);
    this.logger.debug(
      `Attempting to emit to user ${userId}, socketId: ${socketId}, connected users: ${Array.from(this.userSocketMap.keys()).join(', ')}`,
    );

    if (socketId) {
      this.server.to(socketId).emit('booking:status-changed', payload);
      this.logger.log(
        `✅ Emitted 'booking:status-changed' to user ${userId} (socket: ${socketId}): ${payload.message}`,
      );
    } else {
      this.logger.warn(
        `⚠️ Cannot emit to user ${userId}: Socket not found. Connected users: ${this.userSocketMap.size}`,
      );
    }
  }

  emitRefund(
    userId: number,
    payload: {
      bookingId: number;
      refundAmount: number;
      refundPercentage: number;
      newWalletBalance: number | null;
    },
  ) {
    const socketId = this.userSocketMap.get(userId);
    if (socketId) {
      this.server.to(socketId).emit('booking:refund-received', payload);
      this.logger.log(`Emitted refund to user ${userId}`);
    }
  }

  emitNotification(
    userId: number,
    notification: {
      type: 'success' | 'error' | 'warning' | 'info';
      title: string;
      message: string;
    },
  ) {
    const socketId = this.userSocketMap.get(userId);
    if (socketId) {
      this.server.to(socketId).emit('notification', notification);
      this.logger.log(
        `Emitted notification to user ${userId}: ${notification.title}`,
      );
    }
  }

  broadcastCourtStatusUpdate(courtId: number, status: string) {
    this.server.emit('court:status-update', { courtId, status });
    this.logger.log(`Broadcasted court status: Court ${courtId} = ${status}`);
  }

  /**
   * 🔔 NEW: Emit notification to specific user
   */
  emitToUser(userId: number, event: string, data: any) {
    // Try room-based first (if user connected via JWT)
    this.server.to(`user-${userId}`).emit(event, data);
    
    // Fallback to direct socket (legacy)
    const socketId = this.userSocketMap.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
    }
    
    this.logger.log(`📤 Emitted '${event}' to user-${userId}`);
  }

  /**
   * 🔔 NEW: Emit notification to all staff
   */
  emitToStaff(event: string, data: any) {
    this.server.to('staff-room').emit(event, data);
    this.logger.log(`📤 Emitted '${event}' to staff-room`);
  }

  /**
   * 🔔 NEW: Emit notification to all admins
   */
  emitToAdmin(event: string, data: any) {
    this.server.to('admin-room').emit(event, data);
    this.logger.log(`📤 Emitted '${event}' to admin-room`);
  }

  /**
   * 🔔 NEW: Emit notification to both staff and admin
   */
  async emitToStaffAndAdmin(event: string, data: any) {
    // 🔍 DEBUG: Check room sizes
    const staffRoom = this.server.in('staff-room');
    const adminRoom = this.server.in('admin-room');
    
    const staffSockets = await staffRoom.fetchSockets();
    const adminSockets = await adminRoom.fetchSockets();
    
    this.logger.log(`🔍 [DEBUG] staff-room has ${staffSockets.length} clients`);
    this.logger.log(`🔍 [DEBUG] admin-room has ${adminSockets.length} clients`);
    this.logger.log(`🔍 [DEBUG] Emitting '${event}' with data: ${JSON.stringify(data)}`);
    
    this.server.to('staff-room').to('admin-room').emit(event, data);
    this.logger.log(`📤 Emitted '${event}' to staff-room & admin-room`);
  }

  /**
   * 🔔 NEW: Broadcast to all connected clients
   */
  broadcast(event: string, data: any) {
    this.logger.log(`📢 Broadcasting '${event}' to all connected clients...`);
    this.server.emit(event, data);
    this.logger.log(`✅ Broadcasted '${event}' successfully. Data: ${JSON.stringify(data)}`);
  }

  /**
   * 📅 NEW: Broadcast new booking to all clients for real-time calendar update
   */
  broadcastNewBooking(booking: any) {
    const payload = {
      bookingId: booking.id,
      courtId: booking.courtId,
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: booking.status,
      bookingCode: booking.bookingCode,
    };
    this.logger.log(`📅 Broadcasting new booking: ${booking.bookingCode}`);
    this.broadcast('booking:created', payload);
  }

  /**
   * �🔔 NEW: Subscribe to notifications
   */
  @SubscribeMessage('subscribe:notifications')
  handleSubscribeNotifications(client: Socket) {
    const user = client.data.user;
    if (!user) return;

    this.logger.log(`🔔 ${user.email} subscribed to notifications`);
    client.emit('subscription:confirmed', {
      message: 'Successfully subscribed to notifications',
    });
  }

  /**
   * 🔔 NEW: Mark notification as read
   */
  @SubscribeMessage('notification:mark-read')
  async handleMarkAsRead(client: Socket, payload: { notificationId: number }) {
    const user = client.data.user;
    if (!user) return;

    try {
      await this.prisma.notification.update({
        where: { id: payload.notificationId, userId: user.id },
        data: { isRead: true, readAt: new Date() },
      });

      client.emit('notification:marked-read', {
        notificationId: payload.notificationId,
      });
      
      this.logger.log(`✅ Notification #${payload.notificationId} marked as read by user ${user.id}`);
    } catch (error) {
      this.logger.error(`❌ Failed to mark notification as read: ${error.message}`);
    }
  }
}
