/**
 * 📦 Interface cho BullMQ Job Data
 */
export interface ExpireBookingJobData {
  bookingId: number;
}

/**
 * 📊 Interface cho Job Result
 */
export interface ExpireBookingJobResult {
  success: boolean;
  bookingId: number;
  bookingCode?: string;
  newStatus?: string;
  reason?: string;
}
