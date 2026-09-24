import { Body, Controller, Delete, Get, HttpException, HttpStatus, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common'
import { ContactMessagesService } from './contact-messages.service'
import { CreateContactMessageDto, UpdateContactMessageDto } from './dto/contact-message.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard, Roles } from '../auth/guards/roles.guard'

// 輕量記憶體 rate-limit（不引入新依賴）：同 IP 提交間隔最少 60 秒、每小時最多 5 條
const ipBuckets = new Map<string, { minute: number[]; hour: number[] }>()
const MINUTE_LIMIT = 3
const HOUR_LIMIT = 5

function checkRateLimit(ip: string) {
  const now = Date.now()
  const bucket = ipBuckets.get(ip) || { minute: [], hour: [] }
  bucket.minute = bucket.minute.filter(t => now - t < 60_000)
  bucket.hour = bucket.hour.filter(t => now - t < 3_600_000)
  if (bucket.minute.length >= MINUTE_LIMIT) {
    throw new HttpException('提交過於頻繁，請稍後再試', HttpStatus.TOO_MANY_REQUESTS)
  }
  if (bucket.hour.length >= HOUR_LIMIT) {
    throw new HttpException('今日提交次數已達上限，請改用電郵聯絡 support@aishoper.co', HttpStatus.TOO_MANY_REQUESTS)
  }
  bucket.minute.push(now)
  bucket.hour.push(now)
  ipBuckets.set(ip, bucket)
  // 防記憶體膨脹：超過 1000 個 IP 就清走最舊一半
  if (ipBuckets.size > 1000) {
    const keys = Array.from(ipBuckets.keys()).slice(0, 500)
    keys.forEach(k => ipBuckets.delete(k))
  }
}

@Controller('contact-messages')
export class ContactMessagesController {
  constructor(private readonly service: ContactMessagesService) {}

  // 公開提交（未登入可用）— 同 IP 每分鐘 3 條 / 每小時 5 條
  @Post()
  async create(@Body() dto: CreateContactMessageDto, @Req() req: any) {
    const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown'
    checkRateLimit(ip)
    // 未套 JwtAuthGuard；若前端帶有效 token，passport 未解析 — userId 只作可選記錄，冇就 null
    return this.service.create(dto)
  }

  // ===== 以下 admin only =====
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll(Number(page) || 1, Number(limit) || 20, status, search)
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async stats() {
    return this.service.findStats()
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id)
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateContactMessageDto) {
    return this.service.updateStatus(id, dto)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async remove(@Param('id') id: string) {
    await this.service.remove(id)
    return { success: true }
  }
}