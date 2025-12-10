import { useMutation } from '@tanstack/react-query';
import apiClient from '../../../services/api/client';

export interface BulkBookingItem {
  courtId: number;
  startTime: Date | string;
  endTime: Date | string;
}

export interface CreateBulkBookingParams {
  bookings: BulkBookingItem[];
  type?: 'NORMAL' | 'GOLDEN' | 'PEAK';
  paymentMethod?: string;
  guestName?: string;
  guestPhone?: string;
}

/**
 * Hook for creating multiple bookings in a single transaction
 * All bookings are created atomically - if any fails, all are rolled back
 */
export const useCreateBulkBooking = () => {
  return useMutation({
    mutationFn: async (params: CreateBulkBookingParams) => {
      const payload = {
        bookings: params.bookings.map((booking) => ({
          courtId: booking.courtId,
          startTime:
            booking.startTime instanceof Date
              ? booking.startTime.toISOString()
              : booking.startTime,
          endTime:
            booking.endTime instanceof Date
              ? booking.endTime.toISOString()
              : booking.endTime,
        })),
        type: params.type,
        paymentMethod: params.paymentMethod,
        guestName: params.guestName,
        guestPhone: params.guestPhone,
      };

      const response = await apiClient.post('/bookings/bulk', payload);
      return response.data;
    },
  });
};
