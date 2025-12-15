import React from 'react';
import { CourtAvailabilitySlot } from '../../../types/court.types';

type Props = {
  slot: CourtAvailabilitySlot;
  isSelected: boolean;
  onSelect: (slot: CourtAvailabilitySlot) => void;
};

export const TimeSlot: React.FC<Props> = ({ slot, isSelected, onSelect }) => {
  const badgeColor =
    slot.priceType === 'PEAK'
      ? 'bg-red-100 text-red-700'
      : slot.priceType === 'GOLDEN'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-green-100 text-green-700';

  return (
    <button
      onClick={() => onSelect(slot)}
      disabled={!slot.available}
      className={`p-3 rounded-lg border transition text-left w-full
				${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'}
				${!slot.available ? 'opacity-60 cursor-not-allowed' : 'hover:border-indigo-300'}`}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gray-900">{slot.time}</span>
        <span
          className={`px-2 py-1 rounded-full text-xs font-semibold ${badgeColor}`}
        >
          {slot.priceType}
        </span>
      </div>
      <div className="mt-1 text-sm text-gray-700">
        {new Intl.NumberFormat('vi-VN', {
          style: 'currency',
          currency: 'VND',
        }).format(slot.price)}
      </div>
      {!slot.available && (
        <p className="text-xs text-gray-500 mt-1">Đã được đặt</p>
      )}
    </button>
  );
};

export default TimeSlot;
