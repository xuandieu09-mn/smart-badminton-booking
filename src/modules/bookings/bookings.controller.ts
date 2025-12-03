import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import * as UserInterface from '../../common/interfaces/user.interface';
import { Role } from '@prisma/client';

type JwtUser = UserInterface.JwtUser;

@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  /**
   * 📅 Create new booking
   */
  @Post()
  async createBooking(
    @Body() dto: CreateBookingDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.bookingsService.createBooking(dto, user.id, user.role);
  }

  /**
   * 📋 Get current user's bookings (Customer)
   */
  @Get('my-bookings')
  async getMyBookings(@CurrentUser() user: JwtUser) {
    const bookings = await this.bookingsService.getUserBookings(user.id);
    return {
      message: 'Your bookings',
      total: bookings.length,
      bookings,
    };
  }

  /**
   * 📊 Get all bookings (Staff/Admin only)
   */
  @Get()
  @Roles(Role.STAFF, Role.ADMIN)
  async getAllBookings() {
    const bookings = await this.bookingsService.getAllBookings();
    return {
      message: 'All bookings',
      total: bookings.length,
      bookings,
    };
  }

  /**
   * 🔍 Get booking by ID
   */
  @Get(':id')
  async getBookingById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtUser,
  ) {
    // Staff/Admin can view any booking, Customer only their own
    const userId = user.role === Role.CUSTOMER ? user.id : undefined;
    const booking = await this.bookingsService.getBookingById(id, userId);
    return {
      message: 'Booking details',
      booking,
    };
  }
}
