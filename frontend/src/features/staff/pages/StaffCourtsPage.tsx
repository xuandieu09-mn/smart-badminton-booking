import React, { useMemo, useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { useCourts } from '../../calendar/hooks/useCourts';
import { useAllCourtBookingsByDate } from '../../calendar/hooks/useCourtBookings';
import TimelineResourceGrid, {
  TimelineBooking,
} from '../../calendar/components/TimelineResourceGrid';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/api/client';
import '../../calendar/components/TimelineResourceGrid.css';

type SelectedSlot = {
  courtId: number;
  courtName: string;
  startTime: Date;
  endTime: Date;
  price: number;
};

interface GuestInfo {
  guestName: string;
  guestPhone: string;
}

const StaffCourtsPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([]);
  const [guestInfo, setGuestInfo] = useState<GuestInfo>({
    guestName: '',
    guestPhone: '',
  });
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'VNPAY'>('CASH');
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [staffInfo, setStaffInfo] = useState<{ name: string; phone: string } | null>(null);
  const queryClient = useQueryClient();

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const { data: courts, isLoading: courtsLoading } = useCourts();
  const { data: bookings = [], isLoading: bookingsLoading } =
    useAllCourtBookingsByDate(dateStr);

  // Auto-fill staff info on mount
  useEffect(() => {
    const fetchStaffInfo = async () => {
      try {
        const { data } = await apiClient.get('/users/profile');
        if (data.name) {
          setStaffInfo({
            name: data.name,
            phone: data.phone || '',
          });
          setGuestInfo({
            guestName: data.name,
            guestPhone: data.phone || '',
          });
        }
      } catch (error) {
        console.error('Failed to fetch staff info:', error);
      }
    };
    fetchStaffInfo();
  }, []);

  // Merge consecutive slots into single bookings
  const mergeConsecutiveSlots = (
    slots: SelectedSlot[],
  ): Array<{
    courtId: number;
    startTime: string;
    endTime: string;
    guestName: string;
    guestPhone: string;
    paymentMethod: string;
  }> => {
    const courtGroups = slots.reduce(
      (acc, slot) => {
        if (!acc[slot.courtId]) acc[slot.courtId] = [];
        acc[slot.courtId].push(slot);
        return acc;
      },
      {} as Record<number, SelectedSlot[]>,
    );

    const mergedBookings: Array<{
      courtId: number;
      startTime: string;
      endTime: string;
      guestName: string;
      guestPhone: string;
      paymentMethod: string;
    }> = [];
paymentMethod
    Object.values(courtGroups).forEach((courtSlots) => {
      const sorted = [...courtSlots].sort(
        (a, b) => a.startTime.getTime() - b.startTime.getTime(),
      );

      let currentGroup: SelectedSlot[] = [sorted[0]];

      for (let i = 1; i < sorted.length; i++) {
        const prev = currentGroup[currentGroup.length - 1];
        const curr = sorted[i];

        if (prev.endTime.getTime() === curr.startTime.getTime()) {
          currentGroup.push(curr);
        } else {
          mergedBookings.push({
            courtId: currentGroup[0].courtId,
            startTime: currentGroup[0].startTime.toISOString(),
            endTime:
              currentGroup[currentGroup.length - 1].endTime.toISOString(),
            guestName: guestInfo.guestName,
            guestPhone: guestInfo.guestPhone,
            paymentMethod: 'CASH',
          });
          currentGroup = [curr];
        }
      }

      mergedBookings.push({
        courtId: currentGroup[0].courtId,
        startTime: currentGroup[0].startTime.toISOString(),
        endTime: currentGroup[currentGroup.length - 1].endTime.toISOString(),
        guestName: guestInfo.guestName,
        guestPhone: guestInfo.guestPhone,
        paymentMethod: paymentMethod,
      });
    });

    return mergedBookings;
  };

  // Bulk booking mutation for walk-in guests
  const { mutate: createGuestBooking, isPending: isBooking } = useMutation({
    mutationFn: async (slots: SelectedSlot[]) => {
      const bookingRequests = mergeConsecutiveSlots(slots);
      console.log('📦 Guest bookings:', bookingRequests);

      return apiClient.post('/bookings/bulk', {
        bookings: bookingRequests,
      });
    },
    onSuccess: (response) => {
      const bookingCodes =
        response.data.bookings?.map((b: any) => b.bookingCode).join(', ') || '';
      const count = response.data.bookings?.length || 0;

      setSelectedSlots([]);
      setGuestInfo({ guestName: '', guestPhone: '' });
      setShowGuestForm(false);

      queryClient.invalidateQueries({ queryKey: ['all-court-bookings'] });

      alert(
        `✅ Đặt sân thành công!\n` +
          `${count} booking được tạo\n` +
          `Mã đặt: ${bookingCodes}\n` +
          `Khách: ${guestInfo.guestName} (${guestInfo.guestPhone})\n` +
          `Thanh toán: ${paymentMethod === 'CASH' ? '💵 Tiền mặt' : '💳 Chuyển khoản (VNPAY)'}`,
      );
    },
    onError: (error: any) => {
      console.error('❌ Guest booking error:', error);
      alert('❌ Lỗi: ' + (error.response?.data?.message || error.message));
    },
  });

  const totalPrice = useMemo(() => {
    return selectedSlots.reduce((sum, slot) => sum + slot.price, 0);
  }, [selectedSlots]);

  const selectedSummary = useMemo(() => {
    if (selectedSlots.length === 0) return null;

    const slotCount = selectedSlots.length;
    const courtGroups = selectedSlots.reduce(
      (acc, slot) => {
        if (!acc[slot.courtId]) acc[slot.courtId] = [];
        acc[slot.courtId].push(slot);
        return acc;
      },
      {} as Record<number, SelectedSlot[]>,
    );

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

  const handleSlotToggle = (courtId: number, startTime: Date) => {
    const court = courts?.find((c) => c.id === courtId);
    if (!court) return;

    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
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

    const slotKey = `${courtId}-${startTime.getTime()}`;
    const existingIndex = selectedSlots.findIndex(
      (s) =>
        s.courtId === courtId && s.startTime.getTime() === startTime.getTime(),
    );

    if (existingIndex >= 0) {
      setSelectedSlots((prev) =>
        prev.filter((_, idx) => idx !== existingIndex),
      );
      return;
    }

    const price = Number(court.pricePerHour) / 2;

    const newSlot: SelectedSlot = {
      courtId,
      courtName: court.name,
      startTime,
      endTime,
      price,
    };

    setSelectedSlots((prev) => [...prev, newSlot]);
  };

  const handleShowGuestForm = () => {
    if (selectedSlots.length === 0) {
      alert('⚠️ Vui lòng chọn ít nhất 1 slot');
      return;
    }
    setShowGuestForm(true);
  };

  const handleSubmitBooking = () => {
    if (!guestInfo.guestName.trim()) {
      alert('⚠️ Vui lòng nhập tên khách hàng');
      return;
    }
    if (!guestInfo.guestPhone.trim()) {
      alert('⚠️ Vui lòng nhập số điện thoại');
      return;
    }
    if (!/^[0-9]{10,11}$/.test(guestInfo.guestPhone.trim())) {
      alert('⚠️ Số điện thoại không hợp lệ (10-11 số)');
      return;
    }

    createGuestBooking(selectedSlots);
  };

  return (
    <div className="min-h-screen bg-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            🏸 Đặt sân cho khách vãng lai
          </h1>
          <p className="text-gray-600">
            Chọn sân và giờ, sau đó nhập thông tin khách hàng
          </p>
        </div>

        {/* Date Selector */}
        <div className="mb-6 bg-white rounded-lg shadow p-4 md:p-6">
          <label className="block text-sm font-bold text-gray-700 mb-3">
            📅 Chọn ngày:
          </label>
          <input
            type="date"
            value={format(selectedDate, 'yyyy-MM-dd')}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            min={format(new Date(), 'yyyy-MM-dd')}
            className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />

          <div className="mt-4 flex items-center gap-2 overflow-x-auto">
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
                {day === 0
                  ? 'Hôm nay'
                  : day === 1
                    ? 'Ngày mai'
                    : 'T' + (2 + day)}
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

        {/* Selection Summary & Guest Form */}
        {selectedSummary ? (
          <div className="mt-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg shadow-lg border-2 border-indigo-200 p-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              {/* Left: Booking Details */}
              <div className="flex-1">
                <div className="text-sm font-bold text-indigo-900 mb-3 flex items-center gap-2">
                  <span className="text-2xl">🎯</span>
                  <span>
                    Đã chọn {selectedSummary.slotCount} slot trên{' '}
                    {selectedSummary.courtCount} sân
                  </span>
                </div>

                <div className="space-y-2">
                  {selectedSummary.details.map((detail) => (
                    <div
                      key={detail.courtId}
                      className="bg-white rounded-lg p-3 border border-indigo-100"
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

              {/* Right: Total & Actions */}
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
                    {selectedSummary.slotCount} slot
                    {selectedSummary.slotCount > 1 ? 's' : ''} •{' '}
                    {selectedSummary.courtCount} sân
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
                    className="px-6 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold shadow-lg hover:shadow-xl transition transform hover:scale-105"
                    onClick={handleShowGuestForm}
                  >
                    👤 Nhập thông tin khách
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
                Click vào các ô trống để chọn slot cho khách vãng lai
              </p>
            </div>
          </div>
        )}

        {/* Guest Information Form Modal */}
        {showGuestForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                👤 Thông tin khách hàng
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tên khách hàng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={guestInfo.guestName}
                    onChange={(e) =>
                      setGuestInfo({ ...guestInfo, guestName: e.target.value })
                    }
                    placeholder="Nhập tên khách hàng"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={guestInfo.guestPhone}
                    onChange={(e) =>
                      setGuestInfo({
                        ...guestInfo,
                        guestPhone: e.target.value,
                      })
                    }
                    placeholder="0901234567"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Nhập 10-11 số, không có khoảng trắng
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phương thức thanh toán <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('CASH')}
                      className={`px-4 py-3 rounded-lg border-2 font-medium transition ${
                        paymentMethod === 'CASH'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      💵 Tiền mặt
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('VNPAY')}
                      className={`px-4 py-3 rounded-lg border-2 font-medium transition ${
                        paymentMethod === 'VNPAY'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      🏦 Chuyển khoản
                    </button>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="text-xs text-green-600">
                    ✅ Booking sẽ được xác nhận ngay lập tức
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-6">
                <button
                  className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-300 text-gray-700 hover:bg-gray-100 font-medium transition"
                  onClick={() => setShowGuestForm(false)}
                  disabled={isBooking}
                >
                  Hủy
                </button>
                <button
                  className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition"
                  onClick={handleSubmitBooking}
                  disabled={isBooking}
                >
                  {isBooking ? '⏳ Đang xử lý...' : '✅ Xác nhận đặt sân'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h3 className="text-lg font-bold text-blue-900 mb-4">
            📌 Hướng dẫn sử dụng
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">1.</span>
              <span>
                <strong>Chọn ngày:</strong> Click vào nút ngày hoặc dùng date
                picker
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">2.</span>
              <span>
                <strong>Chọn slot:</strong> Click vào các ô trống trên lịch.
                Bạn có thể chọn nhiều slot trên nhiều sân
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">3.</span>
              <span>
                <strong>Nhập thông tin:</strong> Click "Nhập thông tin khách",
                điền tên và số điện thoại
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">4.</span>
              <span>
                <strong>Xác nhận:</strong> Booking sẽ được tạo với trạng thái
                CONFIRMED ngay lập tức (thanh toán tiền mặt)
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default StaffCourtsPage;
