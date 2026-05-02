<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { productApi } from '@/api/products'
import { auctionApi } from '@/api/auctions'
import { ordersApi } from '@/api/orders'

const { t } = useI18n()

const stats = ref({ totalProducts: 0, activeAuctions: 0, pendingOrders: 0, totalEarnings: 0 })
const recentOrders = ref<any[]>([])
const recentAuctions = ref<any[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const [productsRes, auctionsRes, ordersRes] = await Promise.all([
      productApi.getMyProducts({ limit: 100 }),
      auctionApi.getMyAuctions({ limit: 5 }),
      ordersApi.getSellerOrders(),
    ])

    const allProducts = productsRes.data
    const orders = ordersRes.data.data || []
    const auctions = auctionsRes.data.data || []
    const totalEarned = orders
      .filter((o: any) => ['paid', 'shipped', 'delivered'].includes(o.status))
      .reduce((sum: number, o: any) => sum + (o.totalPrice || 0), 0)

    stats.value = {
      totalProducts: allProducts.length,
      activeAuctions: auctions.filter((a: any) => a.status === 'active').length,
      pendingOrders: orders.filter((o: any) => o.status === 'pending_paid').length,
      totalEarnings: totalEarned,
    }

    recentOrders.value = orders.slice(0, 5)
    recentAuctions.value = auctions.filter((a: any) => a.status === 'active').slice(0, 5)
  } catch (e) {
    console.error('Failed to load dashboard', e)
  } finally {
    loading.value = false
  }
})

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('zh-HK', { style: 'currency', currency: 'HKD', minimumFractionDigits: 0 }).format(price)
}

const getOrderStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending_paid: '待付款', paid: '已付款', shipped: '已發貨',
    delivered: '已完成', cancelled: '已取消',
  }
  return map[status] || status
}

const getOrderStatusClass = (status: string) => {
  const map: Record<string, string> = {
    pending_paid: 'warning', paid: 'info', shipped: 'primary',
    delivered: 'success', cancelled: 'danger',
  }
  return map[status] || 'default'
}

const formatDate = (date: string) => {
  return date ? new Date(date).toLocaleDateString('zh-CN') : '-'
}
</script>

<template>
  <div class="seller-dashboard">
    <!-- Stats Grid -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">📦</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.totalProducts }}</div>
          <div class="stat-label">{{ t('seller.products') }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🔨</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.activeAuctions }}</div>
          <div class="stat-label">{{ t('seller.auctions') }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📋</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.pendingOrders }}</div>
          <div class="stat-label">待處理訂單</div>
        </div>
      </div>
      <div class="stat-card highlight">
        <div class="stat-icon">💰</div>
        <div class="stat-content">
          <div class="stat-value">{{ formatPrice(stats.totalEarnings) }}</div>
          <div class="stat-label">{{ t('seller.earnings') }}</div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions">
      <router-link to="/seller/products?action=create" class="action-card">
        <span class="action-icon">➕</span>
        <span class="action-text">發布新商品</span>
      </router-link>
      <router-link to="/seller/auctions?action=create" class="action-card">
        <span class="action-icon">🔨</span>
        <span class="action-text">創建拍賣</span>
      </router-link>
      <router-link to="/seller/orders" class="action-card">
        <span class="action-icon">📦</span>
        <span class="action-text">處理訂單</span>
      </router-link>
      <router-link to="/seller/earnings" class="action-card">
        <span class="action-icon">💳</span>
        <span class="action-text">查看收益</span>
      </router-link>
    </div>

    <!-- Recent Activity -->
    <div class="dashboard-grid">
      <!-- Recent Orders -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📋 最新訂單</h3>
          <router-link to="/seller/orders" class="see-all">查看全部</router-link>
        </div>
        <div class="card-body">
          <div v-if="loading" class="loading">加載中...</div>
          <div v-else-if="!recentOrders.length" class="empty">暫無訂單</div>
          <table v-else class="data-table">
            <thead>
              <tr><th>訂單號</th><th>商品</th><th>買家</th><th>金額</th><th>狀態</th></tr>
            </thead>
            <tbody>
              <tr v-for="order in recentOrders" :key="order.id">
                <td class="order-number">{{ order.orderNumber }}</td>
                <td class="product-title">{{ order.product?.title || '-' }}</td>
                <td>{{ order.buyer?.nickname || '-' }}</td>
                <td class="amount">{{ formatPrice(order.totalPrice || 0) }}</td>
                <td>
                  <span class="status-badge" :class="getOrderStatusClass(order.status)">
                    {{ getOrderStatusText(order.status) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Active Auctions -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">🔥 進行中拍賣</h3>
          <router-link to="/seller/auctions" class="see-all">查看全部</router-link>
        </div>
        <div class="card-body">
          <div v-if="loading" class="loading">加載中...</div>
          <div v-else-if="!recentAuctions.length" class="empty">暫無進行中拍賣</div>
          <div v-else class="auction-list">
            <div v-for="auction in recentAuctions" :key="auction.id" class="auction-item">
              <div class="auction-info">
                <div class="auction-title">{{ auction.product?.title || '-' }}</div>
                <div class="auction-meta">
                  <span>{{ auction.bidCount || 0 }} 次出价</span>
                  <span>•</span>
                  <span>截止 {{ formatDate(auction.endTime) }}</span>
                </div>
              </div>
              <div class="auction-price">
                <div class="current-price">{{ formatPrice(auction.currentPrice || 0) }}</div>
                <div class="price-label">當前價格</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.seller-dashboard { display: flex; flex-direction: column; gap: var(--space-6); }
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-4); }
.stat-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: var(--space-6); display: flex; align-items: center; gap: var(--space-4); transition: all var(--transition-fast); }
.stat-card:hover { border-color: var(--primary); transform: translateY(-2px); }
.stat-card.highlight { background: var(--primary-gradient); border: none; }
.stat-card.highlight .stat-value, .stat-card.highlight .stat-label { color: white; }
.stat-icon { font-size: 32px; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: var(--bg-elevated); border-radius: var(--radius-lg); }
.stat-card.highlight .stat-icon { background: rgba(255,255,255,0.2); }
.stat-value { font-family: var(--font-num); font-size: var(--text-2xl); font-weight: 700; color: var(--text-primary); }
.stat-label { font-size: var(--text-sm); color: var(--text-secondary); }
.quick-actions { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-4); }
.action-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: var(--space-6); display: flex; flex-direction: column; align-items: center; gap: var(--space-3); text-decoration: none; transition: all var(--transition-fast); }
.action-card:hover { border-color: var(--primary); transform: translateY(-2px); box-shadow: 0 4px 16px #667eea33; }
.action-icon { font-size: 28px; }
.action-text { font-size: var(--text-sm); font-weight: 600; color: var(--text-primary); }
.dashboard-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-6); }
.card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-xl); overflow: hidden; }
.card-header { display: flex; justify-content: space-between; align-items: center; padding: var(--space-4) var(--space-6); border-bottom: 1px solid var(--border); }
.card-title { font-size: var(--text-base); font-weight: 600; color: var(--text-primary); }
.see-all { font-size: var(--text-sm); color: var(--primary); text-decoration: none; }
.see-all:hover { text-decoration: underline; }
.card-body { padding: var(--space-4); }
.loading, .empty { text-align: center; padding: var(--space-8); color: var(--text-secondary); }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: var(--space-3); text-align: left; font-size: var(--text-sm); border-bottom: 1px solid var(--border); }
.data-table th { color: var(--text-secondary); font-weight: 500; }
.data-table td { color: var(--text-primary); }
.data-table tr:last-child td { border-bottom: none; }
.order-number { font-family: var(--font-num); font-size: var(--text-xs); color: var(--text-secondary); }
.product-title { max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.amount { font-family: var(--font-num); font-weight: 600; color: var(--primary); }
.status-badge { padding: 2px 8px; border-radius: var(--radius-full); font-size: var(--text-xs); font-weight: 500; }
.status-badge.warning { background: #fbbf244d; color: #f59e0b; }
.status-badge.success { background: #10b9814d; color: #10b981; }
.status-badge.info { background: #3b82f64d; color: #3b82f6; }
.status-badge.primary { background: #8b5cf64d; color: #8b5cf6; }
.status-badge.danger { background: #ef44444d; color: #ef4444; }
.auction-list { display: flex; flex-direction: column; gap: var(--space-3); }
.auction-item { display: flex; justify-content: space-between; align-items: center; padding: var(--space-3); background: var(--bg-elevated); border-radius: var(--radius-lg); }
.auction-title { font-size: var(--text-sm); font-weight: 500; color: var(--text-primary); margin-bottom: var(--space-1); }
.auction-meta { font-size: var(--text-xs); color: var(--text-secondary); display: flex; gap: var(--space-2); }
.auction-price { text-align: right; }
.current-price { font-family: var(--font-num); font-size: var(--text-lg); font-weight: 700; color: var(--primary); }
.price-label { font-size: var(--text-xs); color: var(--text-secondary); }
@media (max-width: 1024px) { .stats-grid, .quick-actions, .dashboard-grid { grid-template-columns: 1fr; } }
</style>
