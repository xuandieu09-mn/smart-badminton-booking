import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto, CreateBulkBookingDto } from './dto';
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
   * 🎟️ Staff/Admin check-in booking by ID
   */
  @Post(':id/check-in')
  @Roles(Role.STAFF, Role.ADMIN)
  async checkInBooking(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.bookingsService.checkInBooking(id, user.id, user.role);
  }

  /**
   * 🔎 Find booking by booking code
   */
  @Get('code/:code')
  @Roles(Role.STAFF, Role.ADMIN)
  async getBookingByCode(@Param('code') code: string) {
    return this.bookingsService.getBookingByCode(code);
  }

  /**
   * 🎯 Bulk create bookings (multiple courts/time slots in one transaction)
   */
  @Post('bulk')
  async createBulkBooking(
    @Body() dto: CreateBulkBookingDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.bookingsService.createBulkBooking(dto, user.id, user.role);
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
   * 📊 Get bookings by date (for timeline view)
   */
  @Get('by-date')
  async getBookingsByDate(@Query('date') date?: string) {
    if (!date) {
      return [];
    }
    return this.bookingsService.getBookingsByDate(date);
  }

  /**
   * 🏸 Get bookings for a specific court on a specific date
   */
  @Get('court/:courtId')
  async getCourtBookingsByDate(
    @Param('courtId', ParseIntPipe) courtId: number,
    @Query('date') date?: string,
  ) {
    if (!date) {
      return [];
    }
    return this.bookingsService.getCourtBookingsByDate(courtId, date);
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
