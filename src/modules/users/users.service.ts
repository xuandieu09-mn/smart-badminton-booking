import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async getAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async getUserById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        wallet: {
          select: {
            balance: true,
          },
        },
      },
    });
  }

  async findById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });
  }

  /**
   * Update user profile (email, name)
   */
  async updateProfile(userId: number, data: UpdateProfileDto) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // If updating email, check if new email is already taken
    if (data.email && data.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new ConflictException('Email already in use');
      }
    }

    // Update user
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.email && { email: data.email }),
        ...(data.name && { name: data.name }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      message: 'Profile updated successfully',
      user: updatedUser,
    };
  }

  /**
   * Update user by admin (name, role, isActive)
   * Sends notification if account is locked/unlocked
   */
  async updateUser(
    userId: number,
    data: { name?: string; role?: string; isActive?: boolean; lockReason?: string },
  ) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Check if isActive status is changing
    const wasActive = user.isActive;
    const willBeActive = data.isActive;
    const isLocking = wasActive === true && willBeActive === false;
    const isUnlocking = wasActive === false && willBeActive === true;

    // Update user
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.role !== undefined && { role: data.role as any }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 🔒 Send notification if account was locked
    if (isLocking) {
      await this.notificationsService.notifyAccountLocked(
        userId,
        data.lockReason || 'Vi phạm quy định sử dụng dịch vụ',
      );
    }

    // 🔓 Send notification if account was unlocked
    if (isUnlocking) {
      await this.notificationsService.notifyAccountUnlocked(userId);
    }

    return updatedUser;
  }
}
