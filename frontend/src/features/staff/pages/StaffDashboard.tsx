import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { isToday, format, startOfDay, endOfDay, differenceInHours } from 'date-fns';

const API = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000,
});

interface Booking {
  id: number;
  bookingCode: string;
  courtId: number;
  startTime: string;
  endTime: string;
  status: string;
  totalPrice: number;
  guestName?: string;
  guestPhone?: string;
  checkInAt?: string | null;
  user?: {
    id: number;
    name: string;
    email: string;
  };
  court?: {
    id: number;
    name: string;
    courtNumber: number;
  };
}

// Display status types
type DisplayStatus =
  | 'WAITING'
  | 'PLAYING'
  | 'LATE'
  | 'PENDING'
  | 'COMPLETED'
  | 'CANCELLED';

// Status configuration
const DISPLAY_STATUS_CONFIG: Record<
  DisplayStatus,
  {
    label: string;
    color: string;
    icon: string;
    showCheckInBtn: boolean;
  }
> = {
  WAITING: {
    label: 'Chờ khách đến',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: '⏳',
    showCheckInBtn: false,
  },
  READY: {
    label: 'Sẵn sàng',
    color: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    icon: '✅',
    showCheckInBtn: true,
  },
  PLAYING: {
    label: 'Đang chơi',
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: '🎾',
    showCheckInBtn: false,
  },
  LATE: {
    label: 'Trễ giờ',
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    icon: '⚠️',
    showCheckInBtn: true,
  },
  PENDING: {
    label: 'Chờ thanh toán',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: '💳',
    showCheckInBtn: false,
  },
  COMPLETED: {
    label: 'Hoàn thành',
    color: 'bg-gray-100 text-gray-800 border-gray-300',
    icon: '✅',
    showCheckInBtn: false,
  },
  CANCELLED: {
    label: 'Đã hủy',
    color: 'bg-red-100 text-red-800 border-red-300',
    icon: '❌',
    showCheckInBtn: false,
  },
};

// Calculate display status based on business logic
const calculateDisplayStatus = (booking: Booking): DisplayStatus => {
  const now = new Date();
  const startTime = new Date(booking.startTime);
  const hasCheckedIn = !!booking.checkInAt;

  // Case 1: Already checked in
  if (booking.status === 'CHECKED_IN' || hasCheckedIn) {
    return 'PLAYING';
  }

  // Case 2: CONFIRMED but not checked in yet
  if (booking.status === 'CONFIRMED' && !hasCheckedIn) {
    const timeUntilStart = startTime.getTime() - now.getTime();
    const minutesUntilStart = timeUntilStart / (1000 * 60);

    if (now > startTime) {
      return 'LATE'; // Past start time
    }
    
    if (minutesUntilStart <= 15) {
      return 'READY'; // Within 15-min window
    }
    
    return 'WAITING'; // Still too early
  }

  // Case 3: Other statuses
  if (booking.status === 'PENDING_PAYMENT') {
    return 'PENDING';
  }

  if (booking.status === 'COMPLETED') {
    return 'COMPLETED';
  }

  if (booking.status === 'CANCELLED') {
    return 'CANCELLED';
  }

  return 'WAITING';
}

export const StaffDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings'>(
    'overview',
  );
  const token = localStorage.getItem('access_token');

  // Fetch all bookings
  const { data: bookingsResponse, isLoading, error } = useQuery({
    queryKey: ['staff', 'bookings'],
    queryFn: async () => {
      const response = await API.get<{ total: number; bookings: Booking[] }>('/bookings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('📊 Staff Dashboard - Bookings response:', response.data);
      return response.data;
    },
    enabled: !!token,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const bookings = bookingsResponse?.bookings || [];
  const totalBookings = bookingsResponse?.total || 0;

  console.log('📊 Staff Dashboard Stats:', {
    totalBookings,
    bookingsArrayLength: bookings.length,
    token: token ? 'exists' : 'null',
    userRole: user?.role,
  });

  // Calculate stats from bookings (client-side)
  const stats = useMemo(() => {
    const todayBookings = bookings.filter((booking) => {
      const bookingDate = new Date(booking.startTime);
      return isToday(bookingDate);
    });

    const todayBookingsCount = todayBookings.length;

    const pendingPayments = bookings.filter(
      (b) => b.status === 'PENDING_PAYMENT'
    ).length;

    // Calculate display status counts
    const playingCount = todayBookings.filter(
      (b) => calculateDisplayStatus(b) === 'PLAYING'
    ).length;
    const waitingCount = todayBookings.filter(
      (b) => calculateDisplayStatus(b) === 'WAITING'
    ).length;
    const readyCount = todayBookings.filter(
      (b) => calculateDisplayStatus(b) === 'READY'
    ).length;
    const lateCount = todayBookings.filter(
      (b) => calculateDisplayStatus(b) === 'LATE'
    ).length;

    const TOTAL_COURTS = 8;
    const HOURS_PER_DAY = 12;
    const totalAvailableHours = TOTAL_COURTS * HOURS_PER_DAY;

    const hoursBookedToday = todayBookings.reduce((total, booking) => {
      const start = new Date(booking.startTime);
      const end = new Date(booking.endTime);
      const hours = differenceInHours(end, start);
      return total + hours;
    }, 0);

    const occupancyRate = totalAvailableHours > 0 
      ? Math.round((hoursBookedToday / totalAvailableHours) * 100) 
      : 0;

    return {
      todayBookings: todayBookingsCount,
      totalBookings: totalBookings,
      pendingPayments,
      occupancyRate,
      playingCount,
      waitingCount,
      readyCount,
      lateCount,
    };
  }, [bookings, totalBookings]);

  // Filter today's bookings for the table
  const todayBookingsList = useMemo(() => {
    return bookings
      .filter((booking) => isToday(new Date(booking.startTime)))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [bookings]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-semibold mb-2">
            ❌ Lỗi khi tải dữ liệu
          </p>
          <p className="text-red-600 text-sm">
            {(error as Error).message || 'Không thể tải danh sách booking'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!isLoading && bookings.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-semibold text-yellow-900 mb-2">
            ⚠️ Không tìm thấy booking nào
          </h3>
          <div className="text-yellow-800 text-sm space-y-1">
            <p>Có thể do:</p>
            <ul className="list-disc list-inside ml-4">
              <li>Token không hợp lệ (đăng xuất và đăng nhập lại)</li>
              <li>User hiện tại không có quyền Staff/Admin</li>
              <li>Database chưa có booking nào</li>
            </ul>
          </div>
          <div className="mt-4 p-3 bg-white rounded border text-xs font-mono">
            <p><strong>Debug Info:</strong></p>
            <p>Token: {token ? token.substring(0, 30) + '...' : 'null'}</p>
            <p>User: {user?.email}</p>
            <p>Role: {user?.role}</p>
            <p>Total from API: {totalBookings}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Staff Dashboard
        </h1>
        <p className="text-gray-600">
          Chào mừng,{' '}
          <span className="font-semibold">
            {user?.fullName || user?.name || user?.email}
          </span>
        </p>
        <div className="mt-2 text-xs text-gray-500">
          📊 Total: {stats.totalBookings} | Today: {stats.todayBookings} | Playing: {stats.playingCount} | Ready: {stats.readyCount} | Waiting: {stats.waitingCount} | Late: {stats.lateCount}
        </div>
      </div>

      {/* Stats Grid - 4 key metrics for staff */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm mb-1">Booking hôm nay</p>
              <p className="text-2xl font-bold text-gray-800">
                {stats.todayBookings}
              </p>
            </div>
            <div className="bg-blue-500 w-10 h-10 rounded-lg flex items-center justify-center text-xl">
              📅
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm mb-1">Đang chơi</p>
              <p className="text-2xl font-bold text-green-600">
                {stats.playingCount}
              </p>
            </div>
            <div className="bg-green-500 w-10 h-10 rounded-lg flex items-center justify-center text-xl">
              🎾
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm mb-1">Chờ khách</p>
              <p className="text-2xl font-bold text-blue-600">
                {stats.waitingCount}
              </p>
            </div>
            <div className="bg-blue-400 w-10 h-10 rounded-lg flex items-center justify-center text-xl">
              ⏳
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm mb-1">Trễ giờ</p>
              <p className="text-2xl font-bold text-orange-600">
                {stats.lateCount}
              </p>
            </div>
            <div className="bg-orange-500 w-10 h-10 rounded-lg flex items-center justify-center text-xl">
              ⚠️
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📊 Tổng quan
            </button>
            <button
              onClick={() => setActiveTab('bookings')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'bookings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📋 Danh sách booking
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Actions */}
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                  Thao tác nhanh
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button 
                    onClick={() => navigate('/staff/checkin')}
                    className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <div className="text-3xl mb-2">✅</div>
                    <h3 className="font-semibold text-gray-800">
                      Check-in khách
                    </h3>
                    <p className="text-sm text-gray-500">
                      Quét QR code booking
                    </p>
                  </button>

                  <button 
                    onClick={() => navigate('/staff/courts')}
                    className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
                  >
                    <div className="text-3xl mb-2">🏟️</div>
                    <h3 className="font-semibold text-gray-800">
                      Trạng thái sân
                    </h3>
                    <p className="text-sm text-gray-500">
                      Xem sân đang hoạt động
                    </p>
                  </button>

                  <button 
                    onClick={() => navigate('/staff/pos')}
                    className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
                  >
                    <div className="text-3xl mb-2">🛒</div>
                    <h3 className="font-semibold text-gray-800">POS</h3>
                    <p className="text-sm text-gray-500">Bán hàng & chốt ca</p>
                  </button>
                </div>
              </div>

              {/* Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800">
                  <span className="font-semibold">💡 Gợi ý:</span> Nhân viên có
                  thể xem danh sách booking, check-in khách hàng, và quản lý
                  POS. Các tính năng nâng cao sẽ được triển khai trong Day
                  14-18.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'bookings' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  Booking hôm nay ({todayBookingsList.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Giờ
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sân
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Khách hàng
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        SĐT
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Giá
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trạng thái
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hành động
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {todayBookingsList.map((booking) => {
                      const startTime = new Date(booking.startTime);
                      const endTime = new Date(booking.endTime);
                      const customerName = booking.guestName || booking.user?.name || 'N/A';
                      const customerPhone = booking.guestPhone || 'N/A';
                      const courtName = booking.court?.name || `Sân ${booking.courtId}`;

                      // Calculate display status
                      const displayStatus = calculateDisplayStatus(booking);
                      const statusConfig = DISPLAY_STATUS_CONFIG[displayStatus];

                      return (
                        <tr key={booking.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {courtName}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {customerName}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                            {customerPhone}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {booking.totalPrice.toLocaleString('vi-VN')}đ
                          </td>

                          {/* Status badge with new logic */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full border ${statusConfig.color}`}
                            >
                              <span>{statusConfig.icon}</span>
                              <span>{statusConfig.label}</span>
                            </span>
                          </td>

                          {/* Action button with conditional logic */}
                          <td className="px-4 py-4 whitespace-nowrap text-sm">
                            {displayStatus === 'READY' && (
                              <button
                                onClick={() => navigate('/staff/checkin')}
                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded transition-colors bg-cyan-600 hover:bg-cyan-700 text-white"
                              >
                                <span className="mr-1">✅</span>
                                Check-in
                              </button>
                            )}
                            {displayStatus === 'LATE' && (
                              <button
                                onClick={() => navigate('/staff/checkin')}
                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded transition-colors bg-orange-600 hover:bg-orange-700 text-white"
                              >
                                <span className="mr-1">⚠️</span>
                                Check-in
                              </button>
                            )}
                            {displayStatus === 'WAITING' && (
                              <span className="text-xs text-blue-600 italic flex items-center gap-1">
                                <span>⏳</span>
                                <span>Chờ khách đến</span>
                              </span>
                            )}
                            {displayStatus === 'PLAYING' && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                                  <span>🎾</span>
                                  <span>Đang chơi</span>
                                </span>
                                <button
                                  onClick={async () => {
                                    if (!confirm('Xác nhận kết thúc sớm booking này?')) return;
                                    try {
                                      await API.post(`/bookings/${booking.id}/finish`, {}, {
                                        headers: { Authorization: `Bearer ${token}` },
                                      });
                                      alert('Đã kết thúc booking thành công!');
                                      window.location.reload();
                                    } catch (error: any) {
                                      alert('Lỗi: ' + (error.response?.data?.message || error.message));
                                    }
                                  }}
                                  className="inline-flex items-center px-2 py-1 text-xs font-medium rounded transition-colors bg-gray-600 hover:bg-gray-700 text-white"
                                  title="Kết thúc sớm (khách về trước giờ)"
                                >
                                  🏁 Kết thúc
                                </button>
                              </div>
                            )}
                            {displayStatus === 'PENDING' && (
                              <span className="text-xs text-yellow-600 italic">
                                Chờ thanh toán
                              </span>
                            )}
                            {(displayStatus === 'COMPLETED' || displayStatus === 'CANCELLED') && (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {todayBookingsList.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-2">📅</div>
                    <p className="text-gray-500 text-lg font-medium">
                      Chưa có booking nào hôm nay
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      Danh sách sẽ tự động cập nhật khi có booking mới
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
