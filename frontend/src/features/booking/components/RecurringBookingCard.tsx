import React, { useState } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface BookingDetail {
  id: number;
  bookingCode: string;
  startTime: string;
  endTime: string;
  status:
    | 'PENDING_PAYMENT'
    | 'CONFIRMED'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'EXPIRED';
  expiresAt?: string | null;
}

interface RecurringBookingCardProps {
  recurrenceGroupId: string;
  courtName: string;
  pattern: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  dayOfWeek: number;
  totalPrice: number;
  bookings: BookingDetail[];
  onCancelGroup?: (groupId: string) => void;
  onPayAll?: (groupId: string) => void;
}

const PATTERN_LABELS: Record<string, string> = {
  WEEKLY: 'Hàng tuần',
  BIWEEKLY: '2 tuần/lần',
  MONTHLY: 'Hàng tháng',
};

const WEEKDAY_LABELS = [
  'Chủ nhật',
  'Thứ 2',
  'Thứ 3',
  'Thứ 4',
  'Thứ 5',
  'Thứ 6',
  'Thứ 7',
];

const STATUS_CONFIG = {
  PENDING_PAYMENT: {
    color: 'orange',
    label: 'Chờ thanh toán',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
  },
  CONFIRMED: {
    color: 'green',
    label: 'Đã xác nhận',
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
  },
  COMPLETED: {
    color: 'blue',
    label: 'Hoàn thành',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  CANCELLED: {
    color: 'gray',
    label: 'Đã hủy',
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-200',
  },
  EXPIRED: {
    color: 'red',
    label: 'Hết hạn',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
  },
};

export const RecurringBookingCard: React.FC<RecurringBookingCardProps> = ({
  recurrenceGroupId,
  courtName,
  pattern,
  dayOfWeek,
  totalPrice,
  bookings,
  onCancelGroup,
  onPayAll,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate summary
  const totalBookings = bookings.length;
  const pendingCount = bookings.filter(
    (b) => b.status === 'PENDING_PAYMENT',
  ).length;
  const confirmedCount = bookings.filter(
    (b) => b.status === 'CONFIRMED',
  ).length;
  const completedCount = bookings.filter(
    (b) => b.status === 'COMPLETED',
  ).length;
  const cancelledCount = bookings.filter(
    (b) => b.status === 'CANCELLED',
  ).length;
  const expiredCount = bookings.filter((b) => b.status === 'EXPIRED').length;

  // Calculate total duration
  const firstBooking = bookings[0];
  const duration = firstBooking
    ? (new Date(firstBooking.endTime).getTime() -
        new Date(firstBooking.startTime).getTime()) /
      (1000 * 60 * 60)
    : 0;
  const totalHours = duration * totalBookings;

  // Get time range
  const timeRange = firstBooking
    ? `${format(new Date(firstBooking.startTime), 'HH:mm')} - ${format(new Date(firstBooking.endTime), 'HH:mm')}`
    : '';

  // Determine main status
  const getMainStatus = () => {
    if (expiredCount === totalBookings) return 'EXPIRED';
    if (cancelledCount === totalBookings) return 'CANCELLED';
    if (completedCount === totalBookings) return 'COMPLETED';
    if (confirmedCount === totalBookings) return 'CONFIRMED';
    if (pendingCount > 0) return 'PENDING_PAYMENT';
    return 'CONFIRMED';
  };

  const mainStatus = getMainStatus();
  const statusConfig = STATUS_CONFIG[mainStatus];

  // Calculate remaining time for first pending booking
  const firstPending = bookings.find(
    (b) => b.status === 'PENDING_PAYMENT' && b.expiresAt,
  );
  const getRemainingTime = () => {
    if (!firstPending?.expiresAt) return null;
    const now = Date.now();
    const expires = new Date(firstPending.expiresAt).getTime();
    const remaining = Math.max(0, Math.floor((expires - now) / 1000));
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  const [remainingTime, setRemainingTime] = useState(getRemainingTime());

  React.useEffect(() => {
    if (!firstPending?.expiresAt) return;
    const interval = setInterval(() => {
      setRemainingTime(getRemainingTime());
    }, 1000);
    return () => clearInterval(interval);
  }, [firstPending]);

  return (
    <div
      className={`border-2 ${statusConfig.border} ${statusConfig.bg} rounded-lg overflow-hidden shadow-sm hover:shadow-md transition`}
    >
      {/* Header - Collapsed View */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🔄</span>
              <div>
                <h3 className="font-bold text-lg text-gray-900">{courtName}</h3>
                <p className="text-sm text-gray-600">
                  {WEEKDAY_LABELS[dayOfWeek]} • {PATTERN_LABELS[pattern]} •{' '}
                  {timeRange}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}
              >
                {statusConfig.label}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                📅 {totalBookings} buổi
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                ⏱ {totalHours}h total
              </span>
              {pendingCount > 0 && remainingTime && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200 animate-pulse">
                  ⏰ {remainingTime}
                </span>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-600">Tổng tiền: </span>
                <span className="text-xl font-bold text-purple-600">
                  {new Intl.NumberFormat('vi-VN', {
                    style: 'currency',
                    currency: 'VND',
                  }).format(totalPrice)}
                </span>
              </div>

              {/* Status summary */}
              <div className="text-xs text-gray-600 space-y-1">
                {pendingCount > 0 && (
                  <div>⏳ {pendingCount} chờ thanh toán</div>
                )}
                {confirmedCount > 0 && (
                  <div>✅ {confirmedCount} đã xác nhận</div>
                )}
                {completedCount > 0 && (
                  <div>🏆 {completedCount} hoàn thành</div>
                )}
                {cancelledCount > 0 && <div>❌ {cancelledCount} đã hủy</div>}
                {expiredCount > 0 && <div>⏰ {expiredCount} hết hạn</div>}
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium"
          >
            {isExpanded ? '▲ Thu gọn' : '▼ Xem chi tiết'}
          </button>

          {pendingCount > 0 && onPayAll && (
            <button
              onClick={() => onPayAll(recurrenceGroupId)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
            >
              💰 Thanh toán tất cả
            </button>
          )}

          {(pendingCount > 0 || confirmedCount > 0) && onCancelGroup && (
            <button
              onClick={() => onCancelGroup(recurrenceGroupId)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
            >
              🗑 Hủy toàn bộ
            </button>
          )}
        </div>
      </div>

      {/* Expanded View - Booking Details */}
      {isExpanded && (
        <div className="border-t-2 border-gray-200 bg-white p-4">
          <h4 className="font-semibold text-gray-800 mb-3">
            Chi tiết từng buổi:
          </h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {bookings.map((booking, idx) => {
              const config = STATUS_CONFIG[booking.status];
              return (
                <div
                  key={booking.id}
                  className={`border ${config.border} ${config.bg} rounded-lg p-3 flex items-center justify-between`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        Buổi {idx + 1}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.text} border ${config.border}`}
                      >
                        {config.label}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      📅{' '}
                      {format(new Date(booking.startTime), 'EEEE, dd/MM/yyyy', {
                        locale: vi,
                      })}
                    </div>
                    <div className="text-sm text-gray-600">
                      ⏰ {format(new Date(booking.startTime), 'HH:mm')} -{' '}
                      {format(new Date(booking.endTime), 'HH:mm')}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Mã:{' '}
                      <code className="bg-gray-100 px-1 py-0.5 rounded">
                        {booking.bookingCode}
                      </code>
                    </div>
                  </div>

                  {booking.status === 'PENDING_PAYMENT' &&
                    booking.expiresAt && (
                      <div className="text-right">
                        <div className="text-xs text-orange-600 font-medium">
                          Hết hạn sau:
                        </div>
                        <div className="text-lg font-bold text-orange-700">
                          {format(new Date(booking.expiresAt), 'HH:mm:ss')}
                        </div>
                      </div>
                    )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-600">
              <strong>Mã nhóm:</strong>{' '}
              <code className="bg-white px-2 py-1 rounded border border-gray-300 text-xs">
                {recurrenceGroupId}
              </code>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecurringBookingCard;
