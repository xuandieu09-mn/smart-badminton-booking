import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { mockPrismaService } from '../../test/test-helpers';
import { PaymentStatus } from '@prisma/client';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPaymentForBooking', () => {
    it('should create payment for booking', async () => {
      const mockBooking = {
        id: 1,
        bookingCode: 'BK001',
        totalPrice: 50000,
        userId: 1,
        courtId: 1,
        user: { id: 1, email: 'test@test.com' },
        court: { id: 1, name: 'Court 1' },
      };

      const mockPayment = {
        id: 1,
        bookingId: 1,
        amount: 50000,
        method: 'WALLET',
        status: PaymentStatus.UNPAID,
        transactionCode: 'PAY-123',
        paidAt: null,
        refundedAt: null,
        createdAt: new Date(),
      };

      jest
        .spyOn(prismaService.booking, 'findUnique')
        .mockResolvedValueOnce(mockBooking as any);
      jest
        .spyOn(prismaService.payment, 'findFirst')
        .mockResolvedValueOnce(null);
      jest
        .spyOn(prismaService.payment, 'create')
        .mockResolvedValueOnce(mockPayment as any);

      const result = await service.createPaymentForBooking(1);

      expect(result.bookingId).toBe(1);
      expect(result.status).toBe(PaymentStatus.UNPAID);
    });
  });

  describe('payWithWallet', () => {
    it('should pay with wallet successfully', async () => {
      const mockBooking = {
        id: 1,
        bookingCode: 'BK001',
        totalPrice: 50000,
        userId: 1,
        status: 'PENDING_PAYMENT',
      };

      const mockWallet = {
        id: 1,
        userId: 1,
        balance: 500000,
      };

      const mockPayment = {
        id: 1,
        bookingId: 1,
        amount: 50000,
        status: PaymentStatus.PAID,
        paidAt: new Date(),
      };

      jest
        .spyOn(prismaService.booking, 'findUnique')
        .mockResolvedValueOnce(mockBooking as any);
      jest
        .spyOn(prismaService.wallet, 'findUnique')
        .mockResolvedValueOnce(mockWallet as any);
      jest
        .spyOn(prismaService.payment, 'findFirst')
        .mockResolvedValueOnce(null);
      jest.spyOn(prismaService.payment, 'create').mockResolvedValueOnce({
        id: 1,
        bookingId: 1,
        amount: 50000,
        method: 'WALLET',
        status: PaymentStatus.UNPAID,
      } as any);
      jest
        .spyOn(prismaService, '$transaction')
        .mockResolvedValueOnce(mockPayment as any);

      const result = await service.payWithWallet(1, 1);

      expect(result.success).toBe(true);
      expect(result.payment.status).toBe(PaymentStatus.PAID);
    });

    it('should fail if insufficient balance', async () => {
      const mockBooking = {
        id: 1,
        totalPrice: 600000,
        userId: 1,
      };

      const mockWallet = {
        userId: 1,
        balance: 50000,
      };

      jest
        .spyOn(prismaService.booking, 'findUnique')
        .mockResolvedValueOnce(mockBooking as any);
      jest
        .spyOn(prismaService.wallet, 'findUnique')
        .mockResolvedValueOnce(mockWallet as any);

      await expect(service.payWithWallet(1, 1)).rejects.toThrow(
        'Insufficient balance',
      );
    });
  });

  describe('getUserPayments', () => {
    it('should return user payments', async () => {
      const mockPayments = [
        {
          id: 1,
          bookingId: 1,
          amount: 50000,
          status: PaymentStatus.PAID,
        },
        {
          id: 2,
          bookingId: 2,
          amount: 75000,
          status: PaymentStatus.PAID,
        },
      ];

      jest
        .spyOn(prismaService.payment, 'findMany')
        .mockResolvedValueOnce(mockPayments as any);

      const result = await service.getUserPayments(1);

      expect(result).toHaveLength(2);
      expect(result[0].amount).toBe(50000);
    });
  });
});
