import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { HomeSettings } from '../../entities/home-settings.entity'
import { User } from '../../entities/user.entity'
import { Product, ProductStatus } from '../../entities/product.entity'
import { Order, OrderStatus } from '../../entities/order.entity'

/**
 * 首頁 Hero + 統計條內容（id=1 單行）
 * 公開讀取（首頁）+ Admin 更新
 */
@Injectable()
export class HomeSettingsService {
  constructor(
    @InjectRepository(HomeSettings)
    private repo: Repository<HomeSettings>,
  ) {}

  // 確保 id=1 行存在
  private async ensureRow(): Promise<HomeSettings> {
    let row = await this.repo.findOne({ where: { id: 1 } })
    if (!row) {
      row = this.repo.create({ id: 1 })
      row = await this.repo.save(row)
    }
    return row
  }

  /**
   * 後台真實數據統計（首頁統計條 liveStats）：
   * - 本日瀏覽數 / 總瀏覽數：site_daily_views（商品詳情瀏覽累計，UTC+8 分日）
   * - 用戶數：users 全部
   * - 在售商品數：products status=active（軟刪 removed 已過濾）
   * - 已完成訂單數：orders status=delivered
   */
  async getLiveStats() {
    const ds = this.repo.manager
    const [viewsRows, totalUsers, activeProducts, completedOrders] = await Promise.all([
      ds.query(
        `SELECT
           COALESCE(SUM(views), 0) AS totalViews,
           COALESCE(SUM(CASE WHEN date = DATE_FORMAT(CONVERT_TZ(NOW(), '+00:00', '+08:00'), '%Y-%m-%d') THEN views ELSE 0 END), 0) AS todayViews
         FROM site_daily_views`
      ),
      ds.query('SELECT COUNT(*) AS c FROM users'),
      ds.query(`SELECT COUNT(*) AS c FROM products WHERE status = '${ProductStatus.ACTIVE}'`),
      ds.query(`SELECT COUNT(*) AS c FROM orders WHERE status = '${OrderStatus.DELIVERED}'`),
    ])

    return {
      todayViews: Number(viewsRows?.[0]?.todayViews || 0),
      totalViews: Number(viewsRows?.[0]?.totalViews || 0),
      totalUsers: Number(totalUsers?.[0]?.c || 0),
      activeProducts: Number(activeProducts?.[0]?.c || 0),
      completedOrders: Number(completedOrders?.[0]?.c || 0),
    }
  }

  // 公開：首頁讀取（全部欄位返回 + liveStats 附加）
  async getPublic() {
    const row = await this.ensureRow()
    const liveStats = await this.getLiveStats()
    return { ...row, liveStats }
  }

  // Admin 讀取（同一形）
  async get(): Promise<HomeSettings> {
    return this.ensureRow()
  }

  // Admin 更新（Partial）
  async update(data: Partial<HomeSettings>): Promise<HomeSettings> {
    const row = await this.ensureRow()
    const fields = [
      'heroTitleZh', 'heroTitleEn', 'heroSubtitleZh', 'heroSubtitleEn',
      'heroPrimaryBtnZh', 'heroPrimaryBtnEn', 'heroPrimaryLink',
      'heroSecondaryBtnZh', 'heroSecondaryBtnEn', 'heroSecondaryLink',
      'statsJson',
    ] as const
    for (const f of fields) {
      if ((data as any)[f] !== undefined) (row as any)[f] = (data as any)[f]
    }
    return this.repo.save(row)
  }
}