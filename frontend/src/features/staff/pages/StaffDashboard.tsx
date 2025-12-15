import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000,
});

interface DashboardData {
  totalBookings: number;
  totalRevenue: number;
  totalUsers: number;
  occupancyRate: number;
  todayBookings: number;
  pendingPayments: number;
}

interface Booking {
  id: number;
  bookingCode: string;
  courtId: number;
  startTime: string;
  endTime: string;
  status: string;
  totalPrice: number;
  user?: {
    fullName: string;
    email: string;
  };
}

export const StaffDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings'>(
    'overview',
  );
  const token = localStorage.getItem('token');

  // Fetch dashboard stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['staff', 'dashboard-stats'],
    queryFn: async () => {
      const response = await API.get<DashboardData>('/users/dashboard/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    enabled: !!token,
  });

  // Fetch today's bookings
  const { data: bookings = [] } = useQuery({
    queryKey: ['staff', 'bookings'],
    queryFn: async () => {
      const response = await API.get<Booking[]>('/bookings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    enabled: !!token,
  });

  // Helper function to get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800';
      case 'PENDING_PAYMENT':
        return 'bg-yellow-100 text-yellow-800';
      case 'CHECKED_IN':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
      </div>

      {/* Stats Grid - 4 key metrics for staff */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm mb-1">Booking hôm nay</p>
              <p className="text-3xl font-bold text-gray-800">
                {stats?.todayBookings || 0}
              </p>
            </div>
            <div className="bg-blue-500 w-12 h-12 rounded-lg flex items-center justify-center text-2xl">
              📅
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm mb-1">Tổng booking</p>
              <p className="text-3xl font-bold text-gray-800">
                {stats?.totalBookings || 0}
              </p>
            </div>
            <div className="bg-green-500 w-12 h-12 rounded-lg flex items-center justify-center text-2xl">
              📊
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm mb-1">Chờ thanh toán</p>
              <p className="text-3xl font-bold text-gray-800">
                {stats?.pendingPayments || 0}
              </p>
            </div>
            <div className="bg-yellow-500 w-12 h-12 rounded-lg flex items-center justify-center text-2xl">
              ⏰
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm mb-1">Công suất</p>
              <p className="text-3xl font-bold text-gray-800">
                {stats?.occupancyRate || 0}%
              </p>
            </div>
            <div className="bg-purple-500 w-12 h-12 rounded-lg flex items-center justify-center text-2xl">
              📈
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
                  <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
                    <div className="text-3xl mb-2">✅</div>
                    <h3 className="font-semibold text-gray-800">
                      Check-in khách
                    </h3>
                    <p className="text-sm text-gray-500">
                      Quét QR code booking
                    </p>
                  </button>

                  <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors">
                    <div className="text-3xl mb-2">🏟️</div>
                    <h3 className="font-semibold text-gray-800">
                      Trạng thái sân
                    </h3>
                    <p className="text-sm text-gray-500">
                      Xem sân đang hoạt động
                    </p>
                  </button>

                  <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors">
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
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Danh sách booking
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Mã booking
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Khách hàng
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Thời gian
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Giá
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trạng thái
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bookings.slice(0, 10).map((booking) => (
                      <tr key={booking.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {booking.bookingCode}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {booking.user?.fullName ||
                            booking.user?.email ||
                            'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(booking.startTime).toLocaleString('vi-VN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {booking.totalPrice.toLocaleString('vi-VN')} VND
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(booking.status)}`}
                          >
                            {booking.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {bookings.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Chưa có booking nào
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
