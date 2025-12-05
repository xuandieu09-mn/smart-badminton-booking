import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCourtDto, UpdateCourtDto, FilterCourtsDto } from './dto';
import { Court } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class CourtsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new court
   */
  async create(data: CreateCourtDto): Promise<Court> {
    return this.prisma.court.create({
      data: {
        name: data.name,
        description: data.description,
        pricePerHour: new Decimal(data.pricePerHour),
        isActive: data.isActive ?? true,
      },
    });
  }

  /**
   * Get all courts with optional filters
   */
  async findAll(filters?: FilterCourtsDto): Promise<Court[]> {
    const where: any = {};

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return this.prisma.court.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get court by ID
   */
  async findById(id: number): Promise<Court> {
    const court = await this.prisma.court.findUnique({
      where: { id },
    });

    if (!court) {
      throw new NotFoundException(`Court with ID ${id} not found`);
    }

    return court;
  }

  /**
   * Update court information
   */
  async update(id: number, data: UpdateCourtDto): Promise<Court> {
    // Verify court exists
    await this.findById(id);

    return this.prisma.court.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description && { description: data.description }),
        ...(data.pricePerHour && {
          pricePerHour: new Decimal(data.pricePerHour),
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  /**
   * Delete court
   */
  async delete(id: number): Promise<Court> {
    await this.findById(id);

    return this.prisma.court.delete({
      where: { id },
    });
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
          in: ['CONFIRMED', 'PENDING_PAYMENT'], // Don't book over confirmed or pending payments
        },
        AND: [
          {
            startTime: {
              lt: endTime, // Booking starts before our end time
            },
          },
          {
            endTime: {
              gt: startTime, // Booking ends after our start time
            },
          },
        ],
      },
    });

    return !conflictingBooking;
  }

  /**
   * Get available time slots for a court on a specific date
   */
  async getAvailableSlots(
    courtId: number,
    date: Date,
  ): Promise<Array<{ startTime: string; endTime: string }>> {
    // Verify court exists
    await this.findById(courtId);

    // Get all bookings for this court on this date
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const bookings = await this.prisma.booking.findMany({
      where: {
        courtId,
        status: {
          in: ['CONFIRMED', 'PENDING_PAYMENT'],
        },
        startTime: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      select: {
        startTime: true,
        endTime: true,
      },
      orderBy: { startTime: 'asc' },
    });

    // Operating hours: 6:00 - 21:00
    const slots: Array<{ startTime: string; endTime: string }> = [];
    const operatingStart = 6;
    const operatingEnd = 21;

    let currentHour = operatingStart;

    for (const booking of bookings) {
      const bookingStartHour = booking.startTime.getHours();
      const bookingEndHour = booking.endTime.getHours();

      // Add slots before this booking
      while (currentHour < bookingStartHour) {
        slots.push({
          startTime: `${String(currentHour).padStart(2, '0')}:00`,
          endTime: `${String(currentHour + 1).padStart(2, '0')}:00`,
        });
        currentHour++;
      }

      currentHour = Math.max(currentHour, bookingEndHour);
    }

    // Add remaining slots until closing time
    while (currentHour < operatingEnd) {
      slots.push({
        startTime: `${String(currentHour).padStart(2, '0')}:00`,
        endTime: `${String(currentHour + 1).padStart(2, '0')}:00`,
      });
      currentHour++;
    }

    return slots;
  }

  /**
   * Get court with pricing for a specific time slot
   */
  async getCourtWithPrice(
    courtId: number,
    startTime: Date,
    endTime: Date,
  ): Promise<{ court: Court; pricePerHour: number; totalPrice: number }> {
    const court = await this.findById(courtId);

    // Get applicable pricing rule
    const pricing = await this.prisma.pricingRule.findFirst({
      where: {
        OR: [
          // Court-specific pricing (highest priority)
          {
            courtId,
            isActive: true,
          },
          // General pricing
          {
            courtId: null,
            isActive: true,
          },
        ],
      },
      orderBy: { priority: 'desc' },
    });

    const pricePerHour = pricing
      ? Number(pricing.pricePerHour)
      : Number(court.pricePerHour);
    const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    const totalPrice = pricePerHour * hours;

    return {
      court,
      pricePerHour,
      totalPrice,
    };
  }
}
