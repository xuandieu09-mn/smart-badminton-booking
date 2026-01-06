import apiClient from './client';

export interface OperatingHours {
  openingHour: number;
  closingHour: number;
}

export const settingsApi = {
  // Get current operating hours (public)
  getOperatingHours: async (): Promise<OperatingHours> => {
    const { data } = await apiClient.get('/settings/operating-hours');
    return data;
  },

  // Update operating hours (admin only)
  updateOperatingHours: async (hours: OperatingHours): Promise<OperatingHours> => {
    const { data } = await apiClient.put('/settings/operating-hours', hours);
    return data;
  },

  // Reset to default (admin only)
  resetOperatingHours: async (): Promise<OperatingHours> => {
    const { data } = await apiClient.post('/settings/operating-hours/reset');
    return data;
  },
};
