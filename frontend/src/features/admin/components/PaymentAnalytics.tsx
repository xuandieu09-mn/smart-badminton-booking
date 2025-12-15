import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface Payment {
  id: number;
  amount: number;
  status: string;
  createdAt: string;
}

const API = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000,
});

const PaymentAnalytics: React.FC = () => {
  const token = localStorage.getItem('token');

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['admin', 'payments'],
    queryFn: async () => {
      const response = await API.get<Payment[]>('/payments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    enabled: !!token,
  });

  const calculateStats = () => {
    const stats = {
      totalRevenue: 0,
      paidAmount: 0,
      refundedAmount: 0,
      pendingAmount: 0,
      failedAmount: 0,
      paymentCount: {
        paid: 0,
        pending: 0,
        refunded: 0,
        failed: 0,
      },
    };

    payments.forEach((payment) => {
      stats.totalRevenue += payment.amount;
      switch (payment.status) {
        case 'PAID':
          stats.paidAmount += payment.amount;
          stats.paymentCount.paid++;
          break;
        case 'UNPAID':
          stats.pendingAmount += payment.amount;
          stats.paymentCount.pending++;
          break;
        case 'REFUNDED':
          stats.refundedAmount += payment.amount;
          stats.paymentCount.refunded++;
          break;
        case 'FAILED':
          stats.failedAmount += payment.amount;
          stats.paymentCount.failed++;
          break;
      }
    });

    return stats;
  };

  if (isLoading) {
    return <div className="text-center py-8">Đang tải dữ liệu...</div>;
  }

  const stats = calculateStats();

  const analyticsCards = [
    {
      label: 'Tổng doanh thu',
      value: `${stats.totalRevenue.toLocaleString('vi-VN')} VND`,
      icon: '💵',
      color: 'bg-green-50 border-green-200',
      textColor: 'text-green-700',
    },
    {
      label: 'Đã thanh toán',
      value: `${stats.paidAmount.toLocaleString('vi-VN')} VND`,
      icon: '✓',
      color: 'bg-blue-50 border-blue-200',
      textColor: 'text-blue-700',
    },
    {
      label: 'Chờ thanh toán',
      value: `${stats.pendingAmount.toLocaleString('vi-VN')} VND`,
      icon: '⏳',
      color: 'bg-yellow-50 border-yellow-200',
      textColor: 'text-yellow-700',
    },
    {
      label: 'Hoàn tiền',
      value: `${stats.refundedAmount.toLocaleString('vi-VN')} VND`,
      icon: '↶',
      color: 'bg-purple-50 border-purple-200',
      textColor: 'text-purple-700',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {analyticsCards.map((card, index) => (
          <div
            key={index}
            className={`${card.color} border rounded-lg p-6 hover:shadow-lg transition-shadow`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  {card.label}
                </p>
                <p className={`text-xl font-bold mt-2 ${card.textColor}`}>
                  {card.value}
                </p>
              </div>
              <span className="text-2xl">{card.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Payment Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Phân bổ trạng thái thanh toán
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Đã thanh toán
                </span>
                <span className="text-sm font-bold text-green-700">
                  {stats.paymentCount.paid} (
                  {stats.paymentCount.paid === 0
                    ? '0%'
                    : (
                        (stats.paymentCount.paid / payments.length) *
                        100
                      ).toFixed(1) + '%'}
                  )
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{
                    width:
                      payments.length > 0
                        ? `${(stats.paymentCount.paid / payments.length) * 100}%`
                        : '0%',
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Chờ thanh toán
                </span>
                <span className="text-sm font-bold text-yellow-700">
                  {stats.paymentCount.pending} (
                  {stats.paymentCount.pending === 0
                    ? '0%'
                    : (
                        (stats.paymentCount.pending / payments.length) *
                        100
                      ).toFixed(1) + '%'}
                  )
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-yellow-500 h-2 rounded-full transition-all"
                  style={{
                    width:
                      payments.length > 0
                        ? `${(stats.paymentCount.pending / payments.length) * 100}%`
                        : '0%',
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Hoàn tiền
                </span>
                <span className="text-sm font-bold text-purple-700">
                  {stats.paymentCount.refunded} (
                  {stats.paymentCount.refunded === 0
                    ? '0%'
                    : (
                        (stats.paymentCount.refunded / payments.length) *
                        100
                      ).toFixed(1) + '%'}
                  )
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all"
                  style={{
                    width:
                      payments.length > 0
                        ? `${(stats.paymentCount.refunded / payments.length) * 100}%`
                        : '0%',
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Thất bại
                </span>
                <span className="text-sm font-bold text-red-700">
                  {stats.paymentCount.failed} (
                  {stats.paymentCount.failed === 0
                    ? '0%'
                    : (
                        (stats.paymentCount.failed / payments.length) *
                        100
                      ).toFixed(1) + '%'}
                  )
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full transition-all"
                  style={{
                    width:
                      payments.length > 0
                        ? `${(stats.paymentCount.failed / payments.length) * 100}%`
                        : '0%',
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Thống kê tóm tắt
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Tổng thanh toán</span>
              <span className="font-bold text-gray-900">{payments.length}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-gray-700">Thành công</span>
              <span className="font-bold text-green-700">
                {stats.paymentCount.paid}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
              <span className="text-gray-700">Chờ xử lý</span>
              <span className="font-bold text-yellow-700">
                {stats.paymentCount.pending}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
              <span className="text-gray-700">Không thành công</span>
              <span className="font-bold text-red-700">
                {stats.paymentCount.failed}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <span className="text-gray-700">Hoàn tiền</span>
              <span className="font-bold text-purple-700">
                {stats.paymentCount.refunded}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Payments */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">
            Thanh toán gần đây
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  #
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Số tiền
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Ngày
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payments.slice(0, 10).map((payment, index) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {payment.amount.toLocaleString('vi-VN')} VND
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        payment.status === 'PAID'
                          ? 'bg-green-100 text-green-800'
                          : payment.status === 'UNPAID'
                            ? 'bg-yellow-100 text-yellow-800'
                            : payment.status === 'REFUNDED'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {payment.status === 'PAID'
                        ? '✓ Đã thanh toán'
                        : payment.status === 'UNPAID'
                          ? '⏳ Chờ thanh toán'
                          : payment.status === 'REFUNDED'
                            ? '↶ Hoàn tiền'
                            : '✕ Thất bại'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(payment.createdAt).toLocaleString('vi-VN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaymentAnalytics;
