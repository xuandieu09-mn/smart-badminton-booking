import React, { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Court, CourtAvailabilitySlot } from '../../../types/court.types';
import { courtApi } from '../../../services/api/court.api';

type CellStatus = 'BOOKED' | 'PENDING' | 'AVAILABLE' | 'SELECTED' | 'PAST' | 'MAINTENANCE';

type BookingGridProps = {
  courts: Court[];
  date: Date;
  isLoadingCourts?: boolean;
  onSelect?: (payload: { court: Court; slot: CourtAvailabilitySlot }) => void;
};

const startHour = 6;
const endHour = 21;
const intervalMinutes = 60;

const timeSlotsForDay = (date: Date) => {
  const slots: { label: string; date: Date }[] = [];
  const base = new Date(date);
  base.setSeconds(0, 0);
  for (let hour = startHour; hour < endHour; hour++) {
    const d = new Date(base);
    d.setHours(hour, 0, 0, 0);
    slots.push({
      label: `${String(hour).padStart(2, '0')}:00`,
      date: d,
    });
  }
  return slots;
};

const statusClasses: Record<CellStatus, string> = {
  BOOKED: 'bg-red-100 text-red-700 border border-red-200 cursor-not-allowed',
  PENDING: 'bg-orange-200 text-orange-800 border border-orange-300 cursor-not-allowed',
  AVAILABLE: 'bg-white text-gray-900 border border-gray-200 hover:bg-green-50 hover:border-green-200',
  SELECTED: 'bg-blue-600 text-white border border-blue-700',
  PAST: 'bg-gray-200 text-gray-500 border border-gray-300 cursor-not-allowed',
  MAINTENANCE: 'bg-gray-300 text-gray-600 border border-gray-400 cursor-not-allowed',
};

const Legend = () => (
  <div className="flex flex-wrap gap-3 text-sm mb-4">
    {[
      { color: statusClasses.BOOKED, label: '🔴 Đã đặt' },
      { color: statusClasses.PENDING, label: '🟡 Đang giữ chỗ' },
      { color: statusClasses.AVAILABLE, label: '🟢 Trống' },
      { color: statusClasses.SELECTED, label: '🔵 Đang chọn' },
      { color: statusClasses.PAST, label: '⚫ Đã qua' },
      { color: statusClasses.MAINTENANCE, label: '⚫ Bảo trì' },
    ].map((item) => (
      <div key={item.label} className="flex items-center gap-2">
        <span className={`inline-block w-4 h-4 rounded ${item.color}`}></span>
        <span>{item.label}</span>
      </div>
    ))}
  </div>
);

export const BookingGrid: React.FC<BookingGridProps> = ({ courts, date, isLoadingCourts, onSelect }) => {
  const [selectedCells, setSelectedCells] = useState<Record<string, boolean>>({});

  const dateStr = useMemo(() => date.toISOString().split('T')[0], [date]);
  const slotRows = useMemo(() => timeSlotsForDay(date), [date]);

  const availabilityQueries = useQueries({
    queries:
      courts?.map((court) => ({
        queryKey: ['court-availability', court.id, dateStr],
        queryFn: () => courtApi.fetchCourtAvailability(court.id, dateStr),
        enabled: !!dateStr,
      })) ?? [],
  });

  const availabilityMap = useMemo(() => {
    const map: Record<number, CourtAvailabilitySlot[]> = {};
    availabilityQueries.forEach((q, idx) => {
      const courtId = courts?.[idx]?.id;
      if (courtId && q.data?.slots) {
        map[courtId] = q.data.slots;
      }
    });
    return map;
  }, [availabilityQueries, courts]);

  const now = new Date();

  const computeStatus = (
    courtId: number,
    slotLabel: string,
    slotDate: Date,
  ): { status: CellStatus; slot?: CourtAvailabilitySlot; tooltip?: string } => {
    // Past time guard
    if (slotDate < now) return { status: 'PAST', tooltip: 'Giờ đã qua' };

    const slots = availabilityMap[courtId];
    const slot = slots?.find((s) => s.time.startsWith(slotLabel));
    if (!slot) return { status: 'MAINTENANCE', tooltip: 'Không khả dụng' };

    if (!slot.available) {
      // Không có phân biệt BOOKED/PENDING từ API, mặc định BOOKED
      return { status: 'BOOKED', slot, tooltip: 'Hết chỗ' };
    }

    const key = `${courtId}-${slotLabel}`;
    if (selectedCells[key]) return { status: 'SELECTED', slot };

    return { status: 'AVAILABLE', slot };
  };

  const handleSelect = (court: Court, slot: CourtAvailabilitySlot, slotLabel: string) => {
    const key = `${court.id}-${slotLabel}`;
    setSelectedCells((prev) => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = true;
      return next;
    });
    onSelect?.({ court, slot });
  };

  return (
    <div className="space-y-4">
      <Legend />
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 bg-gray-50 text-left text-xs font-semibold text-gray-600 px-2 py-2 border border-gray-200 w-24">Giờ</th>
              {courts?.map((court) => (
                <th
                  key={court.id}
                  className="text-sm font-semibold text-gray-700 px-2 py-2 border border-gray-200"
                >
                  {court.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slotRows.map(({ label, date: slotDate }) => (
              <tr key={label}>
                <td className="sticky left-0 bg-gray-50 text-xs font-medium text-gray-700 px-2 py-2 border border-gray-200 w-24">
                  {label}
                </td>
                {courts?.map((court) => {
                  const { status, slot, tooltip } = computeStatus(court.id, label, slotDate);
                  const classes = statusClasses[status];
                  const key = `${court.id}-${label}`;
                  const clickable = status === 'AVAILABLE' || status === 'SELECTED';

                  return (
                    <td key={court.id} className="p-1 border border-gray-200">
                      <button
                        title={tooltip}
                        disabled={!clickable}
                        onClick={() => slot && handleSelect(court, slot, label)}
                        className={`w-full h-full min-h-[48px] rounded text-xs md:text-sm transition ${classes}
                          ${clickable ? 'focus:outline-none focus:ring-2 focus:ring-indigo-400' : ''}`}
                      >
                        <div className="flex flex-col items-center justify-center gap-1">
                          <span>{slot?.price ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(slot.price) : '—'}</span>
                          {status === 'BOOKED' && <span className="text-[11px]">Booked</span>}
                          {status === 'PENDING' && <span className="text-[11px]">Pending</span>}
                          {status === 'AVAILABLE' && <span className="text-[11px] text-green-700">Available</span>}
                          {status === 'SELECTED' && <span className="text-[11px] text-white">Selected</span>}
                          {status === 'PAST' && <span className="text-[11px]">Past</span>}
                          {status === 'MAINTENANCE' && <span className="text-[11px]">NA</span>}
                        </div>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BookingGrid;