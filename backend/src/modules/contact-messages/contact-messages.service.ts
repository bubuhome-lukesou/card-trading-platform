import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ContactMessage, ContactMessageStatus } from '../../entities/contact-message.entity'
import { CreateContactMessageDto, UpdateContactMessageDto } from './dto/contact-message.dto'

@Injectable()
export class ContactMessagesService {
  constructor(
    @InjectRepository(ContactMessage)
    private readonly repo: Repository<ContactMessage>,
  ) {}

  // 公開提交：任何人可發送
  async create(dto: CreateContactMessageDto, userId?: string): Promise<ContactMessage> {
    const msg = this.repo.create({
      name: dto.name.trim(),
      email: dto.email.trim().toLowerCase(),
      phone: dto.phone?.trim() || null,
      subject: dto.subject.trim(),
      message: dto.message.trim(),
      userId: userId || null,
      status: ContactMessageStatus.NEW,
    })
    return this.repo.save(msg)
  }

  // admin 列表：狀態/搜尋篩選 + 分頁（DB 層過濾，同 admin/users 模式）
  async findAll(page = 1, limit = 20, status?: string, search?: string) {
    const qb = this.repo.createQueryBuilder('m')

    if (status && status !== 'all') {
      qb.andWhere('m.status = :status', { status })
    }
    if (search) {
      qb.andWhere(
        '(m.name LIKE :kw OR m.email LIKE :kw OR m.subject LIKE :kw OR m.message LIKE :kw)',
        { kw: `%${search.trim()}%` }
      )
    }

    qb.orderBy('m.createdAt', 'DESC')
    qb.skip((page - 1) * limit).take(limit)

    const [data, total] = await qb.getManyAndCount()
    return { data, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) }
  }

  async findStats() {
    const [newCount, readCount, handledCount, total] = await Promise.all([
      this.repo.count({ where: { status: ContactMessageStatus.NEW } }),
      this.repo.count({ where: { status: ContactMessageStatus.READ } }),
      this.repo.count({ where: { status: ContactMessageStatus.HANDLED } }),
      this.repo.count(),
    ])
    return { new: newCount, read: readCount, handled: handledCount, total }
  }

  async findOne(id: string): Promise<ContactMessage> {
    const msg = await this.repo.findOne({ where: { id } })
    if (!msg) throw new NotFoundException('訊息不存在')
    return msg
  }

  async updateStatus(id: string, dto: UpdateContactMessageDto): Promise<ContactMessage> {
    const msg = await this.findOne(id)
    msg.status = dto.status
    return this.repo.save(msg)
  }

  async remove(id: string): Promise<void> {
    const msg = await this.findOne(id)
    await this.repo.remove(msg)
  }
}