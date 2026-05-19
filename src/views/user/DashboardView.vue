<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const authStore = useAuthStore()

interface Bid {
  id: string
  auctionTitle: string
  yourBid: number
  currentBid: number
  status: 'outbid' | 'winning' | 'won' | 'ended'
  endTime: string
}

interface Order {
  id: string
  orderNumber: string
  productTitle: string
  amount: number
  status: string
  date: string
}

const stats = ref({
  totalBids: 12,
  activeBids: 3,
  wonAuctions: 2,
  totalSpent: 45600,
})

const recentBids = ref<Bid[]>([])
const recentOrders = ref<Order[]>([])

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('zh-MO', {
    style: 'currency',
    currency: 'MOP',
    minimumFractionDigits: 0,
  }).format(price)
}

const loadData = async () => {
  recentBids.value = [
    { id: '1', auctionTitle: 'Pokemon 1st Edition Base Set', yourBid: 12000, currentBid: 12800, status: 'outbid', endTime: '2026-04-21 18:00' },
    { id: '2', auctionTitle: 'Yu-Gi-Oh Blue-Eyes White Dragon', yourBid: 6800, currentBid: 6800, status: 'winning', endTime: '2026-04-21 22:00' },
    { id: '3', auctionTitle: 'MTG Black Lotus', yourBid: 25000, currentBid: 25000, status: 'won', endTime: '2026-04-22 10:00' },
  ]

  recentOrders.value = [
    { id: '1', orderNumber: 'ORD-2026-001', productTitle: 'Pokemon 1st Edition Base Set', amount: 12800, status: 'delivered', date: '2026-04-21' },
    { id: '2', orderNumber: 'ORD-2026-002', productTitle: 'MTG Black Lotus', amount: 25000, status: 'shipped', date: '2026-04-22' },
  ]
}

const getBidStatusBadge = (status: string) => {
  const map: Record<string, { class: string; text: string }> = {
    outbid: { class: 'danger', text: '已出局' },
    winning: { class: 'success', text: '領先中' },
    won: { class: 'primary', text: '已中標' },
    ended: { class: 'default', text: '已結束' },
  }
  return map[status] || { class: 'default', text: status }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="user-dashboard">
    <!-- Welcome -->
    <div class="welcome-section">
      <h1>歡迎回來，{{ authStore.user?.nickname || '收藏家' }}！</h1>
      <p>發現珍稀卡牌，參與精彩競拍</p>
    </div>

    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">🎯</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.totalBids }}</div>
          <div class="stat-label">總出價次數</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🔥</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.activeBids }}</div>
          <div class="stat-label">進行中的出價</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🏆</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.wonAuctions }}</div>
          <div class="stat-label">贏得的拍賣</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-content">
          <div class="stat-value">{{ formatPrice(stats.totalSpent) }}</div>
          <div class="stat-label">總消費</div>
        </div>
      </div>
    </div>

    <!-- Activity Grid -->
    <div class="activity-grid">
      <!-- My Bids -->
      <div class="card">
        <div class="card-header">
          <h3>🎯 我的出價</h3>
          <router-link to="/user/orders" class="see-all">查看全部</router-link>
        </div>
        <div class="card-body">
          <div v-for="bid in recentBids" :key="bid.id" class="bid-item">
            <div class="bid-info">
              <div class="bid-title">{{ bid.auctionTitle }}</div>
              <div class="bid-meta">
                您的出價: {{ formatPrice(bid.yourBid) }}
              </div>
            </div>
            <div class="bid-status">
              <div class="current-bid">目前: {{ formatPrice(bid.currentBid) }}</div>
              <span class="status-badge" :class="getBidStatusBadge(bid.status).class">
                {{ getBidStatusBadge(bid.status).text }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- My Orders -->
      <div class="card">
        <div class="card-header">
          <h3>📦 我的訂單</h3>
          <router-link to="/user/orders" class="see-all">查看全部</router-link>
        </div>
        <div class="card-body">
          <div v-for="order in recentOrders" :key="order.id" class="order-item">
            <div class="order-info">
              <div class="order-title">{{ order.productTitle }}</div>
              <div class="order-meta">{{ order.orderNumber }}</div>
            </div>
            <div class="order-status">
              <div class="order-amount">{{ formatPrice(order.amount) }}</div>
              <span class="status-badge" :class="order.status">
                {{ order.status === 'delivered' ? '已送達' : order.status === 'shipped' ? '已發貨' : '處理中' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions">
      <router-link to="/auctions" class="action-card">
        <span class="action-icon">🔨</span>
        <span class="action-text">參與拍賣</span>
      </router-link>
      <router-link to="/marketplace" class="action-card">
        <span class="action-icon">🛒</span>
        <span class="action-text">商品市場</span>
      </router-link>
      <router-link to="/user/favorites" class="action-card">
        <span class="action-icon">❤️</span>
        <span class="action-text">我的收藏</span>
      </router-link>
      <router-link to="/user/wallet" class="action-card">
        <span class="action-icon">💳</span>
        <span class="action-text">我的錢包</span>
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.user-dashboard {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.welcome-section h1 {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}

.welcome-section p {
  color: var(--text-secondary);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
}

.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.stat-icon {
  font-size: 28px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
}

.stat-value {
  font-family: var(--font-num);
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--text-primary);
}

.stat-label {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.activity-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-6);
}

.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--border);
}

.card-header h3 {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-primary);
}

.see-all {
  font-size: var(--text-sm);
  color: var(--primary);
  text-decoration: none;
}

.card-body {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.bid-item,
.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3);
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
}

.bid-title,
.order-title {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: var(--space-1);
}

.bid-meta,
.order-meta {
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.current-bid,
.order-amount {
  font-family: var(--font-num);
  font-size: var(--text-sm);
  color: var(--text-primary);
  margin-bottom: var(--space-1);
  text-align: right;
}

.status-badge {
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 500;
}

.status-badge.success {
  background: #10b9814d;
  color: #10b981;
}

.status-badge.danger {
  background: #ef44444d;
  color: #ef4444;
}

.status-badge.primary {
  background: var(--primary-gradient);
  color: white;
}

.status-badge.delivered {
  background: #10b9814d;
  color: #10b981;
}

.status-badge.shipped {
  background: #3b82f64d;
  color: #3b82f6;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
}

.action-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  text-decoration: none;
  transition: all var(--transition-fast);
}

.action-card:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
}

.action-icon {
  font-size: 28px;
}

.action-text {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
}

@media (max-width: 1024px) {
  .stats-grid,
  .activity-grid,
  .quick-actions {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .stats-grid,
  .activity-grid,
  .quick-actions {
    grid-template-columns: 1fr;
  }
}
</style>
