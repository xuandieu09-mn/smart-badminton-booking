import React from 'react';
import { Court } from '../../../types/court.types';

type Props = {
  courts: Court[] | undefined;
  isLoading?: boolean;
  selectedCourtId?: number;
  onSelect: (court: Court) => void;
};

export const CourtGrid: React.FC<Props> = ({
  courts,
  isLoading,
  selectedCourtId,
  onSelect,
}) => {
  if (isLoading) {
    return <p className="text-gray-500">Đang tải sân...</p>;
  }

  if (!courts || courts.length === 0) {
    return (
      <p className="text-gray-500">
        Chưa có sân khả dụng. Vui lòng tạo sân hoặc thử lại sau.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {courts?.map((court) => {
        const isSelected = selectedCourtId === court.id;
        return (
          <button
            key={court.id}
            onClick={() => onSelect(court)}
            className={`w-full p-3 rounded-lg text-left transition border
							${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white hover:border-indigo-200'}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-900">{court.name}</div>
                {court.description && (
                  <div className="text-sm text-gray-600 line-clamp-2">
                    {court.description}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-indigo-700">
                  {new Intl.NumberFormat('vi-VN', {
                    style: 'currency',
                    currency: 'VND',
                  }).format(Number(court.pricePerHour))}
                  {' / '}
                  {new Intl.NumberFormat('vi-VN', {
                    style: 'currency',
                    currency: 'VND',
                  }).format(Number((court as any).peakPricePerHour || court.pricePerHour * 2))}
                </div>
                <div className="text-xs text-gray-500">Thường / Cao điểm (17h+)</div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default CourtGrid;
