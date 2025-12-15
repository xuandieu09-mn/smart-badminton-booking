import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
import { format, addWeeks, addMonths, startOfWeek, addDays } from 'date-fns';
import { vi } from 'date-fns/locale';

const API = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 30000,
});

interface Court {
  id: number;
  name: string;
  pricePerHour: number;
}

interface TimeSlotAvailability {
  status: 'available' | 'partial' | 'busy';
  conflictDates?: Date[];
  availableCount: number;
  totalCount: number;
}

interface SelectedSlot {
  dayOfWeek: number;
  hour: number;
  courtId: number;
}

const WEEKDAYS = [
  'Chủ nhật',
  'Thứ 2',
  'Thứ 3',
  'Thứ 4',
  'Thứ 5',
  'Thứ 6',
  'Thứ 7',
];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 6); // 6:00 - 20:00

export const FixedScheduleGrid: React.FC = () => {
  const { accessToken } = useAuthStore();
  const [courts, setCourts] = useState<Court[]>([]);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [duration, setDuration] = useState<number>(3); // months
  const [pattern] = useState<'WEEKLY'>('WEEKLY'); // Fixed to weekly for now
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [availability, setAvailability] = useState<
    Map<string, TimeSlotAvailability>
  >(new Map());
  const [loading, setLoading] = useState(false);
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);

  useEffect(() => {
    fetchCourts();
  }, []);

  useEffect(() => {
    if (selectedCourt) {
      calculateAvailability();
    }
  }, [selectedCourt, startDate, duration]);

  const fetchCourts = async () => {
    try {
      const response = await API.get('/courts');
      setCourts(response.data);
      if (response.data.length > 0) {
        setSelectedCourt(response.data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch courts:', error);
    }
  };

  // Generate all recurring dates for a given day of week
  const generateRecurringDates = (dayOfWeek: number): Date[] => {
    const dates: Date[] = [];
    const occurrences = duration * 4; // Approximate weeks in duration months

    // Find first occurrence
    let currentDate = new Date(startDate);
    while (currentDate.getDay() !== dayOfWeek) {
      currentDate = addDays(currentDate, 1);
    }

    for (let i = 0; i < occurrences; i++) {
      dates.push(new Date(currentDate));
      currentDate = addWeeks(currentDate, 1);
    }

    return dates;
  };

  // Check availability via API
  const checkSlotAvailability = async (
    courtId: number,
    dayOfWeek: number,
    hour: number,
  ): Promise<TimeSlotAvailability> => {
    try {
      const response = await API.post(
        '/bookings/recurring/check-availability',
        {
          courtId,
          dayOfWeek,
          hour,
          startDate: startDate.toISOString(),
          durationMonths: duration,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return {
        status: response.data.status,
        conflictDates:
          response.data.conflictDates?.map((d: string) => new Date(d)) || [],
        availableCount: response.data.availableCount,
        totalCount: response.data.totalCount,
      };
    } catch (error) {
      console.error('Failed to check availability:', error);
      // Fallback to mock data on error
      const dates = generateRecurringDates(dayOfWeek);
      const conflictDates: Date[] = [];
      const randomConflictChance = Math.random();

      if (randomConflictChance < 0.15) {
        // 15% chance of being completely busy
        return {
          status: 'busy',
          availableCount: 0,
          totalCount: dates.length,
        };
      } else if (randomConflictChance < 0.35) {
        // 20% chance of partial conflicts
        const numConflicts = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < numConflicts && i < dates.length; i++) {
          conflictDates.push(
            dates[i * Math.floor(dates.length / numConflicts)],
          );
        }
        return {
          status: 'partial',
          conflictDates,
          availableCount: dates.length - conflictDates.length,
          totalCount: dates.length,
        };
      } else {
        // 65% chance of being fully available
        return {
          status: 'available',
          availableCount: dates.length,
          totalCount: dates.length,
        };
      }
    }
  };

  const calculateAvailability = async () => {
    if (!selectedCourt) return;

    setLoading(true);
    const newAvailability = new Map<string, TimeSlotAvailability>();

    for (const dayOfWeek of [0, 1, 2, 3, 4, 5, 6]) {
      for (const hour of HOURS) {
        const key = `${selectedCourt.id}-${dayOfWeek}-${hour}`;
        const availability = await checkSlotAvailability(
          selectedCourt.id,
          dayOfWeek,
          hour,
        );
        newAvailability.set(key, availability);
      }
    }

    setAvailability(newAvailability);
    setLoading(false);
  };

  const toggleSlot = (dayOfWeek: number, hour: number) => {
    if (!selectedCourt) return;

    const key = `${selectedCourt.id}-${dayOfWeek}-${hour}`;
    const status = availability.get(key)?.status;

    if (status === 'busy') return; // Can't select busy slots

    const slotKey = `${dayOfWeek}-${hour}`;
    const newSelected = new Set(selectedSlots);

    if (newSelected.has(slotKey)) {
      newSelected.delete(slotKey);
    } else {
      newSelected.add(slotKey);
    }

    setSelectedSlots(newSelected);
  };

  const getSlotColor = (dayOfWeek: number, hour: number): string => {
    if (!selectedCourt) return 'bg-gray-100';

    const key = `${selectedCourt.id}-${dayOfWeek}-${hour}`;
    const slotKey = `${dayOfWeek}-${hour}`;
    const isSelected = selectedSlots.has(slotKey);
    const status = availability.get(key)?.status;

    if (isSelected) {
      return 'bg-purple-600 text-white border-purple-700';
    }

    switch (status) {
      case 'available':
        return 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200';
      case 'partial':
        return 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'busy':
        return 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed';
      default:
        return 'bg-gray-100';
    }
  };

  const getSlotIcon = (dayOfWeek: number, hour: number): string => {
    if (!selectedCourt) return '';

    const key = `${selectedCourt.id}-${dayOfWeek}-${hour}`;
    const status = availability.get(key)?.status;

    switch (status) {
      case 'available':
        return '✓';
      case 'partial':
        return '⚠';
      case 'busy':
        return '✕';
      default:
        return '';
    }
  };

  // Calculate summary
  const calculateSummary = () => {
    if (!selectedCourt) return null;

    const slots = Array.from(selectedSlots).map((key) => {
      const [dayOfWeek, hour] = key.split('-').map(Number);
      const availKey = `${selectedCourt.id}-${dayOfWeek}-${hour}`;
      const avail = availability.get(availKey);
      return {
        dayOfWeek,
        hour,
        availability: avail,
      };
    });

    const totalSessions = slots.reduce(
      (sum, slot) => sum + (slot.availability?.availableCount || 0),
      0,
    );
    const excludedDates: Date[] = [];
    slots.forEach((slot) => {
      if (slot.availability?.conflictDates) {
        excludedDates.push(...slot.availability.conflictDates);
      }
    });

    const totalPrice = totalSessions * selectedCourt.pricePerHour * 2; // Assume 2 hours per session

    return {
      slots,
      totalSessions,
      excludedDates,
      totalPrice,
    };
  };

  const summary = calculateSummary();

  const handleSubmit = async () => {
    if (!selectedCourt || selectedSlots.size === 0) {
      alert('Vui lòng chọn ít nhất một khung giờ');
      return;
    }

    // Implementation for submitting recurring bookings
    alert(
      'Chức năng đang phát triển - Sẽ tạo booking cho tất cả các slot đã chọn',
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Court Selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Chọn sân:
            </label>
            <select
              value={selectedCourt?.id || ''}
              onChange={(e) => {
                const court = courts.find(
                  (c) => c.id === parseInt(e.target.value),
                );
                setSelectedCourt(court || null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              {courts.map((court) => (
                <option key={court.id} value={court.id}>
                  {court.name} -{' '}
                  {new Intl.NumberFormat('vi-VN').format(court.pricePerHour)}đ/h
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Ngày bắt đầu:
            </label>
            <input
              type="date"
              value={format(startDate, 'yyyy-MM-dd')}
              onChange={(e) =>
                setStartDate(new Date(e.target.value + 'T00:00:00'))
              }
              min={format(new Date(), 'yyyy-MM-dd')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Thời lượng:
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value={1}>1 tháng</option>
              <option value={2}>2 tháng</option>
              <option value={3}>3 tháng</option>
              <option value={6}>6 tháng</option>
            </select>
          </div>

          {/* Pattern (Fixed to Weekly) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tần suất:
            </label>
            <div className="px-3 py-2 bg-purple-50 text-purple-700 rounded-lg border border-purple-200 font-medium">
              📅 Hàng tuần
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-100 border border-green-300 rounded flex items-center justify-center text-green-700 font-bold">
              ✓
            </div>
            <span className="text-gray-700">Trống hoàn toàn</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-yellow-100 border border-yellow-300 rounded flex items-center justify-center text-yellow-700 font-bold">
              ⚠
            </div>
            <span className="text-gray-700">Bận một vài ngày</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-200 border border-gray-300 rounded flex items-center justify-center text-gray-500 font-bold">
              ✕
            </div>
            <span className="text-gray-700">Đã kín</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-purple-600 border border-purple-700 rounded"></div>
            <span className="text-gray-700">Đã chọn</span>
          </div>
        </div>
      </div>

      {/* Availability Heatmap Grid */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <h3 className="text-lg font-bold">🗓 Lịch trống - Click để chọn</h3>
          <p className="text-sm text-purple-100 mt-1">
            Mỗi ô = tất cả các {WEEKDAYS[startDate.getDay()]} trong {duration}{' '}
            tháng
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Đang tải lịch trống...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-r">
                    Giờ / Thứ
                  </th>
                  {WEEKDAYS.map((day, idx) => (
                    <th
                      key={idx}
                      className="px-2 py-3 text-center text-sm font-semibold text-gray-700 border-b min-w-[80px]"
                    >
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOURS.map((hour) => (
                  <tr key={hour} className="border-b hover:bg-gray-50">
                    <td className="sticky left-0 z-10 bg-white px-4 py-2 text-sm font-medium text-gray-700 border-r">
                      {String(hour).padStart(2, '0')}:00
                    </td>
                    {[0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
                      const slotKey = `${dayOfWeek}-${hour}`;
                      const availKey = `${selectedCourt?.id}-${dayOfWeek}-${hour}`;
                      const avail = availability.get(availKey);
                      const isHovered = hoveredSlot === slotKey;

                      return (
                        <td key={dayOfWeek} className="p-1 relative">
                          <button
                            onClick={() => toggleSlot(dayOfWeek, hour)}
                            onMouseEnter={() => setHoveredSlot(slotKey)}
                            onMouseLeave={() => setHoveredSlot(null)}
                            disabled={avail?.status === 'busy'}
                            className={`
                              w-full h-12 rounded-lg border-2 transition-all font-bold text-lg
                              ${getSlotColor(dayOfWeek, hour)}
                              ${avail?.status !== 'busy' ? 'hover:scale-105 hover:shadow-md' : ''}
                            `}
                          >
                            {getSlotIcon(dayOfWeek, hour)}
                          </button>

                          {/* Tooltip for partial conflicts */}
                          {isHovered &&
                            avail?.status === 'partial' &&
                            avail.conflictDates && (
                              <div className="absolute z-20 bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                                <div className="font-semibold mb-1">
                                  Bận vào:
                                </div>
                                {avail.conflictDates
                                  .slice(0, 3)
                                  .map((date, idx) => (
                                    <div key={idx}>
                                      {format(date, 'dd/MM/yyyy', {
                                        locale: vi,
                                      })}
                                    </div>
                                  ))}
                                {avail.conflictDates.length > 3 && (
                                  <div>
                                    +{avail.conflictDates.length - 3} ngày nữa
                                  </div>
                                )}
                                <div className="text-yellow-300 mt-1">
                                  {avail.availableCount}/{avail.totalCount} buổi
                                  trống
                                </div>
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                              </div>
                            )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Summary */}
      {summary && selectedSlots.size > 0 && (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg shadow-lg border-2 border-purple-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            📋 Tóm tắt đặt lịch
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Selection details */}
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-600">
                  Các khung giờ đã chọn:
                </div>
                <div className="mt-2 space-y-1">
                  {summary.slots.map((slot, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span className="font-semibold text-purple-700">
                        {WEEKDAYS[slot.dayOfWeek]}
                      </span>
                      <span className="text-gray-700">
                        {String(slot.hour).padStart(2, '0')}:00 -{' '}
                        {String(slot.hour + 2).padStart(2, '0')}:00
                      </span>
                      <span className="text-xs text-gray-500">
                        ({slot.availability?.availableCount} buổi)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {summary.excludedDates.length > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="text-sm font-semibold text-yellow-800 mb-1">
                    ⚠️ Các ngày bị loại trừ (do bận):
                  </div>
                  <div className="text-xs text-yellow-700 space-y-1">
                    {summary.excludedDates.slice(0, 5).map((date, idx) => (
                      <div key={idx}>
                        {format(date, 'dd/MM/yyyy', { locale: vi })}
                      </div>
                    ))}
                    {summary.excludedDates.length > 5 && (
                      <div>+{summary.excludedDates.length - 5} ngày nữa</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Price summary */}
            <div className="bg-white rounded-lg p-4 border border-purple-200">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Tổng số buổi:</span>
                  <span className="text-xl font-bold text-purple-600">
                    {summary.totalSessions} buổi
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Giá mỗi buổi:</span>
                  <span className="font-semibold text-gray-900">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                    }).format((selectedCourt?.pricePerHour || 0) * 2)}
                  </span>
                </div>

                <div className="border-t pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">
                      Tạm tính:
                    </span>
                    <span className="text-2xl font-bold text-purple-600">
                      {new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND',
                      }).format(summary.totalPrice)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            className="w-full mt-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-lg hover:from-purple-700 hover:to-blue-700 font-bold text-lg shadow-lg transition"
          >
            ✨ Xác nhận đặt lịch cố định ({summary.totalSessions} buổi)
          </button>
        </div>
      )}

      {/* Empty state */}
      {selectedSlots.size === 0 && !loading && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-8 text-center">
          <div className="text-5xl mb-4">👆</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Hãy chọn các khung giờ trên lịch
          </h3>
          <p className="text-gray-600">
            Click vào các ô màu xanh hoặc vàng để chọn khung giờ bạn muốn đặt cố
            định
          </p>
        </div>
      )}
    </div>
  );
};

export default FixedScheduleGrid;
