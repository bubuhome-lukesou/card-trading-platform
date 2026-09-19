import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { HomeSettings } from '../../entities/home-settings.entity'

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

  // 公開：首頁讀取（全部欄位返回，前端 fallback 預設值）
  async getPublic(): Promise<HomeSettings> {
    return this.ensureRow()
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