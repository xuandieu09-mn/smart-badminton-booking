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
import { QRCodeService } from './qrcode.service';
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
  constructor(
    private bookingsService: BookingsService,
    private qrcodeService: QRCodeService,
  ) {}

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
   * 📦 Create bulk bookings (multiple courts/slots in one transaction)
   * NEW: Support for cross-court bulk booking
   */
  @Post('bulk')
  async createBulkBookings(
    @Body() body: { bookings: CreateBookingDto[] },
    @CurrentUser() user: JwtUser,
  ) {
    const results = await this.bookingsService.createBulkBookings(
      body.bookings,
      user.id,
      user.role,
    );
    return {
      message: 'Bulk bookings created successfully',
      total: results.length,
      bookings: results,
    };
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
   * � Get bookings for a specific user (Admin/Staff)
   */
  @Get('user/:userId')
  @Roles(Role.STAFF, Role.ADMIN)
  async getUserBookingsByUserId(@Param('userId', ParseIntPipe) userId: number) {
    const bookings = await this.bookingsService.getUserBookings(userId);
    return {
      message: 'User bookings',
      total: bookings.length,
      bookings,
    };
  }

  /**
   * �📊 Get all bookings (Staff/Admin only)
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
   * � Generate QR code for booking (Customer/Staff/Admin)
   * QR code is generated after successful payment
   */
  @Post(':id/generate-qr')
  async generateQRCode(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtUser,
  ) {
    // Verify booking exists and belongs to user (if customer)
    const userId = user.role === Role.CUSTOMER ? user.id : undefined;
    const booking = await this.bookingsService.getBookingById(id, userId);

    // Generate QR code with booking code
    const qrCodeDataURL = await this.qrcodeService.generateBookingQR(
      booking.bookingCode,
    );

    return {
      message: 'QR code generated successfully',
      bookingId: booking.id,
      bookingCode: booking.bookingCode,
      qrCode: qrCodeDataURL,
    };
  }

  /**
   * ❌ Cancel booking (Customer/Staff/Admin)
   * - Customer can cancel their own bookings
   * - Staff/Admin can cancel any booking
   */
  @Post(':id/cancel')
  async cancelBooking(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtUser,
  ) {
    const userId = user.role === Role.CUSTOMER ? user.id : undefined;
    return this.bookingsService.cancelBooking(id, userId);
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

  /**
   * 🏁 Finish booking (Manual completion by staff)
   * Update booking status to COMPLETED (for early finish)
   */
  @Post(':id/finish')
  @Roles(Role.STAFF, Role.ADMIN)
  async finishBooking(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtUser,
  ) {
    const result = await this.bookingsService.finishBooking(id);
    return {
      ...result,
      finishedBy: user.email,
    };
  }

  /**
   * ✅ Check-in booking using QR code (Staff only)
   * Update booking status to CHECKED_IN
   */
  @Post('check-in')
  @Roles(Role.STAFF, Role.ADMIN)
  async checkInBooking(
    @Body() body: { bookingCode: string },
    @CurrentUser() user: JwtUser,
  ) {
    const { bookingCode } = body;

    // Validate booking code format (allow TEST codes for development)
    if (
      bookingCode &&
      !bookingCode.startsWith('TEST') &&
      !this.qrcodeService.validateBookingCode(bookingCode)
    ) {
      throw new Error(
        'Invalid booking code format. Expected: BK{YYMMDD}-{XXXX} (e.g., BK251215-CRWD)',
      );
    }

    // Check in the booking
    const booking = await this.bookingsService.checkInBooking(bookingCode);

    return {
      message: 'Check-in successful',
      booking: {
        id: booking.id,
        bookingCode: booking.bookingCode,
        courtId: booking.courtId,
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: booking.status,
      },
      checkedInBy: user.email,
    };
  }
}
