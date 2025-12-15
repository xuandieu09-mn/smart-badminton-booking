import React, { useState } from 'react';
import axios from 'axios';
import { QRScanner } from '../components/QRScanner';
import { CourtMonitor } from '../components/CourtMonitor';
import { QRCodeGenerator } from '../components/QRCodeGenerator';

const API = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000,
});

export const CheckInPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'scanner' | 'monitor' | 'generator'
  >('generator');
  const [manualCode, setManualCode] = useState('');
  const [checkInResult, setCheckInResult] = useState<{
    success: boolean;
    message: string;
    booking?: any;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckIn = async (bookingCode: string) => {
    if (!bookingCode || bookingCode.trim() === '') {
      setCheckInResult({
        success: false,
        message: 'Mã booking không hợp lệ',
      });
      return;
    }

    setIsProcessing(true);
    setCheckInResult(null);

    try {
      // Fix: authStore lưu vào 'access_token' không phải 'token'
      const token = localStorage.getItem('access_token');

      if (!token) {
        setCheckInResult({
          success: false,
          message: '❌ Bạn chưa đăng nhập. Vui lòng đăng nhập lại!',
        });
        setIsProcessing(false);
        return;
      }

      const response = await API.post(
        '/bookings/check-in',
        { bookingCode: bookingCode.trim() },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setCheckInResult({
        success: true,
        message: response.data.message || 'Check-in thành công!',
        booking: response.data.booking,
      });

      // Clear manual input
      setManualCode('');

      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setCheckInResult(null);
      }, 5000);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || error.message || 'Lỗi không xác định';

      setCheckInResult({
        success: false,
        message: errorMessage,
      });

      // Auto-hide error message after 8 seconds
      setTimeout(() => {
        setCheckInResult(null);
      }, 8000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQRScan = (decodedText: string) => {
    console.log('QR scanned:', decodedText);
    handleCheckIn(decodedText);
  };

  const handleManualCheckIn = () => {
    handleCheckIn(manualCode);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Check-in khách hàng
        </h1>
        <p className="text-gray-600">
          Quét mã QR hoặc nhập mã booking để check-in khách vào sân
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('generator')}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              activeTab === 'generator'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            🎫 Tạo QR Code
          </button>
          <button
            onClick={() => setActiveTab('scanner')}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              activeTab === 'scanner'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            📱 Quét QR
          </button>
          <button
            onClick={() => setActiveTab('monitor')}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              activeTab === 'monitor'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            🏟️ Theo dõi sân
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'generator' ? (
            /* QR Generator Tab */
            <QRCodeGenerator />
          ) : activeTab === 'scanner' ? (
            <div className="space-y-6">
              {/* Check-in Result */}
              {checkInResult && (
                <div
                  className={`rounded-lg p-4 border-2 ${
                    checkInResult.success
                      ? 'bg-green-50 border-green-300'
                      : 'bg-red-50 border-red-300'
                  }`}
                >
                  <div
                    className={`flex items-start gap-3 ${
                      checkInResult.success ? 'text-green-800' : 'text-red-800'
                    }`}
                  >
                    <span className="text-2xl">
                      {checkInResult.success ? '✅' : '❌'}
                    </span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">
                        {checkInResult.success
                          ? 'Check-in thành công!'
                          : 'Check-in thất bại'}
                      </h3>
                      <p className="text-sm">{checkInResult.message}</p>
                      {checkInResult.booking && (
                        <div className="mt-3 text-sm bg-white rounded p-3 border">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="font-medium">Mã booking:</span>{' '}
                              {checkInResult.booking.bookingCode}
                            </div>
                            <div>
                              <span className="font-medium">Sân:</span> Sân{' '}
                              {checkInResult.booking.courtId}
                            </div>
                            <div>
                              <span className="font-medium">Bắt đầu:</span>{' '}
                              {new Date(
                                checkInResult.booking.startTime,
                              ).toLocaleTimeString('vi-VN')}
                            </div>
                            <div>
                              <span className="font-medium">Kết thúc:</span>{' '}
                              {new Date(
                                checkInResult.booking.endTime,
                              ).toLocaleTimeString('vi-VN')}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* QR Scanner */}
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                  Quét mã QR
                </h2>
                <QRScanner
                  onScan={handleQRScan}
                  onError={(error) =>
                    setCheckInResult({ success: false, message: error })
                  }
                />
              </div>

              {/* Manual Entry */}
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                  Nhập mã thủ công
                </h2>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Nhập mã booking (VD: BOOK-20251213-ABCD)"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    disabled={isProcessing}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isProcessing) {
                        handleManualCheckIn();
                      }
                    }}
                  />
                  <button
                    onClick={handleManualCheckIn}
                    disabled={isProcessing || !manualCode.trim()}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? '⏳ Đang xử lý...' : '✓ Check-in'}
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">
                  📖 Hướng dẫn:
                </h3>
                <ul className="list-disc list-inside text-blue-800 space-y-1 text-sm">
                  <li>Khách hàng xuất trình QR code từ email hoặc app</li>
                  <li>Nhân viên quét QR code để xác nhận booking</li>
                  <li>Check-in được phép 15 phút trước giờ bắt đầu</li>
                  <li>Chỉ booking có trạng thái CONFIRMED mới được check-in</li>
                </ul>
              </div>
            </div>
          ) : (
            /* Court Monitor Tab */
            <CourtMonitor />
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckInPage;
