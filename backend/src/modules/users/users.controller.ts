import { Controller, Get, Patch, Body, UseGuards, Request, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return this.usersService.findById(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  updateProfile(@Request() req, @Body() body: { nickname?: string; phone?: string; avatar?: string }) {
    return this.usersService.updateProfile(req.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('password')
  updatePassword(@Request() req, @Body() body: { currentPassword: string; newPassword: string }) {
    return this.usersService.updatePassword(req.user.id, body.currentPassword, body.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('pickup-info')
  updatePickupInfo(@Request() req, @Body() body: { pickupInfo?: string; pickupQrCode?: string }) {
    return this.usersService.updatePickupInfo(req.user.id, body);
  }

  @Get('seller/:sellerId/pickup-info')
  getSellerPickupInfo(@Param('sellerId') sellerId: string) {
    return this.usersService.getSellerInfo(sellerId);
  }
}

