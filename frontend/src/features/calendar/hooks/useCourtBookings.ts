import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../services/api/client';
import { TimelineBooking } from '../components/TimelineResourceGrid';

/**
 * Lấy tất cả bookings cho một sân cụ thể vào một ngày nhất định
 */
export const useCourtBookings = (courtId?: number, date?: string) => {
  return useQuery<TimelineBooking[]>({
    queryKey: ['court-bookings', courtId, date],
    queryFn: async () => {
      if (!courtId || !date) return [];
      const { data } = await apiClient.get<TimelineBooking[]>(
        `/bookings/court/${courtId}`,
        { params: { date } }
      );
      return data;
    },
    enabled: Boolean(courtId && date),
    staleTime: 2 * 60 * 1000, // 2 phút
  });
};

/**
 * Lấy tất cả bookings cho tất cả các sân vào một ngày nhất định
 */
export const useAllCourtBookingsByDate = (date?: string) => {
  return useQuery<TimelineBooking[]>({
    queryKey: ['all-court-bookings', date],
    queryFn: async () => {
      if (!date) return [];
      const { data } = await apiClient.get<TimelineBooking[]>(
        `/bookings/by-date`,
        { params: { date } }
      );
      return data;
    },
    enabled: Boolean(date),
    staleTime: 2 * 60 * 1000, // 2 phút
  });
};
