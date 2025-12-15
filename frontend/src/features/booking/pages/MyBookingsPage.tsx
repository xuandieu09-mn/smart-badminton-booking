import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import apiClient from '@/services/api/client';
import { format, differenceInSeconds } from 'date-fns';
import { vi } from 'date-fns/locale';
import PaymentMethodModal, {
  PaymentGateway,
} from '../../payment/components/PaymentMethodModal';
import {
  processPayment,
  CreatePaymentUrlResponse,
  PaymentResponse,
} from '../../../services/paymentService';
import { useBookingEvents } from '@/hooks/useSocket';

type BookingStatus =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

interface Booking {
  id: number;
  bookingCode: string;
  courtId: number;
  court: {
    id: number;
    name: string;
    pricePerHour: number;
  };
  startTime: string;
  endTime: string;
  totalPrice: number;
  status: BookingStatus;
  paymentStatus: 'PAID' | 'UNPAID';
  expiresAt: string | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<
  BookingStatus,
  {
    label: string;
    color: string;
    bgColor: string;
    icon: string;
  }
> = {
  PENDING_PAYMENT: {
    label: 'Chờ thanh toán',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    icon: '⏱️',
  },
  CONFIRMED: {
    label: 'Đã xác nhận',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    icon: '✅',
  },
  CHECKED_IN: {
    label: 'Đã check-in',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: '🎾',
  },
  COMPLETED: {
    label: 'Hoàn thành',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    icon: '🏆',
  },
  CANCELLED: {
    label: 'Đã hủy',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    icon: '❌',
  },
  EXPIRED: {
    label: 'Hết hạn',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    icon: '⌛',
  },
};

const CountdownTimer: React.FC<{ expiresAt: string }> = ({ expiresAt }) => {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    const updateTimer = () => {
      const seconds = differenceInSeconds(new Date(expiresAt), new Date());
      setSecondsLeft(Math.max(0, seconds));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  if (secondsLeft <= 0) {
    return <span className="text-red-600 font-semibold">Đã hết hạn</span>;
  }

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <span
      className={`font-mono font-semibold ${secondsLeft < 300 ? 'text-red-600 animate-pulse' : 'text-yellow-700'}`}
    >
      {minutes}:{seconds.toString().padStart(2, '0')}
    </span>
  );
};

export const MyBookingsPage: React.FC = () => {
  const [filterStatus, setFilterStatus] = useState<BookingStatus | 'ALL'>(
    'ALL',
  );
  const [selectedQRCode, setSelectedQRCode] = useState<{
    bookingCode: string;
    qrCode: string;
  } | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedBookingForPayment, setSelectedBookingForPayment] =
    useState<Booking | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [realtimeMessage, setRealtimeMessage] = useState('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Setup Socket.IO listeners for real-time updates
  useBookingEvents({
    onStatusChange: (payload) => {
      console.log('📢 Booking status changed:', payload);
      setRealtimeMessage(`✅ ${payload.message}`);

      // Auto-refresh bookings list
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });

      // Clear message after 5 seconds
      setTimeout(() => setRealtimeMessage(''), 5000);
    },
    onRefund: (payload) => {
      console.log('💰 Refund received:', payload);

      const refundMessage = `💰 Hoàn tiền: ${payload.refundAmount.toLocaleString('vi-VN')} VND (${payload.refundPercentage}%)\nSố dư mới: ${payload.newWalletBalance?.toLocaleString('vi-VN') || 'N/A'} VND`;
      setRealtimeMessage(`💰 Hoàn tiền ${payload.refundPercentage}%`);

      // Show detailed notification
      alert(refundMessage);

      // Redirect to wallet page after 2 seconds
      setTimeout(() => {
        navigate('/wallet');
      }, 2000);
    },
    onNotification: (notification) => {
      console.log('🔔 Notification:', notification);
      setRealtimeMessage(
        `${notification.type === 'success' ? '✅' : '⚠️'} ${notification.message}`,
      );
      setTimeout(() => setRealtimeMessage(''), 5000);
    },
  });

  // Fetch wallet balance
  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const res = await apiClient.get('/wallet/balance');
        setWalletBalance(Number(res.data.balance));
      } catch (error) {
        console.error('Failed to fetch wallet balance:', error);
        setWalletBalance(0); // Default to 0 if error
      }
    };
    fetchWallet();
  }, []);

  // Fetch user's bookings
  const {
    data: response,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: async () => {
      const res = await apiClient.get('/bookings/my-bookings');
      return res.data;
    },
    refetchInterval: 5000, // Auto-refresh every 5s
  });

  const bookings: Booking[] = response?.bookings || [];

  // Payment mutation (supports both wallet and gateway)
  const { mutate: handlePayment, isPending: isPaying } = useMutation({
    mutationFn: async ({
      bookingId,
      gateway,
    }: {
      bookingId: number;
      gateway: PaymentGateway;
    }) => {
      return processPayment(
        bookingId,
        gateway,
        `${window.location.origin}/payment/result`,
      );
    },
    onSuccess: (data, variables) => {
      // If VNPay, redirect to payment URL
      if (variables.gateway === 'VNPAY' && 'paymentUrl' in data) {
        const vnpayResponse = data as CreatePaymentUrlResponse;
        window.location.href = vnpayResponse.paymentUrl;
      } else {
        // Wallet payment success
        const walletResponse = data as PaymentResponse;
        alert(`✅ ${walletResponse.message}`);
        queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
        setPaymentModalOpen(false);

        // Show QR code if available
        if (walletResponse.qrCode) {
          setSelectedQRCode({
            bookingCode: selectedBookingForPayment?.bookingCode || '',
            qrCode: walletResponse.qrCode,
          });
        }
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message;
      alert(`❌ Lỗi thanh toán: ${message}`);
      setPaymentModalOpen(false);
    },
  });

  // Cancel booking mutation
  const { mutate: cancelBooking, isPending: isCancelling } = useMutation({
    mutationFn: async (bookingId: number) => {
      return apiClient.post(`/bookings/${bookingId}/cancel`);
    },
    onSuccess: () => {
      alert('✅ Đã hủy booking!');
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    },
    onError: (error: any) => {
      alert(`❌ Lỗi: ${error.response?.data?.message || error.message}`);
    },
  });

  // Generate QR Code mutation
  const { mutate: generateQR, isPending: isGeneratingQR } = useMutation({
    mutationFn: async (bookingId: number) => {
      const res = await apiClient.post(`/bookings/${bookingId}/generate-qr`);
      return res.data;
    },
    onSuccess: (data) => {
      setSelectedQRCode({
        bookingCode: data.bookingCode,
        qrCode: data.qrCode,
      });
    },
    onError: (error: any) => {
      alert(`❌ Lỗi: ${error.response?.data?.message || error.message}`);
    },
  });

  // Filter bookings by status
  const filteredBookings = useMemo(() => {
    if (filterStatus === 'ALL') return bookings;
    return bookings.filter((b) => b.status === filterStatus);
  }, [bookings, filterStatus]);

  // Group bookings by status for stats
  const stats = useMemo(() => {
    return {
      pending: bookings.filter((b) => b.status === 'PENDING_PAYMENT').length,
      confirmed: bookings.filter((b) => b.status === 'CONFIRMED').length,
      completed: bookings.filter((b) => b.status === 'COMPLETED').length,
      cancelled: bookings.filter((b) => b.status === 'CANCELLED').length,
      total: bookings.length,
    };
  }, [bookings]);

  const handlePayNow = (booking: Booking) => {
    setSelectedBookingForPayment(booking);
    setPaymentModalOpen(true);
  };

  const handlePaymentMethodSelected = (gateway: PaymentGateway) => {
    if (selectedBookingForPayment) {
      handlePayment({
        bookingId: selectedBookingForPayment.id,
        gateway,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
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

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            📋 Lịch đặt sân của tôi
          </h1>
          <p className="text-gray-600">
            Quản lý và thanh toán các booking của bạn
          </p>
        </div>

        {/* Real-time notification banner */}
        {realtimeMessage && (
          <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 animate-pulse shadow-md">
            <p className="text-blue-800 font-medium">🔄 {realtimeMessage}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-indigo-500">
            <div className="text-2xl font-bold text-indigo-600">
              {stats.total}
            </div>
            <div className="text-sm text-gray-600">Tổng booking</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
            <div className="text-2xl font-bold text-yellow-600">
              {stats.pending}
            </div>
            <div className="text-sm text-gray-600">Chờ thanh toán</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <div className="text-2xl font-bold text-green-600">
              {stats.confirmed}
            </div>
            <div className="text-sm text-gray-600">Đã xác nhận</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-gray-500">
            <div className="text-2xl font-bold text-gray-600">
              {stats.completed}
            </div>
            <div className="text-sm text-gray-600">Hoàn thành</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
            <div className="text-2xl font-bold text-red-600">
              {stats.cancelled}
            </div>
            <div className="text-sm text-gray-600">Đã hủy</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex flex-wrap gap-2">
            {(
              [
                'ALL',
                'PENDING_PAYMENT',
                'CONFIRMED',
                'COMPLETED',
                'CANCELLED',
              ] as const
            ).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filterStatus === status
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'ALL'
                  ? '🔍 Tất cả'
                  : STATUS_CONFIG[status].icon +
                    ' ' +
                    STATUS_CONFIG[status].label}
              </button>
            ))}
          </div>
        </div>

        {/* Bookings List */}
        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {filterStatus === 'ALL'
                ? 'Chưa có booking nào'
                : `Không có booking ${STATUS_CONFIG[filterStatus]?.label.toLowerCase()}`}
            </h3>
            <p className="text-gray-600 mb-6">
              Hãy đặt sân để bắt đầu chơi cầu lông!
            </p>
            <a
              href="/calendar"
              className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              Đặt sân ngay
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => {
              const statusConfig = STATUS_CONFIG[booking.status];
              const isPending = booking.status === 'PENDING_PAYMENT';

              // Check if payment is still valid (not expired)
              const isPaymentExpired =
                booking.expiresAt && new Date(booking.expiresAt) < new Date();
              const canPay =
                isPending && booking.expiresAt && !isPaymentExpired;

              const canCancel = ['PENDING_PAYMENT', 'CONFIRMED'].includes(
                booking.status,
              );

              return (
                <div
                  key={booking.id}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 border-l-4"
                  style={{
                    borderColor: statusConfig.bgColor.replace('bg-', ''),
                  }}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {/* Left: Booking Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${statusConfig.bgColor} ${statusConfig.color}`}
                        >
                          {statusConfig.icon} {statusConfig.label}
                        </span>
                        <span className="font-mono text-sm text-gray-600">
                          #{booking.bookingCode}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600">🏸 Sân:</span>
                          <span className="font-semibold ml-2">
                            {booking.court.name}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">📅 Ngày:</span>
                          <span className="font-semibold ml-2">
                            {format(new Date(booking.startTime), 'dd/MM/yyyy', {
                              locale: vi,
                            })}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">⏰ Giờ:</span>
                          <span className="font-semibold ml-2">
                            {format(new Date(booking.startTime), 'HH:mm')} -{' '}
                            {format(new Date(booking.endTime), 'HH:mm')}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">💰 Giá:</span>
                          <span className="font-semibold ml-2">
                            {new Intl.NumberFormat('vi-VN', {
                              style: 'currency',
                              currency: 'VND',
                            }).format(booking.totalPrice)}
                          </span>
                        </div>
                      </div>

                      {/* Countdown Timer for Pending Payments */}
                      {isPending && booking.expiresAt && (
                        <div
                          className={`mt-3 p-3 rounded-lg ${isPaymentExpired ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'}`}
                        >
                          <div className="flex items-center gap-2">
                            {isPaymentExpired ? (
                              <>
                                <span className="text-sm text-red-700">
                                  ❌ Đã hết hạn thanh toán
                                </span>
                                <span className="text-xs text-red-600">
                                  (Booking sẽ tự động bị hủy)
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="text-sm text-yellow-700">
                                  ⏱️ Còn lại:
                                </span>
                                <CountdownTimer expiresAt={booking.expiresAt} />
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-col gap-2 md:items-end">
                      {canPay && (
                        <button
                          onClick={() => handlePayNow(booking)}
                          disabled={isPaying}
                          className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition transform hover:scale-105"
                        >
                          {isPaying ? '⏳ Đang xử lý...' : '💳 Thanh toán ngay'}
                        </button>
                      )}

                      {booking.status === 'CONFIRMED' && (
                        <button
                          className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200 transition disabled:opacity-50"
                          onClick={() => generateQR(booking.id)}
                          disabled={isGeneratingQR}
                        >
                          📱 Xem QR Code
                        </button>
                      )}

                      {canCancel && (
                        <button
                          onClick={() => {
                            if (confirm('Bạn có chắc muốn hủy booking này?')) {
                              cancelBooking(booking.id);
                            }
                          }}
                          disabled={isCancelling}
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 disabled:opacity-50 transition"
                        >
                          ❌ Hủy booking
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* QR Code Modal */}
        {selectedQRCode && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-fadeIn">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  🎾 Mã QR Check-in
                </h2>
                <p className="text-gray-600 mb-6">
                  Mã booking:{' '}
                  <span className="font-mono font-semibold">
                    #{selectedQRCode.bookingCode}
                  </span>
                </p>

                {/* QR Code Image */}
                <div className="bg-white p-6 rounded-lg border-2 border-gray-200 mb-6">
                  <img
                    src={selectedQRCode.qrCode}
                    alt="QR Code"
                    className="w-64 h-64 mx-auto"
                  />
                </div>

                <p className="text-sm text-gray-500 mb-4">
                  📱 Vui lòng xuất trình mã QR này cho nhân viên khi check-in
                </p>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = selectedQRCode.qrCode;
                      link.download = `booking-${selectedQRCode.bookingCode}.png`;
                      link.click();
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                  >
                    💾 Tải xuống
                  </button>
                  <button
                    onClick={() => setSelectedQRCode(null)}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Method Modal */}
        {paymentModalOpen && selectedBookingForPayment && (
          <PaymentMethodModal
            isOpen={paymentModalOpen}
            onClose={() => {
              setPaymentModalOpen(false);
              setSelectedBookingForPayment(null);
            }}
            onSelectMethod={handlePaymentMethodSelected}
            walletBalance={walletBalance}
            bookingAmount={selectedBookingForPayment.totalPrice}
            isProcessing={isPaying}
          />
        )}
      </div>
    </div>
  );
};

export default MyBookingsPage;
