import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import apiClient from '../../../services/api/client';

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

const AdminRevenuePage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRevenue();
  }, [selectedDate]);

  const fetchRevenue = async () => {
    setLoading(true);
    setError(null);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data } = await apiClient.get(`/revenue/daily?date=${dateStr}`);
      setRevenueData(data);
    } catch (err: any) {
      console.error('Failed to fetch revenue:', err);
      setError(err.response?.data?.message || 'Không thể tải dữ liệu doanh thu');
    } finally {
      setLoading(false);
    }
  };

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

  if (loading && !revenueData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            💰 Báo cáo doanh thu
          </h1>
          <p className="text-gray-600">Tổng hợp doanh thu từ đặt sân và bán hàng</p>
        </div>

        {/* Date Picker */}
        <div className="mb-6 bg-white rounded-lg shadow p-4 md:p-6">
          <label className="block text-sm font-bold text-gray-700 mb-3">
            📅 Chọn ngày xem báo cáo:
          </label>
          <input
            type="date"
            value={format(selectedDate, 'yyyy-MM-dd')}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            max={format(new Date(), 'yyyy-MM-dd')}
            className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
          <button
            onClick={fetchRevenue}
            disabled={loading}
            className="ml-3 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {loading ? '🔄 Đang tải...' : '🔍 Xem báo cáo'}
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <p className="text-red-700">❌ {error}</p>
          </div>
        )}

        {revenueData && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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
    </div>
  );
};

export default AdminRevenuePage;
