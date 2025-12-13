import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../../../services/api/client';

interface Booking {
  id: number;
  bookingCode: string;
  courtId: number;
  startTime: string;
  endTime: string;
  totalPrice: number;
  status: string;
  qrCode?: string;
}

export default function PaymentResultPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);

  // Parse query params
  const success = searchParams.get('success') === 'true';
  const bookingId = searchParams.get('bookingId') ? parseInt(searchParams.get('bookingId')!) : null;
  const message = searchParams.get('message') || '';

  useEffect(() => {
    if (success && bookingId) {
      // Fetch booking details to show QR code
      apiClient
        .get(`/bookings/${bookingId}`)
        .then((response) => {
          setBooking(response.data);
        })
        .catch((error) => {
          console.error('Failed to fetch booking:', error);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [success, bookingId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto"></div>
          <p className="text-gray-600 mt-4">Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {/* Icon */}
        <div className="text-center mb-6">
          {success ? (
            <div className="text-8xl mb-4">✅</div>
          ) : (
            <div className="text-8xl mb-4">❌</div>
          )}

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {success ? 'Thanh toán thành công!' : 'Thanh toán thất bại'}
          </h1>

          {/* Message */}
          <p className="text-gray-600">
            {success
              ? 'Booking của bạn đã được xác nhận thành công.'
              : message || 'Đã có lỗi xảy ra trong quá trình thanh toán.'}
          </p>
        </div>

        {/* Booking info */}
        {success && booking && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Mã booking:</span>
                <span className="font-semibold">{booking.bookingCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Sân:</span>
                <span className="font-semibold">Court {booking.courtId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Thời gian:</span>
                <span className="font-semibold">
                  {new Date(booking.startTime).toLocaleString('vi-VN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Số tiền:</span>
                <span className="font-semibold text-green-600">
                  {booking.totalPrice.toLocaleString('vi-VN')} VNĐ
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-3">
          {success && booking && (
            <button
              onClick={() => setShowQR(true)}
              className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
            >
              📱 Xem mã QR check-in
            </button>
          )}

          <button
            onClick={() => navigate('/my-bookings')}
            className="w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            📋 Xem bookings của tôi
          </button>

          <button
            onClick={() => navigate('/')}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            🏠 Về trang chủ
          </button>
        </div>

        {/* QR Code Modal */}
        {showQR && booking?.qrCode && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowQR(false)}
          >
            <div
              className="bg-white rounded-lg p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-4 text-center">
                Mã QR Check-in
              </h3>
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                <img
                  src={booking.qrCode}
                  alt="QR Code"
                  className="w-full h-auto"
                />
              </div>
              <p className="text-sm text-gray-600 text-center mt-4">
                Xuất trình mã này khi đến sân để check-in
              </p>
              <button
                onClick={() => setShowQR(false)}
                className="w-full mt-4 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
