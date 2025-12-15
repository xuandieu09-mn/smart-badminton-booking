import { Test, TestingModule } from '@nestjs/testing';
import { CourtsService } from './courts.service';
import { PrismaService } from '../../prisma/prisma.service';
import { mockPrismaService } from '../../test/test-helpers';
import { Role } from '@prisma/client';

describe('CourtsService', () => {
  let service: CourtsService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourtsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CourtsService>(CourtsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new court', async () => {
      const mockCourt = {
        id: 1,
        name: 'Court 1',
        description: 'Test Court',
        pricePerHour: 50000,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest
        .spyOn(prismaService.court, 'create')
        .mockResolvedValueOnce(mockCourt as any);

      const result = await service.create({
        name: 'Court 1',
        description: 'Test Court',
        pricePerHour: 50000,
      });

      expect(result.name).toBe('Court 1');
      expect(prismaService.court.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return array of courts', async () => {
      const mockCourts = [
        {
          id: 1,
          name: 'Court 1',
          description: 'Test Court 1',
          pricePerHour: 50000,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          name: 'Court 2',
          description: 'Test Court 2',
          pricePerHour: 50000,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest
        .spyOn(prismaService.court, 'findMany')
        .mockResolvedValueOnce(mockCourts as any);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Court 1');
    });
  });

  describe('findById', () => {
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

      jest
        .spyOn(prismaService.court, 'findUnique')
        .mockResolvedValueOnce(mockCourt as any);

      const result = await service.findById(1);

      expect(result.id).toBe(1);
      expect(result.name).toBe('Court 1');
    });

    it('should throw error if court not found', async () => {
      jest.spyOn(prismaService.court, 'findUnique').mockResolvedValueOnce(null);

      await expect(service.findById(999)).rejects.toThrow('not found');
    });
  });

  describe('update', () => {
    it('should update a court', async () => {
      const mockCourt = {
        id: 1,
        name: 'Updated Court',
        description: 'Updated Description',
        pricePerHour: 60000,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest
        .spyOn(prismaService.court, 'findUnique')
        .mockResolvedValueOnce(mockCourt as any);
      jest
        .spyOn(prismaService.court, 'update')
        .mockResolvedValueOnce(mockCourt as any);

      const result = await service.update(1, { name: 'Updated Court' });

      expect(result.name).toBe('Updated Court');
    });
  });

  describe('isAvailable', () => {
    it('should return true if court is available', async () => {
      jest
        .spyOn(prismaService.booking, 'findFirst')
        .mockResolvedValueOnce(null);

      const result = await service.isAvailable(
        1,
        new Date('2025-12-10T10:00:00'),
        new Date('2025-12-10T11:00:00'),
      );

      expect(result).toBe(true);
    });

    it('should return false if court is not available', async () => {
      const mockBooking = {
        id: 1,
        bookingCode: 'BK001',
        status: 'CONFIRMED',
        startTime: new Date('2025-12-10T10:00:00'),
        endTime: new Date('2025-12-10T11:00:00'),
      };

      jest
        .spyOn(prismaService.booking, 'findFirst')
        .mockResolvedValueOnce(mockBooking as any);

      const result = await service.isAvailable(
        1,
        new Date('2025-12-10T10:30:00'),
        new Date('2025-12-10T11:30:00'),
      );

      expect(result).toBe(false);
    });
  });
});
