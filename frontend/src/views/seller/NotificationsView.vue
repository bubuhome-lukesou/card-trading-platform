<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useNotificationStore } from '@/stores/notifications'

const { t, locale } = useI18n()
const router = useRouter()
const store = useNotificationStore()

const zh = () => locale.value === 'zh'

const typeIcon = (type: string) => {
  const map: Record<string, string> = {
    outbid: '⚠️',
    auction_ending: '⏰',
    auction_result: '🏆',
    new_bid: '🔨',
    order_update: '📦',
    payment_received: '💰',
    reservation_update: '📅',
  }
  return map[type] || '🔔'
}

const typeClass = (type: string) => {
  if (type === 'outbid') return 'danger'
  if (type === 'auction_result') return 'success'
  if (type === 'payment_received') return 'success'
  if (type === 'new_bid') return 'warning'
  return 'info'
}

const formatTime = (dateStr: string) => {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return zh() ? '剛剛' : 'Just now'
  if (diffMin < 60) return zh() ? `${diffMin} 分鐘前` : `${diffMin}m ago`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return zh() ? `${diffHour} 小時前` : `${diffHour}h ago`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 7) return zh() ? `${diffDay} 天前` : `${diffDay}d ago`
  return d.toLocaleDateString(zh() ? 'zh-TW' : 'en-US')
}

const handleClick = async (n: { id: string; isRead: boolean; link: string | null }) => {
  if (!n.isRead) await store.markRead(n.id)
  if (n.link) {
    router.push(n.link)
  }
}

const handleReadAll = () => store.markAllRead()

onMounted(() => {
  store.fetchNotifications()
})
</script>

<template>
  <div class="notifications-page">
    <div class="page-header">
      <h1 class="page-title">🔔 {{ zh() ? '通知中心' : 'Notifications' }}</h1>
      <button
        v-if="store.unreadCount > 0"
        class="btn-read-all"
        @click="handleReadAll"
      >
        {{ zh() ? '全部標為已讀' : 'Mark all read' }} ({{ store.unreadCount }})
      </button>
    </div>

    <div v-if="store.loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <div v-else-if="store.notifications.length === 0" class="empty-state">
      <div class="empty-icon">🔕</div>
      <p>{{ zh() ? '暫無通知' : 'No notifications yet' }}</p>
      <p class="empty-hint">{{ zh() ? '新訂單、新預約、付款憑證嘅動態會喺呢度顯示' : 'Order, reservation and payment updates will appear here' }}</p>
    </div>

    <div v-else class="notifications-list">
      <div
        v-for="n in store.notifications"
        :key="n.id"
        class="notification-item"
        :class="{ unread: !n.isRead, clickable: !!n.link }"
        @click="handleClick(n)"
      >
        <div class="n-icon" :class="typeClass(n.type)">{{ typeIcon(n.type) }}</div>
        <div class="n-body">
          <div class="n-title-row">
            <span class="n-title">{{ n.title }}</span>
            <span v-if="!n.isRead" class="unread-dot"></span>
          </div>
          <div class="n-message">{{ n.message }}</div>
          <div class="n-time">{{ formatTime(n.createdAt) }}</div>
        </div>
        <span v-if="n.link" class="n-arrow">›</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notifications-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  max-width: 800px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.page-title {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--text-primary);
}

.btn-read-all {
  padding: var(--space-2) var(--space-4);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  color: var(--text-primary);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.btn-read-all:hover { border-color: var(--primary); color: var(--primary); }

.notifications-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  cursor: pointer;
  transition: all var(--transition-fast);
  position: relative;
}

.notification-item.clickable:hover {
  border-color: var(--primary);
  transform: translateY(-1px);
}

.notification-item.unread {
  background: var(--bg-elevated);
  border-left: 3px solid var(--primary);
}

.n-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}
.n-icon.danger { background: #ef444422; }
.n-icon.success { background: #10b98122; }
.n-icon.warning { background: #f59e0b22; }
.n-icon.info { background: #3b82f622; }

.n-body { flex: 1; min-width: 0; }

.n-title-row { display: flex; align-items: center; gap: var(--space-2); }
.n-title { font-size: var(--text-sm); font-weight: 600; color: var(--text-primary); }
.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary);
  flex-shrink: 0;
}

.n-message {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin-top: 2px;
  line-height: 1.5;
}

.n-time {
  font-size: var(--text-xs);
  color: var(--text-muted);
  margin-top: var(--space-1);
}

.n-arrow {
  color: var(--text-muted);
  font-size: 20px;
  align-self: center;
}

.empty-state {
  text-align: center;
  padding: var(--space-10) var(--space-4);
  color: var(--text-secondary);
}
.empty-icon { font-size: 48px; margin-bottom: var(--space-3); }
.empty-hint { font-size: var(--text-xs); color: var(--text-muted); margin-top: var(--space-2); }

.loading-state { text-align: center; padding: var(--space-10); }
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>