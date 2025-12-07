import { useQuery } from '@tanstack/react-query';
import { courtApi } from '../../../services/api/court.api';
import { Court } from '../../../types/court.types';

export const useCourts = () => {
  return useQuery<Court[]>({
    queryKey: ['courts'],
    queryFn: courtApi.fetchCourts,
    staleTime: 5 * 60 * 1000,
  });
};
