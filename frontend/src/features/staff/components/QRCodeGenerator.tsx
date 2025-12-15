import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000,
});

interface Booking {
  id: number;
  bookingCode: string;
  status: string;
  startTime: string;
  endTime: string;
  court?: {
    name: string;
  };
  user?: {
    name: string;
    email: string;
  };
  guestName?: string;
}

export const QRCodeGenerator: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      // Fix: authStore lưu vào 'access_token' không phải 'token'
      const token = localStorage.getItem('access_token');

      if (!token) {
        alert(
          '❌ Bạn chưa đăng nhập. Vui lòng đăng nhập với tài khoản Staff/Admin!',
        );
        return;
      }

      const response = await API.get('/bookings', {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Filter only CONFIRMED bookings
      const confirmedBookings = response.data.bookings.filter(
        (b: Booking) => b.status === 'CONFIRMED',
      );
      setBookings(confirmedBookings);

      if (confirmedBookings.length === 0) {
        alert(
          '⚠️ Không tìm thấy booking nào có trạng thái CONFIRMED. Vui lòng tạo booking trước!',
        );
      }
    } catch (error: any) {
      console.error('Failed to fetch bookings:', error);

      if (error.response?.status === 401) {
        alert(
          '❌ Unauthorized! Bạn cần đăng nhập với tài khoản Staff hoặc Admin.\n\nVui lòng:\n1. Đăng nhập tại /auth/login\n2. Sử dụng email: staff@badminton.com\n3. Password: Staff@123',
        );
      } else if (
        error.code === 'ERR_NETWORK' ||
        error.message.includes('Network Error')
      ) {
        alert(
          '❌ Backend không chạy! Vui lòng khởi động backend tại http://localhost:3000',
        );
      } else {
        alert(
          '❌ Không thể tải danh sách booking: ' +
            (error.response?.data?.message || error.message),
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const generateQRCode = (booking: Booking) => {
    setSelectedBooking(booking);
    setQrCodeData(booking.bookingCode);
  };

  const downloadQR = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `QR-${selectedBooking?.bookingCode}.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
      });
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-2">🎫 Tạo mã QR Check-in</h2>
        <p className="text-purple-100">
          Chọn booking để tạo QR code và test tính năng quét
        </p>
      </div>

      {/* Fetch Bookings Button */}
      {bookings.length === 0 && (
        <button
          onClick={fetchBookings}
          disabled={isLoading}
          className="w-full py-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:bg-gray-300"
        >
          {isLoading ? '⏳ Đang tải...' : '📋 Tải danh sách booking'}
        </button>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bookings List */}
        {bookings.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">
                📝 Booking đã xác nhận ({bookings.length})
              </h3>
              <button
                onClick={fetchBookings}
                className="text-sm text-indigo-600 hover:text-indigo-800"
              >
                🔄 Làm mới
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedBooking?.id === booking.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                  }`}
                  onClick={() => generateQRCode(booking)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-mono text-sm font-bold text-indigo-600">
                      {booking.bookingCode}
                    </div>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      {booking.status}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600 space-y-1">
                    <div>🏸 {booking.court?.name || `Sân ${booking.id}`}</div>
                    <div>
                      👤 {booking.user?.name || booking.guestName || 'Guest'}
                    </div>
                    <div className="text-xs text-gray-500">
                      📅 {formatTime(booking.startTime)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* QR Code Display */}
        {qrCodeData && selectedBooking && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              🎯 Mã QR Check-in
            </h3>

            {/* QR Code */}
            <div className="flex justify-center mb-6">
              <div className="bg-white p-6 rounded-lg border-4 border-indigo-200">
                <QRCodeSVG
                  id="qr-code-svg"
                  value={qrCodeData}
                  size={250}
                  level="H"
                  includeMargin={true}
                />
              </div>
            </div>

            {/* Booking Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Mã booking:</span>
                <span className="font-mono font-bold text-indigo-600">
                  {selectedBooking.bookingCode}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Sân:</span>
                <span className="font-medium">
                  {selectedBooking.court?.name || `Court ${selectedBooking.id}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Khách hàng:</span>
                <span className="font-medium">
                  {selectedBooking.user?.name ||
                    selectedBooking.guestName ||
                    'Guest'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Thời gian:</span>
                <span className="font-medium text-xs">
                  {formatTime(selectedBooking.startTime)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={downloadQR}
                className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                💾 Tải xuống QR Code
              </button>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(qrCodeData);
                  alert('Đã copy mã booking: ' + qrCodeData);
                }}
                className="w-full py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
              >
                📋 Copy mã booking
              </button>
            </div>

            {/* Instructions */}
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                💡 <strong>Cách test:</strong>
                <br />
                1. Tải xuống QR code này
                <br />
                2. Mở QR trên điện thoại/màn hình khác
                <br />
                3. Quay lại tab "QR Scanner" và quét thử
                <br />
                4. Hoặc nhập thủ công mã:{' '}
                <code className="bg-blue-100 px-1 rounded">{qrCodeData}</code>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Empty State */}
      {bookings.length === 0 && !isLoading && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-6xl mb-4">📋</div>
          <p>Nhấn nút bên trên để tải danh sách booking</p>
        </div>
      )}
    </div>
  );
};
