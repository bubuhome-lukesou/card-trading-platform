<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import api from '@/api'

const { t } = useI18n()
const authStore = useAuthStore()

interface Bid {
  id: string
  auctionTitle: string
  yourBid: number
  currentBid: number
  status: 'outbid' | 'winning' | 'won' | 'ended'
  endTime: string
  auctionId: string
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
  totalBids: 0,
  activeBids: 0,
  totalSpent: 0,
})

const recentBids = ref<Bid[]>([])
const recentOrders = ref<Order[]>([])
const loading = ref(true)

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('zh-MO', {
    style: 'currency',
    currency: 'MOP',
    minimumFractionDigits: 0,
  }).format(price)
}

const loadData = async () => {
  loading.value = true
  try {
    // 並行拉取：我的出價 + 我的訂單
    const [bidsRes, ordersRes] = await Promise.all([
      api.get('/bids/my', { params: { limit: 5 } }),
      api.get('/orders', { params: { limit: 5 } }),
    ])

    const bids = bidsRes.data?.data || []
    const orders = ordersRes.data?.data || ordersRes.data || []

    // 我的出價（附 auction+product 資料）
    recentBids.value = bids.map((b: any) => {
      const auction = b.auction || {}
      const product = auction.product || {}
      const now = new Date()
      const ended = auction.endTime ? new Date(auction.endTime) < now : false
      const isWinner = auction.winnerId === authStore.user?.id
      let bidStatus: Bid['status'] = 'winning'
      if (b.status === 'won' || isWinner) bidStatus = 'won'
      else if (b.status === 'outbid' || (auction.winnerId && !isWinner)) bidStatus = 'outbid'
      else if (ended) bidStatus = 'ended'
      return {
        id: b.id,
        auctionId: b.auctionId,
        auctionTitle: product.titleZh || product.titleEn || '拍賣商品',
        yourBid: Number(b.amount),
        currentBid: Number(auction.currentPrice || b.amount),
        status: bidStatus,
        endTime: auction.endTime || '',
      }
    })

    // 我的訂單（近 5 單）
    recentOrders.value = orders.slice(0, 5).map((o: any) => {
      const product = o.product || {}
      let images: string[] = []
      try {
        images = typeof product.images === 'string' ? JSON.parse(product.images) : (Array.isArray(product.images) ? product.images : [])
      } catch {}
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        productTitle: product.titleZh || product.titleEn || o.orderNumber,
        amount: Number(o.totalPrice) || 0,
        status: o.status,
        date: o.createdAt,
      }
    })

    // 統計：總出價次數/進行中出價/總消費（delivered 訂單總額）
    const allBids = bidsRes.data?.total || 0
    const activeBids = bids.filter((b: any) => {
      const auction = b.auction || {}
      const ended = auction.endTime ? new Date(auction.endTime) < new Date() : false
      return !ended && b.status === 'active'
    }).length
    const totalSpent = orders
      .filter((o: any) => ['delivered'].includes(o.status))
      .reduce((sum: number, o: any) => sum + (Number(o.totalPrice) || 0), 0)

    stats.value = {
      totalBids: allBids,
      activeBids,
      totalSpent,
    }
  } catch (e) {
    console.error('Failed to load dashboard:', e)
  } finally {
    loading.value = false
  }
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
        </div>
        <div class="card-body">
          <div v-if="!recentBids.length" class="empty-row">暫無出價記錄</div>
          <div v-for="bid in recentBids" :key="bid.id" class="bid-item" @click="$router.push(`/auction/${bid.auctionId}`)" style="cursor:pointer">
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
          <div v-if="!recentOrders.length" class="empty-row">暫無訂單記錄</div>
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

.bid-item:hover {
  background: var(--bg-card);
  outline: 1px solid var(--border);
}

.empty-row {
  text-align: center;
  padding: var(--space-4);
  color: var(--text-muted);
  font-size: var(--text-sm);
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
