import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Banner } from '../../entities/banner.entity'

@Injectable()
export class BannersService {
  constructor(
    @InjectRepository(Banner)
    private bannerRepo: Repository<Banner>,
  ) {}

  // 公開：首頁走馬燈（只返回啟用中，按 sortOrder 排序）
  async getActive(): Promise<Banner[]> {
    return this.bannerRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    })
  }

  // Admin：全部（包括停用）
  async getAll(): Promise<Banner[]> {
    return this.bannerRepo.find({ order: { sortOrder: 'ASC', id: 'ASC' } })
  }

  async create(data: { title?: string; imageUrl: string; linkUrl?: string; sortOrder?: number; isActive?: boolean }): Promise<Banner> {
    const banner = this.bannerRepo.create({
      title: data.title || null,
      imageUrl: data.imageUrl,
      linkUrl: data.linkUrl || null,
      sortOrder: data.sortOrder ?? 0,
      isActive: data.isActive ?? true,
    })
    return this.bannerRepo.save(banner)
  }

  async update(id: number, data: Partial<Banner>): Promise<Banner> {
    const banner = await this.bannerRepo.findOne({ where: { id } })
    if (!banner) throw new NotFoundException('Banner not found')
    if (data.title !== undefined) banner.title = data.title
    if (data.imageUrl !== undefined) banner.imageUrl = data.imageUrl
    if (data.linkUrl !== undefined) banner.linkUrl = data.linkUrl
    if (data.sortOrder !== undefined) banner.sortOrder = data.sortOrder
    if (data.isActive !== undefined) banner.isActive = data.isActive
    return this.bannerRepo.save(banner)
  }

  async remove(id: number): Promise<void> {
    const banner = await this.bannerRepo.findOne({ where: { id } })
    if (!banner) throw new NotFoundException('Banner not found')
    await this.bannerRepo.remove(banner)
  }
}