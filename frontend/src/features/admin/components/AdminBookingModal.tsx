import React, { useState, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import axios from 'axios';

// ==================== TYPES ====================

interface Booking {
  id: number;
  bookingCode: string;
  courtId: number;
  court: { id: number; name: string; pricePerHour: number };
  userId?: number;
  user?: { id: number; name?: string; email: string; phone?: string };
  guestName?: string;
  guestPhone?: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
}

interface Court {
  id: number;
  name: string;
  pricePerHour: number;
  isActive: boolean;
}

interface ConflictInfo {
  bookingId: number;
  bookingCode: string;
  startTime: string;
  endTime: string;
  status: string;
  overwritten?: boolean;
}

interface AdminUpdateResult {
  success: boolean;
  message: string;
  booking: Booking;
  priceChange?: {
    oldPrice: number;
    newPrice: number;
    difference: number;
    refunded?: boolean;
    charged?: boolean;
  };
  conflicts?: ConflictInfo[];
}

interface AdminBookingModalProps {
  booking: Booking;
  courts: Court[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// ==================== API CLIENT ====================

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token'); // FIXED: use correct key
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ==================== COMPONENT ====================

const AdminBookingModal: React.FC<AdminBookingModalProps> = ({
  booking,
  courts,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  // ==================== LOCAL STATE ====================
  const [activeTab, setActiveTab] = useState<'info' | 'time' | 'court' | 'cancel'>('info');
  
  // Time override
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [recalculatePrice, setRecalculatePrice] = useState(true);
  const [chargeExtraToWallet, setChargeExtraToWallet] = useState(false);
  
  // Court transfer
  const [newCourtId, setNewCourtId] = useState<number | null>(null);
  
  // Cancel options
  const [refundToWallet, setRefundToWallet] = useState(true);
  const [cancelReason, setCancelReason] = useState('');
  
  // Force options
  const [forceOverwrite, setForceOverwrite] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  
  // Conflicts
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [showConflictWarning, setShowConflictWarning] = useState(false);

  // ==================== INITIALIZE ====================
  useEffect(() => {
    if (isOpen && booking) {
      const start = new Date(booking.startTime);
      const end = new Date(booking.endTime);
      setNewStartTime(format(start, "yyyy-MM-dd'T'HH:mm"));
      setNewEndTime(format(end, "yyyy-MM-dd'T'HH:mm"));
      setNewCourtId(booking.courtId);
      setConflicts([]);
      setShowConflictWarning(false);
      setForceOverwrite(false);
    }
  }, [isOpen, booking]);

  // ==================== MUTATIONS ====================
  
  // Admin Update
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await API.patch<AdminUpdateResult>(
        `/bookings/${booking.id}/admin-update`,
        data
      );
      return response.data;
    },
    onSuccess: (result) => {
      if (!result.success && result.conflicts) {
        // Show conflict warning
        setConflicts(result.conflicts);
        setShowConflictWarning(true);
        return;
      }
      
      queryClient.invalidateQueries({ queryKey: ['all-court-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      
      // Show success message
      let message = result.message;
      if (result.priceChange) {
        const diff = result.priceChange.difference;
        const formatted = new Intl.NumberFormat('vi-VN').format(Math.abs(diff));
        if (diff > 0) {
          message += `\n💰 Phụ thu: +${formatted}đ`;
        } else if (diff < 0) {
          message += `\n💰 Hoàn tiền: ${formatted}đ`;
        }
      }
      
      alert(message);
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      alert('❌ Lỗi: ' + (error.response?.data?.message || error.message));
    },
  });

  // Admin Cancel
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await API.post(`/bookings/${booking.id}/admin-cancel`, {
        refundToWallet,
        reason: cancelReason || 'Admin force cancel',
      });
      return response.data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['all-court-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      alert('✅ Đã hủy booking thành công' + (refundToWallet ? ' và hoàn tiền về ví' : ''));
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      alert('❌ Lỗi: ' + (error.response?.data?.message || error.message));
    },
  });

  // ==================== HANDLERS ====================

  const handleTimeUpdate = () => {
    const data: any = {
      startTime: new Date(newStartTime).toISOString(),
      endTime: new Date(newEndTime).toISOString(),
      recalculatePrice,
      chargeExtraToWallet,
      forceOverwrite,
      adminNote: adminNote || 'Admin time adjustment',
    };
    updateMutation.mutate(data);
  };

  const handleCourtTransfer = () => {
    if (!newCourtId || newCourtId === booking.courtId) {
      alert('⚠️ Vui lòng chọn sân khác');
      return;
    }
    
    const data: any = {
      courtId: newCourtId,
      forceOverwrite,
      adminNote: adminNote || 'Admin court transfer',
    };
    updateMutation.mutate(data);
  };

  const handleCancel = () => {
    if (!confirm(`⚠️ Xác nhận hủy booking #${booking.bookingCode}?`)) return;
    cancelMutation.mutate();
  };

  const handleForceOverwrite = () => {
    setForceOverwrite(true);
    setShowConflictWarning(false);
    // Re-trigger the last action
    if (activeTab === 'time') {
      handleTimeUpdate();
    } else if (activeTab === 'court') {
      handleCourtTransfer();
    }
  };

  // ==================== COMPUTED ====================
  
  // Find court from courts array (booking.court might be undefined)
  const court = useMemo(() => {
    return courts.find(c => c.id === booking.courtId) || {
      id: booking.courtId,
      name: `Sân ${booking.courtId}`,
      pricePerHour: 0,
      isActive: true,
    };
  }, [courts, booking.courtId]);
  
  const customerInfo = useMemo(() => {
    if (booking.user) {
      return {
        name: booking.user.name || 'N/A',
        phone: booking.user.phone || 'N/A',
        email: booking.user.email,
        type: 'Thành viên',
      };
    }
    return {
      name: booking.guestName || 'Khách vãng lai',
      phone: booking.guestPhone || 'N/A',
      email: 'N/A',
      type: 'Khách vãng lai',
    };
  }, [booking]);

  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    PENDING_PAYMENT: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Chờ thanh toán' },
    CONFIRMED: { bg: 'bg-green-100', text: 'text-green-800', label: 'Đã xác nhận' },
    CHECKED_IN: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Đang chơi' },
    COMPLETED: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Hoàn thành' },
    CANCELLED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Đã hủy' },
    EXPIRED: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Hết hạn' },
    BLOCKED: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Bảo trì' },
  };

  const status = statusConfig[booking.status] || statusConfig.CONFIRMED;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span>🔧</span>
                <span>Admin: Chỉnh sửa Booking #{booking.bookingCode}</span>
              </h2>
              <p className="text-indigo-200 text-sm mt-1">
                God Mode - Có thể sửa mọi thông số
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          {[
            { key: 'info', icon: '📋', label: 'Thông tin' },
            { key: 'time', icon: '⏰', label: 'Sửa giờ' },
            { key: 'court', icon: '🏸', label: 'Chuyển sân' },
            { key: 'cancel', icon: '❌', label: 'Hủy booking' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition flex items-center justify-center gap-2 ${
                activeTab === tab.key
                  ? 'bg-white text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* ==================== INFO TAB ==================== */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Status Badge */}
              <div className="flex items-center gap-3">
                <span className={`px-4 py-2 rounded-full text-sm font-bold ${status.bg} ${status.text}`}>
                  {status.label}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  booking.paymentStatus === 'PAID' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {booking.paymentStatus === 'PAID' ? '💳 Đã thanh toán' : '⏳ Chưa thanh toán'}
                </span>
              </div>

              {/* Booking Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sân</label>
                  <p className="text-lg font-bold text-gray-900 mt-1">{court.name}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tổng tiền</label>
                  <p className="text-lg font-bold text-green-600 mt-1">
                    {new Intl.NumberFormat('vi-VN').format(booking.totalPrice)}đ
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Bắt đầu</label>
                  <p className="text-lg font-bold text-gray-900 mt-1">
                    {format(new Date(booking.startTime), 'HH:mm - dd/MM/yyyy', { locale: vi })}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Kết thúc</label>
                  <p className="text-lg font-bold text-gray-900 mt-1">
                    {format(new Date(booking.endTime), 'HH:mm - dd/MM/yyyy', { locale: vi })}
                  </p>
                </div>
              </div>

              {/* Customer Info */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                  <span>👤</span>
                  <span>Thông tin khách hàng ({customerInfo.type})</span>
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-blue-600">Tên:</span>
                    <span className="font-medium text-blue-900 ml-2">{customerInfo.name}</span>
                  </div>
                  <div>
                    <span className="text-blue-600">SĐT:</span>
                    <span className="font-medium text-blue-900 ml-2">{customerInfo.phone}</span>
                  </div>
                  {customerInfo.email !== 'N/A' && (
                    <div className="col-span-2">
                      <span className="text-blue-600">Email:</span>
                      <span className="font-medium text-blue-900 ml-2">{customerInfo.email}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==================== TIME TAB ==================== */}
          {activeTab === 'time' && (
            <div className="space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="font-bold text-amber-900 flex items-center gap-2">
                  <span>⚠️</span>
                  <span>Điều chỉnh thời gian</span>
                </h3>
                <p className="text-amber-700 text-sm mt-1">
                  Kéo dài → Tính thêm tiền chênh lệch<br/>
                  Rút ngắn → Có thể hoàn tiền về ví
                </p>
              </div>

              {/* Current Time Display */}
              <div className="bg-gray-100 rounded-lg p-4">
                <label className="text-xs font-medium text-gray-500 uppercase">Thời gian hiện tại</label>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  {format(new Date(booking.startTime), 'HH:mm')} - {format(new Date(booking.endTime), 'HH:mm')} ({format(new Date(booking.startTime), 'dd/MM/yyyy')})
                </p>
              </div>

              {/* Easy Time Adjustment */}
              <div className="space-y-4">
                {/* Start Time */}
                <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    ⏰ Giờ bắt đầu
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(newStartTime);
                        d.setMinutes(d.getMinutes() - 30);
                        setNewStartTime(format(d, "yyyy-MM-dd'T'HH:mm"));
                      }}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition"
                    >
                      -30 phút
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(newStartTime);
                        d.setHours(d.getHours() - 1);
                        setNewStartTime(format(d, "yyyy-MM-dd'T'HH:mm"));
                      }}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition"
                    >
                      -1 giờ
                    </button>
                    <input
                      type="time"
                      value={newStartTime.split('T')[1] || ''}
                      onChange={(e) => {
                        const datePart = newStartTime.split('T')[0];
                        setNewStartTime(`${datePart}T${e.target.value}`);
                      }}
                      className="px-4 py-2 border-2 border-indigo-300 rounded-lg text-center font-bold text-lg w-32 focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(newStartTime);
                        d.setMinutes(d.getMinutes() + 30);
                        setNewStartTime(format(d, "yyyy-MM-dd'T'HH:mm"));
                      }}
                      className="px-3 py-2 bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200 transition"
                    >
                      +30 phút
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(newStartTime);
                        d.setHours(d.getHours() + 1);
                        setNewStartTime(format(d, "yyyy-MM-dd'T'HH:mm"));
                      }}
                      className="px-3 py-2 bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200 transition"
                    >
                      +1 giờ
                    </button>
                  </div>
                </div>

                {/* End Time */}
                <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    🏁 Giờ kết thúc
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(newEndTime);
                        d.setMinutes(d.getMinutes() - 30);
                        setNewEndTime(format(d, "yyyy-MM-dd'T'HH:mm"));
                      }}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition"
                    >
                      -30 phút
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(newEndTime);
                        d.setHours(d.getHours() - 1);
                        setNewEndTime(format(d, "yyyy-MM-dd'T'HH:mm"));
                      }}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition"
                    >
                      -1 giờ
                    </button>
                    <input
                      type="time"
                      value={newEndTime.split('T')[1] || ''}
                      onChange={(e) => {
                        const datePart = newEndTime.split('T')[0];
                        setNewEndTime(`${datePart}T${e.target.value}`);
                      }}
                      className="px-4 py-2 border-2 border-indigo-300 rounded-lg text-center font-bold text-lg w-32 focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(newEndTime);
                        d.setMinutes(d.getMinutes() + 30);
                        setNewEndTime(format(d, "yyyy-MM-dd'T'HH:mm"));
                      }}
                      className="px-3 py-2 bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200 transition"
                    >
                      +30 phút
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(newEndTime);
                        d.setHours(d.getHours() + 1);
                        setNewEndTime(format(d, "yyyy-MM-dd'T'HH:mm"));
                      }}
                      className="px-3 py-2 bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200 transition"
                    >
                      +1 giờ
                    </button>
                  </div>
                </div>

                {/* Preview New Time */}
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <label className="text-xs font-medium text-indigo-600 uppercase">Thời gian mới</label>
                  <p className="text-xl font-bold text-indigo-900 mt-1">
                    {newStartTime.split('T')[1] || '--:--'} → {newEndTime.split('T')[1] || '--:--'}
                  </p>
                  {(() => {
                    const start = new Date(newStartTime);
                    const end = new Date(newEndTime);
                    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                    return (
                      <p className="text-sm text-indigo-600 mt-1">
                        Thời lượng: {hours.toFixed(1)} giờ
                      </p>
                    );
                  })()}
                </div>
              </div>

              {/* Options */}
              <div className="space-y-3 bg-gray-50 rounded-lg p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recalculatePrice}
                    onChange={(e) => setRecalculatePrice(e.target.checked)}
                    className="w-5 h-5 text-indigo-600 rounded"
                  />
                  <span className="text-gray-700">Tính lại giá tự động</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chargeExtraToWallet}
                    onChange={(e) => setChargeExtraToWallet(e.target.checked)}
                    className="w-5 h-5 text-indigo-600 rounded"
                  />
                  <span className="text-gray-700">Trừ tiền thêm từ ví (nếu kéo dài)</span>
                </label>
              </div>

              {/* Admin Note */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ghi chú Admin (tùy chọn)
                </label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Lý do điều chỉnh..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 resize-none"
                  rows={2}
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleTimeUpdate}
                disabled={updateMutation.isPending}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {updateMutation.isPending ? '⏳ Đang xử lý...' : '✅ Cập nhật thời gian'}
              </button>
            </div>
          )}

          {/* ==================== COURT TAB ==================== */}
          {activeTab === 'court' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-bold text-blue-900 flex items-center gap-2">
                  <span>🔄</span>
                  <span>Chuyển sân</span>
                </h3>
                <p className="text-blue-700 text-sm mt-1">
                  Chuyển booking sang sân khác (giữ nguyên giờ)
                </p>
              </div>

              {/* Current Court */}
              <div className="bg-gray-100 rounded-lg p-4">
                <label className="text-xs font-medium text-gray-500 uppercase">Sân hiện tại</label>
                <p className="text-lg font-bold text-gray-900 mt-1">{court.name}</p>
              </div>

              {/* Court Select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chọn sân mới
                </label>
                <select
                  value={newCourtId || ''}
                  onChange={(e) => setNewCourtId(Number(e.target.value))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500"
                >
                  {courts.filter(c => c.isActive).map((court) => (
                    <option 
                      key={court.id} 
                      value={court.id}
                      disabled={court.id === booking.courtId}
                    >
                      {court.name} {court.id === booking.courtId ? '(Hiện tại)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Admin Note */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ghi chú Admin (tùy chọn)
                </label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Lý do chuyển sân..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 resize-none"
                  rows={2}
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleCourtTransfer}
                disabled={updateMutation.isPending || newCourtId === booking.courtId}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-50"
              >
                {updateMutation.isPending ? '⏳ Đang xử lý...' : '🔄 Chuyển sân'}
              </button>
            </div>
          )}

          {/* ==================== CANCEL TAB ==================== */}
          {activeTab === 'cancel' && (
            <div className="space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-bold text-red-900 flex items-center gap-2">
                  <span>⚠️</span>
                  <span>Hủy Booking (Force Cancel)</span>
                </h3>
                <p className="text-red-700 text-sm mt-1">
                  Hủy bất chấp trạng thái - Có thể hoàn tiền hoặc không
                </p>
              </div>

              {/* Refund Option */}
              <div className="bg-gray-50 rounded-lg p-4 border">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={refundToWallet}
                    onChange={(e) => setRefundToWallet(e.target.checked)}
                    className="w-5 h-5 text-red-600 rounded"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Hoàn tiền về ví khách</span>
                    <p className="text-sm text-gray-500">
                      Hoàn {new Intl.NumberFormat('vi-VN').format(booking.totalPrice)}đ về ví
                    </p>
                  </div>
                </label>
              </div>

              {/* Cancel Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lý do hủy
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Nhập lý do hủy booking..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 resize-none"
                  rows={3}
                />
              </div>

              {/* Warning */}
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
                <p className="text-amber-800 text-sm font-medium">
                  ⚠️ Lưu ý: Hành động này không thể hoàn tác!
                </p>
              </div>

              {/* Submit */}
              <button
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
                className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition disabled:opacity-50"
              >
                {cancelMutation.isPending ? '⏳ Đang xử lý...' : '❌ Hủy Booking'}
              </button>
            </div>
          )}
        </div>

        {/* Conflict Warning Modal */}
        {showConflictWarning && conflicts.length > 0 && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-6">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-red-600 flex items-center gap-2 mb-4">
                <span>⚠️</span>
                <span>Phát hiện xung đột!</span>
              </h3>
              
              <p className="text-gray-700 mb-4">
                Có {conflicts.length} booking trùng thời gian:
              </p>
              
              <div className="space-y-2 mb-6 max-h-40 overflow-y-auto">
                {conflicts.map((c) => (
                  <div key={c.bookingId} className="bg-red-50 p-3 rounded-lg text-sm">
                    <p className="font-bold text-red-800">#{c.bookingCode}</p>
                    <p className="text-red-600">
                      {format(new Date(c.startTime), 'HH:mm')} - {format(new Date(c.endTime), 'HH:mm')}
                    </p>
                    <p className="text-red-500 text-xs">{c.status}</p>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConflictWarning(false)}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg font-medium hover:bg-gray-50"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleForceOverwrite}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700"
                >
                  🔨 Force Overwrite
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-3 text-center">
                Force Overwrite sẽ hủy các booking trên
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminBookingModal;
