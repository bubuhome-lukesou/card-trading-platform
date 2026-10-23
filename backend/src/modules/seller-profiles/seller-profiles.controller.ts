import { Controller, Get, Patch, Body, Param, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common'
import { Transform } from 'class-transformer'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { SellerProfilesService } from './seller-profiles.service'

// 布林 query 參數解析（2026-09-24 實證陷阱：Type(Boolean) 先於 Transform 執行，Boolean('false')=true — 只可用 Transform；勿加 @Type(() => Boolean)）
const boolParam = () => Transform(({ value }) => value === true || value === 'true' || value === '1')

class StatsFiltersDto {
  @boolParam()
  hideSold?: boolean

  @boolParam()
  hideExpired?: boolean

  @boolParam()
  hideEndedAuction?: boolean
}

// 商家介紹頁 API
// ⚠️ 路由順序：「me/profile」必須排在「:id/profile」前面，否則 :id 會食走 me（Nest 匹配按聲明序）
// - GET   /sellers/me/profile   賣家讀自己 profile（表單初始化；seller-only）
// - PATCH /sellers/me/profile   賣家更新自己 profile（seller-only）
// - GET   /sellers/:id/profile  公開（匿名/買家/賣家都可讀；?hideSold=1&hideExpired=1&hideEndedAuction=1
//                               可選 — stats 口徑同步前端商品列表過濾，避免 tab 計數同列表錯位）
@Controller('sellers')
export class SellerProfilesController {
  constructor(private profilesService: SellerProfilesService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me/profile')
  getMyProfile(@Request() req) {
    if (req.user?.role !== 'seller') throw new ForbiddenException('只有商家可以管理商家資料')
    return this.profilesService.getMyProfile(req.user.id)
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/profile')
  updateMyProfile(
    @Request() req,
    @Body() body: {
      logo?: string
      banner?: string
      descriptionZh?: string
      descriptionEn?: string
      businessHours?: string
      wechatId?: string
      wechatQrCode?: string
      location?: string
    }
  ) {
    if (req.user?.role !== 'seller') throw new ForbiddenException('只有商家可以管理商家資料')
    return this.profilesService.updateMyProfile(req.user.id, body)
  }

  @Get(':id/profile')
  getProfile(@Param('id') id: string, @Query() filters: StatsFiltersDto) {
    return this.profilesService.getPublicProfile(id, filters)
  }
}