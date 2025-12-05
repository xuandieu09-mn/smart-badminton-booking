import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../../prisma/prisma.service';
import { getQueueToken } from '@nestjs/bull';
import { QUEUE_NAMES } from '../queue/constants/queue.constants';
import { mockPrismaService, mockQueue } from '../../test/test-helpers';

describe('BookingsService', () => {
  let service: BookingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: getQueueToken(QUEUE_NAMES.BOOKING_TIMEOUT),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
