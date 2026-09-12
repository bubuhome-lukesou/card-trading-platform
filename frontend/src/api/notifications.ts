import api from './index'

export interface AppNotification {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  isRead: boolean
  createdAt: string
}

export const notificationApi = {
  /** 通知列表（分頁 + 未讀數） */
  getNotifications: (page = 1, limit = 20) =>
    api.get<{ data: AppNotification[]; total: number; unread: number; page: number; limit: number }>('/notifications', { params: { page, limit } }),

  /** 未讀數（鈴鐺紅點） */
  getUnreadCount: () => api.get<{ count: number }>('/notifications/unread-count'),

  /** 標記單一已讀 */
  markRead: (id: string) => api.post(`/notifications/${id}/read`),

  /** 全部已讀 */
  markAllRead: () => api.post('/notifications/read-all'),
}