import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateOperatingHoursDto } from './dto';

const DEFAULT_OPENING_HOUR = 6;
const DEFAULT_CLOSING_HOUR = 21;
const OPERATING_HOURS_KEY = 'operating_hours';

export interface OperatingHours {
  openingHour: number;
  closingHour: number;
}

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get operating hours (opening and closing time)
   * Returns default values if not set
   */
  async getOperatingHours(): Promise<OperatingHours> {
    const setting = await this.prisma.systemSettings.findUnique({
      where: { key: OPERATING_HOURS_KEY },
    });

    if (!setting) {
      return {
        openingHour: DEFAULT_OPENING_HOUR,
        closingHour: DEFAULT_CLOSING_HOUR,
      };
    }

    return setting.value as unknown as OperatingHours;
  }

  /**
   * Update operating hours (Admin only)
   * Validates that opening < closing and within allowed range (5-24)
   */
  async updateOperatingHours(
    dto: UpdateOperatingHoursDto,
    updatedBy: string,
  ): Promise<OperatingHours> {
    // Validation: opening hour must be before closing hour
    if (dto.openingHour >= dto.closingHour) {
      throw new BadRequestException('Giờ mở cửa phải nhỏ hơn giờ đóng cửa');
    }

    // Minimum operating hours: at least 2 hours
    if (dto.closingHour - dto.openingHour < 2) {
      throw new BadRequestException('Thời gian hoạt động phải ít nhất 2 giờ');
    }

    const operatingHours: OperatingHours = {
      openingHour: dto.openingHour,
      closingHour: dto.closingHour,
    };

    // Upsert settings
    await this.prisma.systemSettings.upsert({
      where: { key: OPERATING_HOURS_KEY },
      create: {
        key: OPERATING_HOURS_KEY,
        value: operatingHours as any,
        description: 'Giờ mở cửa và đóng cửa sân',
        updatedBy,
      },
      update: {
        value: operatingHours as any,
        updatedBy,
      },
    });

    return operatingHours;
  }

  /**
   * Reset operating hours to default (6:00 - 21:00)
   */
  async resetOperatingHours(updatedBy: string): Promise<OperatingHours> {
    const defaultHours: OperatingHours = {
      openingHour: DEFAULT_OPENING_HOUR,
      closingHour: DEFAULT_CLOSING_HOUR,
    };

    await this.prisma.systemSettings.upsert({
      where: { key: OPERATING_HOURS_KEY },
      create: {
        key: OPERATING_HOURS_KEY,
        value: defaultHours as any,
        description: 'Giờ mở cửa và đóng cửa sân',
        updatedBy,
      },
      update: {
        value: defaultHours as any,
        updatedBy,
      },
    });

    return defaultHours;
  }
}
