import { defineStore } from 'pinia'
import { ref } from 'vue'
import { notificationApi, type AppNotification } from '@/api/notifications'

// 站內通知狀態 — 鈴鐺未讀數 + 通知列表
export const useNotificationStore = defineStore('notifications', () => {
  const unreadCount = ref(0)
  const notifications = ref<AppNotification[]>([])
  const total = ref(0)
  const loading = ref(false)
  let pollTimer: ReturnType<typeof setInterval> | null = null

  /** 拉取未讀數（輪詢用） */
  const fetchUnread = async () => {
    try {
      const res = await notificationApi.getUnreadCount()
      unreadCount.value = res.data?.count || 0
    } catch {
      // 靜默失敗 — 未讀數不影響主流程
    }
  }

  /** 拉取通知列表 */
  const fetchNotifications = async (page = 1, limit = 20) => {
    loading.value = true
    try {
      const res = await notificationApi.getNotifications(page, limit)
      notifications.value = res.data?.data || []
      total.value = res.data?.total || 0
      unreadCount.value = res.data?.unread || 0
    } catch {
      notifications.value = []
    } finally {
      loading.value = false
    }
  }

  const markRead = async (id: string) => {
    try {
      await notificationApi.markRead(id)
      const item = notifications.value.find(n => n.id === id)
      if (item && !item.isRead) {
        item.isRead = true
        unreadCount.value = Math.max(0, unreadCount.value - 1)
      }
    } catch {
      // ignore
    }
  }

  const markAllRead = async () => {
    try {
      await notificationApi.markAllRead()
      notifications.value.forEach(n => { n.isRead = true })
      unreadCount.value = 0
    } catch {
      // ignore
    }
  }

  /** 開始輪詢未讀數（30 秒一次） */
  const startPolling = () => {
    if (pollTimer) return
    fetchUnread()
    pollTimer = setInterval(fetchUnread, 30000)
  }

  const stopPolling = () => {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
    unreadCount.value = 0
  }

  return {
    unreadCount,
    notifications,
    total,
    loading,
    fetchUnread,
    fetchNotifications,
    markRead,
    markAllRead,
    startPolling,
    stopPolling,
  }
})