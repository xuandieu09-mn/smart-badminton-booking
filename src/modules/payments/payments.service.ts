import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Payment, PaymentStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

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

      // Update booking status
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'CONFIRMED',
          paymentStatus: 'PAID',
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

      return updatedPayment;
    });

    return {
      payment: result,
      success: true,
      message: 'Payment successful. Booking confirmed.',
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
            Number(currentWallet!.balance) + Number(payment.amount),
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
          balanceBefore: currentWallet!.balance,
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
}
