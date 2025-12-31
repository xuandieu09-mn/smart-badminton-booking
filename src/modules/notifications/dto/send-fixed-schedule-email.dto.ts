export interface FixedScheduleEmailData {
  customerName: string;
  customerEmail: string;
  courtName: string;
  groupId: number;
  schedule: string; // "Mon, Wed 18:00-20:00"
  timeRange: string; // "18:00 - 20:00"
  period: string; // "2025-12-30 to 2026-01-13"
  totalSessions: number;
  originalPrice: string; // "1,600,000đ"
  hasDiscount: boolean;
  discountRate?: number; // 5 or 10
  discountAmount?: string; // "160,000đ"
  finalPrice: string; // "1,440,000đ"
  bookings: Array<{
    date: string; // "30/12/2025"
    dayName: string; // "Thứ Hai"
    time: string; // "18:00 - 20:00"
    bookingCode: string; // "BK251230-ABCD"
  }>;
  dashboardUrl: string;
  groupQRCode?: string; // Base64 QR code for the entire group
}
