import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import apiClient from '../../../services/api/client';
import { TimelineBooking } from '../components/TimelineResourceGrid';
import { socketService } from '../../../services/socket.service';

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
        { params: { date } },
      );
      return data;
    },
    enabled: Boolean(courtId && date),
    staleTime: 2 * 60 * 1000, // 2 phút
  });
};

/**
 * Lấy tất cả bookings cho tất cả các sân vào một ngày nhất định
 * ✅ Real-time updates via Socket.IO
 */
export const useAllCourtBookingsByDate = (date?: string) => {
  const queryClient = useQueryClient();

  const query = useQuery<TimelineBooking[]>({
    queryKey: ['all-court-bookings', date],
    queryFn: async () => {
      if (!date) return [];
      const { data } = await apiClient.get<TimelineBooking[]>(
        `/bookings/by-date`,
        { params: { date } },
      );
      return data;
    },
    enabled: Boolean(date),
    staleTime: 2 * 60 * 1000, // 2 phút
  });

  // ✅ Real-time update via Socket.IO
  useEffect(() => {
    const handleStatusChange = () => {
      queryClient.invalidateQueries({ queryKey: ['all-court-bookings', date] });
    };

    const handleCourtUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['all-court-bookings', date] });
    };

    socketService.onBookingStatusChange(handleStatusChange);
    socketService.socket?.on('court:status-update', handleCourtUpdate);

    return () => {
      socketService.socket?.off('booking:status-change', handleStatusChange);
      socketService.socket?.off('court:status-update', handleCourtUpdate);
    };
  }, [date, queryClient]);

  return query;
};
