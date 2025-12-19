import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/services/api/client';

interface WalletBalance {
  balance: number;
  updatedAt: string;
}

export const CustomerDashboard = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [topupAmount, setTopupAmount] = useState('');
  const [showTopup, setShowTopup] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Fetch wallet balance
  const { data: walletData, isLoading: walletLoading } = useQuery({
    queryKey: ['wallet-balance'],
    queryFn: async () => {
      const response = await apiClient.get('/wallet/balance');
      return response.data as { message: string } & WalletBalance;
    },
  });

  // Top-up mutation
  const topupMutation = useMutation({
    mutationFn: async (amount: number) => {
      const response = await apiClient.post('/wallet/topup', { amount });
      return response.data;
    },
    onSuccess: (data) => {
      setMessage(
        `✅ Nạp tiền thành công! Số dư mới: ${data.wallet.balance.toLocaleString('vi-VN')} VND`,
      );
      setError('');
      setTopupAmount('');
      setShowTopup(false);
      queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });

      setTimeout(() => setMessage(''), 5000);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Nạp tiền thất bại');
      setMessage('');
    },
  });

  const handleTopup = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(topupAmount);

    if (isNaN(amount) || amount <= 0) {
      setError('Vui lòng nhập số tiền hợp lệ');
      return;
    }

    if (amount > 10000000) {
      setError('Số tiền tối đa mỗi lần nạp là 10,000,000 VND');
      return;
    }

    setError('');
    topupMutation.mutate(amount);
  };

  const quickAmounts = [50000, 100000, 200000, 500000, 1000000];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link
          to="/settings"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          Settings
        </Link>
      </div>

      <div className="grid gap-6">
        {/* Messages */}
        {message && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
            {message}
          </div>
        )}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Welcome Card & Wallet Balance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">
              Welcome, {user?.name || user?.email}!
            </h2>
            <p className="text-gray-600">Role: {user?.role}</p>
          </div>

          {/* Wallet Card */}
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-emerald-100 text-sm">Số dư ví</p>
                {walletLoading ? (
                  <p className="text-2xl font-bold">Loading...</p>
                ) : (
                  <p className="text-3xl font-bold">
                    {walletData?.balance?.toLocaleString('vi-VN') || '0'} VND
                  </p>
                )}
              </div>
              <svg
                className="w-12 h-12 opacity-80"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
            </div>
            <button
              onClick={() => setShowTopup(!showTopup)}
              className="w-full bg-white text-emerald-600 py-2 rounded-lg font-semibold hover:bg-emerald-50 transition-colors"
            >
              💰 Nạp tiền
            </button>
          </div>
        </div>

        {/* Top-up Form */}
        {showTopup && (
          <div className="bg-white p-6 rounded-lg shadow-lg border-2 border-emerald-500">
            <h3 className="text-xl font-bold mb-4 text-emerald-700">
              Nạp tiền vào ví
            </h3>
            <form onSubmit={handleTopup} className="space-y-4">
              {/* Quick amounts */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chọn nhanh:
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {quickAmounts.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setTopupAmount(amount.toString())}
                      className={`py-2 px-3 rounded-lg border-2 transition-colors ${
                        topupAmount === amount.toString()
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-semibold'
                          : 'border-gray-300 hover:border-emerald-400'
                      }`}
                    >
                      {(amount / 1000).toFixed(0)}K
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom amount */}
              <div>
                <label
                  htmlFor="topupAmount"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Hoặc nhập số tiền (VND):
                </label>
                <input
                  id="topupAmount"
                  type="number"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  placeholder="Ví dụ: 100000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  min="1"
                  max="10000000"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tối thiểu: 1 VND | Tối đa: 10,000,000 VND
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={topupMutation.isPending}
                  className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {topupMutation.isPending
                    ? 'Đang xử lý...'
                    : 'Xác nhận nạp tiền'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowTopup(false);
                    setTopupAmount('');
                    setError('');
                  }}
                  className="px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
              </div>
            </form>

            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                ℹ️ <strong>Lưu ý:</strong> Đây là chức năng giả lập. Trong thực
                tế, bạn sẽ thanh toán qua VNPay/MoMo.
              </p>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/calendar"
            className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center gap-3">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <div>
                <h3 className="font-semibold">Book a Court</h3>
                <p className="text-sm opacity-90">View calendar & book</p>
              </div>
            </div>
          </Link>

          <Link
            to="/my-bookings"
            className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center gap-3">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <div>
                <h3 className="font-semibold">My Bookings</h3>
                <p className="text-sm opacity-90">View history & QR codes</p>
              </div>
            </div>
          </Link>

          <Link
            to="/transaction-history"
            className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center gap-3">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
              <div>
                <h3 className="font-semibold">Lịch sử giao dịch</h3>
                <p className="text-sm opacity-90">Xem giao dịch ví</p>
              </div>
            </div>
          </Link>

          <Link
            to="/settings"
            className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center gap-3">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <div>
                <h3 className="font-semibold">Email Settings</h3>
                <p className="text-sm opacity-90">Update email & profile</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};
