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
    isGroup?: boolean;
    groupBookings?: any[];
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

      // Check if it's a group response
      if (response.data.isGroup) {
        setCheckInResult({
          success: true,
          message: `Lịch cố định - ${response.data.totalSessions} buổi`,
          isGroup: true,
          groupBookings: response.data.bookings,
          booking: response.data,
        });
      } else {
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
      }
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg p-6 md:p-8 text-white">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-1">
                Check-in Khách Hàng
              </h1>
              <p className="text-indigo-100 text-sm md:text-base">
                Quét mã QR hoặc nhập mã booking để xác nhận khách vào sân
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation with improved design */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('generator')}
              className={`flex-1 px-4 md:px-6 py-4 md:py-5 font-semibold transition-all duration-200 ${
                activeTab === 'generator'
                  ? 'text-indigo-600 border-b-4 border-indigo-600 bg-indigo-50/50'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <span className="text-xl">🎫</span>
                <span className="hidden md:inline">Tạo QR Code</span>
                <span className="md:hidden">Tạo QR</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('scanner')}
              className={`flex-1 px-4 md:px-6 py-4 md:py-5 font-semibold transition-all duration-200 ${
                activeTab === 'scanner'
                  ? 'text-indigo-600 border-b-4 border-indigo-600 bg-indigo-50/50'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <span className="text-xl">📱</span>
                <span className="hidden md:inline">Quét QR Code</span>
                <span className="md:hidden">Quét QR</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('monitor')}
              className={`flex-1 px-4 md:px-6 py-4 md:py-5 font-semibold transition-all duration-200 ${
                activeTab === 'monitor'
                  ? 'text-indigo-600 border-b-4 border-indigo-600 bg-indigo-50/50'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <span className="text-xl">🏟️</span>
                <span className="hidden md:inline">Theo dõi sân</span>
                <span className="md:hidden">Theo dõi</span>
              </span>
            </button>
          </div>
          {/* Đóng Tab Navigation ở đây để tránh lồng thẻ */}
        </div>

        {/* Tab Content */}
        <div className="p-4 md:p-8">
          {activeTab === 'generator' ? (
            /* QR Generator Tab */
            <QRCodeGenerator />
          ) : activeTab === 'scanner' ? (
            <div className="space-y-6">
              {/* Check-in Result with improved animation */}
              {checkInResult && (
                <div
                  className={`rounded-2xl p-6 border-2 shadow-lg transform transition-all duration-300 ${
                    checkInResult.success
                      ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300 animate-pulse'
                      : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-300'
                  }`}
                >
                  <div
                    className={`flex items-start gap-4 ${
                      checkInResult.success ? 'text-green-800' : 'text-red-800'
                    }`}
                  >
                    <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                      checkInResult.success ? 'bg-green-200' : 'bg-red-200'
                    }`}>
                      <span className="text-3xl">
                        {checkInResult.success ? '✅' : '❌'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-xl mb-2">
                        {checkInResult.success
                          ? '🎉 Check-in Thành Công!'
                          : '⚠️ Check-in Thất Bại'}
                      </h3>
                      <p className="text-base mb-3">{checkInResult.message}</p>
                      
                      {/* Group Bookings Selection with better design */}
                      {checkInResult.isGroup && checkInResult.groupBookings && (
                        <div className="mt-6">
                          <div className="flex items-center gap-2 mb-4">
                            <span className="text-lg">📅</span>
                            <p className="font-semibold text-base">Chọn buổi cần check-in:</p>
                          </div>
                          <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                            {checkInResult.groupBookings.map((b: any) => (
                              <button
                                key={b.id}
                                onClick={() => handleCheckIn(b.bookingCode)}
                                disabled={!b.canCheckIn}
                                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                                  b.canCheckIn
                                    ? 'bg-white hover:bg-blue-50 hover:border-blue-400 hover:shadow-md border-blue-200 cursor-pointer transform hover:scale-[1.02]'
                                    : 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60'
                                }`}
                              >
                                <div className="flex justify-between items-start gap-3">
                                  <div className="flex-1">
                                    <div className="font-bold text-gray-800 mb-1">{b.date} - {b.dayName}</div>
                                    <div className="text-sm text-gray-600 flex items-center gap-2">
                                      <span>🕐</span>
                                      <span>{b.time}</span>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-2 font-mono bg-gray-100 px-2 py-1 rounded inline-block">
                                      {b.bookingCode}
                                    </div>
                                  </div>
                                  <span className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap ${
                                    b.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                                    b.status === 'CHECKED_IN' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {b.status === 'CONFIRMED' ? '✓ Xác nhận' :
                                     b.status === 'CHECKED_IN' ? '✓ Đã check-in' :
                                     b.status}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Individual Booking Info with better layout */}
                      {checkInResult.booking && !checkInResult.isGroup && (
                        <div className="mt-4 bg-white rounded-xl p-5 border-2 border-gray-200 shadow-sm">
                          <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <span>📋</span>
                            <span>Thông tin booking:</span>
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                              <span className="font-semibold text-gray-600">Mã:</span>
                              <span className="font-mono text-indigo-600 font-bold">
                                {checkInResult.booking.bookingCode}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                              <span className="font-semibold text-gray-600">Sân:</span>
                              <span className="font-bold text-gray-800">
                                Sân {checkInResult.booking.courtId}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                              <span className="font-semibold text-gray-600">Bắt đầu:</span>
                              <span className="font-bold text-gray-800">
                                {new Date(
                                  checkInResult.booking.startTime,
                                ).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                              <span className="font-semibold text-gray-600">Kết thúc:</span>
                              <span className="font-bold text-gray-800">
                                {new Date(
                                  checkInResult.booking.endTime,
                                ).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* QR Scanner with card design */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-5">
                  <div className="bg-indigo-100 rounded-lg p-2">
                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    Quét mã QR
                  </h2>
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden">
                  <QRScanner
                    onScan={handleQRScan}
                    onError={(error) =>
                      setCheckInResult({ success: false, message: error })
                    }
                  />
                </div>
              </div>

              {/* Manual Entry with improved design */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-5">
                  <div className="bg-purple-100 rounded-lg p-2">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    Nhập mã thủ công
                  </h2>
                </div>
                <div className="flex flex-col md:flex-row gap-3">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Nhập mã booking (VD: BK251231-ABCD)"
                    className="flex-1 px-5 py-4 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition-all text-base font-mono"
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
                    className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
                  >
                    {isProcessing ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Đang xử lý...</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span>✓</span>
                        <span>Check-in</span>
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Instructions with modern design */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-2xl p-6 shadow-md">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 bg-blue-100 rounded-full p-3">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-blue-900 text-lg mb-3 flex items-center gap-2">
                      📖 Hướng dẫn sử dụng
                    </h3>
                    <ul className="space-y-2 text-blue-800">
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                        <span>Khách hàng xuất trình mã QR từ email hoặc ứng dụng</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                        <span>Nhân viên quét mã QR để xác nhận đặt sân</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                        <span>Check-in được phép <strong>15 phút trước</strong> giờ bắt đầu</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                        <span>Chỉ booking có trạng thái <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded font-semibold">CONFIRMED</span> mới được check-in</span>
                      </li>
                    </ul>
                  </div>
                </div>
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
