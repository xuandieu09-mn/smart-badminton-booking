import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
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
      console.log('🔄 [useAllCourtBookingsByDate] Fetching bookings for date:', date);
      const { data } = await apiClient.get<TimelineBooking[]>(
        `/bookings/by-date`,
        { params: { date } },
      );
      console.log('✅ [useAllCourtBookingsByDate] Received', data.length, 'bookings');
      return data;
    },
    enabled: Boolean(date),
    staleTime: 0, // Always refetch when invalidated
    refetchOnWindowFocus: true,
  });

  // ✅ Real-time update via Socket.IO (using window events from SocketContext)
  useEffect(() => {
    const handleBookingCreated = (event: CustomEvent) => {
      console.log('📅 [useAllCourtBookingsByDate] Booking created event received:', event.detail);
      // Force immediate refetch
      queryClient.refetchQueries({ queryKey: ['all-court-bookings', date] });
    };

    const handleBookingUpdated = (event: CustomEvent) => {
      console.log('📅 [useAllCourtBookingsByDate] Booking updated event received:', event.detail);
      queryClient.refetchQueries({ queryKey: ['all-court-bookings', date] });
    };

    const handleBookingCancelled = (event: CustomEvent) => {
      console.log('📅 [useAllCourtBookingsByDate] Booking cancelled event received:', event.detail);
      queryClient.refetchQueries({ queryKey: ['all-court-bookings', date] });
    };

    // Listen to custom events dispatched by SocketContext
    window.addEventListener('booking-created', handleBookingCreated as EventListener);
    window.addEventListener('booking-updated', handleBookingUpdated as EventListener);
    window.addEventListener('booking-cancelled', handleBookingCancelled as EventListener);

    console.log('🔌 [useAllCourtBookingsByDate] Event listeners registered for date:', date);

    return () => {
      window.removeEventListener('booking-created', handleBookingCreated as EventListener);
      window.removeEventListener('booking-updated', handleBookingUpdated as EventListener);
      window.removeEventListener('booking-cancelled', handleBookingCancelled as EventListener);
      console.log('🔌 [useAllCourtBookingsByDate] Event listeners removed for date:', date);
    };
  }, [date, queryClient]);

  return query;
};
