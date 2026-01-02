import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Base URL should include the API prefix (NestJS is configured with global prefix 'api')
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor: Add JWT token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

// Response interceptor: Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // ✅ CHỈ redirect về login nếu KHÔNG phải đang ở trang login
      const currentPath = window.location.pathname;
      const isLoginPage = currentPath.includes('/login') || currentPath.includes('/auth');
      
      if (!isLoginPage) {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      }
      // ✅ Nếu đang ở login page → Để form xử lý lỗi, KHÔNG redirect
    }
    return Promise.reject(error);
  },
);

export default apiClient;
