import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: 'events',
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private userSocketMap = new Map<number, string>();

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      this.userSocketMap.set(Number(userId), client.id);
      this.logger.log(`Client connected: ${client.id}, userId: ${userId}`);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = Array.from(this.userSocketMap.entries()).find(
      ([, socketId]) => socketId === client.id,
    )?.[0];
    if (userId) {
      this.userSocketMap.delete(userId);
      this.logger.log(`Client disconnected: ${client.id}, userId: ${userId}`);
    }
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
}
