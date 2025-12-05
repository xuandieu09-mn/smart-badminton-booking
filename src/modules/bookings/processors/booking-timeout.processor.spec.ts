import { Test, TestingModule } from '@nestjs/testing';
import type { Job } from 'bull';
import { BookingTimeoutProcessor } from './booking-timeout.processor';
import { PrismaService } from '../../../prisma/prisma.service';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import { mockPrismaService } from '../../../test/test-helpers';
import type {
  ExpireBookingJobData,
  ExpireBookingJobResult,
} from '../interfaces/booking-job.interface';

describe('BookingTimeoutProcessor', () => {
  let processor: BookingTimeoutProcessor;
  let prismaService: PrismaService;

  const createMockJob = (bookingId: number): Job<ExpireBookingJobData> => {
    return {
      data: { bookingId },
      id: '1',
      name: 'expire-booking',
      attemptsMade: 0,
    } as Job<ExpireBookingJobData>;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingTimeoutProcessor,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    processor = module.get<BookingTimeoutProcessor>(BookingTimeoutProcessor);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('handleBookingExpiration', () => {
    it('should expire a PENDING_PAYMENT booking', async () => {
      const mockBooking = {
        id: 1,
        bookingCode: 'BK241203-0001',
        status: BookingStatus.PENDING_PAYMENT,
        paymentStatus: PaymentStatus.UNPAID,
        expiresAt: new Date(),
      };

      const mockUpdatedBooking = {
        id: 1,
        bookingCode: 'BK241203-0001',
        status: BookingStatus.EXPIRED,
      };

      jest
        .spyOn(prismaService.booking, 'findUnique')
        .mockResolvedValueOnce(mockBooking as any);
      jest
        .spyOn(prismaService.booking, 'update')
        .mockResolvedValueOnce(mockUpdatedBooking as any);

      const mockJob = createMockJob(1);
      const result = await processor.handleBookingExpiration(mockJob);

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe(BookingStatus.EXPIRED);
    });

    it('should skip expiration if booking is already CONFIRMED', async () => {
      const mockBooking = {
        id: 1,
        bookingCode: 'BK241203-0001',
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
        expiresAt: new Date(),
      };

      jest
        .spyOn(prismaService.booking, 'findUnique')
        .mockResolvedValueOnce(mockBooking as any);

      const mockJob = createMockJob(1);
      const result = await processor.handleBookingExpiration(mockJob);

      expect(result.success).toBe(false);
      expect(result.reason).toContain('Already');
    });

    it('should handle booking not found', async () => {
      jest
        .spyOn(prismaService.booking, 'findUnique')
        .mockResolvedValueOnce(null);

      const mockJob = createMockJob(999);
      const result = await processor.handleBookingExpiration(mockJob);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('Booking not found');
    });

    it('should throw error on database failure', async () => {
      const mockBooking = {
        id: 1,
        bookingCode: 'BK241203-0001',
        status: BookingStatus.PENDING_PAYMENT,
        paymentStatus: PaymentStatus.UNPAID,
        expiresAt: new Date(),
      };

      jest
        .spyOn(prismaService.booking, 'findUnique')
        .mockResolvedValueOnce(mockBooking as any);
      jest
        .spyOn(prismaService.booking, 'update')
        .mockRejectedValueOnce(new Error('Database error'));

      const mockJob = createMockJob(1);

      await expect(
        processor.handleBookingExpiration(mockJob),
      ).rejects.toThrow('Database error');
    });
  });
});
