import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Payment, PaymentStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import * as QRCode from 'qrcode';
import { VNPayService } from './gateways/vnpay.service';
import { VNPayCallbackDto } from './dto/payment-gateway.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsGateway } from '../../common/websocket/events.gateway';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private vnpayService: VNPayService,
    private notificationsService: NotificationsService,
    private eventsGateway: EventsGateway,
  ) {}

  /**
   * Create payment for booking
   */
  async createPaymentForBooking(bookingId: number): Promise<Payment> {
    // Get booking with its details
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: true,
        court: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }

    // 🚫 MAINTENANCE bookings don't need payment
    if (booking.type === 'MAINTENANCE') {
      throw new BadRequestException(
        'Cannot create payment for maintenance bookings',
      );
    }

    if (booking.totalPrice === null) {
      throw new BadRequestException('Booking total price not set');
    }

    // Check if payment already exists
    const existingPayment = await this.prisma.payment.findFirst({
      where: { bookingId },
    });

    if (existingPayment) {
      return existingPayment;
    }

    // Create payment
    const payment = await this.prisma.payment.create({
      data: {
        bookingId,
        amount: booking.totalPrice,
        method: 'WALLET', // Default to wallet
        status: PaymentStatus.UNPAID,
      },
    });

    return payment;
  }

  /**
   * Pay with wallet balance
   */
  async payWithWallet(
    bookingId: number,
    userId: number,
  ): Promise<{
    payment: Payment;
    qrCode: string | null;
    success: boolean;
    message: string;
  }> {
    // Get booking
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }

    // 🚫 MAINTENANCE bookings don't need payment
    if (booking.type === 'MAINTENANCE') {
      throw new BadRequestException('Cannot pay for maintenance bookings');
    }

    // Get user wallet
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet for user ${userId} not found`);
    }

    if (!booking.totalPrice) {
      throw new BadRequestException('Booking total price not set');
    }

    const totalPrice = Number(booking.totalPrice);
    const walletBalance = Number(wallet.balance);

    if (walletBalance < totalPrice) {
      throw new BadRequestException(
        `Insufficient balance. Required: ${totalPrice}, Available: ${walletBalance}`,
      );
    }

    // Create or get payment
    let payment = await this.prisma.payment.findFirst({
      where: { bookingId },
    });

    if (!payment) {
      payment = await this.prisma.payment.create({
        data: {
          bookingId,
          amount: booking.totalPrice,
          method: 'WALLET',
          status: PaymentStatus.UNPAID,
        },
      });
    }

    // Execute payment transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Deduct from wallet
      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: {
          balance: new Decimal(walletBalance - totalPrice),
        },
      });

      // Update payment status
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          paidAt: new Date(),
        },
      });

      // Update booking status AND paidAmount
      const confirmedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'CONFIRMED',
          paymentStatus: 'PAID',
          paidAmount: booking.totalPrice, // ✅ FIX: Track actual paid amount
        },
      });

      // Record wallet transaction
      await tx.walletTransaction.create({
        data: {
          walletId: updatedWallet.id,
          type: 'PAYMENT',
          amount: booking.totalPrice,
          description: `Payment for booking #${booking.bookingCode}`,
          bookingId,
          balanceBefore: wallet.balance,
          balanceAfter: updatedWallet.balance,
        },
      });

      return { payment: updatedPayment, booking: confirmedBooking };
    });

    // Generate QR code after successful payment
    let qrCode: string | null = null;
    try {
      qrCode = await QRCode.toDataURL(
        JSON.stringify({
          bookingId: booking.id,
          bookingCode: booking.bookingCode,
          courtId: booking.courtId,
          startTime: booking.startTime,
          endTime: booking.endTime,
        }),
        {
          errorCorrectionLevel: 'H',
          type: 'image/png',
          width: 300,
        },
      );

      // Save QR code to booking record
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          qrCode: qrCode,
        },
      });
    } catch (error) {
      console.error('QR code generation failed:', error);
      // Don't fail payment if QR generation fails
    }

    // Send payment success email
    try {
      if (booking.userId) {
        const user = await this.prisma.user.findUnique({
          where: { id: booking.userId },
        });

        if (user?.email) {
          await this.notificationsService.sendPaymentSuccess(user.email, {
            bookingId: booking.id,
            customerName: user.name || user.email,
            bookingCode: booking.bookingCode,
            courtName: `Court ${booking.courtId}`,
            startTime: booking.startTime,
            endTime: booking.endTime,
            totalPrice: Number(booking.totalPrice),
            paymentMethod: 'WALLET',
            qrCode: qrCode || undefined,
          });
          this.logger.log(
            `Payment success email queued for booking ${booking.bookingCode}`,
          );
        }
      }
    } catch (emailError) {
      this.logger.error(`Failed to queue payment email: ${emailError.message}`);
      // Don't fail the payment if email fails
    }

    // Emit WebSocket event for payment success
    if (booking.userId) {
      this.eventsGateway.emitBookingStatusChange(booking.userId, {
        bookingId: booking.id,
        newStatus: 'CONFIRMED',
        message: `Payment successful for booking ${booking.bookingCode}`,
      });
    }

    // � Broadcast booking status change for real-time calendar update
    this.eventsGateway.broadcast('booking:updated', {
      bookingId: booking.id,
      courtId: booking.courtId,
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
    });

    // �🔔 Send payment notification to all parties
    try {
      this.logger.log(
        `📤 Calling notifyPaymentSuccess for booking #${booking.bookingCode}...`,
      );
      await this.notificationsService.notifyPaymentSuccess(
        result.payment,
        result.booking,
      );
      this.logger.log(`✅ Payment notification sent`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to send payment notification: ${error.message}`,
      );
      this.logger.error(error.stack);
    }

    return {
      payment: result.payment,
      qrCode,
      success: true,
      message: 'Payment successful. Booking confirmed. QR code generated.',
    };
  }

  /**
   * Get payment details
   */
  async getPayment(paymentId: number): Promise<Payment> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${paymentId} not found`);
    }

    return payment;
  }

  /**
   * Get payment by booking ID
   */
  async getPaymentByBookingId(bookingId: number): Promise<Payment | null> {
    return this.prisma.payment.findFirst({
      where: { bookingId },
    });
  }

  /**
   * Get user payments
   */
  async getUserPayments(userId: number): Promise<Payment[]> {
    return this.prisma.payment.findMany({
      where: {
        booking: {
          userId,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update payment status (Admin/Internal use)
   */
  async updatePaymentStatus(
    paymentId: number,
    status: PaymentStatus,
  ): Promise<Payment> {
    const payment = await this.getPayment(paymentId);

    if (payment.status === PaymentStatus.PAID) {
      throw new BadRequestException(
        'Cannot change status of completed payment',
      );
    }

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: { status },
    });
  }

  /**
   * Refund payment
   */
  async refundPayment(paymentId: number): Promise<{
    payment: Payment;
    wallet: any;
    message: string;
  }> {
    const payment = await this.getPayment(paymentId);

    if (payment.status !== PaymentStatus.PAID) {
      throw new BadRequestException('Only paid payments can be refunded');
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: payment.bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Associated booking not found');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Update payment status
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.REFUNDED,
        },
      });

      // Add back to wallet
      const currentWallet = await tx.wallet.findUnique({
        where: { userId: booking.userId },
      });

      const updatedWallet = await tx.wallet.update({
        where: { userId: booking.userId },
        data: {
          balance: new Decimal(
            Number(currentWallet.balance) + Number(payment.amount),
          ),
        },
      });

      // Record refund transaction
      await tx.walletTransaction.create({
        data: {
          walletId: updatedWallet.id,
          type: 'REFUND',
          amount: payment.amount,
          description: `Refund for booking #${booking.bookingCode}`,
          bookingId: booking.id,
          balanceBefore: currentWallet.balance,
          balanceAfter: updatedWallet.balance,
        },
      });

      return {
        updatedPayment,
        updatedWallet,
      };
    });

    return {
      payment: result.updatedPayment,
      wallet: result.updatedWallet,
      message: 'Payment refunded successfully',
    };
  }

  /**
   * 💳 Create VNPay payment URL
   */
  async createVNPayPaymentUrl(
    bookingId: number,
    userId: number,
    returnUrl?: string,
    ipAddr?: string,
  ): Promise<{
    success: boolean;
    paymentUrl: string;
    bookingId: number;
    orderId: string;
  }> {
    // Get booking
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: true,
        court: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }

    // 🚫 MAINTENANCE bookings don't need payment
    if (booking.type === 'MAINTENANCE') {
      throw new BadRequestException(
        'Cannot create payment URL for maintenance bookings',
      );
    }

    if (booking.userId !== userId) {
      throw new BadRequestException('You can only pay for your own bookings');
    }

    if (booking.paymentStatus === 'PAID') {
      throw new BadRequestException('Booking is already paid');
    }

    if (booking.status === 'CANCELLED') {
      throw new BadRequestException('Cannot pay for cancelled booking');
    }

    // Create or get payment record
    let payment = await this.prisma.payment.findFirst({
      where: { bookingId },
    });

    if (!payment) {
      payment = await this.prisma.payment.create({
        data: {
          bookingId,
          amount: booking.totalPrice,
          method: 'VNPAY',
          status: PaymentStatus.UNPAID,
        },
      });
    } else {
      // Update payment method to VNPay
      payment = await this.prisma.payment.update({
        where: { id: payment.id },
        data: { method: 'VNPAY' },
      });
    }

    // Generate VNPay payment URL
    const paymentUrl = this.vnpayService.createPaymentUrl({
      amount: Number(booking.totalPrice),
      orderInfo: `Thanh toan dat san ${booking.bookingCode}`,
      orderId: bookingId.toString(),
      returnUrl: returnUrl || this.vnpayService.returnUrl,
      ipAddr: ipAddr || '127.0.0.1',
    });

    return {
      success: true,
      paymentUrl,
      bookingId,
      orderId: bookingId.toString(),
    };
  }

  /**
   * 🔔 Handle VNPay callback (IPN webhook)
   */
  async handleVNPayCallback(
    bookingId: number,
    callbackData: VNPayCallbackDto,
  ): Promise<{
    success: boolean;
    message: string;
    booking?: any;
  }> {
    // Get booking
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }

    // Get payment
    const payment = await this.prisma.payment.findFirst({
      where: { bookingId },
    });

    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }

    // Already paid, skip
    if (payment.status === PaymentStatus.PAID) {
      return {
        success: true,
        message: 'Payment already processed',
        booking,
      };
    }

    // Execute payment confirmation transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Update payment
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          paidAt: new Date(),
          transactionId: callbackData.vnp_TransactionNo,
        },
      });

      // Update booking AND paidAmount
      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'CONFIRMED',
          paymentStatus: 'PAID',
          paidAmount: booking.totalPrice, // ✅ FIX: Track actual paid amount for VNPay
        },
      });

      return { payment: updatedPayment, booking: updatedBooking };
    });

    // Generate QR code after successful payment
    let qrCode: string | null = null;
    try {
      qrCode = await QRCode.toDataURL(
        JSON.stringify({
          bookingId: booking.id,
          bookingCode: booking.bookingCode,
          courtId: booking.courtId,
          startTime: booking.startTime,
          endTime: booking.endTime,
        }),
        {
          errorCorrectionLevel: 'H',
          type: 'image/png',
          width: 300,
        },
      );

      // Save QR code to booking
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: { qrCode },
      });
    } catch (error) {
      console.error('QR code generation failed:', error);
    }

    // Send payment success email for VNPay
    try {
      if (booking.userId) {
        const user = await this.prisma.user.findUnique({
          where: { id: booking.userId },
        });

        if (user?.email) {
          await this.notificationsService.sendPaymentSuccess(user.email, {
            bookingId: booking.id,
            customerName: user.name || user.email,
            bookingCode: booking.bookingCode,
            courtName: `Court ${booking.courtId}`,
            startTime: booking.startTime,
            endTime: booking.endTime,
            totalPrice: Number(booking.totalPrice),
            paymentMethod: 'VNPAY',
            qrCode: qrCode || undefined,
          });
          this.logger.log(
            `VNPay payment success email queued for booking ${booking.bookingCode}`,
          );
        }
      }
    } catch (emailError) {
      this.logger.error(`Failed to queue VNPay email: ${emailError.message}`);
    }

    // Emit WebSocket event for VNPay payment success
    if (booking.userId) {
      this.eventsGateway.emitBookingStatusChange(booking.userId, {
        bookingId: booking.id,
        newStatus: 'CONFIRMED',
        message: `VNPay payment successful for booking ${booking.bookingCode}`,
      });
    }

    // � Broadcast booking status change for real-time calendar update
    this.eventsGateway.broadcast('booking:updated', {
      bookingId: booking.id,
      courtId: booking.courtId,
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
    });

    // �🔔 Send payment notification to all parties
    try {
      await this.notificationsService.notifyPaymentSuccess(
        result.payment,
        result.booking,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send VNPay payment notification: ${error.message}`,
      );
    }

    return {
      success: true,
      message: 'Payment confirmed successfully',
      booking: result.booking,
    };
  }
}
