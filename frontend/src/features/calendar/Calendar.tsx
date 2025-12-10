import React, { useMemo, useState } from 'react';
import { format, addDays } from 'date-fns';
import { useCourts } from './hooks/useCourts';
import { useAllCourtBookingsByDate } from './hooks/useCourtBookings';
import { usePollBookings } from './hooks/usePollBookings';
import TimelineResourceGrid, { TimelineBooking } from './components/TimelineResourceGrid';
import { useMutation } from '@tanstack/react-query';
import apiClient from '../../services/api/client';
import './components/TimelineResourceGrid.css';

// NEW: Multi-court bulk booking data structure
type SelectedSlot = {
  courtId: number;
  courtName: string;
  startTime: Date;
  endTime: Date;
  price: number;
};

export const Calendar: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // NEW: Array-based state for cross-court selection
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([]);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const { data: courts, isLoading: courtsLoading } = useCourts();
  const { data: bookings = [], isLoading: bookingsLoading } = useAllCourtBookingsByDate(dateStr);

  // Polling real-time bookings mỗi 5 giây
  usePollBookings(dateStr, 5000);

  // NEW: Bulk booking mutation - handles multiple slots
  const { mutate: createBulkBooking, isPending: isBooking } = useMutation({
    mutationFn: async (slots: SelectedSlot[]) => {
      // Group slots by court for batch API call
      const bookingRequests = slots.map(slot => ({
        courtId: slot.courtId,
        startTime: slot.startTime.toISOString(),
        endTime: slot.endTime.toISOString(),
      }));

      // Call bulk booking API
      return apiClient.post('/bookings/bulk', {
        bookings: bookingRequests,
      });
    },
    onSuccess: (response) => {
      const bookingCodes = response.data.bookings?.map((b: any) => b.bookingCode).join(', ') || '';
      alert(`✅ Đặt sân thành công!\nMã đặt: ${bookingCodes}`);
      setSelectedSlots([]);
    },
    onError: (error: any) => {
      alert('❌ Lỗi: ' + (error.response?.data?.message || error.message));
    },
  });

  // NEW: Calculate total price in real-time
  const totalPrice = useMemo(() => {
    return selectedSlots.reduce((sum, slot) => sum + slot.price, 0);
  }, [selectedSlots]);

  // NEW: Format selected slots for display
  const selectedSummary = useMemo(() => {
    if (selectedSlots.length === 0) return null;

    const slotCount = selectedSlots.length;
    const courtGroups = selectedSlots.reduce((acc, slot) => {
      if (!acc[slot.courtId]) acc[slot.courtId] = [];
      acc[slot.courtId].push(slot);
      return acc;
    }, {} as Record<number, SelectedSlot[]>);

    return {
      slotCount,
      courtCount: Object.keys(courtGroups).length,
      totalPrice,
      details: Object.entries(courtGroups).map(([courtId, slots]) => ({
        courtId: Number(courtId),
        courtName: slots[0].courtName,
        slots: slots.length,
        timeRange: `${format(slots[0].startTime, 'HH:mm')} - ${format(slots[slots.length - 1].endTime, 'HH:mm')}`,
      })),
    };
  }, [selectedSlots, totalPrice]);

  // NEW: Toggle-based slot selection with cross-court support
  const handleSlotToggle = (courtId: number, startTime: Date) => {
    const court = courts?.find((c) => c.id === courtId);
    if (!court) return;

    // Check for conflicts with existing bookings
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000); // 30-min slot
    const conflict = bookings.find((b) => {
      const bStart = new Date(b.startTime).getTime();
      const bEnd = new Date(b.endTime).getTime();
      const s = startTime.getTime();
      const e = endTime.getTime();
      const isActive = b.status !== 'CANCELLED';
      return b.courtId === courtId && s < bEnd && e > bStart && isActive;
    });

    if (conflict) {
      const msg =
        conflict.status === 'PENDING_PAYMENT'
          ? `⏱️ Slot này đang được giữ (chờ thanh toán)`
          : '🔒 Slot này đã được đặt';
      alert(msg);
      return;
    }

    // Check if slot is already selected (TOGGLE logic)
    const slotKey = `${courtId}-${startTime.getTime()}`;
    const existingIndex = selectedSlots.findIndex(
      (s) => s.courtId === courtId && s.startTime.getTime() === startTime.getTime()
    );

    if (existingIndex >= 0) {
      // REMOVE: Unselect this slot
      setSelectedSlots((prev) => prev.filter((_, idx) => idx !== existingIndex));
      return;
    }

    // ADD: Calculate price and add to selection
    const price = Number(court.pricePerHour) / 2; // 30-min slot = half price

    const newSlot: SelectedSlot = {
      courtId,
      courtName: court.name,
      startTime,
      endTime,
      price,
    };

    setSelectedSlots((prev) => [...prev, newSlot]);
  };

  const handleConfirmBooking = () => {
    if (selectedSlots.length === 0) {
      alert('⚠️ Vui lòng chọn ít nhất 1 slot');
      return;
    }
    createBulkBooking(selectedSlots);
  };

  return (
    <div className="min-h-screen bg-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            📅 Đặt lịch ngày trực quan
          </h1>
          <p className="text-gray-600">Chọn sân và giờ để đặt sân</p>
        </div>

        {/* Date Selector */}
        <div className="mb-6 bg-white rounded-lg shadow p-4 md:p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <button
              onClick={() => setSelectedDate(addDays(selectedDate, -1))}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
            >
              ← Hôm trước
            </button>

            <h2 className="text-2xl font-bold text-center">
              {format(selectedDate, 'dd/MM/yyyy')}
            </h2>

            <button
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
            >
              Hôm sau →
            </button>
          </div>

          {/* Quick date shortcuts */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[0, 1, 2, 3, 4, 5, 6].map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDate(addDays(new Date(), day))}
                className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition flex-shrink-0 ${format(selectedDate, 'yyyy-MM-dd') ===
                  format(addDays(new Date(), day), 'yyyy-MM-dd')
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                  }`}
              >
                {day === 0 ? 'Hôm nay' : day === 1 ? 'Ngày mai' : 'T' + (2 + day)}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Grid */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <TimelineResourceGrid
            courts={courts || []}
            bookings={bookings}
            date={selectedDate}
            startHour={6}
            endHour={21}
            onSlotToggle={handleSlotToggle}
            selectedSlots={selectedSlots} // NEW: Pass array of selected slots
            isLoading={courtsLoading || bookingsLoading}
          />
        </div>

        {/* NEW: Enhanced summary with real-time pricing */}
        {selectedSummary ? (
          <div className="mt-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg shadow-lg p-4 md:p-6 border-2 border-indigo-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* Left: Selection details */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">🎯</span>
                  <h3 className="text-lg font-bold text-gray-900">Đã chọn</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {selectedSummary.details.map((detail) => (
                    <div
                      key={detail.courtId}
                      className="bg-white rounded-lg p-3 border border-indigo-200 shadow-sm"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-indigo-600">
                          {detail.courtName}
                        </span>
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                          {detail.slots} slot{detail.slots > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600">
                        ⏰ {detail.timeRange}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Total price & actions */}
              <div className="flex flex-col items-end gap-3">
                <div className="text-right">
                  <div className="text-sm text-gray-600 mb-1">Tổng cộng</div>
                  <div className="text-3xl font-bold text-indigo-600">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                    }).format(totalPrice)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {selectedSummary.slotCount} slot{selectedSummary.slotCount > 1 ? 's' : ''} • {selectedSummary.courtCount} sân
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className="px-4 py-2 rounded-lg border-2 border-gray-300 text-gray-700 hover:bg-gray-100 font-medium transition"
                    onClick={() => setSelectedSlots([])}
                  >
                    🗑️ Bỏ chọn
                  </button>
                  <button
                    className="px-6 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition transform hover:scale-105"
                    disabled={isBooking}
                    onClick={handleConfirmBooking}
                  >
                    {isBooking ? '⏳ Đang xử lý...' : '✅ Xác nhận đặt sân'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-300">
            <div className="text-center text-gray-500">
              <span className="text-2xl mb-2 block">👆</span>
              <p className="text-sm">
                Click vào các ô trống để chọn slot. Bạn có thể chọn nhiều slot trên nhiều sân khác nhau!
              </p>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h3 className="text-lg font-bold text-blue-900 mb-4">ℹ️ Hướng dẫn sử dụng</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
            <div>
              <p className="font-semibold mb-2">🎯 Đặt sân Bulk (mới!):</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Click 1 lần: Chọn slot</li>
                <li>Click lần 2: Bỏ chọn (toggle)</li>
                <li>Chọn nhiều sân cùng lúc</li>
                <li>Xem giá tổng real-time</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-2">⏰ Thời gian hoạt động:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>6:00 - 21:00 hàng ngày</li>
                <li>Mỗi slot: 30 phút</li>
                <li>Giá: Theo giờ của sân</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-2">💡 Mẹo sử dụng:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Ô vàng: Đã chọn</li>
                <li>Ô đỏ: Đã có người đặt</li>
                <li>Ô cam: Đang chờ thanh toán</li>
                <li>Click nhiều lần để đặt linh hoạt</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
