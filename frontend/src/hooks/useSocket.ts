import { useEffect, useRef } from 'react';
import {
  socketService,
  BookingStatusPayload,
  RefundNotificationPayload,
} from '@/services/socket.service';
import { useAuthStore } from '@/store/authStore';

export const useSocket = () => {
  const { user } = useAuthStore();
  const hasConnected = useRef(false);

  useEffect(() => {
    if (user && !hasConnected.current) {
      socketService.connect(user.id);
      hasConnected.current = true;
    }

    return () => {
      if (!user) {
        socketService.disconnect();
        hasConnected.current = false;
      }
    };
  }, [user]);

  return socketService;
};

export const useBookingEvents = (callbacks: {
  onStatusChange?: (payload: BookingStatusPayload) => void;
  onRefund?: (payload: RefundNotificationPayload) => void;
  onNotification?: (notification: any) => void;
}) => {
  const socket = useSocket();

  useEffect(() => {
    if (callbacks.onStatusChange) {
      socket.onBookingStatusChange(callbacks.onStatusChange);
    }

    if (callbacks.onRefund) {
      socket.onRefundReceived(callbacks.onRefund);
    }

    if (callbacks.onNotification) {
      socket.onNotification(callbacks.onNotification);
    }

    return () => {
      socket.offBookingStatusChange();
      socket.offRefundReceived();
      socket.offNotification();
    };
  }, [socket, callbacks]);

  return socket;
};
