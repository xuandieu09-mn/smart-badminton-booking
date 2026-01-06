import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi, OperatingHours } from '../services/api/settings';
import toast from 'react-hot-toast';

export const useOperatingHours = () => {
  return useQuery({
    queryKey: ['operating-hours'],
    queryFn: () => settingsApi.getOperatingHours(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};

export const useUpdateOperatingHours = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (hours: OperatingHours) => settingsApi.updateOperatingHours(hours),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operating-hours'] });
      toast.success('✅ Cập nhật giờ hoạt động thành công!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Lỗi khi cập nhật giờ hoạt động');
    },
  });
};

export const useResetOperatingHours = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => settingsApi.resetOperatingHours(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operating-hours'] });
      toast.success('✅ Đặt lại giờ hoạt động về mặc định (6:00 - 21:00)');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Lỗi khi đặt lại giờ hoạt động');
    },
  });
};
