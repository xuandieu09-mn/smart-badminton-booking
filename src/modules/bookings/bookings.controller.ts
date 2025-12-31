import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsAdminService } from './bookings-admin.service';
import { QRCodeService } from './qrcode.service';
import { CreateBookingDto, AdminUpdateBookingDto } from './dto';
import { CreateFixedBookingDto } from './dto/create-fixed-booking.dto';
import { CancelBookingGroupDto } from './dto/cancel-booking-group.dto';
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
    private bookingsAdminService: BookingsAdminService,
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

  /**   * 🔍 Check availability for fixed schedule booking
   * Returns summary and conflicts if any
   */
  @Post('fixed/check')
  async checkFixedScheduleAvailability(
    @Body() dto: CreateFixedBookingDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.bookingsService.checkFixedScheduleAvailability(dto, user.id);
  }

  /**   * 📅 Create fixed schedule booking (recurring)
   * Automatically applies discount:
   * - >4 sessions: 5% off
   * - >8 sessions: 10% off
   */
  @Post('fixed')
  async createFixedScheduleBooking(
    @Body() dto: CreateFixedBookingDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.bookingsService.createFixedScheduleBooking(dto, user.id);
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
    const result = await this.bookingsService.checkInBooking(bookingCode);

    // If it's a group response, return group info
    if ('isGroup' in result && result.isGroup) {
      return result; // Return group data directly for selection
    }

    // Individual booking response
    const booking = result as any;
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

  // ==================== ADMIN GOD MODE ENDPOINTS ====================

  /**
   * 🔧 Admin Update Booking (God Mode)
   * Admin can modify any booking regardless of business rules
   * - Change time (extend/shorten)
   * - Change court (transfer)
   * - Force cancel with optional refund
   * - Override conflicts
   */
  @Patch(':id/admin-update')
  @Roles(Role.ADMIN)
  async adminUpdateBooking(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminUpdateBookingDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.bookingsService.adminUpdateBooking(id, dto, user.id);
  }

  /**
   * 🔨 Admin Force Cancel
   * Cancel any booking regardless of status
   */
  @Post(':id/admin-cancel')
  @Roles(Role.ADMIN)
  async adminForceCancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { refundToWallet?: boolean; reason?: string },
    @CurrentUser() user: JwtUser,
  ) {
    return this.bookingsService.adminForceCancel(
      id,
      user.id,
      body.refundToWallet || false,
      body.reason,
    );
  }

  // ==================== PAYMENT COLLECTION ====================

  /**
   * 💵 Collect Extra Payment (Staff/Admin)
   * When booking time was extended, collect the pending extra amount
   */
  @Post(':id/collect-payment')
  @Roles(Role.STAFF, Role.ADMIN)
  async collectExtraPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { paymentMethod: 'CASH' | 'BANK_TRANSFER'; amount?: number },
    @CurrentUser() user: JwtUser,
  ) {
    return this.bookingsService.collectExtraPayment(
      id,
      user.id,
      body.paymentMethod,
      body.amount,
    );
  }

  /**
   * 📊 Get Booking Payment Status
   * Check how much has been paid vs pending
   */
  @Get(':id/payment-status')
  @Roles(Role.STAFF, Role.ADMIN)
  async getBookingPaymentStatus(@Param('id', ParseIntPipe) id: number) {
    return this.bookingsService.getBookingPaymentStatus(id);
  }

  // ==================== BOOKING GROUPS (Fixed Schedule) ====================

  /**
   * 📋 Get booking group details (Staff/Admin)
   * View all bookings in a fixed schedule group
   */
  @Get('groups/:id')
  @Roles(Role.STAFF, Role.ADMIN)
  async getBookingGroupDetails(@Param('id', ParseIntPipe) id: number) {
    return this.bookingsAdminService.getBookingGroupDetails(id);
  }

  /**
   * 🎫 Generate QR code for booking group (Staff/Admin)
   */
  @Post('groups/:id/generate-qr')
  @Roles(Role.STAFF, Role.ADMIN)
  async generateGroupQRCode(@Param('id', ParseIntPipe) id: number) {
    // Verify group exists
    const group = await this.bookingsAdminService.getBookingGroupDetails(id);

    // Generate QR code for the group
    const qrCodeDataURL = await this.qrcodeService.generateGroupQR(id);

    return {
      message: 'Group QR code generated successfully',
      groupId: group.id,
      groupCode: `GROUP-${id}`,
      totalSessions: group.totalSessions,
      qrCode: qrCodeDataURL,
    };
  }

  /**
   * 📊 Get all booking groups (Staff/Admin)
   * List all fixed schedule bookings with filters
   */
  @Get('groups')
  @Roles(Role.STAFF, Role.ADMIN)
  async getAllBookingGroups(@Query() filters: any) {
    return this.bookingsAdminService.getAllBookingGroups(filters);
  }

  /**
   * ❌ Cancel entire booking group (Staff/Admin)
   * Cancel all bookings in a fixed schedule group
   */
  @Post('groups/:id/cancel')
  @Roles(Role.STAFF, Role.ADMIN)
  async cancelBookingGroup(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelBookingGroupDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.bookingsAdminService.cancelBookingGroup(id, user.id, dto);
  }
}
