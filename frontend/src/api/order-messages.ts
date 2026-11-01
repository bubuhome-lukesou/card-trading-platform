import api from './index'

// 訂單聊天 API（2026-11-01）
export interface OrderMessageDto {
  id: string
  orderId: string
  senderId: string | null
  sender?: { id: string; nickname: string; avatar?: string } | null
  kind: 'chat' | 'system' | 'time_proposal'
  content: string
  attachments: string | null // JSON 陣列 [{url, type}]
  proposalTime: string | null
  createdAt: string
}

export interface ChatAttachment {
  url: string
  type: 'image' | 'video'
}

export const orderMessagesApi = {
  // 某訂單聊天記錄（ASC 排序）
  list(orderId: string) {
    return api.get(`/order-messages/order/${orderId}`)
  },
  // 發消息（文字 + 附件）
  post(orderId: string, content: string, attachments: ChatAttachment[] = []) {
    return api.post(`/order-messages/order/${orderId}`, { content, attachments })
  },
}

// 上傳聊天附件（圖片/影片共用）
export const uploadChatMedia = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/upload/chat-media', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}