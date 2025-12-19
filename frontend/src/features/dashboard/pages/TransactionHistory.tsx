import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { walletService } from '@/services/walletService';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Link } from 'react-router-dom';

type TransactionType = 'DEPOSIT' | 'TOPUP' | 'PAYMENT' | 'REFUND' | 'WITHDRAWAL';

interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string | null;
  booking: {
    bookingCode: string;
    courtId: number;
    startTime: string;
  } | null;
  createdAt: string;
}

interface TransactionHistoryResponse {
  balance: number;
  transactions: Transaction[];
}

const TRANSACTION_CONFIG: Record<
  TransactionType,
  {
    label: string;
    icon: string;
    color: string;
    bgColor: string;
    textColor: string;
  }
> = {
  DEPOSIT: {
    label: 'Nạp tiền',
    icon: '💰',
    color: 'bg-green-100',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
  },
  TOPUP: {
    label: 'Nạp tiền',
    icon: '💵',
    color: 'bg-blue-100',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
  },
  PAYMENT: {
    label: 'Thanh toán',
    icon: '💳',
    color: 'bg-purple-100',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
  },
  REFUND: {
    label: 'Hoàn tiền',
    icon: '💸',
    color: 'bg-yellow-100',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
  },
  WITHDRAWAL: {
    label: 'Rút tiền',
    icon: '🏧',
    color: 'bg-red-100',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
  },
};

export const TransactionHistory: React.FC = () => {
  const {
    data: response,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['wallet-transactions'],
    queryFn: async () => {
      const data = await walletService.getTransactions();
      return data as TransactionHistoryResponse;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải lịch sử giao dịch...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">❌ Lỗi: {(error as Error).message}</p>
          <button
            onClick={() => refetch()}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  const transactions = response?.transactions || [];
  const balance = response?.balance || 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                📊 Lịch sử giao dịch
              </h1>
              <p className="text-gray-600">
                Xem chi tiết các giao dịch trong ví của bạn
              </p>
            </div>
            <Link
              to="/dashboard"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              ← Quay lại
            </Link>
          </div>
        </div>

        {/* Balance Card */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-sm mb-1">Số dư ví hiện tại</p>
              <h2 className="text-4xl font-bold">
                {new Intl.NumberFormat('vi-VN', {
                  style: 'currency',
                  currency: 'VND',
                }).format(balance)}
              </h2>
            </div>
            <div className="text-6xl opacity-20">💼</div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {(['TOPUP', 'PAYMENT', 'REFUND', 'DEPOSIT'] as TransactionType[]).map(
            (type) => {
              const typeTransactions = transactions.filter(
                (t) => t.type === type
              );
              const total = typeTransactions.reduce(
                (sum, t) => sum + t.amount,
                0
              );
              const config = TRANSACTION_CONFIG[type];

              return (
                <div
                  key={type}
                  className={`${config.bgColor} rounded-lg shadow p-4 border-l-4 ${config.color}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{config.icon}</span>
                    <span
                      className={`text-xs font-semibold ${config.textColor}`}
                    >
                      {typeTransactions.length}
                    </span>
                  </div>
                  <div className={`text-sm ${config.textColor} mb-1`}>
                    {config.label}
                  </div>
                  <div className={`text-lg font-bold ${config.textColor}`}>
                    {new Intl.NumberFormat('vi-VN').format(total)} đ
                  </div>
                </div>
              );
            }
          )}
        </div>

        {/* Transactions List */}
        {transactions.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Chưa có giao dịch nào
            </h3>
            <p className="text-gray-600 mb-6">
              Lịch sử giao dịch của bạn sẽ hiển thị ở đây
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thời gian
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Loại giao dịch
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mô tả
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Số tiền
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Số dư sau GD
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction) => {
                    const config = TRANSACTION_CONFIG[transaction.type];
                    const isPositive = ['DEPOSIT', 'TOPUP', 'REFUND'].includes(
                      transaction.type
                    );

                    return (
                      <tr
                        key={transaction.id}
                        className="hover:bg-gray-50 transition"
                      >
                        {/* Time */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {format(
                              new Date(transaction.createdAt),
                              'dd/MM/yyyy',
                              { locale: vi }
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {format(
                              new Date(transaction.createdAt),
                              'HH:mm:ss'
                            )}
                          </div>
                        </td>

                        {/* Type */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${config.color} ${config.textColor}`}
                          >
                            {config.icon} {config.label}
                          </span>
                        </td>

                        {/* Description */}
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {transaction.description || 'Không có mô tả'}
                          </div>
                          {transaction.booking && (
                            <div className="text-xs text-gray-500 mt-1">
                              Booking: #{transaction.booking.bookingCode} •{' '}
                              {format(
                                new Date(transaction.booking.startTime),
                                'dd/MM HH:mm',
                                { locale: vi }
                              )}
                            </div>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div
                            className={`text-sm font-bold ${
                              isPositive ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {isPositive ? '+' : '-'}
                            {new Intl.NumberFormat('vi-VN', {
                              style: 'currency',
                              currency: 'VND',
                            }).format(transaction.amount)}
                          </div>
                        </td>

                        {/* Balance After */}
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {new Intl.NumberFormat('vi-VN', {
                              style: 'currency',
                              currency: 'VND',
                            }).format(transaction.balanceAfter)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Tổng số {transactions.length} giao dịch • Cập nhật lúc{' '}
            {format(new Date(), 'HH:mm dd/MM/yyyy', { locale: vi })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TransactionHistory;
