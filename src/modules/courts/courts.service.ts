import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateCourtDto,
  UpdateCourtDto,
  CourtResponseDto,
  CourtAvailabilityDto,
} from './dto';
import { Court } from '@prisma/client';

@Injectable()
export class CourtsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new court
   */
  async create(data: CreateCourtDto): Promise<CourtResponseDto> {
    const court = await this.prisma.court.create({
      data: {
        name: data.name,
        description: data.description,
        pricePerHour: data.pricePerHour,
        isActive: true,
      },
    });

    return this.mapToResponse(court);
  }

  /**
   * Get all courts with optional filters
   */
  async findAll(isActive?: boolean): Promise<CourtResponseDto[]> {
    const courts = await this.prisma.court.findMany({
      where: isActive !== undefined ? { isActive } : {},
      orderBy: { createdAt: 'desc' },
    });

    return courts.map((court) => this.mapToResponse(court));
  }

  /**
   * Get court by ID
   */
  async findById(id: number): Promise<CourtResponseDto> {
    const court = await this.prisma.court.findUnique({
      where: { id },
    });

    if (!court) {
      throw new NotFoundException(`Court with ID ${id} not found`);
    }

    return this.mapToResponse(court);
  }

  /**
   * Update court information
   */
  async update(id: number, data: UpdateCourtDto): Promise<CourtResponseDto> {
    // Verify court exists
    await this.findById(id);

    const court = await this.prisma.court.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        description: data.description ?? undefined,
        pricePerHour: data.pricePerHour ?? undefined,
      },
    });

    return this.mapToResponse(court);
  }

  /**
   * Delete court
   */
  async delete(id: number): Promise<{ message: string }> {
    await this.findById(id);

    await this.prisma.court.delete({
      where: { id },
    });

    return { message: `Court #${id} deleted successfully` };
  }

  /**
   * Check court availability for a time slot
   * Returns true if court is available (no conflicting bookings)
   */
  async isAvailable(
    courtId: number,
    startTime: Date,
    endTime: Date,
  ): Promise<boolean> {
    const conflictingBooking = await this.prisma.booking.findFirst({
      where: {
        courtId,
        status: {
          in: ['CONFIRMED', 'PENDING_PAYMENT'],
        },
        AND: [
          {
            startTime: {
              lt: endTime,
            },
          },
          {
            endTime: {
              gt: startTime,
            },
          },
        ],
      },
    });

    return !conflictingBooking;
  }

  /**
   * Get court availability with time slots and pricing for a specific date
   */
  async getCourtAvailability(
    courtId: number,
    date: string, // ISO format: 2025-12-07
  ): Promise<CourtAvailabilityDto> {
    const court = await this.findById(courtId);
    const basePrice = court.pricePerHour;

    const dayDate = new Date(date);
    const dayOfWeek = dayDate.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday

    const slots = [];

    // Create 30-minute slots from 6:00 to 21:00 (exclusive)
    for (let minute = 6 * 60; minute < 21 * 60; minute += 30) {
      const startTime = new Date(dayDate);
      startTime.setHours(0, minute, 0, 0);

      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + 30);

      // Check for conflicting bookings
      const isAvailable = await this.isAvailable(courtId, startTime, endTime);

      // Calculate price based on time and day
      const startHour = startTime.getHours();
      const priceType = this.getPriceType(startHour, dayOfWeek);
      const price = this.calculateSlotPrice(basePrice, priceType, 30);

      const labelStart = `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`;
      const labelEnd = `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`;

      slots.push({
        time: `${labelStart}-${labelEnd}`,
        available: isAvailable,
        price,
        priceType,
      });
    }

    return {
      date,
      slots,
    };
  }

  /**
   * Calculate price based on time type
   * Normal: base price
   * Golden: 1.5x (17:00-21:00)
   * Peak: 2x (19:00-21:00 on Fri-Sun)
   */
  private calculateSlotPrice(
    basePricePerHour: number,
    priceType: string,
    durationMinutes: number,
  ): number {
    let multiplier = 1;
    if (priceType === 'PEAK') {
      multiplier = 2;
    } else if (priceType === 'GOLDEN') {
      multiplier = 1.5;
    }

    const hours = durationMinutes / 60;
    return Math.round(basePricePerHour * multiplier * hours);
  }

  /**
   * Determine price type based on time and day of week
   * Peak: 19:00-21:00 (Thu 5, Fri 5, Sat 6, Sun 0)
   * Golden: 17:00-21:00
   * Normal: 6:00-17:00
   */
  private getPriceType(
    hour: number,
    dayOfWeek: number,
  ): 'NORMAL' | 'GOLDEN' | 'PEAK' {
    // Peak: 19:00-21:00 on Friday (5), Saturday (6), Sunday (0)
    const isPeakDay = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0;
    if (isPeakDay && hour >= 19 && hour < 21) {
      return 'PEAK';
    }

    // Golden: 17:00-21:00
    if (hour >= 17 && hour < 21) {
      return 'GOLDEN';
    }

    // Normal: 6:00-17:00
    return 'NORMAL';
  }

  /**
   * Helper: Map entity to DTO
   */
  private mapToResponse(court: Court): CourtResponseDto {
    return {
      id: court.id,
      name: court.name,
      description: court.description || undefined,
      pricePerHour: Number(court.pricePerHour),
      isActive: court.isActive,
      createdAt: court.createdAt,
      updatedAt: court.updatedAt,
    };
  }
}
