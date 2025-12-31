import {
  Injectable,
  NotFoundException,
  BadRequestException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
  ) {}

  /**
   * 💼 Get wallet balance
   */
  async getBalance(userId: number) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return {
      balance: Number(wallet.balance),
      updatedAt: wallet.updatedAt,
    };
  }

  /**
   * 💵 Deposit money (Admin/Staff only - for testing)
   */
  async deposit(userId: number, amount: number, adminId: number) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    return this.prisma.$transaction(async (tx) => {
      // Get current balance
      const currentWallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!currentWallet) {
        throw new NotFoundException('Wallet not found');
      }

      const balanceBefore = Number(currentWallet.balance);

      // Update wallet balance
      const wallet = await tx.wallet.update({
        where: { userId },
        data: {
          balance: {
            increment: amount,
          },
        },
      });

      const balanceAfter = Number(wallet.balance);

      // Create transaction record
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEPOSIT',
          amount,
          balanceBefore,
          balanceAfter,
          description: `Deposit by admin ${adminId}`,
        },
      });

      // Send notification to customer
      await this.notificationsService.notifyWalletTransaction(userId, {
        type: 'DEPOSIT',
        amount,
        balanceAfter,
        description: `Nạp tiền vào ví`,
      });

      return {
        message: 'Deposit successful',
        wallet: {
          balance: balanceAfter,
        },
        transaction: {
          id: transaction.id,
          type: transaction.type,
          amount: Number(transaction.amount),
          balanceBefore: Number(transaction.balanceBefore),
          balanceAfter: Number(transaction.balanceAfter),
          createdAt: transaction.createdAt,
        },
      };
    });
  }

  /**
   * 💰 Self top-up (Customer adds money to their own wallet - simulation)
   */
  async topup(userId: number, amount: number) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    // Maximum top-up limit per transaction (for simulation safety)
    if (amount > 10000000) {
      throw new BadRequestException('Maximum top-up amount is 10,000,000 VND');
    }

    return this.prisma.$transaction(async (tx) => {
      // Get current wallet
      const currentWallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!currentWallet) {
        throw new NotFoundException('Wallet not found');
      }

      const balanceBefore = Number(currentWallet.balance);

      // Update wallet balance
      const wallet = await tx.wallet.update({
        where: { userId },
        data: {
          balance: {
            increment: amount,
          },
        },
      });

      const balanceAfter = Number(wallet.balance);

      // Create transaction record
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEPOSIT',
          amount,
          balanceBefore,
          balanceAfter,
          description: 'Self top-up (simulated payment)',
        },
      });

      // Send notification to customer
      await this.notificationsService.notifyWalletTransaction(userId, {
        type: 'DEPOSIT',
        amount,
        balanceAfter,
        description: `Nạp tiền tự động`,
      });

      return {
        message: 'Top-up successful! 💰',
        wallet: {
          balance: balanceAfter,
        },
        transaction: {
          id: transaction.id,
          type: transaction.type,
          amount: Number(transaction.amount),
          balanceBefore: Number(transaction.balanceBefore),
          balanceAfter: Number(transaction.balanceAfter),
          createdAt: transaction.createdAt,
        },
      };
    });
  }

  /**
   * 💸 Pay with wallet
   */
  async payWithWallet(userId: number, bookingId: number) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Get booking
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { user: true },
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      if (booking.userId !== userId) {
        throw new BadRequestException('This is not your booking');
      }

      if (booking.paymentStatus === 'PAID') {
        throw new BadRequestException('Booking already paid');
      }

      if (booking.status !== 'PENDING_PAYMENT') {
        throw new BadRequestException('Booking is not pending payment');
      }

      // Check expiration
      if (booking.expiresAt && booking.expiresAt < new Date()) {
        await tx.booking.update({
          where: { id: bookingId },
          data: { status: 'EXPIRED' },
        });
        throw new BadRequestException('Booking has expired');
      }

      // 2. Get wallet
      const wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      const balanceBefore = Number(wallet.balance);
      const totalPrice = Number(booking.totalPrice);

      if (balanceBefore < totalPrice) {
        throw new BadRequestException(
          `Insufficient balance. Need ${totalPrice} VND, have ${balanceBefore} VND`,
        );
      }

      // 3. Deduct from wallet
      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: {
          balance: {
            decrement: totalPrice,
          },
        },
      });

      const balanceAfter = Number(updatedWallet.balance);

      // 4. Create wallet transaction
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'PAYMENT',
          amount: -totalPrice,
          balanceBefore,
          balanceAfter,
          description: `Payment for booking ${booking.bookingCode}`,
          bookingId: booking.id,
        },
      });

      // 5. Update booking status AND paidAmount
      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: {
          paymentStatus: 'PAID',
          status: 'CONFIRMED',
          paymentMethod: 'WALLET',
          paidAmount: totalPrice, // ✅ FIX: Track actual paid amount
        },
        include: {
          court: true,
        },
      });

      return {
        message: 'Payment successful',
        booking: updatedBooking,
        wallet: {
          balanceBefore,
          balanceAfter,
        },
      };
    });
  }

  /**
   * 📜 Get transaction history
   */
  async getTransactions(userId: number) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            booking: {
              select: {
                bookingCode: true,
                courtId: true,
                startTime: true,
              },
            },
          },
        },
      },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return {
      balance: Number(wallet.balance),
      transactions: wallet.transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        balanceBefore: Number(t.balanceBefore),
        balanceAfter: Number(t.balanceAfter),
        description: t.description,
        booking: t.booking,
        createdAt: t.createdAt,
      })),
    };
  }
}
