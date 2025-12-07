import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook để polling bookings mỗi 5 giây (real-time pending bookings)
 */
export const usePollBookings = (date?: string, intervalMs: number = 5000) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!date) return;

    const timer = setInterval(() => {
      // Invalidate all-court-bookings query để trigger refetch
      queryClient.invalidateQueries({
        queryKey: ['all-court-bookings', date],
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [date, intervalMs, queryClient]);
};
