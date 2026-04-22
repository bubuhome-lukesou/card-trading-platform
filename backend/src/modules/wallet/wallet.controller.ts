import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WalletService } from './wallet.service';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get()
  getBalance(@Request() req) {
    return this.walletService.getBalance(req.user.id);
  }

  @Get('transactions')
  getTransactions(@Request() req, @Query('page') page = '1', @Query('limit') limit = '20') {
    return this.walletService.getTransactions(req.user.id, Number(page), Number(limit));
  }

  @Post('deposit')
  deposit(@Request() req, @Body('amount') amount: number, @Body('description') description: string) {
    return this.walletService.deposit(req.user.id, Number(amount), description || 'Deposit');
  }

  @Post('withdraw')
  withdraw(@Request() req, @Body('amount') amount: number, @Body('description') description: string) {
    return this.walletService.withdraw(req.user.id, Number(amount), description || 'Withdrawal');
  }
}
