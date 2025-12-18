import React, { useState } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useSocket();
  const [showDropdown, setShowDropdown] = useState(false);

  const getTypeIcon = (type: string) => {
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

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'SUCCESS':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'WARNING':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'ERROR':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'INFO':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
      >
        <span className="text-2xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />

          {/* Dropdown Content */}
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[600px] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-bold text-gray-900">
                  🔔 Thông báo
                </h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Đánh dấu tất cả
                  </button>
                )}
              </div>
              <div className="text-sm text-gray-500">
                {unreadCount > 0
                  ? `${unreadCount} thông báo chưa đọc`
                  : 'Không có thông báo mới'}
              </div>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1">
              {notifications.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => {
                        if (!notification.isRead) {
                          markAsRead(notification.id);
                        }
                      }}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition ${
                        !notification.isRead ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        {/* Icon */}
                        <div className="flex-shrink-0 text-2xl">
                          {getTypeIcon(notification.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4
                              className={`text-sm font-semibold ${
                                !notification.isRead
                                  ? 'text-gray-900'
                                  : 'text-gray-700'
                              }`}
                            >
                              {notification.title}
                            </h4>
                            {!notification.isRead && (
                              <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-1" />
                            )}
                          </div>

                          <p className="text-sm text-gray-600 mb-2">
                            {notification.message}
                          </p>

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                              {formatDistanceToNow(
                                new Date(notification.createdAt),
                                { addSuffix: true, locale: vi }
                              )}
                            </span>

                            {/* Type Badge */}
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full border ${getTypeColor(
                                notification.type
                              )}`}
                            >
                              {notification.type}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <div className="text-4xl mb-2">📭</div>
                  <div className="text-sm">Chưa có thông báo</div>
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    // Navigate to notifications page if exists
                  }}
                  className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium py-2"
                >
                  Xem tất cả thông báo
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
