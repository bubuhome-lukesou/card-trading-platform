<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

interface Order {
  id: string
  orderNumber: string
  productTitle: string
  productImage?: string
  sellerNickname: string
  amount: number
  status: 'pending_paid' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
  type: 'purchase' | 'auction'
  createdAt: string
}

const orders = ref<Order[]>([])
const loading = ref(true)
const filterStatus = ref('all')

const filteredOrders = computed(() => {
  if (filterStatus.value === 'all') return orders.value
  return orders.value.filter(o => o.status === filterStatus.value)
})

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('zh-HK', {
    style: 'currency',
    currency: 'HKD',
    minimumFractionDigits: 0,
  }).format(price)
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

const getStatusBadge = (status: string) => {
  const map: Record<string, { class: string; text: string }> = {
    pending_paid: { class: 'pending', text: '待付款' },
    paid: { class: 'paid', text: '已付款' },
    shipped: { class: 'shipped', text: '已发货' },
    delivered: { class: 'delivered', text: '已完成' },
    cancelled: { class: 'cancelled', text: '已取消' },
    refunded: { class: 'refunded', text: '已退款' },
  }
  return map[status] || { class: 'default', text: status }
}

const loadOrders = async () => {
  loading.value = true
  try {
    orders.value = [
      { id: '1', orderNumber: 'ORD-2026-001', productTitle: 'Pokemon 1st Edition Base Set', sellerNickname: 'CardMaster', amount: 12800, status: 'delivered', type: 'auction', createdAt: '2026-04-21' },
      { id: '2', orderNumber: 'ORD-2026-002', productTitle: 'Yu-Gi-Oh Blue-Eyes White Dragon', sellerNickname: 'DragonSeller', amount: 6800, status: 'shipped', type: 'auction', createdAt: '2026-04-20' },
      { id: '3', orderNumber: 'ORD-2026-003', productTitle: 'MTG Black Lotus', sellerNickname: 'MagicCards', amount: 25000, status: 'pending_paid', type: 'auction', createdAt: '2026-04-19' },
      { id: '4', orderNumber: 'ORD-2026-004', productTitle: 'Doraemon Figure Collection', sellerNickname: 'AnimeSeller', amount: 1800, status: 'paid', type: 'purchase', createdAt: '2026-04-18' },
    ]
  } catch (error) {
    console.error('Failed to load orders:', error)
  } finally {
    loading.value = false
  }
}

const handlePay = (orderId: string) => {
  alert(`支付订单 ${orderId} - 功能开发中`)
}

const handleReceive = (orderId: string) => {
  alert(`确认收货 ${orderId} - 功能开发中`)
}

onMounted(() => {
  loadOrders()
})
</script>

<template>
  <div class="orders-page">
    <h1 class="page-title">我的订单</h1>

    <!-- Filter Tabs -->
    <div class="filter-tabs">
      <button 
        class="tab" 
        :class="{ active: filterStatus === 'all' }"
        @click="filterStatus = 'all'"
      >
        全部
      </button>
      <button 
        class="tab" 
        :class="{ active: filterStatus === 'pending_paid' }"
        @click="filterStatus = 'pending_paid'"
      >
        待付款
      </button>
      <button 
        class="tab" 
        :class="{ active: filterStatus === 'paid' }"
        @click="filterStatus = 'paid'"
      >
        已付款
      </button>
      <button 
        class="tab" 
        :class="{ active: filterStatus === 'shipped' }"
        @click="filterStatus = 'shipped'"
      >
        已发货
      </button>
      <button 
        class="tab" 
        :class="{ active: filterStatus === 'delivered' }"
        @click="filterStatus = 'delivered'"
      >
        已完成
      </button>
    </div>

    <!-- Orders List -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <div v-else-if="filteredOrders.length === 0" class="empty-state">
      <div class="empty-icon">📦</div>
      <h3>暂无订单</h3>
      <p>快去参与竞拍或购买吧！</p>
      <router-link to="/auctions" class="btn-primary">浏览拍卖</router-link>
    </div>

    <div v-else class="orders-list">
      <div v-for="order in filteredOrders" :key="order.id" class="order-card">
        <div class="order-header">
          <span class="order-number">{{ order.orderNumber }}</span>
          <span class="type-badge" :class="order.type">
            {{ order.type === 'auction' ? '拍卖' : '购买' }}
          </span>
          <span class="status-badge" :class="getStatusBadge(order.status).class">
            {{ getStatusBadge(order.status).text }}
          </span>
        </div>

        <div class="order-body">
          <div class="product-image">
            <span class="placeholder-emoji">🃏</span>
          </div>
          <div class="product-info">
            <div class="product-title">{{ order.productTitle }}</div>
            <div class="product-meta">
              卖家: {{ order.sellerNickname }} | {{ formatDate(order.createdAt) }}
            </div>
          </div>
          <div class="order-amount">
            <div class="amount-label">金额</div>
            <div class="amount-value">{{ formatPrice(order.amount) }}</div>
          </div>
        </div>

        <div class="order-actions">
          <button 
            v-if="order.status === 'pending_paid'" 
            class="btn-pay"
            @click="handlePay(order.id)"
          >
            立即支付
          </button>
          <button 
            v-if="order.status === 'shipped'" 
            class="btn-receive"
            @click="handleReceive(order.id)"
          >
            确认收货
          </button>
          <router-link :to="`/product/${order.id}`" class="btn-detail">
            订单详情
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.orders-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.page-title {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--text-primary);
}

.filter-tabs {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.tab {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--bg-card);
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tab:hover {
  border-color: var(--primary);
}

.tab.active {
  background: var(--primary-gradient);
  border: none;
  color: white;
}

.loading-state {
  text-align: center;
  padding: var(--space-16);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: var(--space-16);
  background: var(--bg-card);
  border: 1px dashed var(--border);
  border-radius: var(--radius-xl);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: var(--space-4);
}

.empty-state h3 {
  font-size: var(--text-lg);
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}

.empty-state p {
  color: var(--text-secondary);
  margin-bottom: var(--space-6);
}

.btn-primary {
  padding: var(--space-3) var(--space-6);
  background: var(--primary-gradient);
  border-radius: var(--radius-lg);
  color: white;
  font-weight: 600;
  text-decoration: none;
  display: inline-block;
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.order-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.order-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border);
}

.order-number {
  font-family: var(--font-num);
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.type-badge {
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
}

.type-badge.auction {
  background: #667eea33;
  color: #667eea;
}

.type-badge.purchase {
  background: #10b98133;
  color: #10b981;
}

.status-badge {
  padding: 2px 10px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 600;
}

.status-badge.pending {
  background: #f59e0b4d;
  color: #f59e0b;
}

.status-badge.paid {
  background: #3b82f64d;
  color: #3b82f6;
}

.status-badge.shipped {
  background: #8b5cf64d;
  color: #8b5cf6;
}

.status-badge.delivered {
  background: #10b9814d;
  color: #10b981;
}

.order-body {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4);
}

.product-image {
  width: 80px;
  height: 80px;
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-emoji {
  font-size: 32px;
}

.product-info {
  flex: 1;
}

.product-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-1);
}

.product-meta {
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.order-amount {
  text-align: right;
}

.amount-label {
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.amount-value {
  font-family: var(--font-num);
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--primary);
}

.order-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-4);
  border-top: 1px solid var(--border);
}

.btn-pay,
.btn-receive,
.btn-detail {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  border: none;
  transition: all var(--transition-fast);
}

.btn-pay {
  background: var(--primary-gradient);
  color: white;
}

.btn-pay:hover {
  opacity: 0.9;
}

.btn-receive {
  background: #10b981;
  color: white;
}

.btn-detail {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.btn-detail:hover {
  background: var(--border);
}
</style>
