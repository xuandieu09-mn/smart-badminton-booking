import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  metadata?: any;
  createdAt: string;
  isRead: boolean;
}

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  notifications: Notification[];
  unreadCount: number;
  connect: () => void;
  disconnect: () => void;
  markAsRead: (notificationId: number) => void;
  markAllAsRead: () => void;
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('❌ No token found, cannot connect to socket');
      return;
    }

    const newSocket = io('http://localhost:3000/events', {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: maxReconnectAttempts,
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
      setConnected(true);
      reconnectAttempts.current = 0;
      
      // Subscribe to notifications
      newSocket.emit('subscribe:notifications');
    });

    newSocket.on('connected', (data: any) => {
      console.log('📡 Connection confirmed:', data);
      toast.success('Kết nối thành công!', { duration: 2000 });
    });

    newSocket.on('disconnect', () => {
      console.log('👋 Socket disconnected');
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      reconnectAttempts.current++;
      
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        toast.error('Không thể kết nối đến server. Vui lòng thử lại sau.');
      }
    });

    // Notification events
    newSocket.on('notification:new', (notification: any) => {
      console.log('🔔 New notification:', notification);
      
      // Add to list
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Play notification sound
      try {
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {}); // Ignore if autoplay blocked
      } catch (e) {}

      // Show toast based on type
      const toastType = notification.type?.toLowerCase() || 'info';
      const emoji = {
        success: '✅',
        warning: '⚠️',
        error: '❌',
        info: 'ℹ️',
      }[toastType] || '🔔';

      const message = `${emoji} ${notification.title}\n${notification.message}`;
      
      // High priority for warnings (cancellations)
      if (toastType === 'warning') {
        toast.error(message, { 
          duration: 10000, // 10 seconds for cancellation
          icon: '🚨',
          style: {
            background: '#FEF2F2',
            color: '#991B1B',
            border: '2px solid #F87171',
            fontWeight: 'bold',
          }
        });
      } else if (toastType === 'success') {
        toast.success(message, { duration: 5000 });
      } else if (toastType === 'error') {
        toast.error(message, { duration: 6000 });
      } else {
        toast(message, { duration: 4000 });
      }
    });

    newSocket.on('booking:status-changed', (data: any) => {
      console.log('📦 Booking status changed:', data);
      toast.success(`${data.message}`, { duration: 3000 });
    });

    newSocket.on('booking:refund-received', (data: any) => {
      console.log('💸 Refund received:', data);
      const amount = new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
      }).format(data.refundAmount);
      
      toast.success(
        `💸 Hoàn tiền ${amount} đã được chuyển vào ví của bạn!`,
        { duration: 5000 }
      );
    });

    newSocket.on('court:status-update', (data: any) => {
      console.log('🏟️ Court status updated:', data);
    });

    newSocket.on('subscription:confirmed', (data: any) => {
      console.log('✅ Subscription confirmed:', data);
    });

    // 📅 Real-time booking events for calendar updates
    newSocket.on('booking:created', (data: any) => {
      console.log('�🔔🔔 [SocketContext] RECEIVED booking:created from server:', data);
      // Trigger a custom event that Calendar page can listen to
      window.dispatchEvent(new CustomEvent('booking-created', { detail: data }));
      console.log('📢 [SocketContext] Dispatched window event: booking-created');
    });

    newSocket.on('booking:updated', (data: any) => {
      console.log('🔔🔔🔔 [SocketContext] RECEIVED booking:updated from server:', data);
      window.dispatchEvent(new CustomEvent('booking-updated', { detail: data }));
      console.log('📢 [SocketContext] Dispatched window event: booking-updated');
    });

    newSocket.on('booking:cancelled', (data: any) => {
      console.log('🔔🔔🔔 [SocketContext] RECEIVED booking:cancelled from server:', data);
      window.dispatchEvent(new CustomEvent('booking-cancelled', { detail: data }));
      console.log('📢 [SocketContext] Dispatched window event: booking-cancelled');
    });

    setSocket(newSocket);

    return newSocket;
  };

  const disconnect = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setConnected(false);
    }
  };

  const markAsRead = (notificationId: number) => {
    if (!socket) return;

    socket.emit('notification:mark-read', { notificationId });
    
    // Optimistically update UI
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId ? { ...n, isRead: true } : n
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    // Call API to mark all as read
    fetch('http://localhost:3000/api/notifications/read-all', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    })
      .then(() => {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, isRead: true }))
        );
        setUnreadCount(0);
        toast.success('Đã đánh dấu tất cả là đã đọc');
      })
      .catch((error) => {
        console.error('Failed to mark all as read:', error);
        toast.error('Không thể đánh dấu đã đọc');
      });
  };

  // Auto-connect when user is logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !socket) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, []);

  // Fetch initial notifications
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    Promise.all([
      fetch('http://localhost:3000/api/notifications?limit=20', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).then((res) => res.json()),
      fetch('http://localhost:3000/api/notifications/unread-count', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).then((res) => res.json()),
    ])
      .then(([notifs, countData]) => {
        setNotifications(notifs || []);
        setUnreadCount(countData.count || 0);
      })
      .catch((error) => {
        console.error('Failed to fetch notifications:', error);
      });
  }, []);

  const value: SocketContextValue = {
    socket,
    connected,
    notifications,
    unreadCount,
    connect,
    disconnect,
    markAsRead,
    markAllAsRead,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};
