import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { mockPrismaService } from '../../test/test-helpers';
import { PaymentStatus } from '@prisma/client';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let service: PaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        PaymentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    service = module.get<PaymentsService>(PaymentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('payWithWallet', () => {
    it('should pay with wallet', async () => {
      const mockResult = {
        payment: {
          id: 1,
          bookingId: 1,
          status: PaymentStatus.PAID,
        },
        success: true,
        message: 'Payment successful',
      };

      jest
        .spyOn(service, 'payWithWallet')
        .mockResolvedValueOnce(mockResult as any);

      const result = await controller.payWithWallet('1', { id: 1 });

      expect(result.success).toBe(true);
    });
  });

  describe('getUserPayments', () => {
    it('should return user payments', async () => {
      const mockPayments = [
        {
          id: 1,
          amount: 50000,
          status: PaymentStatus.PAID,
        },
      ];

      jest
        .spyOn(service, 'getUserPayments')
        .mockResolvedValueOnce(mockPayments as any);

      const result = await controller.getUserPayments({ id: 1 });

      expect(result).toHaveLength(1);
    });
  });
});
