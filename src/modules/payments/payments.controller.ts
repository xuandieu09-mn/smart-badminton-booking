import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  Req,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PaymentsService } from './payments.service';
import { VNPayService } from './gateways/vnpay.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import {
  CreatePaymentUrlDto,
  VNPayCallbackDto,
} from './dto/payment-gateway.dto';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly vnpayService: VNPayService,
  ) {}

  /**
   * 💳 Create VNPay payment URL
   * CRITICAL: Must be before `:id` routes to avoid route collision
   */
  @Post('vnpay/create-url')
  @UseGuards(JwtAuthGuard)
  createVNPayPaymentUrl(
    @Body() dto: CreatePaymentUrlDto,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.paymentsService.createVNPayPaymentUrl(
      dto.bookingId,
      user.id,
      dto.returnUrl,
      req.ip || '127.0.0.1',
    );
  }

  /**
   * 🔔 VNPay IPN callback (webhook)
   */
  @Get('vnpay/callback')
  async vnpayCallback(@Query() query: VNPayCallbackDto, @Res() res: Response) {
    try {
      // Verify signature
      if (!this.vnpayService.verifyCallback(query as any)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          RspCode: '97',
          Message: 'Invalid signature',
        });
      }

      // Check payment success
      if (!this.vnpayService.isPaymentSuccess(query as any)) {
        return res.status(HttpStatus.OK).json({
          RspCode: query.vnp_ResponseCode,
          Message: this.vnpayService.getResponseMessage(query.vnp_ResponseCode),
        });
      }

      // Update booking status
      const bookingId = parseInt(query.vnp_TxnRef);
      await this.paymentsService.handleVNPayCallback(bookingId, query);

      return res.status(HttpStatus.OK).json({
        RspCode: '00',
        Message: 'Success',
      });
    } catch (error) {
      console.error('VNPay callback error:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        RspCode: '99',
        Message: 'Internal error',
      });
    }
  }

  /**
   * 🔙 VNPay return URL (redirect from VNPay)
   */
  @Get('vnpay/return')
  vnpayReturn(@Query() query: VNPayCallbackDto, @Res() res: Response) {
    try {
      // Verify signature
      if (!this.vnpayService.verifyCallback(query as any)) {
        return res.redirect(
          `${process.env.FRONTEND_URL}/payment/result?success=false&message=Invalid%20signature`,
        );
      }

      // Check payment success
      const isSuccess = this.vnpayService.isPaymentSuccess(query as any);
      const message = this.vnpayService.getResponseMessage(
        query.vnp_ResponseCode,
      );

      if (isSuccess) {
        // Redirect to success page
        return res.redirect(
          `${process.env.FRONTEND_URL}/payment/result?success=true&bookingId=${query.vnp_TxnRef}`,
        );
      } else {
        // Redirect to failure page
        return res.redirect(
          `${process.env.FRONTEND_URL}/payment/result?success=false&message=${encodeURIComponent(message)}`,
        );
      }
    } catch (error) {
      console.error('VNPay return error:', error);
      return res.redirect(
        `${process.env.FRONTEND_URL}/payment/result?success=false&message=Error%20processing%20payment`,
      );
    }
  }

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
    return this.paymentsService.payWithWallet(
      Number(bookingId),
      Number(user.id),
    );
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
