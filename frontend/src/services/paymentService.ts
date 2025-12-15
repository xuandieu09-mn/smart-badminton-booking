import apiClient from './api/client';
import { PaymentGateway } from '../features/payment/components/PaymentMethodModal';

export interface Payment {
  id: number;
  bookingId: number;
  amount: number;
  method: string;
  status: string;
  transactionId?: string;
  paidAt?: string;
  createdAt: string;
}

export interface PaymentResponse {
  payment: Payment;
  qrCode?: string;
  success: boolean;
  message: string;
}

export interface CreatePaymentUrlResponse {
  success: boolean;
  paymentUrl: string;
  bookingId: number;
  orderId: string;
}

/**
 * Pay with wallet
 */
export async function payWithWallet(
  bookingId: number,
): Promise<PaymentResponse> {
  const response = await apiClient.post<PaymentResponse>(
    `/payments/pay/${bookingId}`,
  );
  return response.data;
}

/**
 * Create VNPay payment URL
 */
export async function createVNPayPaymentUrl(
  bookingId: number,
  returnUrl?: string,
): Promise<CreatePaymentUrlResponse> {
  const response = await apiClient.post<CreatePaymentUrlResponse>(
    '/payments/vnpay/create-url',
    {
      bookingId,
      gateway: 'VNPAY' as PaymentGateway,
      returnUrl,
    },
  );
  return response.data;
}

/**
 * Get payment by ID
 */
export async function getPaymentById(paymentId: number): Promise<Payment> {
  const response = await apiClient.get<Payment>(`/payments/${paymentId}`);
  return response.data;
}

/**
 * Get payment by booking ID
 */
export async function getPaymentByBookingId(
  bookingId: number,
): Promise<Payment | null> {
  try {
    const response = await apiClient.get<Payment>(
      `/payments/booking/${bookingId}`,
    );
    return response.data;
  } catch (error) {
    return null;
  }
}

/**
 * Get user payments
 */
export async function getUserPayments(): Promise<Payment[]> {
  const response = await apiClient.get<Payment[]>('/payments/user');
  return response.data;
}

/**
 * Generic payment function - handles both wallet and gateway payments
 */
export async function processPayment(
  bookingId: number,
  gateway: PaymentGateway,
  returnUrl?: string,
): Promise<PaymentResponse | CreatePaymentUrlResponse> {
  if (gateway === 'WALLET') {
    return payWithWallet(bookingId);
  } else if (gateway === 'VNPAY') {
    return createVNPayPaymentUrl(bookingId, returnUrl);
  } else {
    throw new Error(`Payment gateway ${gateway} is not supported yet`);
  }
}
