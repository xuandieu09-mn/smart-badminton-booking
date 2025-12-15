import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { DepositDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import * as UserInterface from '../../common/interfaces/user.interface';
import { Role } from '@prisma/client';

type JwtUser = UserInterface.JwtUser;

@Controller('wallet')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WalletController {
  constructor(private walletService: WalletService) {}

  /**
   * 💼 Get my wallet balance
   */
  @Get('balance')
  async getBalance(@CurrentUser() user: JwtUser) {
    const wallet = await this.walletService.getBalance(user.id);
    return {
      message: 'Wallet balance',
      ...wallet,
    };
  }

  /**
   * 💵 Deposit (Admin/Staff only - for testing)
   */
  @Post('deposit/:userId')
  @Roles(Role.ADMIN, Role.STAFF)
  async deposit(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: DepositDto,
    @CurrentUser() admin: JwtUser,
  ) {
    return this.walletService.deposit(userId, dto.amount, admin.id);
  }

  /**
   * 💰 Self top-up (Customer can add money to their own wallet - simulation)
   */
  @Post('topup')
  topup(@CurrentUser() user: JwtUser, @Body() dto: DepositDto) {
    return this.walletService.topup(user.id, dto.amount);
  }

  /**
   * 💸 Pay booking with wallet
   */
  @Post('pay/:bookingId')
  async payBooking(
    @Param('bookingId', ParseIntPipe) bookingId: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.walletService.payWithWallet(user.id, bookingId);
  }

  /**
   * 📜 Get transaction history
   */
  @Get('transactions')
  async getTransactions(@CurrentUser() user: JwtUser) {
    const data = await this.walletService.getTransactions(user.id);
    return {
      message: 'Transaction history',
      ...data,
    };
  }
}
