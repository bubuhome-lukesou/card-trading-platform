import api from './index'

// 訂單擴展 API（2026-11-01）：攞貨時間協調 + 互評
export const orderPickupApi = {
  // 買家提出/重提攞貨時間
  proposePickupTime(orderId: string, pickupTime: string) {
    return api.post(`/orders/${orderId}/pickup-time`, { pickupTime })
  },
  // 商家確認攞貨時間
  confirmPickupTime(orderId: string) {
    return api.post(`/orders/${orderId}/pickup-time/confirm`)
  },
  // 買家確認取貨（訂單完成）
  confirmPickup(orderId: string) {
    return api.post(`/orders/${orderId}/pickup-confirm`)
  },
}

export interface ReviewDto {
  id: string
  orderId: string
  reviewerId: string
  targetUserId: string
  targetRole: 'seller_review' | 'buyer_review'
  rating: number
  content: string | null
  images: string | null
  reply?: string | null
  createdAt: string
  reviewer?: { id: string; nickname: string; avatar?: string }
}

export const reviewApi = {
  // 寫評價（5星必選 + 文字 + 最多9圖）
  create(orderId: string, rating: number, content?: string, images: string[] = []) {
    return api.post(`/orders/${orderId}/review`, { rating, content, images })
  },
  // 讀某訂單評價
  findByOrder(orderId: string) {
    return api.get(`/orders/${orderId}/review`)
  },
  // 某人收到嘅評價（公開）
  findForTarget(userId: string, role?: 'seller_review' | 'buyer_review') {
    return api.get(`/reviews/target/${userId}`, { params: { role: role || undefined } })
  },
  // 統計
  stats(userId: string, role: 'seller_review' | 'buyer_review') {
    return api.get(`/reviews/target/${userId}/stats`, { params: { role } })
  },
  // 商家回覆
  reply(reviewId: string, content: string) {
    return api.post(`/reviews/${reviewId}/reply`, { content })
  },
}