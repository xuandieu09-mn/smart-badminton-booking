import { Test, TestingModule } from '@nestjs/testing';
import { CourtsController } from './courts.controller';
import { CourtsService } from './courts.service';
import { mockPrismaService } from '../../test/test-helpers';
import { PrismaService } from '../../prisma/prisma.service';

describe('CourtsController', () => {
  let controller: CourtsController;
  let service: CourtsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourtsController],
      providers: [
        CourtsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<CourtsController>(CourtsController);
    service = module.get<CourtsService>(CourtsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /courts', () => {
    it('should return array of courts', async () => {
      const mockCourts = [
        {
          id: 1,
          name: 'Court 1',
          description: 'Test Court',
          pricePerHour: 50000,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest.spyOn(service, 'findAll').mockResolvedValueOnce(mockCourts as any);

      const result = await controller.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Court 1');
    });
  });

  describe('GET /courts/:id', () => {
    it('should return a court by id', async () => {
      const mockCourt = {
        id: 1,
        name: 'Court 1',
        description: 'Test Court',
        pricePerHour: 50000,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(service, 'findById').mockResolvedValueOnce(mockCourt as any);

      const result = await controller.findById('1');

      expect(result.id).toBe(1);
    });
  });

  describe('GET /courts/:id/available-slots', () => {
    it('should return availability with pricing', async () => {
      const mockAvailability = {
        date: '2025-12-10',
        slots: [
          { time: '06:00-07:00', available: true, price: 50000, priceType: 'NORMAL' },
          { time: '07:00-08:00', available: false, price: 50000, priceType: 'NORMAL' },
        ],
      };

      jest
        .spyOn(service, 'getCourtAvailability')
        .mockResolvedValueOnce(mockAvailability as any);

      const result = await controller.getAvailability('1', '2025-12-10');

      expect(result.date).toBe('2025-12-10');
      expect(result.slots).toHaveLength(2);
      expect(result.slots[0].priceType).toBe('NORMAL');
    });
  });
});
