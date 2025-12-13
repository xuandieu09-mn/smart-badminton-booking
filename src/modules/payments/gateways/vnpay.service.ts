import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface VNPayPaymentParams {
  amount: number;
  orderInfo: string;
  orderId: string;
  returnUrl: string;
  ipAddr: string;
}

export interface VNPayCallbackData {
  vnp_Amount: string;
  vnp_BankCode?: string;
  vnp_BankTranNo?: string;
  vnp_CardType?: string;
  vnp_OrderInfo: string;
  vnp_PayDate: string;
  vnp_ResponseCode: string;
  vnp_TmnCode: string;
  vnp_TransactionNo: string;
  vnp_TransactionStatus: string;
  vnp_TxnRef: string;
  vnp_SecureHash: string;
}

@Injectable()
export class VNPayService {
  private readonly vnpUrl: string;
  private readonly tmnCode: string;
  private readonly secretKey: string;
  public readonly returnUrl: string;

  constructor(private configService: ConfigService) {
    this.vnpUrl =
      this.configService.get<string>('VNPAY_URL') ||
      'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    this.tmnCode = this.configService.get<string>('VNPAY_TMN_CODE') || '';
    this.secretKey = this.configService.get<string>('VNPAY_SECRET_KEY') || '';
    this.returnUrl =
      this.configService.get<string>('VNPAY_RETURN_URL') ||
      'http://localhost:5173/payment/vnpay-return';
  }

  /**
   * Create VNPay payment URL
   */
  createPaymentUrl(params: VNPayPaymentParams): string {
    const date = new Date();
    const createDate = this.formatDate(date);
    const expireDate = this.formatDate(
      new Date(date.getTime() + 15 * 60 * 1000),
    ); // 15 minutes

    // Build VNPay params
    const vnpParams: Record<string, string | number> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: params.orderId,
      vnp_OrderInfo: params.orderInfo,
      vnp_OrderType: 'other',
      vnp_Amount: params.amount * 100, // VNPay requires amount in smallest unit (VND * 100)
      vnp_ReturnUrl: params.returnUrl || this.returnUrl,
      vnp_IpAddr: params.ipAddr,
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate,
    };

    console.log('🔍 VNPay Config:', {
      tmnCode: this.tmnCode,
      secretKey: this.secretKey ? `${this.secretKey.substring(0, 10)}...` : 'NOT SET',
      returnUrl: this.returnUrl,
      vnpUrl: this.vnpUrl,
    });
    console.log('🔍 VNPay Params:', vnpParams);

    // Sort params by key
    const sortedParams = this.sortObject(vnpParams);

    // Create signature
    const signData = Object.keys(sortedParams)
      .map((key) => `${key}=${sortedParams[key]}`)
      .join('&');
    const hmac = crypto.createHmac('sha512', this.secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    // Build final URL
    const paymentUrl =
      this.vnpUrl + '?' + signData + '&vnp_SecureHash=' + signed;

    console.log('🔍 VNPay Payment URL:', paymentUrl);
    console.log('🔍 VNPay Signature:', signed.substring(0, 20) + '...');

    return paymentUrl;
  }

  /**
   * Verify VNPay callback signature
   */
  verifyCallback(callbackData: VNPayCallbackData): boolean {
    const secureHash = callbackData.vnp_SecureHash;

    // Remove hash fields
    const data: Record<string, string | number> = { ...callbackData };
    delete data.vnp_SecureHash;
    delete data.vnp_SecureHashType;

    // Sort and create signature
    const sortedData = this.sortObject(data);
    const signData = Object.keys(sortedData)
      .map((key) => `${key}=${sortedData[key]}`)
      .join('&');
    const hmac = crypto.createHmac('sha512', this.secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    return secureHash === signed;
  }

  /**
   * Check if payment is successful
   */
  isPaymentSuccess(callbackData: VNPayCallbackData): boolean {
    return (
      callbackData.vnp_ResponseCode === '00' &&
      callbackData.vnp_TransactionStatus === '00'
    );
  }

  /**
   * Sort object keys alphabetically
   */
  private sortObject(
    obj: Record<string, string | number>,
  ): Record<string, string | number> {
    const sorted: Record<string, string | number> = {};
    const keys = Object.keys(obj).sort();
    keys.forEach((key) => {
      sorted[key] = obj[key];
    });
    return sorted;
  }

  /**
   * Format date to YYYYMMDDHHmmss
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');

    return `${year}${month}${day}${hour}${minute}${second}`;
  }

  /**
   * Parse VNPay date to JavaScript Date
   */
  parseDate(vnpDate: string): Date {
    // Format: YYYYMMDDHHmmss
    const year = parseInt(vnpDate.substring(0, 4));
    const month = parseInt(vnpDate.substring(4, 6)) - 1;
    const day = parseInt(vnpDate.substring(6, 8));
    const hour = parseInt(vnpDate.substring(8, 10));
    const minute = parseInt(vnpDate.substring(10, 12));
    const second = parseInt(vnpDate.substring(12, 14));

    return new Date(year, month, day, hour, minute, second);
  }

  /**
   * Get response message from code
   */
  getResponseMessage(responseCode: string): string {
    const messages: Record<string, string> = {
      '00': 'Giao dịch thành công',
      '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).',
      '09': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking tại ngân hàng.',
      '10': 'Giao dịch không thành công do: Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
      '11': 'Giao dịch không thành công do: Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch.',
      '12': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa.',
      '13': 'Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch (OTP).',
      '24': 'Giao dịch không thành công do: Khách hàng hủy giao dịch',
      '51': 'Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch.',
      '65': 'Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày.',
      '75': 'Ngân hàng thanh toán đang bảo trì.',
      '79': 'Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định.',
      '99': 'Các lỗi khác (lỗi còn lại, không có trong danh sách mã lỗi đã liệt kê)',
    };

    return messages[responseCode] || 'Lỗi không xác định';
  }
}
