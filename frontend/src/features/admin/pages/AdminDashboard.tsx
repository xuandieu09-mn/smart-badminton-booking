import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { format } from 'date-fns';
import apiClient from '@/services/api/client';
import DashboardStats from '../components/DashboardStats';
import BookingsList from '../components/BookingsList';
import CourtManagement from '../components/CourtManagement';
import PaymentAnalytics from '../components/PaymentAnalytics';

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

interface RevenueSummary {
  totalRevenue: number;
  bookingRevenue: number;
  posRevenue: number;
  cashRevenue: number;
  onlineRevenue: number;
}

interface RevenueBreakdown {
  bookings: {
    count: number;
    cash: number;
    online: number;
    items: any[];
  };
  sales: {
    count: number;
    cash: number;
    online: number;
    items: any[];
  };
}

interface RevenueData {
  date: string;
  summary: RevenueSummary;
  breakdown: RevenueBreakdown;
}

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'bookings' | 'courts' | 'analytics'
  >('overview');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [revenueLoading, setRevenueLoading] = useState(false);
  const token = localStorage.getItem('access_token');

  const {
    data: stats,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin', 'dashboard-stats'],
    queryFn: async () => {
      const response = await API.get<DashboardData>('/users/dashboard/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    enabled: !!token,
  });

  const { data: bookingsData } = useQuery({
    queryKey: ['admin', 'bookings'],
    queryFn: async () => {
      const response = await API.get('/bookings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    enabled: !!token,
  });

  // Revenue data query
  const { data: revenueData, refetch: refetchRevenue } = useQuery({
    queryKey: ['admin', 'revenue', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      setRevenueLoading(true);
      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const { data } = await apiClient.get(`/revenue/daily?date=${dateStr}`);
        return data as RevenueData;
      } finally {
        setRevenueLoading(false);
      }
    },
    enabled: !!token,
  });

  // Extract bookings array from response (API returns { message, total, bookings })
  const bookings = Array.isArray(bookingsData)
    ? bookingsData
    : (bookingsData?.bookings || []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const StatCard: React.FC<{
    title: string;
    value: number;
    icon: string;
    color: string;
    subtitle?: string;
  }> = ({ title, value, icon, color, subtitle }) => (
    <div className={`bg-gradient-to-br ${color} rounded-xl shadow-lg p-6 text-white`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium opacity-90">{title}</h3>
        <span className="text-3xl">{icon}</span>
      </div>
      <div className="text-3xl font-bold mb-1">{formatCurrency(value)}</div>
      {subtitle && <div className="text-xs opacity-75">{subtitle}</div>}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Bảng điều khiển quản lý
          </h1>
          <p className="text-gray-600 mt-1">
            Theo dõi hoạt động kinh doanh của sân cầu lông
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-3 font-medium text-sm ${
            activeTab === 'overview'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Tổng quan
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`px-4 py-3 font-medium text-sm ${
            activeTab === 'bookings'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Đặt sân
        </button>
        <button
          onClick={() => setActiveTab('courts')}
          className={`px-4 py-3 font-medium text-sm ${
            activeTab === 'courts'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Quản lý sân
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-3 font-medium text-sm ${
            activeTab === 'analytics'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Phân tích
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Revenue Section Header */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                💰 Báo cáo doanh thu
              </h2>
              <p className="text-gray-600">Tổng hợp doanh thu từ đặt sân và bán hàng</p>
            </div>

            {/* Date Picker */}
            <div className="bg-white rounded-lg shadow p-4 md:p-6">
              <label className="block text-sm font-bold text-gray-700 mb-3">
                📅 Chọn ngày xem báo cáo:
              </label>
              <div className="flex gap-3">
                <input
                  type="date"
                  value={format(selectedDate, 'yyyy-MM-dd')}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
                <button
                  onClick={() => refetchRevenue()}
                  disabled={revenueLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {revenueLoading ? '🔄 Đang tải...' : '🔍 Xem báo cáo'}
                </button>
              </div>
            </div>

            {revenueData && (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <StatCard
                    title="Tổng doanh thu"
                    value={revenueData.summary.totalRevenue}
                    icon="💎"
                    color="from-purple-500 to-indigo-600"
                    subtitle={`${revenueData.breakdown.bookings.count + revenueData.breakdown.sales.count} giao dịch`}
                  />
                  <StatCard
                    title="Doanh thu đặt sân"
                    value={revenueData.summary.bookingRevenue}
                    icon="🏸"
                    color="from-blue-500 to-cyan-600"
                    subtitle={`${revenueData.breakdown.bookings.count} bookings`}
                  />
                  <StatCard
                    title="Doanh thu bán hàng"
                    value={revenueData.summary.posRevenue}
                    icon="🛒"
                    color="from-green-500 to-emerald-600"
                    subtitle={`${revenueData.breakdown.sales.count} đơn hàng`}
                  />
                </div>

                {/* Payment Method Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <span>💵</span>
                      <span>Tiền mặt</span>
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Tổng cộng</span>
                        <span className="text-2xl font-bold text-green-600">
                          {formatCurrency(revenueData.summary.cashRevenue)}
                        </span>
                      </div>
                      <div className="border-t pt-2 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Đặt sân</span>
                          <span className="font-medium">{revenueData.breakdown.bookings.cash} bookings</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Bán hàng</span>
                          <span className="font-medium">{revenueData.breakdown.sales.cash} đơn</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <span>💳</span>
                      <span>Chuyển khoản Online</span>
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Tổng cộng</span>
                        <span className="text-2xl font-bold text-blue-600">
                          {formatCurrency(revenueData.summary.onlineRevenue)}
                        </span>
                      </div>
                      <div className="border-t pt-2 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Đặt sân</span>
                          <span className="font-medium">{revenueData.breakdown.bookings.online} bookings</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Bán hàng</span>
                          <span className="font-medium">{revenueData.breakdown.sales.online} đơn</span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 mt-2">
                        * Bao gồm VNPAY, MOMO, WALLET
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transaction Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Bookings */}
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <span>🏸</span>
                      <span>Chi tiết đặt sân ({revenueData.breakdown.bookings.count})</span>
                    </h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {revenueData.breakdown.bookings.items.length > 0 ? (
                        revenueData.breakdown.bookings.items.map((booking: any) => (
                          <div
                            key={booking.id}
                            className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                          >
                            <div>
                              <div className="font-medium text-gray-900">
                                {booking.bookingCode}
                              </div>
                              <div className="text-xs text-gray-500">
                                {booking.guestName || booking.user?.name || 'N/A'} •{' '}
                                {booking.paymentMethod === 'CASH' ? '💵 Cash' : '💳 Online'}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-indigo-600">
                                {formatCurrency(Number(booking.totalPrice))}
                              </div>
                              <div className="text-xs text-gray-500">
                                {format(new Date(booking.createdAt), 'HH:mm')}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-400 text-center py-8">Chưa có booking nào</p>
                      )}
                    </div>
                  </div>

                  {/* Sales */}
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <span>🛒</span>
                      <span>Chi tiết bán hàng ({revenueData.breakdown.sales.count})</span>
                    </h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {revenueData.breakdown.sales.items.length > 0 ? (
                        revenueData.breakdown.sales.items.map((sale: any) => (
                          <div
                            key={sale.id}
                            className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                          >
                            <div>
                              <div className="font-medium text-gray-900">
                                {sale.saleCode}
                              </div>
                              <div className="text-xs text-gray-500">
                                {sale.customerName || 'Khách vãng lai'} •{' '}
                                {sale.paymentMethod === 'CASH' ? '💵 Cash' : '💳 Online'}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-green-600">
                                {formatCurrency(Number(sale.totalAmount))}
                              </div>
                              <div className="text-xs text-gray-500">
                                {format(new Date(sale.createdAt), 'HH:mm')}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-400 text-center py-8">Chưa có đơn hàng nào</p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'bookings' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Quản lý đặt sân
            </h2>
            <BookingsList bookings={bookings || []} isEditable={true} />
          </div>
        )}

        {activeTab === 'courts' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Quản lý sân cầu lông
            </h2>
            <CourtManagement />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Phân tích doanh thu
            </h2>
            <PaymentAnalytics />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
