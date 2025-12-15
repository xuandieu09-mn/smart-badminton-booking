import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
import { format, addWeeks, addMonths, addDays } from 'date-fns';
import { vi } from 'date-fns/locale';

const API = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 30000,
});

interface Court {
  id: number;
  name: string;
  pricePerHour: number;
  description?: string;
}

type RecurrencePattern = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

const PATTERN_LABELS: Record<RecurrencePattern, string> = {
  WEEKLY: 'Hàng tuần',
  BIWEEKLY: '2 tuần/lần',
  MONTHLY: 'Hàng tháng',
};

const WEEKDAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const WEEKDAY_FULL = [
  'Chủ nhật',
  'Thứ 2',
  'Thứ 3',
  'Thứ 4',
  'Thứ 5',
  'Thứ 6',
  'Thứ 7',
];

const TIME_SLOTS = Array.from({ length: 15 }, (_, i) => i + 6); // 6-20h

export const RecurringCalendar: React.FC = () => {
  const { accessToken } = useAuthStore();
  const [courts, setCourts] = useState<Court[]>([]);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [pattern, setPattern] = useState<RecurrencePattern>('WEEKLY');
  const [occurrences, setOccurrences] = useState<number>(12);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    fetchCourts();
  }, []);

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

  // Generate preview dates
  const generatePreviewDates = (): Date[] => {
    if (!selectedDate) return [];
    const dates: Date[] = [new Date(selectedDate)];

    for (let i = 1; i < occurrences; i++) {
      const lastDate = dates[dates.length - 1];
      let newDate = new Date(lastDate);

      if (pattern === 'WEEKLY') {
        newDate = addWeeks(lastDate, 1);
      } else if (pattern === 'BIWEEKLY') {
        newDate = addWeeks(lastDate, 2);
      } else if (pattern === 'MONTHLY') {
        newDate = addMonths(lastDate, 1);
      }

      dates.push(newDate);
    }

    return dates;
  };

  const previewDates = generatePreviewDates();

  // Toggle time slot selection
  const toggleSlot = (hour: number) => {
    const key = `${hour}`;
    const newSlots = new Set(selectedSlots);

    if (newSlots.has(key)) {
      newSlots.delete(key);
    } else {
      newSlots.add(key);
    }

    setSelectedSlots(newSlots);
  };

  // Check if slots are continuous
  const getContinuousSlots = (): { start: number; end: number } | null => {
    if (selectedSlots.size === 0) return null;

    const hours = Array.from(selectedSlots)
      .map((s) => parseInt(s))
      .sort((a, b) => a - b);

    // Check if continuous
    for (let i = 1; i < hours.length; i++) {
      if (hours[i] !== hours[i - 1] + 1) {
        return null; // Not continuous
      }
    }

    return { start: hours[0], end: hours[hours.length - 1] + 1 };
  };

  const continuousSlots = getContinuousSlots();
  const duration = continuousSlots
    ? continuousSlots.end - continuousSlots.start
    : 0;
  const totalPrice =
    selectedCourt && duration > 0
      ? selectedCourt.pricePerHour * duration * occurrences
      : 0;

  const handleSubmit = async () => {
    if (!selectedCourt || !continuousSlots) {
      alert('Vui lòng chọn sân và khung giờ liên tục');
      return;
    }

    setLoading(true);
    setResult(null);

    const startTime = new Date(selectedDate);
    startTime.setHours(continuousSlots.start, 0, 0, 0);

    const endTime = new Date(selectedDate);
    endTime.setHours(continuousSlots.end, 0, 0, 0);

    const payload = {
      courtId: selectedCourt.id,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      pattern,
      dayOfWeek: selectedDate.getDay(),
      occurrences,
    };

    try {
      const response = await API.post('/bookings/recurring', payload, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      setResult({ success: true, data: response.data });
      setSelectedSlots(new Set());
    } catch (error: any) {
      setResult({
        success: false,
        message: error.response?.data?.message || error.message,
        conflicts: error.response?.data?.conflicts,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Court Selector */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Chọn sân:
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {courts.map((court) => (
            <button
              key={court.id}
              onClick={() => setSelectedCourt(court)}
              className={`p-3 rounded-lg border-2 transition text-left ${
                selectedCourt?.id === court.id
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-purple-300'
              }`}
            >
              <div className="font-semibold text-gray-900">{court.name}</div>
              <div className="text-xs text-gray-600 mt-1">
                {new Intl.NumberFormat('vi-VN', {
                  style: 'currency',
                  currency: 'VND',
                }).format(Number(court.pricePerHour))}
                /h
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Date Selector */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Chọn ngày bắt đầu:
        </label>
        <input
          type="date"
          value={format(selectedDate, 'yyyy-MM-dd')}
          onChange={(e) =>
            setSelectedDate(new Date(e.target.value + 'T00:00:00'))
          }
          min={format(new Date(), 'yyyy-MM-dd')}
          className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
        />
        <div className="text-sm text-gray-600 mt-2">
          📅 {format(selectedDate, 'EEEE, dd/MM/yyyy', { locale: vi })}
        </div>
      </div>

      {/* Time Slot Grid */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Chọn khung giờ (click để chọn liên tục):
        </label>

        <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
          {TIME_SLOTS.map((hour) => {
            const isSelected = selectedSlots.has(`${hour}`);
            return (
              <button
                key={hour}
                onClick={() => toggleSlot(hour)}
                className={`p-3 rounded-lg text-center font-medium transition border-2 ${
                  isSelected
                    ? 'border-purple-500 bg-purple-500 text-white'
                    : 'border-gray-200 hover:border-purple-300 text-gray-700'
                }`}
              >
                {String(hour).padStart(2, '0')}:00
              </button>
            );
          })}
        </div>

        {continuousSlots && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              ✅ Đã chọn:{' '}
              <strong>
                {continuousSlots.start}:00 - {continuousSlots.end}:00
              </strong>{' '}
              ({duration}h)
            </p>
          </div>
        )}

        {selectedSlots.size > 0 && !continuousSlots && (
          <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-800">
              ⚠️ Vui lòng chọn các khung giờ liên tục (VD: 18:00, 19:00, 20:00)
            </p>
          </div>
        )}
      </div>

      {/* Pattern & Occurrences */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Tần suất:
          </label>
          <div className="space-y-2">
            {(['WEEKLY', 'BIWEEKLY', 'MONTHLY'] as RecurrencePattern[]).map(
              (p) => (
                <button
                  key={p}
                  onClick={() => setPattern(p)}
                  className={`w-full p-3 rounded-lg border-2 transition text-left font-medium ${
                    pattern === p
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 hover:border-purple-300 text-gray-700'
                  }`}
                >
                  {PATTERN_LABELS[p]}
                </button>
              ),
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Số lần:
          </label>
          <input
            type="number"
            min={1}
            max={52}
            value={occurrences}
            onChange={(e) =>
              setOccurrences(Math.max(1, parseInt(e.target.value) || 1))
            }
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-0 text-lg font-medium"
          />
          <p className="text-xs text-gray-500 mt-2">
            {pattern === 'WEEKLY' && '12 lần = 3 tháng'}
            {pattern === 'BIWEEKLY' && '6 lần = 3 tháng'}
            {pattern === 'MONTHLY' && '3 lần = 3 tháng'}
          </p>
        </div>
      </div>

      {/* Preview Calendar */}
      {continuousSlots && (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg shadow-sm border-2 border-purple-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            📅 Xem trước lịch đặt
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {previewDates.map((date, idx) => (
              <div
                key={idx}
                className="bg-white rounded-lg p-3 border border-purple-200 shadow-sm"
              >
                <div className="text-xs text-gray-600">Buổi {idx + 1}</div>
                <div className="font-semibold text-gray-900 text-sm">
                  {format(date, 'dd/MM/yyyy')}
                </div>
                <div className="text-xs text-purple-600">
                  {format(date, 'EEEE', { locale: vi })}
                </div>
                <div className="text-xs text-gray-700 mt-1">
                  {continuousSlots.start}:00 - {continuousSlots.end}:00
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg p-4 border border-purple-300">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Tổng cộng:</div>
                <div className="text-2xl font-bold text-purple-600">
                  {new Intl.NumberFormat('vi-VN', {
                    style: 'currency',
                    currency: 'VND',
                  }).format(totalPrice)}
                </div>
              </div>
              <div className="text-right text-sm text-gray-600">
                <div>
                  {occurrences} buổi × {duration}h
                </div>
                <div>= {occurrences * duration}h total</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={loading || !continuousSlots}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 font-bold text-lg shadow-lg transition"
      >
        {loading ? '⏳ Đang xử lý...' : '✨ Xác nhận đặt lịch cố định'}
      </button>

      {/* Result */}
      {result && (
        <div
          className={`rounded-lg p-6 shadow-lg border-2 ${
            result.success
              ? 'bg-green-50 border-green-300'
              : 'bg-red-50 border-red-300'
          }`}
        >
          {result.success ? (
            <>
              <div className="flex items-center mb-4">
                <span className="text-4xl mr-3">✅</span>
                <h3 className="text-2xl font-bold text-green-900">
                  Đặt lịch thành công!
                </h3>
              </div>
              <div className="text-green-800 space-y-2">
                <p>
                  <strong>Tổng số buổi:</strong> {result.data.totalBookings}
                </p>
                <p>
                  <strong>Tổng tiền:</strong>{' '}
                  {new Intl.NumberFormat('vi-VN', {
                    style: 'currency',
                    currency: 'VND',
                  }).format(result.data.totalPrice)}
                </p>
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
                  <p className="text-yellow-900 font-medium">
                    ⚠️ Vui lòng thanh toán trong vòng 15 phút để giữ lịch đặt
                    sân
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <a
                  href="/my-recurring-bookings"
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-center"
                >
                  📋 Xem lịch của tôi
                </a>
                <button
                  onClick={() => {
                    setResult(null);
                    setSelectedSlots(new Set());
                  }}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium"
                >
                  ➕ Đặt lịch mới
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center mb-4">
                <span className="text-4xl mr-3">❌</span>
                <h3 className="text-2xl font-bold text-red-900">
                  Đặt lịch thất bại
                </h3>
              </div>
              <p className="text-red-800 mb-4">{result.message}</p>
              {result.conflicts && result.conflicts.length > 0 && (
                <div className="mt-4 p-4 bg-white rounded-lg border border-red-300">
                  <p className="font-semibold text-red-900 mb-2">
                    Các thời gian bị trùng:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-red-800">
                    {result.conflicts.map((conflict: string, idx: number) => (
                      <li key={idx}>
                        {format(new Date(conflict), 'EEEE, dd/MM/yyyy HH:mm', {
                          locale: vi,
                        })}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <button
                onClick={() => setResult(null)}
                className="mt-4 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
              >
                Thử lại
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default RecurringCalendar;
