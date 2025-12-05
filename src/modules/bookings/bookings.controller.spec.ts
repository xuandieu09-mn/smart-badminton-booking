import { Test, TestingModule } from '@nestjs/testing';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../../prisma/prisma.service';
import { getQueueToken } from '@nestjs/bull';
import { QUEUE_NAMES } from '../queue/constants/queue.constants';
import { mockPrismaService, mockQueue } from '../../test/test-helpers';

describe('BookingsController', () => {
  let controller: BookingsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingsController],
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

    controller = module.get<BookingsController>(BookingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
