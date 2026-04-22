import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('users')
  getUsers(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('role') role?: string,
  ) {
    return this.adminService.getUsers(Number(page), Number(limit), role);
  }

  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() body: { role?: string; status?: string; nickname?: string }) {
    return this.adminService.updateUser(id, body);
  }

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }
}

