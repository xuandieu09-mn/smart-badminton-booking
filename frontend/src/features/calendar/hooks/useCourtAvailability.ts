import { useQuery } from '@tanstack/react-query';
import { courtApi } from '../../../services/api/court.api';
import { CourtAvailability } from '../../../types/court.types';

export const useCourtAvailability = (courtId?: number, date?: string) => {
  return useQuery<CourtAvailability>({
    queryKey: ['court-availability', courtId, date],
    queryFn: () => courtApi.fetchCourtAvailability(courtId!, date!),
    enabled: Boolean(courtId && date),
  });
};
