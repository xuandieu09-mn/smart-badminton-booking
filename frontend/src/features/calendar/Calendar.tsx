import React, { useMemo, useState } from 'react';
import { format, addDays } from 'date-fns';
import { useCourts } from './hooks/useCourts';
import { useAllCourtBookingsByDate } from './hooks/useCourtBookings';
import { usePollBookings } from './hooks/usePollBookings';
import { useCreateBulkBooking } from './hooks/useCreateBulkBooking';
import TimelineResourceGrid from './components/TimelineResourceGrid';
import './components/TimelineResourceGrid.css';

type SelectedSlot = {
  courtId: number;
  courtName: string;
  startTime: Date;
  price: number;
};

export const Calendar: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([]);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const { data: courts, isLoading: courtsLoading } = useCourts();
  const { data: bookings = [], isLoading: bookingsLoading } = useAllCourtBookingsByDate(dateStr);

  // Polling real-time bookings mỗi 5 giây
  usePollBookings(dateStr, 5000);

  const { mutate: createBulkBooking, isPending: isBooking } = useCreateBulkBooking();

  const totalSelectedPrice = useMemo(
    () => selectedSlots.reduce((sum, slot) => sum + slot.price, 0),
    [selectedSlots],
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.max(value, 0));

  const computeSlotPrice = (court: { pricePerHour: number }, startTime: Date) => {
    const base = Number(court.pricePerHour) || 0;
    const hour = startTime.getHours();
    const day = startTime.getDay(); // 0 = Sun, 5 = Fri, 6 = Sat
    const isFriToSun = day === 5 || day === 6 || day === 0;

    let multiplier = 1;
    if (isFriToSun && hour >= 19 && hour < 21) {
      multiplier = 2; // PEAK Fri-Sun 19-21h
    } else if (hour >= 17 && hour < 21) {
      multiplier = 1.5; // GOLDEN 17-21h
    }

    return (base * multiplier) / 2; // 30-minute slot
  };

  const handleSlotToggle = (slot: {
    courtId: number;
    courtName: string;
    courtPricePerHour: number;
    startTime: Date;
  }) => {
    const slotStartMs = slot.startTime.getTime();
    const slotEndMs = slotStartMs + 30 * 60 * 1000;

    const conflict = bookings.find((b) => {
      const bStart = new Date(b.startTime).getTime();
      const bEnd = new Date(b.endTime).getTime();
      const isActive = b.status !== 'CANCELLED';
      return b.courtId === slot.courtId && slotStartMs < bEnd && slotEndMs > bStart && isActive;
    });
    if (conflict) {
      const msg =
        conflict.status === 'PENDING_PAYMENT'
          ? `Slot này đang được giữ (chờ thanh toán). Hãy thử lại sau.`
          : 'Slot này đã được đặt';
      alert(msg);
      return;
    }

    const existingIdx = selectedSlots.findIndex(
      (selected) => selected.courtId === slot.courtId && selected.startTime.getTime() === slotStartMs,
    );

    if (existingIdx !== -1) {
      const next = [...selectedSlots];
      next.splice(existingIdx, 1);
      setSelectedSlots(next);
      return;
    }

    const price = computeSlotPrice({ pricePerHour: slot.courtPricePerHour }, slot.startTime);
    const next = [...selectedSlots, { courtId: slot.courtId, courtName: slot.courtName, startTime: slot.startTime, price }];
    next.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    setSelectedSlots(next);
  };

  const handleConfirmBooking = () => {
    if (selectedSlots.length === 0) return;

    const bulkPayload = {
      bookings: selectedSlots.map((slot) => ({
        courtId: slot.courtId,
        startTime: slot.startTime.toISOString(),
        endTime: new Date(slot.startTime.getTime() + 30 * 60 * 1000).toISOString(),
      })),
    };

    createBulkBooking(bulkPayload, {
      onSuccess: (response) => {
        alert(
          `✅ ${response.bookings?.length || selectedSlots.length} booking(s) created!\nBooking codes: ${response.bookings?.map((b: any) => b.bookingCode).join(', ') || 'pending'}`,
        );
        setSelectedSlots([]);
      },
      onError: (error: any) => {
        alert('❌ Error: ' + (error.response?.data?.message || error.message));
      },
    });
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
                className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition flex-shrink-0 ${
                  format(selectedDate, 'yyyy-MM-dd') ===
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
            selectedSlots={selectedSlots}
            isLoading={courtsLoading || bookingsLoading}
          />
        </div>

        {/* Selected summary & actions */}
        <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-sm text-gray-700">
            {selectedSlots.length > 0 ? (
              <>
                <span className="font-semibold">Đang chọn:</span>{' '}
                {selectedSlots.length} slot • Tổng: {formatCurrency(totalSelectedPrice)}
              </>
            ) : (
              'Chọn các khung 30p bất kỳ (đa sân) để đặt.'
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
              onClick={() => {
                setSelectedSlots([]);
              }}
            >
              Bỏ chọn
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold disabled:opacity-50"
              disabled={selectedSlots.length === 0 || isBooking}
              onClick={handleConfirmBooking}
            >
              {isBooking ? 'Đang đặt...' : 'Xác nhận đặt sân'}
            </button>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h3 className="text-lg font-bold text-blue-900 mb-4">ℹ️ Hướng dẫn sử dụng</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <p className="font-semibold mb-2">Thời gian hoạt động:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>6:00 - 21:00 hàng ngày</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-2">Cách đặt sân:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Click vào khung giờ trống để đặt</li>
                <li>Chọn thời lượng đặt (30p, 60p, v.v.)</li>
                <li>Xác nhận để hoàn tất đặt sân</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
