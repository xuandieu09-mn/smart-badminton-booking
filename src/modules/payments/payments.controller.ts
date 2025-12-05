import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Create payment for booking (Internal)
   */
  @Post('booking/:bookingId')
  @UseGuards(JwtAuthGuard)
  async createPaymentForBooking(@Param('bookingId') bookingId: string) {
    return this.paymentsService.createPaymentForBooking(Number(bookingId));
  }

  /**
   * Pay booking with wallet
   */
  @Post('pay/:bookingId')
  @UseGuards(JwtAuthGuard)
  async payWithWallet(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: any,
  ) {
    return this.paymentsService.payWithWallet(Number(bookingId), Number(user.id));
  }

  /**
   * Get payment details
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getPayment(@Param('id') id: string) {
    return this.paymentsService.getPayment(Number(id));
  }

  /**
   * Get payment by booking ID
   */
  @Get('booking/:bookingId')
  @UseGuards(JwtAuthGuard)
  async getPaymentByBookingId(@Param('bookingId') bookingId: string) {
    return this.paymentsService.getPaymentByBookingId(Number(bookingId));
  }

  /**
   * Get user's payments
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getUserPayments(@CurrentUser() user: any) {
    return this.paymentsService.getUserPayments(Number(user.id));
  }

  /**
   * Refund payment
   */
  @Post(':id/refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  async refundPayment(@Param('id') id: string) {
    return this.paymentsService.refundPayment(Number(id));
  }
}
