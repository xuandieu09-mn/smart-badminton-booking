import React, { useMemo, useState } from 'react';
import { format, addDays } from 'date-fns';
import { useCourts } from './hooks/useCourts';
import { useAllCourtBookingsByDate } from './hooks/useCourtBookings';
import { usePollBookings } from './hooks/usePollBookings';
import TimelineResourceGrid, { TimelineBooking } from './components/TimelineResourceGrid';
import { useMutation } from '@tanstack/react-query';
import apiClient from '../../services/api/client';
import './components/TimelineResourceGrid.css';

export const Calendar: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedCourtId, setSelectedCourtId] = useState<number | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<number[]>([]); // timestamps (ms) per 30m slot

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const { data: courts, isLoading: courtsLoading } = useCourts();
  const { data: bookings = [], isLoading: bookingsLoading } = useAllCourtBookingsByDate(dateStr);

  // Polling real-time bookings mỗi 5 giây
  usePollBookings(dateStr, 5000);

  const { mutate: createBooking, isPending: isBooking } = useMutation({
    mutationFn: async (params: { courtId: number; startTime: Date; endTime: Date }) => {
      return apiClient.post('/bookings', {
        courtId: params.courtId,
        startTime: params.startTime.toISOString(),
        endTime: params.endTime.toISOString(),
      });
    },
    onSuccess: (response) => {
      alert('Booking created! Booking Code: ' + response.data.booking?.bookingCode);
      setSelectedSlots([]);
      setSelectedCourtId(null);
    },
    onError: (error: any) => {
      alert('Error creating booking: ' + (error.response?.data?.message || error.message));
    },
  });

  const selectedRange = useMemo(() => {
    if (!selectedCourtId || selectedSlots.length === 0) return null;
    const sorted = [...selectedSlots].sort((a, b) => a - b);
    const start = new Date(sorted[0]);
    const end = new Date(sorted[sorted.length - 1] + 30 * 60 * 1000);
    return { courtId: selectedCourtId, start, end };
  }, [selectedCourtId, selectedSlots]);

  const handleSlotToggle = (courtId: number, startTime: Date) => {
    // Reject if overlaps existing booking (BOOKED/PENDING/CONFIRMED)
    const conflict = bookings.find((b) => {
      const bStart = new Date(b.startTime).getTime();
      const bEnd = new Date(b.endTime).getTime();
      const s = startTime.getTime();
      const e = s + 30 * 60 * 1000;
      const isActive = b.status !== 'CANCELLED';
      return b.courtId === courtId && s < bEnd && e > bStart && isActive;
    });
    if (conflict) {
      const msg =
        conflict.status === 'PENDING_PAYMENT'
          ? `Slot này đang được giữ (chờ thanh toán). Hãy thử lại sau.`
          : 'Slot này đã được đặt';
      alert(msg);
      return;
    }

    const slotTs = startTime.getTime();

    if (selectedCourtId !== courtId) {
      setSelectedCourtId(courtId);
      setSelectedSlots([slotTs]);
      return;
    }

    // Same court: toggle
    if (selectedSlots.includes(slotTs)) {
      const next = selectedSlots.filter((ts) => ts !== slotTs);
      setSelectedSlots(next);
      if (next.length === 0) {
        setSelectedCourtId(null);
      }
      return;
    }

    const next = [...selectedSlots, slotTs].sort((a, b) => a - b);
    // Ensure contiguity (30-minute steps)
    const contiguous = next.every((ts, idx) => idx === 0 || ts - next[idx - 1] === 30 * 60 * 1000);
    if (!contiguous) {
      alert('Vui lòng chọn các khung 30p liên tiếp trong cùng một sân.');
      return;
    }
    setSelectedSlots(next);
  };

  const handleConfirmBooking = () => {
    if (!selectedRange) return;
    createBooking({ courtId: selectedRange.courtId, startTime: selectedRange.start, endTime: selectedRange.end });
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
            selectedRange={selectedRange}
            isLoading={courtsLoading || bookingsLoading}
          />
        </div>

        {/* Selected summary & actions */}
        <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-sm text-gray-700">
            {selectedRange ? (
              <>
                <span className="font-semibold">Đang chọn:</span>{' '}
                Sân {selectedRange.courtId} • {format(selectedRange.start, 'HH:mm')} -{' '}
                {format(selectedRange.end, 'HH:mm')}
              </>
            ) : (
              'Chọn khung giờ 30p liên tiếp để đặt.'
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
              onClick={() => {
                setSelectedSlots([]);
                setSelectedCourtId(null);
              }}
            >
              Bỏ chọn
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold disabled:opacity-50"
              disabled={!selectedRange || isBooking}
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
