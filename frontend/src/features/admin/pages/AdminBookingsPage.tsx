import React, { useMemo, useState } from 'react';
import { format, addDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useCourts } from '../../calendar/hooks/useCourts';
import { useAllCourtBookingsByDate } from '../../calendar/hooks/useCourtBookings';
import TimelineResourceGrid, {
  TimelineBooking,
} from '../../calendar/components/TimelineResourceGrid';
import { useQueryClient } from '@tanstack/react-query';
import AdminBookingModal from '../components/AdminBookingModal';
import '../../calendar/components/TimelineResourceGrid.css';

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

// ==================== COMPONENT ====================

export const AdminBookingsPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const { data: courts = [], isLoading: courtsLoading } = useCourts();
  const { data: bookings = [], isLoading: bookingsLoading } =
    useAllCourtBookingsByDate(dateStr);

  // Stats
  const stats = useMemo(() => {
    const activeBookings = bookings.filter(
      (b) => !['CANCELLED', 'EXPIRED'].includes(b.status)
    );
    const confirmedBookings = bookings.filter((b) => b.status === 'CONFIRMED');
    const checkedInBookings = bookings.filter((b) => b.status === 'CHECKED_IN');
    const pendingBookings = bookings.filter((b) => b.status === 'PENDING_PAYMENT');

    const totalRevenue = activeBookings.reduce(
      (sum, b) => sum + Number((b as any).totalPrice || 0),
      0
    );

    return {
      total: activeBookings.length,
      confirmed: confirmedBookings.length,
      checkedIn: checkedInBookings.length,
      pending: pendingBookings.length,
      revenue: totalRevenue,
    };
  }, [bookings]);

  // Handle booking click from timeline
  const handleBookingClick = (booking: TimelineBooking) => {
    // Find full booking data with relations
    const fullBooking = bookings.find((b) => b.id === booking.id);
    if (fullBooking) {
      setSelectedBooking(fullBooking as Booking);
      setIsModalOpen(true);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedBooking(null);
  };

  const handleModalSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['all-court-bookings'] });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                <span className="text-3xl">🔧</span>
                <span>Admin Booking Manager</span>
              </h1>
              <p className="text-indigo-200 mt-1">
                God Mode - Quản lý và can thiệp vào mọi booking
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white/20 rounded-lg px-4 py-2">
              <span className="text-2xl">📅</span>
              <span className="font-medium">
                {format(selectedDate, 'EEEE, dd/MM/yyyy', { locale: vi })}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl shadow p-4 border-l-4 border-indigo-500">
            <p className="text-gray-500 text-sm">Tổng booking</p>
            <p className="text-2xl font-bold text-indigo-600">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4 border-l-4 border-green-500">
            <p className="text-gray-500 text-sm">Đã xác nhận</p>
            <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4 border-l-4 border-blue-500">
            <p className="text-gray-500 text-sm">Đang chơi</p>
            <p className="text-2xl font-bold text-blue-600">{stats.checkedIn}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4 border-l-4 border-amber-500">
            <p className="text-gray-500 text-sm">Chờ thanh toán</p>
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4 border-l-4 border-emerald-500 col-span-2 md:col-span-1">
            <p className="text-gray-500 text-sm">Doanh thu ngày</p>
            <p className="text-2xl font-bold text-emerald-600">
              {new Intl.NumberFormat('vi-VN').format(stats.revenue)}đ
            </p>
          </div>
        </div>

        {/* Date Selector */}
        <div className="bg-white rounded-xl shadow p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                📅 Chọn ngày:
              </label>
              <input
                type="date"
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
              {[-3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7].map((offset) => {
                const date = addDays(new Date(), offset);
                const isSelected =
                  format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
                const isPast = offset < 0;

                return (
                  <button
                    key={offset}
                    onClick={() => setSelectedDate(date)}
                    className={`
                      px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition flex-shrink-0
                      ${isSelected
                        ? 'bg-indigo-600 text-white shadow-lg'
                        : isPast
                          ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                      }
                    `}
                  >
                    {offset === 0
                      ? 'Hôm nay'
                      : offset === -1
                        ? 'Hôm qua'
                        : offset === 1
                          ? 'Ngày mai'
                          : format(date, 'dd/MM')}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Timeline Grid */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <span>🏸</span>
              <span>Lịch đặt sân - Click vào booking để chỉnh sửa</span>
            </h2>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500"></div>
                <span className="text-gray-600">Đã đặt</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-500"></div>
                <span className="text-gray-600">Đang chơi</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-amber-500"></div>
                <span className="text-gray-600">Chờ TT</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500"></div>
                <span className="text-gray-600">Hoàn thành</span>
              </div>
            </div>
          </div>

          <TimelineResourceGrid
            courts={courts}
            bookings={bookings}
            date={selectedDate}
            startHour={6}
            endHour={23}
            onBookingClick={handleBookingClick}
            isLoading={courtsLoading || bookingsLoading}
            userRole="ADMIN"
          />
        </div>

        {/* Bookings List */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <span>📋</span>
              <span>Danh sách booking ({stats.total})</span>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                    Mã đặt
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                    Sân
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                    Thời gian
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                    Khách hàng
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                    Trạng thái
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">
                    Giá
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {bookings
                  .filter((b) => !['CANCELLED', 'EXPIRED'].includes(b.status))
                  .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                  .map((booking) => {
                    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
                      PENDING_PAYMENT: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Chờ TT' },
                      CONFIRMED: { bg: 'bg-green-100', text: 'text-green-700', label: 'Đã xác nhận' },
                      CHECKED_IN: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Đang chơi' },
                      COMPLETED: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Hoàn thành' },
                      BLOCKED: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Bảo trì' },
                    };
                    const status = statusConfig[booking.status] || statusConfig.CONFIRMED;
                    const court = courts.find((c) => c.id === booking.courtId);
                    const bk = booking as any;

                    return (
                      <tr
                        key={booking.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          setSelectedBooking(booking as Booking);
                          setIsModalOpen(true);
                        }}
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono font-bold text-indigo-600">
                            {booking.bookingCode}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {court?.name || `Sân ${booking.courtId}`}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <span className="font-medium">
                              {format(new Date(booking.startTime), 'HH:mm')} -{' '}
                              {format(new Date(booking.endTime), 'HH:mm')}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <p className="font-medium">
                              {bk.user?.name || bk.guestName || 'N/A'}
                            </p>
                            <p className="text-gray-500 text-xs">
                              {bk.user?.phone || bk.guestPhone || ''}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-bold ${status.bg} ${status.text}`}
                          >
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {new Intl.NumberFormat('vi-VN').format(
                            Number(bk.totalPrice || 0)
                          )}
                          đ
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBooking(booking as Booking);
                              setIsModalOpen(true);
                            }}
                            className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200 transition"
                          >
                            🔧 Sửa
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>

            {bookings.filter((b) => !['CANCELLED', 'EXPIRED'].includes(b.status)).length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <span className="text-4xl block mb-2">📭</span>
                Không có booking nào trong ngày này
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl shadow-lg p-6 text-white">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <span>⚡</span>
            <span>Admin Quick Actions</span>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 rounded-lg p-4 hover:bg-white/20 transition cursor-pointer">
              <span className="text-2xl block mb-2">📊</span>
              <span className="text-sm">Báo cáo doanh thu</span>
            </div>
            <div className="bg-white/10 rounded-lg p-4 hover:bg-white/20 transition cursor-pointer">
              <span className="text-2xl block mb-2">🔧</span>
              <span className="text-sm">Bảo trì sân</span>
            </div>
            <div className="bg-white/10 rounded-lg p-4 hover:bg-white/20 transition cursor-pointer">
              <span className="text-2xl block mb-2">📤</span>
              <span className="text-sm">Xuất Excel</span>
            </div>
            <div className="bg-white/10 rounded-lg p-4 hover:bg-white/20 transition cursor-pointer">
              <span className="text-2xl block mb-2">🔄</span>
              <span className="text-sm">Đồng bộ dữ liệu</span>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Booking Modal */}
      {selectedBooking && (
        <AdminBookingModal
          booking={selectedBooking}
          courts={courts}
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
};

export default AdminBookingsPage;
