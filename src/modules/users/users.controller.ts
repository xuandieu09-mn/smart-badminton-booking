import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import * as UserInterface from '../../common/interfaces/user.interface';
import { Role } from '@prisma/client';
import { UpdateProfileDto } from './dto';

type JwtUser = UserInterface.JwtUser;

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  // ✅ 1. Own profile (all authenticated users)
  @Get('profile')
  async getProfile(@CurrentUser() user: JwtUser) {
    const fullProfile = await this.usersService.getUserById(user.id);
    return {
      message: 'Your profile',
      user: fullProfile,
    };
  }

  // ✅ 1.1 Update own profile (email, name)
  @Put('profile')
  async updateProfile(
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  // ✅ 2. Dashboard (Staff/Admin) - PHẢI ĐẶT TRƯỚC :id
  @Get('dashboard/stats')
  @Roles(Role.STAFF, Role.ADMIN)
  getStaffDashboard(@CurrentUser() user: JwtUser) {
    const { id, email, role } = user;
    return {
      message: 'Staff/Admin dashboard',
      user: { id, email, role },
      stats: {
        totalBookings: 0,
        todayBookings: 0,
      },
    };
  }

  // ✅ 3. Admin secret - PHẢI ĐẶT TRƯỚC :id
  @Get('admin/secret')
  @Roles(Role.ADMIN)
  getAdminSecret(@CurrentUser() user: JwtUser) {
    return {
      message: 'Admin secret data',
      user,
      secret: 'This is only visible to admins',
    };
  }

  // ✅ 4. Get all users (Admin only) - PHẢI ĐẶT SAU các route cụ thể
  // NHƯNG vẫn TRƯỚC :id để tránh conflict với /users/list
  @Get('list')
  @Roles(Role.ADMIN)
  async getAllUsers() {
    const users = await this.usersService.getAllUsers();
    return {
      message: 'All users',
      total: users.length,
      users,
    };
  }

  // ✅ 5. Get user by ID (Staff/Admin) - ĐẶT CUỐI CÙNG
  @Get(':id')
  @Roles(Role.STAFF, Role.ADMIN)
  async getUserById(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.getUserById(id);
    return {
      message: 'User details',
      user,
    };
  }
}
