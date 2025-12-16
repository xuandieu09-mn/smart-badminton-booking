import React, { useState, useEffect } from 'react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import apiClient from '../../../services/api/client';

interface Payment {
  id: number;
  bookingId: number;
  amount: number;
  method: string;
  status: string;
  paidAt: string | null;
  transactionId: string | null;
  createdAt: string;
  booking?: {
    id: number;
    bookingCode: string;
    user?: {
      name: string;
      email: string;
    };
    guestName?: string;
    court: {
      name: string;
    };
  };
}

interface PaymentStats {
  total: number;
  paid: number;
  unpaid: number;
  refunded: number;
  totalAmount: number;
  paidAmount: number;
}

const AdminPaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats>({
    total: 0,
    paid: 0,
    unpaid: 0,
    refunded: 0,
    totalAmount: 0,
    paidAmount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [payments, statusFilter, methodFilter, startDate, endDate]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      // Get all bookings (Staff/Admin endpoint: GET /bookings)
      const { data } = await apiClient.get('/bookings');

      // Extract payments from bookings (avoid duplicates)
      const allPayments: Payment[] = [];
      const seenBookingIds = new Set<number>();
      
      data.bookings?.forEach((booking: any) => {
        // Skip if already processed or no payment info
        if (seenBookingIds.has(booking.id) || (!booking.paymentMethod && !booking.payment)) {
          return;
        }
        seenBookingIds.add(booking.id);

        // Handle both cases: Payment table exists OR payment info in Booking
        if (booking.payment) {
          // Use separate Payment table data
          allPayments.push({
            ...booking.payment,
            booking: {
              id: booking.id,
              bookingCode: booking.bookingCode,
              user: booking.user,
              guestName: booking.guestName,
              court: booking.court,
            },
          });
        } else if (booking.paymentMethod) {
          // Fallback to payment info in Booking table
          allPayments.push({
            id: booking.id,
            bookingId: booking.id,
            amount: booking.totalPrice || 0,
            method: booking.paymentMethod,
            status: booking.paymentStatus || 'UNPAID',
            paidAt: booking.paymentStatus === 'PAID' ? booking.updatedAt : null,
            transactionId: null,
            createdAt: booking.createdAt,
            booking: {
              id: booking.id,
              bookingCode: booking.bookingCode,
              user: booking.user,
              guestName: booking.guestName,
              court: booking.court,
            },
          });
        }
      });

      setPayments(allPayments);
      calculateStats(allPayments);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      alert('❌ Không thể tải dữ liệu thanh toán');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = payments;

    // Filter by date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59);

    filtered = filtered.filter((p) => {
      const createdDate = new Date(p.createdAt);
      return createdDate >= start && createdDate <= end;
    });

    // Filter by status
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    // Filter by method
    if (methodFilter !== 'ALL') {
      filtered = filtered.filter((p) => p.method === methodFilter);
    }

    setFilteredPayments(filtered);
    calculateStats(filtered);
  };

  const calculateStats = (paymentList: Payment[]) => {
    const stats: PaymentStats = {
      total: paymentList.length,
      paid: paymentList.filter((p) => p.status === 'PAID').length,
      unpaid: paymentList.filter((p) => p.status === 'UNPAID').length,
      refunded: paymentList.filter((p) => p.status === 'REFUNDED').length,
      totalAmount: paymentList.reduce((sum, p) => sum + Number(p.amount), 0),
      paidAmount: paymentList
        .filter((p) => p.status === 'PAID')
        .reduce((sum, p) => sum + Number(p.amount), 0),
    };
    setStats(stats);
  };

  const handleRefund = async () => {
    if (!selectedPayment) return;

    if (!window.confirm(
      `Xác nhận hoàn tiền ${formatCurrency(Number(selectedPayment.amount))} cho booking ${selectedPayment.booking?.bookingCode}?`
    )) {
      return;
    }

    setRefundLoading(true);
    try {
      await apiClient.post(`/payments/${selectedPayment.id}/refund`);
      alert('✅ Hoàn tiền thành công!');
      setShowRefundModal(false);
      setSelectedPayment(null);
      fetchPayments();
    } catch (error: any) {
      console.error('Refund error:', error);
      alert('❌ Lỗi hoàn tiền: ' + (error.response?.data?.message || error.message));
    } finally {
      setRefundLoading(false);
    }
  };

  const exportToCSV = () => {
    const csvHeaders = ['ID', 'Mã booking', 'Khách hàng', 'Số tiền', 'Phương thức', 'Trạng thái', 'Ngày tạo', 'Ngày thanh toán'];
    const csvRows = filteredPayments.map((p) => [
      p.id,
      p.booking?.bookingCode || '',
      p.booking?.user?.name || p.booking?.guestName || 'N/A',
      Number(p.amount),
      getMethodLabel(p.method),
      getStatusLabel(p.status),
      format(new Date(p.createdAt), 'dd/MM/yyyy HH:mm'),
      p.paidAt ? format(new Date(p.paidAt), 'dd/MM/yyyy HH:mm') : 'N/A',
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `payments_${startDate}_${endDate}.csv`;
    link.click();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PAID: 'Đã thanh toán',
      UNPAID: 'Chưa thanh toán',
      REFUNDED: 'Đã hoàn tiền',
      FAILED: 'Thất bại',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PAID: 'bg-green-100 text-green-800',
      UNPAID: 'bg-yellow-100 text-yellow-800',
      REFUNDED: 'bg-gray-100 text-gray-800',
      FAILED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      CASH: '💵 Tiền mặt',
      VNPAY: '💳 VNPay',
      MOMO: '📱 MoMo',
      WALLET: '👛 Ví nội bộ',
    };
    return labels[method] || method;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            💳 Quản lý Thanh toán
          </h1>
          <p className="text-gray-600">
            Theo dõi giao dịch, hoàn tiền, và xuất báo cáo tài chính
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium opacity-90">Tổng giao dịch</h3>
              <span className="text-3xl">📊</span>
            </div>
            <div className="text-3xl font-bold">{stats.total}</div>
            <div className="text-xs opacity-75 mt-1">Trong khoảng thời gian</div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium opacity-90">Đã thanh toán</h3>
              <span className="text-3xl">✅</span>
            </div>
            <div className="text-3xl font-bold">{stats.paid}</div>
            <div className="text-xs opacity-75 mt-1">{formatCurrency(stats.paidAmount)}</div>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium opacity-90">Chưa thanh toán</h3>
              <span className="text-3xl">⏳</span>
            </div>
            <div className="text-3xl font-bold">{stats.unpaid}</div>
            <div className="text-xs opacity-75 mt-1">Cần theo dõi</div>
          </div>

          <div className="bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium opacity-90">Đã hoàn tiền</h3>
              <span className="text-3xl">↩️</span>
            </div>
            <div className="text-3xl font-bold">{stats.refunded}</div>
            <div className="text-xs opacity-75 mt-1">Đã xử lý</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Từ ngày
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Đến ngày
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trạng thái
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              >
                <option value="ALL">Tất cả</option>
                <option value="PAID">Đã thanh toán</option>
                <option value="UNPAID">Chưa thanh toán</option>
                <option value="REFUNDED">Đã hoàn tiền</option>
                <option value="FAILED">Thất bại</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phương thức
              </label>
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              >
                <option value="ALL">Tất cả</option>
                <option value="CASH">Tiền mặt</option>
                <option value="VNPAY">VNPay</option>
                <option value="MOMO">MoMo</option>
                <option value="WALLET">Ví nội bộ</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={fetchPayments}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {loading ? '🔄 Đang tải...' : '🔍 Tìm kiếm'}
            </button>
            <button
              onClick={exportToCSV}
              disabled={filteredPayments.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
            >
              📥 Xuất CSV
            </button>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mã booking
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Khách hàng
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Số tiền
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phương thức
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ngày
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayments.length > 0 ? (
                  filteredPayments.map((payment) => (
                    <tr key={`payment-${payment.bookingId}`} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        #{payment.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {payment.booking?.bookingCode}
                        </div>
                        <div className="text-xs text-gray-500">
                          {payment.booking?.court?.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {payment.booking?.user?.name || payment.booking?.guestName || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {payment.booking?.user?.email || 'Khách vãng lai'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {formatCurrency(Number(payment.amount))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {getMethodLabel(payment.method)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(payment.status)}`}
                        >
                          {getStatusLabel(payment.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {format(new Date(payment.createdAt), 'dd/MM/yyyy')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(payment.createdAt), 'HH:mm')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {payment.status === 'PAID' && (
                          <button
                            onClick={() => {
                              setSelectedPayment(payment);
                              setShowRefundModal(true);
                            }}
                            className="text-red-600 hover:text-red-900 transition"
                          >
                            ↩️ Hoàn tiền
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      {loading ? '🔄 Đang tải dữ liệu...' : '❌ Không tìm thấy giao dịch nào'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Refund Modal */}
        {showRefundModal && selectedPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                ↩️ Xác nhận hoàn tiền
              </h2>

              <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Mã booking:</span>
                  <span className="font-medium">{selectedPayment.booking?.bookingCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Khách hàng:</span>
                  <span className="font-medium">
                    {selectedPayment.booking?.user?.name || selectedPayment.booking?.guestName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Số tiền:</span>
                  <span className="font-bold text-red-600">
                    {formatCurrency(Number(selectedPayment.amount))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Phương thức:</span>
                  <span className="font-medium">{getMethodLabel(selectedPayment.method)}</span>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>Lưu ý:</strong> Tiền sẽ được hoàn vào ví nội bộ của khách hàng.
                  Hành động này không thể hoàn tác.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRefundModal(false);
                    setSelectedPayment(null);
                  }}
                  disabled={refundLoading}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition"
                >
                  Hủy
                </button>
                <button
                  onClick={handleRefund}
                  disabled={refundLoading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
                >
                  {refundLoading ? '⏳ Đang xử lý...' : '✓ Xác nhận hoàn tiền'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPaymentsPage;
