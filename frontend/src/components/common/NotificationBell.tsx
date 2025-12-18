import React, { useState, useRef, useEffect } from 'react';
import { useSocket, Notification, NotificationType } from '../../contexts/SocketContext';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

// ==================== HELPERS ====================

const getTypeIcon = (type: NotificationType): string => {
  switch (type) {
    case 'SUCCESS':
      return '✅';
    case 'WARNING':
      return '⚠️';
    case 'ERROR':
      return '❌';
    case 'INFO':
    default:
      return 'ℹ️';
  }
};

const getTypeBgColor = (type: NotificationType): string => {
  switch (type) {
    case 'SUCCESS':
      return 'bg-green-50 border-green-200';
    case 'WARNING':
      return 'bg-yellow-50 border-yellow-200';
    case 'ERROR':
      return 'bg-red-50 border-red-200';
    case 'INFO':
    default:
      return 'bg-blue-50 border-blue-200';
  }
};

const getTypeTextColor = (type: NotificationType): string => {
  switch (type) {
    case 'SUCCESS':
      return 'text-green-800';
    case 'WARNING':
      return 'text-yellow-800';
    case 'ERROR':
      return 'text-red-800';
    case 'INFO':
    default:
      return 'text-blue-800';
  }
};

const getTypeBadgeColor = (type: NotificationType): string => {
  switch (type) {
    case 'SUCCESS':
      return 'bg-green-100 text-green-700 border-green-300';
    case 'WARNING':
      return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    case 'ERROR':
      return 'bg-red-100 text-red-700 border-red-300';
    case 'INFO':
    default:
      return 'bg-blue-100 text-blue-700 border-blue-300';
  }
};

// ==================== NOTIFICATION ITEM ====================

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: number) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onRead,
}) => {
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
    locale: vi,
  });

  return (
    <div
      onClick={() => !notification.isRead && onRead(notification.id)}
      className={`
        p-4 border-b border-gray-100 cursor-pointer transition-all duration-200
        hover:bg-gray-50
        ${!notification.isRead ? 'bg-blue-50/50' : 'bg-white'}
      `}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div
          className={`
            flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
            ${getTypeBgColor(notification.type)} border
          `}
        >
          <span className="text-lg">{getTypeIcon(notification.type)}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4
              className={`
                text-sm font-semibold truncate
                ${!notification.isRead ? 'text-gray-900' : 'text-gray-600'}
              `}
            >
              {notification.title}
            </h4>
            {!notification.isRead && (
              <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1.5 animate-pulse" />
            )}
          </div>

          <p
            className={`
              text-sm mb-2 whitespace-pre-line
              ${!notification.isRead ? 'text-gray-700' : 'text-gray-500'}
            `}
          >
            {notification.message}
          </p>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{timeAgo}</span>

            <span
              className={`
                text-xs px-2 py-0.5 rounded-full border
                ${getTypeBadgeColor(notification.type)}
              `}
            >
              {notification.type === 'INFO' && 'Thông tin'}
              {notification.type === 'SUCCESS' && 'Thành công'}
              {notification.type === 'WARNING' && 'Cảnh báo'}
              {notification.type === 'ERROR' && 'Lỗi'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== MAIN COMPONENT ====================

const NotificationBell: React.FC = () => {
  const {
    notifications,
    unreadCount,
    connected,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
  } = useSocket();

  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Refresh notifications when dropdown opens
  useEffect(() => {
    if (showDropdown) {
      refreshNotifications();
    }
  }, [showDropdown, refreshNotifications]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`
          relative p-2 rounded-lg transition-all duration-200
          hover:bg-gray-100 active:scale-95
          ${showDropdown ? 'bg-gray-100' : ''}
        `}
        title={connected ? 'Thông báo' : 'Đang kết nối...'}
      >
        {/* Bell Icon */}
        <svg
          className={`w-6 h-6 ${connected ? 'text-gray-600' : 'text-gray-400'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Badge */}
        {unreadCount > 0 && (
          <span
            className="
              absolute -top-1 -right-1 
              min-w-[20px] h-5 px-1.5
              flex items-center justify-center
              text-xs font-bold text-white
              bg-red-500 rounded-full
              animate-bounce
            "
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* Connection indicator */}
        <span
          className={`
            absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white
            ${connected ? 'bg-green-500' : 'bg-gray-400'}
          `}
        />
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div
          className="
            absolute right-0 mt-2 w-96
            bg-white rounded-xl shadow-2xl border border-gray-200
            z-50 overflow-hidden
            animate-in fade-in slide-in-from-top-2 duration-200
          "
        >
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-lg font-bold flex items-center gap-2">
                🔔 Thông báo
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    markAllAsRead();
                  }}
                  className="text-sm hover:underline opacity-90 hover:opacity-100"
                >
                  Đánh dấu tất cả
                </button>
              )}
            </div>
            <div className="text-sm opacity-90">
              {unreadCount > 0 ? (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  {unreadCount} thông báo chưa đọc
                </span>
              ) : (
                'Không có thông báo mới'
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={markAsRead}
                />
              ))
            ) : (
              <div className="p-8 text-center">
                <div className="text-5xl mb-3">📭</div>
                <div className="text-gray-500 font-medium">
                  Chưa có thông báo
                </div>
                <div className="text-gray-400 text-sm mt-1">
                  Thông báo mới sẽ xuất hiện ở đây
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 bg-gray-50 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowDropdown(false);
                  // Could navigate to full notifications page
                }}
                className="
                  w-full text-sm text-orange-600 hover:text-orange-700
                  font-medium py-2 rounded-lg
                  hover:bg-orange-50 transition-colors
                "
              >
                Xem tất cả ({notifications.length} thông báo)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
