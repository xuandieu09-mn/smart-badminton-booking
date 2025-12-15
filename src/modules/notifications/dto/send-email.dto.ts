export interface SendEmailDto {
  to: string;
  subject: string;
  template: 'booking-confirmation' | 'booking-cancelled' | 'payment-success';
  context: {
    customerName: string;
    bookingCode: string;
    courtName: string;
    startTime: string;
    endTime: string;
    totalPrice: number;
    paymentMethod?: string;
    qrCode?: string;
    cancellationReason?: string;
    refundAmount?: number;
  };
}

export interface SendEmailJobData extends SendEmailDto {
  bookingId: number;
}
