import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { OrderMessage, OrderMessageKind } from '../../entities/order-message.entity'
import { Order } from '../../entities/order.entity'

// 訂單聊天服務（2026-11-01）
// - 一訂單一 thread；只限該單買賣雙方讀寫
// - 攞貨時間協調以 time_proposal / system 消息寫入聊天流，雙方可見進度
export interface PostMessageDto {
  content?: string
  attachments?: { url: string; type: 'image' | 'video' }[]
}

// 系統消息文案統一喺 service 生成，前端直接渲染
export const SYSTEM_MESSAGES = {
  PROPOSED: '【系統】買家提出了取貨時間：{time}，等待商家確認',
  REPROPOSED: '【系統】買家更改了取貨時間：{time}，等待商家確認',
  CONFIRMED: '【系統】商家已確認取貨時間：{time}',
  PICKUP_CONFIRMED: '【系統】買家已確認取貨，訂單完成',
}

@Injectable()
export class OrderMessagesService {
  constructor(
    @InjectRepository(OrderMessage)
    private messageRepo: Repository<OrderMessage>,
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
  ) {}

  // 校驗調用者係呢單嘅買家或賣家，返回訂單
  async assertParticipant(orderId: string, userId: string): Promise<Order> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } })
    if (!order) throw new NotFoundException('Order not found')
    if (order.buyerId !== userId && order.sellerId !== userId) {
      throw new ForbiddenException('只有買賣雙方可以存取此訂單')
    }
    return order
  }

  async listMessages(orderId: string, userId: string): Promise<OrderMessage[]> {
    await this.assertParticipant(orderId, userId)
    return this.messageRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.sender', 'sender')
      .where('m.orderId = :orderId', { orderId })
      .orderBy('m.createdAt', 'ASC')
      .getMany()
  }

  // 買賣雙方發消息（文字 + 可選圖片/影片附件）
  async postMessage(orderId: string, userId: string, dto: PostMessageDto): Promise<OrderMessage> {
    const order = await this.assertParticipant(orderId, userId)
    const content = (dto.content || '').trim()
    const atts = Array.isArray(dto.attachments) ? dto.attachments.slice(0, 4) : []
    if (!content && !atts.length) {
      throw new BadRequestException('Message cannot be empty')
    }
    // 附件總大小防呆：只信 URL 字串（檔案已另行上傳 uploads/）
    const msg = this.messageRepo.create({
      orderId,
      senderId: userId,
      kind: OrderMessageKind.CHAT,
      content: content || '',
      attachments: atts.length ? JSON.stringify(atts) : null,
    })
    const saved = await this.messageRepo.save(msg)
    // 通知對方有新消息（non-fatal）
    const targetId = order.buyerId === userId ? order.sellerId : order.buyerId
    return saved
  }

  // 內部用（orders service 呼叫）：寫 time_proposal / system 消息
  async addSystemMessage(
    orderId: string,
    kind: OrderMessageKind,
    content: string,
    proposalTime?: string | null,
    senderId?: string | null,
  ) {
    const msg = this.messageRepo.create({
      orderId,
      senderId: senderId ?? null,
      kind,
      content,
      proposalTime: proposalTime ?? null,
    })
    return this.messageRepo.save(msg)
  }
}