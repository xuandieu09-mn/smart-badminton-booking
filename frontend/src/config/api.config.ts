export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
};

export const ENDPOINTS = {
  // Auth
  AUTH_LOGIN: '/auth/login',
  AUTH_REGISTER: '/auth/register',
  AUTH_LOGOUT: '/auth/logout',
  AUTH_REFRESH: '/auth/refresh',

  // Bookings
  BOOKINGS: '/bookings',
  BOOKINGS_BY_USER: '/bookings/user',
  BOOKINGS_BY_COURT: '/bookings/court',

  // Courts
  COURTS: '/courts',
  COURTS_AVAILABLE: '/courts/available',

  // Payment
  PAYMENTS: '/payments',
  PAYMENT_VNPAY_CALLBACK: '/payments/vnpay/callback',
  PAYMENT_MOMO_CALLBACK: '/payments/momo/callback',
};
