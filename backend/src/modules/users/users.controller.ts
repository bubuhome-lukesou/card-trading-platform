import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
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
}

