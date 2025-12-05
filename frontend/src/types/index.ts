export type Role = 'CUSTOMER' | 'STAFF' | 'ADMIN';
export type BookingStatus = 
  | 'PENDING_PAYMENT' 
  | 'CONFIRMED' 
  | 'CHECKED_IN' 
  | 'COMPLETED' 
  | 'CANCELLED' 
  | 'CANCELLED_LATE' 
  | 'EXPIRED' 
  | 'BLOCKED';

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface Court {
  id: number;
  name: string;
  description: string;
  pricePerHour: number;
  isActive: boolean;
}

export interface Booking {
  id: number;
  bookingCode: string;
  courtId: number;
  userId?: number;
  guestName?: string;
  guestPhone?: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  status: BookingStatus;
  expiresAt?: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}