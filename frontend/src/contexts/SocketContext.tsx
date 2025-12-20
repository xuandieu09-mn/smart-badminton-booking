import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

// ==================== TYPES ====================

export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: NotificationType;
  metadata?: Record<string, any>;
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
  refreshNotifications: () => Promise<void>;
}

// ==================== CONTEXT ====================

const SocketContext = createContext<SocketContextValue | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

// ==================== TOAST HELPERS ====================

const getToastConfig = (type: string, metadata?: Record<string, any>) => {
  // Check for POS sale - override icon
  const icon = metadata?.type === 'POS_SALE' ? '🛒' : undefined;
  
  switch (type?.toUpperCase()) {
    case 'SUCCESS':
      return {
        icon: icon || '✅',
        style: {
          background: '#ECFDF5',
          color: '#065F46',
          border: '1px solid #10B981',
        },
        duration: 5000,
      };
    case 'WARNING':
      return {
        icon: icon || '⚠️',
        style: {
          background: '#FFFBEB',
          color: '#92400E',
          border: '2px solid #F59E0B',
          fontWeight: 'bold' as const,
        },
        duration: 8000,
      };
    case 'ERROR':
      return {
        icon: icon || '❌',
        style: {
          background: '#FEF2F2',
          color: '#991B1B',
          border: '2px solid #EF4444',
          fontWeight: 'bold' as const,
        },
        duration: 10000,
      };
    case 'INFO':
    default:
      return {
        icon: icon || 'ℹ️',
        style: {
          background: '#EFF6FF',
          color: '#1E40AF',
          border: '1px solid #3B82F6',
        },
        duration: 4000,
      };
  }
};

const playNotificationSound = () => {
  try {
    const audio = new Audio('/notification.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch (e) {
    // Ignore audio errors
  }
};

// ==================== ROLE FILTERING ====================

/**
 * 🔒 Filter notifications based on user role
 * Ensures customers don't see staff/admin notifications and vice versa
 */
const shouldShowNotification = (
  notification: Notification,
  userRole: string | null
): boolean => {
  const targetRole = notification.metadata?.targetRole;
  const targetRooms = notification.metadata?.targetRooms as string[] | undefined;

  // If no targetRole specified, show to all (backward compatibility)
  if (!targetRole && !targetRooms) {
    return true;
  }

  // Handle array of target roles
  if (Array.isArray(targetRole)) {
    return targetRole.includes(userRole || '');
  }

  // Handle single target role
  if (typeof targetRole === 'string') {
    // CUSTOMER notifications should only show to CUSTOMER
    if (targetRole === 'CUSTOMER') {
      return userRole === 'CUSTOMER';
    }
    // STAFF notifications should show to STAFF and ADMIN
    if (targetRole === 'STAFF') {
      return userRole === 'STAFF' || userRole === 'ADMIN';
    }
    // ADMIN notifications should show to ADMIN only
    if (targetRole === 'ADMIN') {
      return userRole === 'ADMIN';
    }
  }

  // Check room-based targeting
  if (targetRooms) {
    if (userRole === 'CUSTOMER') {
      // Customers should NOT see staff-room or admin-room notifications
      return !targetRooms.includes('staff-room') && !targetRooms.includes('admin-room');
    }
    if (userRole === 'STAFF') {
      return targetRooms.includes('staff-room');
    }
    if (userRole === 'ADMIN') {
      return targetRooms.includes('admin-room') || targetRooms.includes('staff-room');
    }
  }

  return true;
};

// ==================== PROVIDER ====================

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userRole, setUserRole] = useState<string | null>(null); // Track user role for filtering
  const userRoleRef = useRef<string | null>(null); // Ref for use in socket handlers
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // ==================== FETCH NOTIFICATIONS ====================

  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const [notifsRes, countRes] = await Promise.all([
        fetch('http://localhost:3000/api/notifications?limit=50', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:3000/api/notifications/unread-count', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (notifsRes.ok) {
        const notifs = await notifsRes.json();
        setNotifications(notifs || []);
      }

      if (countRes.ok) {
        const countData = await countRes.json();
        setUnreadCount(countData.count || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, []);

  // ==================== SOCKET CONNECTION ====================

  const connect = useCallback(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.warn('❌ No token found, cannot connect to socket');
      return;
    }

    console.log('🔌 Connecting to WebSocket...');

    const newSocket = io('http://localhost:3000/events', {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: maxReconnectAttempts,
    });

    // ==================== CONNECTION EVENTS ====================

    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
      setConnected(true);
      reconnectAttempts.current = 0;
      newSocket.emit('subscribe:notifications');
    });

    newSocket.on('connected', (data: { userId: number; role: string }) => {
      console.log('📡 Server confirmed:', data);
      setUserRole(data.role); // 🔒 Store user role for notification filtering
      userRoleRef.current = data.role; // Also update ref for socket handlers
      fetchNotifications();
    });

    newSocket.on('disconnect', () => {
      console.log('👋 Socket disconnected');
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      reconnectAttempts.current++;
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        toast.error('Không thể kết nối đến server');
      }
    });

    // ==================== NOTIFICATION EVENTS ====================

    newSocket.on('notification:new', (notification: Notification) => {
      console.log('🔔 New notification received:', notification);

      // 🔒 ROLE-BASED FILTERING: Check if this notification is for current user's role
      const currentRole = userRoleRef.current;
      if (!shouldShowNotification(notification, currentRole)) {
        console.log(`🚫 Notification filtered out (role: ${currentRole}, target: ${notification.metadata?.targetRole})`);
        return; // Skip this notification - not for our role
      }

      console.log(`✅ Notification accepted for role: ${currentRole}`);

      // Add to list (avoid duplicates)
      setNotifications((prev) => {
        const exists = prev.some((n) => n.id === notification.id);
        if (exists) return prev;
        return [notification, ...prev].slice(0, 100);
      });

      // Update unread count
      setUnreadCount((prev) => prev + 1);

      // Play sound
      playNotificationSound();

      // Show toast
      const config = getToastConfig(notification.type, notification.metadata);
      toast(
        <div className="flex flex-col gap-1">
          <strong className="text-sm">{notification.title}</strong>
          <span className="text-xs opacity-80 whitespace-pre-line">
            {notification.message}
          </span>
        </div>,
        config
      );
    });

    newSocket.on(
      'notification:marked-read',
      (data: { notificationId: number }) => {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === data.notificationId ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    );

    // ==================== BOOKING EVENTS ====================

    newSocket.on('booking:created', (data: any) => {
      console.log('📅 Booking created:', data);
      window.dispatchEvent(new CustomEvent('booking-created', { detail: data }));
    });

    newSocket.on('booking:updated', (data: any) => {
      console.log('📅 Booking updated:', data);
      window.dispatchEvent(new CustomEvent('booking-updated', { detail: data }));
    });

    newSocket.on('booking:cancelled', (data: any) => {
      console.log('📅 Booking cancelled:', data);
      window.dispatchEvent(
        new CustomEvent('booking-cancelled', { detail: data })
      );
    });

    newSocket.on('booking:status-changed', (data: any) => {
      console.log('📦 Booking status changed:', data);
      toast.success(data.message, { duration: 3000 });
    });

    newSocket.on('booking:refund-received', (data: any) => {
      console.log('💸 Refund received:', data);
      const amount = new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
      }).format(data.refundAmount);
      toast.success(`💸 Hoàn tiền ${amount} đã chuyển vào ví!`, {
        duration: 5000,
      });
    });

    newSocket.on('court:status-update', (data: any) => {
      console.log('🏟️ Court status updated:', data);
      window.dispatchEvent(
        new CustomEvent('court-status-changed', { detail: data })
      );
    });

    // ==================== ACCOUNT EVENTS ====================

    newSocket.on('account:locked', (data: { reason: string; forceLogout: boolean }) => {
      console.log('🔒 Account locked:', data);
      toast.error(`🔒 Tài khoản đã bị khóa: ${data.reason}`, {
        duration: 10000,
      });
      
      // Force logout if required
      if (data.forceLogout) {
        setTimeout(() => {
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
          window.location.href = '/login?reason=account_locked';
        }, 3000);
      }
    });

    setSocket(newSocket);
    return newSocket;
  }, [fetchNotifications]);

  // ==================== DISCONNECT ====================

  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setConnected(false);
    }
  }, [socket]);

  // ==================== MARK AS READ ====================

  const markAsRead = useCallback(
    (notificationId: number) => {
      if (!socket) return;

      socket.emit('notification:mark-read', { notificationId });

      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    },
    [socket]
  );

  // ==================== MARK ALL AS READ ====================

  const markAllAsRead = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const res = await fetch(
        'http://localhost:3000/api/notifications/read-all',
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
        toast.success('Đã đánh dấu tất cả là đã đọc');
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast.error('Không thể đánh dấu đã đọc');
    }
  }, []);

  // ==================== AUTO-CONNECT ====================

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token && !socket) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, []);

  // ==================== INITIAL FETCH ====================

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // ==================== CONTEXT VALUE ====================

  const value: SocketContextValue = {
    socket,
    connected,
    notifications,
    unreadCount,
    connect,
    disconnect,
    markAsRead,
    markAllAsRead,
    refreshNotifications: fetchNotifications,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};
