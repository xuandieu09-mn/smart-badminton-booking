import React, { useMemo, useState } from 'react';
import { parseISO, differenceInMinutes, format } from 'date-fns';
import { Court } from '../../../types/court.types';
import './TimelineResourceGrid.css';

export interface TimelineBooking {
  id: number;
  courtId: number;
  startTime: string; // ISO datetime
  endTime: string; // ISO datetime
  status: 'PENDING_PAYMENT' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | string;
  paymentStatus?: 'PAID' | 'UNPAID' | 'PENDING';
  bookingCode?: string;
  expiresAt?: string | null; // ISO datetime for PENDING_PAYMENT countdown
}

interface TimelineResourceGridProps {
  courts: Court[];
  bookings: TimelineBooking[];
  date: Date;
  startHour?: number;
  endHour?: number;
  selectedRange?: { courtId: number; start: Date; end: Date } | null;
  onSlotToggle?: (courtId: number, startTime: Date) => void;
  isLoading?: boolean;
}

const DEFAULT_START_HOUR = 6;
const DEFAULT_END_HOUR = 21;
const SLOT_WIDTH_PX = 60; // Độ rộng của 1 giờ (30 phút = SLOT_WIDTH_PX / 2)
const ROW_HEIGHT_PX = 80; // Chiều cao mỗi sân

/**
 * Tính toán màu sắc và trạng thái hiển thị cho booking block
 */
const getBookingStyle = (booking: TimelineBooking) => {
  // Map trạng thái booking → màu sắc
  const statusColorMap: Record<string, { bg: string; text: string; label: string }> = {
    CONFIRMED: { bg: '#ef4444', text: '#ffffff', label: 'Đã đặt' }, // Red
    PENDING_PAYMENT: { bg: '#f59e0b', text: '#ffffff', label: 'Chờ thanh toán' }, // Amber
    COMPLETED: { bg: '#10b981', text: '#ffffff', label: 'Hoàn thành' }, // Green
    CANCELLED: { bg: '#9ca3af', text: '#ffffff', label: 'Hủy' }, // Gray
  };

  const style = statusColorMap[booking.status] || { bg: '#ef4444', text: '#ffffff', label: 'Đã đặt' };

  // Calculate remaining time for PENDING_PAYMENT
  let remainingSeconds = 0;
  if (booking.status === 'PENDING_PAYMENT' && booking.expiresAt) {
    const now = Date.now();
    const expiresAt = new Date(booking.expiresAt).getTime();
    remainingSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000));
  }

  return { ...style, remainingSeconds };
};

const TimelineResourceGrid: React.FC<TimelineResourceGridProps> = ({
  courts,
  bookings,
  date,
  startHour = DEFAULT_START_HOUR,
  endHour = DEFAULT_END_HOUR,
  selectedRange,
  onSlotToggle,
  isLoading = false,
}) => {
  const [hoveredSlot, setHoveredSlot] = useState<{ courtId: number; hour: number } | null>(null);

  // Tạo danh sách giờ từ startHour đến endHour
  const hours = useMemo(() => {
    const result = [];
    for (let i = startHour; i < endHour; i++) {
      result.push(i);
    }
    return result;
  }, [startHour, endHour]);

  // Tính toán vị trí và kích thước của mỗi booking block
  const bookingBlocks = useMemo(() => {
    return bookings
      .filter((booking) => {
        // Chỉ lấy booking của ngày được chọn
        const bookingDate = format(parseISO(booking.startTime), 'yyyy-MM-dd');
        const selectedDate = format(date, 'yyyy-MM-dd');
        return bookingDate === selectedDate;
      })
      .map((booking) => {
        const start = parseISO(booking.startTime);
        const end = parseISO(booking.endTime);
        const durationMinutes = differenceInMinutes(end, start);
        const durationHours = durationMinutes / 60;

        // Tính vị trí bắt đầu (tính từ startHour)
        const startOffsetMinutes = start.getHours() * 60 + start.getMinutes() - startHour * 60;
        const leftPx = (startOffsetMinutes / 60) * SLOT_WIDTH_PX;
        const widthPx = durationHours * SLOT_WIDTH_PX;

        const style = getBookingStyle(booking);

        return {
          id: booking.id,
          courtId: booking.courtId,
          leftPx,
          widthPx,
          durationMinutes,
          bookingCode: booking.bookingCode || `#${booking.id}`,
          style,
          rawBooking: booking,
        };
      });
  }, [bookings, date, startHour]);

  // Lấy bookings cho từng sân
  const getCourtBookings = (courtId: number) => {
    return bookingBlocks.filter((block) => block.courtId === courtId);
  };

  const handleSlotToggle = (courtId: number, hour: number, minute: number = 0) => {
    if (!onSlotToggle) return;

    const slotTime = new Date(date);
    slotTime.setHours(hour, minute, 0, 0);
    onSlotToggle(courtId, slotTime);
  };

  const totalHours = endHour - startHour;
  const totalWidthPx = totalHours * SLOT_WIDTH_PX;

  return (
    <div className="timeline-resource-grid-container">
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Đang tải lịch...</div>
      ) : courts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Chưa có sân khả dụng</div>
      ) : (
        <div className="timeline-wrapper">
          {/* Sticky Court Name Column */}
          <div className="timeline-court-names" style={{ height: courts.length * ROW_HEIGHT_PX + 50 }}>
            {/* Header spacer */}
            <div className="timeline-court-name-header">
              <div className="timeline-court-name-cell">Sân</div>
            </div>

            {/* Court rows */}
            {courts.map((court) => (
              <div
                key={court.id}
                className="timeline-court-name-row"
                style={{ height: ROW_HEIGHT_PX }}
                title={court.description}
              >
                <div className="timeline-court-name-cell">
                  <div className="font-semibold text-gray-900">{court.name}</div>
                  <div className="text-xs text-gray-600">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                    }).format(Number(court.pricePerHour))}
                    /h
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Scrollable Timeline Grid */}
          <div className="timeline-grid-wrapper">
            {/* Timeline Header (Hours) */}
            <div className="timeline-header" style={{ width: totalWidthPx }}>
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="timeline-hour-cell"
                  style={{ width: SLOT_WIDTH_PX }}
                >
                  <span className="timeline-hour-label">{String(hour).padStart(2, '0')}:00</span>
                </div>
              ))}
            </div>

            {/* Timeline Grid Body */}
            <div
              className="timeline-grid-body"
              style={{ width: totalWidthPx, height: courts.length * ROW_HEIGHT_PX }}
            >
              {/* Background grid lines */}
              {hours.map((hour, idx) => (
                <div
                  key={`grid-${hour}`}
                  className="timeline-grid-line"
                  style={{
                    left: idx * SLOT_WIDTH_PX,
                    width: SLOT_WIDTH_PX,
                    height: courts.length * ROW_HEIGHT_PX,
                  }}
                />
              ))}

              {/* Court rows with interactive slots */}
              {courts.map((court, courtIdx) => (
                <div
                  key={`court-${court.id}`}
                  className="timeline-court-row"
                  style={{
                    top: courtIdx * ROW_HEIGHT_PX,
                    height: ROW_HEIGHT_PX,
                    width: totalWidthPx,
                  }}
                >
                  {/* Interactive 30-minute slots */}
                  {hours.map((hour) => (
                    <React.Fragment key={`slots-${hour}`}>
                      {/* 0-30 min */}
                      <div
                        className="timeline-slot"
                        style={{
                          left: (hour - startHour) * SLOT_WIDTH_PX,
                          width: SLOT_WIDTH_PX / 2,
                          height: ROW_HEIGHT_PX,
                        }}
                        onMouseEnter={() => setHoveredSlot({ courtId: court.id, hour })}
                        onMouseLeave={() => setHoveredSlot(null)}
                        onClick={() => handleSlotToggle(court.id, hour, 0)}
                      />

                      {/* 30-60 min */}
                      <div
                        className="timeline-slot"
                        style={{
                          left: (hour - startHour) * SLOT_WIDTH_PX + SLOT_WIDTH_PX / 2,
                          width: SLOT_WIDTH_PX / 2,
                          height: ROW_HEIGHT_PX,
                        }}
                        onMouseEnter={() => setHoveredSlot({ courtId: court.id, hour })}
                        onMouseLeave={() => setHoveredSlot(null)}
                        onClick={() => handleSlotToggle(court.id, hour, 30)}
                      />
                    </React.Fragment>
                  ))}

              {/* Booking blocks */}
              {getCourtBookings(court.id).map((block) => (
                <div
                  key={`booking-${block.id}`}
                  className="timeline-booking-block"
                  style={{
                    left: block.leftPx,
                    width: Math.max(block.widthPx, 30), // Min width to show label
                    backgroundColor: block.style.bg,
                    color: block.style.text,
                    height: ROW_HEIGHT_PX * 0.8,
                    top: ROW_HEIGHT_PX * 0.1,
                  }}
                  title={`${block.style.label} - ${block.durationMinutes}min${
                    block.style.remainingSeconds
                      ? ` (${Math.ceil(block.style.remainingSeconds / 60)}p còn lại)`
                      : ''
                  }`}
                >
                  <div className="timeline-booking-label">
                    {block.durationMinutes >= 30 && (
                      <>
                        <div className="text-xs font-bold">{block.bookingCode}</div>
                        {block.style.remainingSeconds ? (
                          <div className="text-xs">⏱ {Math.ceil(block.style.remainingSeconds / 60)}p</div>
                        ) : (
                          <div className="text-xs">{block.durationMinutes}p</div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}                  {/* Selected range block */}
                  {selectedRange && selectedRange.courtId === court.id && (
                    <div
                      className="timeline-selection-block"
                      style={{
                        left:
                          ((selectedRange.start.getHours() * 60 + selectedRange.start.getMinutes()) -
                            startHour * 60) /
                          60 *
                          SLOT_WIDTH_PX,
                        width:
                          ((selectedRange.end.getTime() - selectedRange.start.getTime()) / 60000 / 60) *
                          SLOT_WIDTH_PX,
                        height: ROW_HEIGHT_PX * 0.8,
                        top: ROW_HEIGHT_PX * 0.1,
                      }}
                      title={`Đang chọn: ${format(selectedRange.start, 'HH:mm')} - ${format(
                        selectedRange.end,
                        'HH:mm',
                      )}`}
                    >
                      <div className="timeline-selection-label">
                        <div className="text-xs font-semibold text-white">Đang chọn</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      {!isLoading && bookings.length > 0 && (
        <div className="timeline-legend">
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#ef4444' }}></div>
            <span>Đã đặt</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#f59e0b' }}></div>
            <span>Chờ thanh toán</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#10b981' }}></div>
            <span>Hoàn thành</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#9ca3af' }}></div>
            <span>Hủy</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#ffffff', border: '1px solid #d1d5db' }}></div>
            <span>Trống</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimelineResourceGrid;
