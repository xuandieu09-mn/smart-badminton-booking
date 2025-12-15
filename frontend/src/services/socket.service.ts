import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';

const SOCKET_URL =
  import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';

export interface BookingStatusPayload {
  bookingId: number;
  bookingCode: string;
  userId: number;
  status: string;
  previousStatus?: string;
  message: string;
  timestamp: Date;
}

export interface RefundNotificationPayload {
  bookingId: number;
  bookingCode: string;
  userId: number;
  refundAmount: number;
  refundPercentage: number;
  refundReason: string;
  newWalletBalance?: number;
  timestamp: Date;
}

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(userId: number) {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return this.socket;
    }

    this.socket = io(`${SOCKET_URL}/events`, {
      query: { userId: userId.toString() },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.disconnect();
      }
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('Socket disconnected manually');
    }
  }

  onBookingStatusChange(callback: (payload: BookingStatusPayload) => void) {
    this.socket?.on('booking:status-changed', callback);
  }

  onRefundReceived(callback: (payload: RefundNotificationPayload) => void) {
    this.socket?.on('booking:refund-received', callback);
  }

  onNotification(
    callback: (notification: {
      type: 'success' | 'info' | 'warning' | 'error';
      title: string;
      message: string;
      data?: any;
    }) => void,
  ) {
    this.socket?.on('notification', callback);
  }

  onBookingUpdate(
    callback: (payload: {
      bookingId: number;
      courtId: number;
      action: 'created' | 'updated' | 'cancelled';
      booking?: any;
    }) => void,
  ) {
    this.socket?.on('booking:updated', callback);
  }

  offBookingStatusChange() {
    this.socket?.off('booking:status-changed');
  }

  offRefundReceived() {
    this.socket?.off('booking:refund-received');
  }

  offNotification() {
    this.socket?.off('notification');
  }

  offBookingUpdate() {
    this.socket?.off('booking:updated');
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketService = new SocketService();

// Auto-connect when user logs in
const authStore = useAuthStore.getState();
if (authStore.user?.id) {
  socketService.connect(authStore.user.id);
}

// Listen for auth changes
useAuthStore.subscribe((state, prevState) => {
  if (state.user && !prevState.user) {
    // User logged in
    socketService.connect(state.user.id);
  } else if (!state.user && prevState.user) {
    // User logged out
    socketService.disconnect();
  }
});
