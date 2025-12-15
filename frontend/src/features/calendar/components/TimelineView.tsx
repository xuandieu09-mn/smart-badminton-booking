import React from 'react';
import { CourtAvailabilitySlot } from '../../../types/court.types';
import { TimeSlot } from './TimeSlot';

type Props = {
  slots: CourtAvailabilitySlot[];
  selectedTime?: string;
  onSelect: (slot: CourtAvailabilitySlot) => void;
};

export const TimelineView: React.FC<Props> = ({
  slots,
  selectedTime,
  onSelect,
}) => {
  if (!slots?.length) {
    return <p className="text-gray-500">Không có giờ trống cho ngày này</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {slots.map((slot) => (
        <TimeSlot
          key={slot.time}
          slot={slot}
          isSelected={selectedTime === slot.time}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
};

export default TimelineView;
