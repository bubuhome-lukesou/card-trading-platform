<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '@/api'

const { t } = useI18n()

interface Stats {
  totalProducts: number
  activeAuctions: number
  totalOrders: number
  totalEarnings: number
  pendingOrders: number
  completedSales: number
}

interface RecentOrder {
  id: string
  orderNumber: string
  productTitle: string
  buyerNickname: string
  amount: number
  status: string
  createdAt: string
}

interface RecentAuction {
  id: string
  productTitle: string
  currentPrice: number
  bidsCount: number
  endTime: string
  status: string
}

const stats = ref<Stats>({
  totalProducts: 0,
  activeAuctions: 0,
  totalOrders: 0,
  totalEarnings: 0,
  pendingOrders: 0,
  completedSales: 0,
})

const recentOrders = ref<RecentOrder[]>([])
const recentAuctions = ref<RecentAuction[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    // Mock data for demonstration - in production, call real API
    stats.value = {
      totalProducts: 24,
      activeAuctions: 5,
      totalOrders: 18,
      totalEarnings: 45680,
      pendingOrders: 3,
      completedSales: 15,
    }

    recentOrders.value = [
      { id: '1', orderNumber: 'ORD-2026-001', productTitle: 'Pokemon 1st Edition Base Set', buyerNickname: 'Collector_001', amount: 12800, status: 'paid', createdAt: '2026-04-21' },
      { id: '2', orderNumber: 'ORD-2026-002', productTitle: 'Yu-Gi-Oh Blue-Eyes', buyerNickname: 'DragonMaster', amount: 6800, status: 'shipped', createdAt: '2026-04-20' },
      { id: '3', orderNumber: 'ORD-2026-003', productTitle: 'MTG Black Lotus', buyerNickname: 'MagicPlayer', amount: 25000, status: 'pending_paid', createdAt: '2026-04-19' },
    ]

    recentAuctions.value = [
      { id: '1', productTitle: 'Pokemon 1st Edition Base Set', currentPrice: 12800, bidsCount: 23, endTime: '2026-04-21 18:00', status: 'active' },
      { id: '2', productTitle: 'Yu-Gi-Oh Blue-Eyes White Dragon', currentPrice: 6800, bidsCount: 15, endTime: '2026-04-21 22:00', status: 'active' },
      { id: '3', productTitle: 'MTG Black Lotus', currentPrice: 25000, bidsCount: 8, endTime: '2026-04-22 10:00', status: 'active' },
    ]
  } catch (error) {
    console.error('Failed to load dashboard data:', error)
  } finally {
    loading.value = false
  }
})

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('zh-HK', {
    style: 'currency',
    currency: 'HKD',
    minimumFractionDigits: 0,
  }).format(price)
}

const getStatusClass = (status: string) => {
  const map: Record<string, string> = {
    pending_paid: 'warning',
    paid: 'success',
    shipped: 'info',
    delivered: 'success',
    cancelled: 'danger',
  }
  return map[status] || 'default'
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending_paid: '待付款',
    paid: '已付款',
    shipped: '已发货',
    delivered: '已完成',
    cancelled: '已取消',
  }
  return map[status] || status
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
          <div class="stat-label">待处理订单</div>
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
        <span class="action-text">发布新商品</span>
      </router-link>
      <router-link to="/seller/auctions?action=create" class="action-card">
        <span class="action-icon">🔨</span>
        <span class="action-text">创建拍卖</span>
      </router-link>
      <router-link to="/seller/orders" class="action-card">
        <span class="action-icon">📦</span>
        <span class="action-text">处理订单</span>
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
          <h3 class="card-title">📋 最新订单</h3>
          <router-link to="/seller/orders" class="see-all">查看全部</router-link>
        </div>
        <div class="card-body">
          <div v-if="loading" class="loading">加载中...</div>
          <table v-else class="data-table">
            <thead>
              <tr>
                <th>订单号</th>
                <th>商品</th>
                <th>买家</th>
                <th>金额</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="order in recentOrders" :key="order.id">
                <td class="order-number">{{ order.orderNumber }}</td>
                <td class="product-title">{{ order.productTitle }}</td>
                <td>{{ order.buyerNickname }}</td>
                <td class="amount">{{ formatPrice(order.amount) }}</td>
                <td>
                  <span class="status-badge" :class="getStatusClass(order.status)">
                    {{ getStatusText(order.status) }}
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
          <h3 class="card-title">🔥 进行中拍卖</h3>
          <router-link to="/seller/auctions" class="see-all">查看全部</router-link>
        </div>
        <div class="card-body">
          <div v-if="loading" class="loading">加载中...</div>
          <div v-else class="auction-list">
            <div v-for="auction in recentAuctions" :key="auction.id" class="auction-item">
              <div class="auction-info">
                <div class="auction-title">{{ auction.productTitle }}</div>
                <div class="auction-meta">
                  <span>{{ auction.bidsCount }} 次出价</span>
                  <span>•</span>
                  <span>截止 {{ auction.endTime }}</span>
                </div>
              </div>
              <div class="auction-price">
                <div class="current-price">{{ formatPrice(auction.currentPrice) }}</div>
                <div class="price-label">当前价格</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.seller-dashboard {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
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
  transition: all var(--transition-fast);
}

.stat-card:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
}

.stat-card.highlight {
  background: var(--primary-gradient);
  border: none;
}

.stat-card.highlight .stat-value,
.stat-card.highlight .stat-label {
  color: white;
}

.stat-icon {
  font-size: 32px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
}

.stat-card.highlight .stat-icon {
  background: rgba(255, 255, 255, 0.2);
}

.stat-value {
  font-family: var(--font-num);
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--text-primary);
}

.stat-label {
  font-size: var(--text-sm);
  color: var(--text-secondary);
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
  box-shadow: 0 4px 16px #667eea33;
}

.action-icon {
  font-size: 28px;
}

.action-text {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-6);
}

.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--border);
}

.card-title {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-primary);
}

.see-all {
  font-size: var(--text-sm);
  color: var(--primary);
  text-decoration: none;
}

.see-all:hover {
  text-decoration: underline;
}

.card-body {
  padding: var(--space-4);
}

.loading {
  text-align: center;
  padding: var(--space-8);
  color: var(--text-secondary);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: var(--space-3);
  text-align: left;
  font-size: var(--text-sm);
}

.data-table th {
  color: var(--text-secondary);
  font-weight: 500;
  border-bottom: 1px solid var(--border);
}

.data-table td {
  color: var(--text-primary);
  border-bottom: 1px solid var(--border);
}

.data-table tr:last-child td {
  border-bottom: none;
}

.order-number {
  font-family: var(--font-num);
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.product-title {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.amount {
  font-family: var(--font-num);
  font-weight: 600;
  color: var(--primary);
}

.status-badge {
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 500;
}

.status-badge.warning {
  background: #fbbf244d;
  color: #f59e0b;
}

.status-badge.success {
  background: #10b9814d;
  color: #10b981;
}

.status-badge.info {
  background: #3b82f64d;
  color: #3b82f6;
}

.status-badge.danger {
  background: #ef44444d;
  color: #ef4444;
}

.auction-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.auction-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3);
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
}

.auction-title {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: var(--space-1);
}

.auction-meta {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  display: flex;
  gap: var(--space-2);
}

.auction-price {
  text-align: right;
}

.current-price {
  font-family: var(--font-num);
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--primary);
}

.price-label {
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

@media (max-width: 1024px) {
  .stats-grid,
  .quick-actions,
  .dashboard-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .stats-grid,
  .quick-actions,
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
</style>
