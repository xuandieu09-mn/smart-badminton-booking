import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type FC,
  type MouseEvent,
} from 'react';
import {
  format,
  addDays,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameDay,
  isSameMonth,
  isBefore,
  startOfDay,
} from 'date-fns';
import { vi } from 'date-fns/locale';

interface HybridDatePickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  /** Cho phép chọn ngày trong quá khứ (dành cho Admin) */
  allowPast?: boolean;
  /** Giới hạn số ngày có thể chọn trong tương lai */
  maxFutureDays?: number;
  /** CSS class bổ sung */
  className?: string;
  /** Ẩn nút điều hướng prev/next */
  hideNavigation?: boolean;
  /** Ẩn quick action buttons */
  hideQuickActions?: boolean;
}

const HybridDatePicker: FC<HybridDatePickerProps> = ({
  selectedDate,
  onDateChange,
  allowPast = false,
  maxFutureDays = 30,
  className = '',
  hideNavigation = false,
  hideQuickActions = false,
}) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(selectedDate);
  const calendarRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const today = startOfDay(new Date());
  const maxDate = addDays(today, maxFutureDays);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: globalThis.MouseEvent) => {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsCalendarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update current month when selected date changes
  useEffect(() => {
    setCurrentMonth(selectedDate);
  }, [selectedDate]);

  const isDateDisabled = useCallback(
    (date: Date) => {
      // Check past dates
      if (!allowPast && isBefore(date, today)) {
        return true;
      }
      // Check future limit
      if (isBefore(maxDate, date)) {
        return true;
      }
      return false;
    },
    [allowPast, today, maxDate]
  );

  const handlePrevDay = () => {
    const newDate = addDays(selectedDate, -1);
    if (!isDateDisabled(newDate)) {
      onDateChange(newDate);
    }
  };

  const handleNextDay = () => {
    const newDate = addDays(selectedDate, 1);
    if (!isDateDisabled(newDate)) {
      onDateChange(newDate);
    }
  };

  const handleQuickSelect = (daysFromToday: number) => {
    const newDate = addDays(today, daysFromToday);
    if (!isDateDisabled(newDate)) {
      onDateChange(newDate);
    }
  };

  const handleDateSelect = (date: Date) => {
    if (!isDateDisabled(date)) {
      onDateChange(date);
      setIsCalendarOpen(false);
    }
  };

  const handlePrevMonth = (e: MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = (e: MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const toggleCalendar = () => {
    setIsCalendarOpen(!isCalendarOpen);
    if (!isCalendarOpen) {
      setCurrentMonth(selectedDate);
    }
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Start from Monday
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[] = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  };

  const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  const canGoPrev = allowPast || !isBefore(addDays(selectedDate, -1), today);
  const canGoNext = !isBefore(maxDate, addDays(selectedDate, 1));

  return (
    <div className={`relative ${className}`}>
      {/* Main Container */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
        {/* Quick Actions */}
        {!hideQuickActions && (
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => handleQuickSelect(0)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                isSameDay(selectedDate, today)
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
              }`}
            >
              📅 Hôm nay
            </button>
            <button
              onClick={() => handleQuickSelect(1)}
              disabled={isDateDisabled(addDays(today, 1))}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                isSameDay(selectedDate, addDays(today, 1))
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              🌅 Ngày mai
            </button>
            {allowPast && (
              <button
                onClick={() => handleQuickSelect(-1)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  isSameDay(selectedDate, addDays(today, -1))
                    ? 'bg-gray-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
                }`}
              >
                ⏪ Hôm qua
              </button>
            )}
          </div>
        )}

        {/* Date Display & Navigation */}
        <div className="flex items-center justify-between gap-3">
          {/* Prev Day Button */}
          {!hideNavigation && (
            <button
              onClick={handlePrevDay}
              disabled={!canGoPrev}
              className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 ${
                canGoPrev
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  : 'bg-gray-50 text-gray-300 cursor-not-allowed'
              }`}
              title="Ngày trước"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}

          {/* Calendar Trigger Button */}
          <button
            ref={buttonRef}
            onClick={toggleCalendar}
            className="flex-1 flex items-center justify-center gap-3 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="font-bold text-lg">
              {format(selectedDate, 'EEEE, dd/MM/yyyy', { locale: vi })}
            </span>
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${
                isCalendarOpen ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Next Day Button */}
          {!hideNavigation && (
            <button
              onClick={handleNextDay}
              disabled={!canGoNext}
              className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 ${
                canGoNext
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  : 'bg-gray-50 text-gray-300 cursor-not-allowed'
              }`}
              title="Ngày sau"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Calendar Dropdown */}
        {isCalendarOpen && (
          <div
            ref={calendarRef}
            className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 animate-fadeIn"
          >
            {/* Month Navigation */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <button
                onClick={handlePrevMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg
                  className="w-5 h-5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              <h3 className="text-lg font-bold text-gray-800">
                {format(currentMonth, 'MMMM yyyy', { locale: vi })}
              </h3>

              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg
                  className="w-5 h-5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>

            {/* Week Days Header */}
            <div className="grid grid-cols-7 px-2 py-2 border-b border-gray-100">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-semibold text-gray-500 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1 p-2">
              {generateCalendarDays().map((date, index) => {
                const isSelected = isSameDay(date, selectedDate);
                const isToday = isSameDay(date, today);
                const isCurrentMonth = isSameMonth(date, currentMonth);
                const disabled = isDateDisabled(date);

                return (
                  <button
                    key={index}
                    onClick={() => handleDateSelect(date)}
                    disabled={disabled}
                    className={`
                      relative p-2 rounded-lg text-sm font-medium transition-all duration-200
                      ${!isCurrentMonth ? 'text-gray-300' : ''}
                      ${disabled ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-indigo-50'}
                      ${isSelected ? 'bg-indigo-600 text-white hover:bg-indigo-700' : ''}
                      ${isToday && !isSelected ? 'bg-indigo-100 text-indigo-700 font-bold' : ''}
                      ${!isSelected && !isToday && isCurrentMonth && !disabled ? 'text-gray-700' : ''}
                    `}
                  >
                    {format(date, 'd')}
                    {isToday && (
                      <span className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-indigo-500 rounded-full"></span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Jump Footer */}
            <div className="flex items-center justify-between p-3 border-t border-gray-100 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => {
                  onDateChange(today);
                  setIsCalendarOpen(false);
                }}
                className="text-sm text-indigo-600 font-semibold hover:text-indigo-800 transition-colors"
              >
                Hôm nay
              </button>
              <span className="text-xs text-gray-400">
                {allowPast ? 'Admin Mode' : `Tối đa ${maxFutureDays} ngày`}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HybridDatePicker;
