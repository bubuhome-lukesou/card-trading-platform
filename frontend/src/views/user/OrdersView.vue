<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ordersApi } from '@/api/orders'
import { useRouter } from 'vue-router'

const { t } = useI18n()
const router = useRouter()

interface Order {
  id: string
  orderNumber: string
  productTitle: string
  productImage?: string
  sellerNickname: string
  amount: number
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
  type: 'direct_purchase' | 'buy_now' | 'auction_win'
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
    pending: { class: 'pending', text: '待付款' },
    paid: { class: 'paid', text: '已付款' },
    shipped: { class: 'shipped', text: '已发货' },
    delivered: { class: 'delivered', text: '已完成' },
    cancelled: { class: 'cancelled', text: '已取消' },
    refunded: { class: 'refunded', text: '已退款' },
  }
  return map[status] || { class: 'default', text: status }
}

const getTypeText = (type: string) => {
  const map: Record<string, string> = {
    direct_purchase: '直购',
    buy_now: '立即购买',
    auction_win: '拍卖赢取',
  }
  return map[type] || type
}

const loadOrders = async () => {
  loading.value = true
  try {
    const res = await ordersApi.getMyOrders()
    const list = Array.isArray(res.data) ? res.data : (res.data?.data || [])
    orders.value = list.map((o: any) => {
      // Parse product images (stored as JSON string)
      let images: string[] = []
      try {
        images = typeof o.product?.images === 'string'
          ? JSON.parse(o.product.images)
          : (Array.isArray(o.product?.images) ? o.product.images : [])
      } catch {}
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        productTitle: o.product?.titleZh || o.product?.titleEn || '未知商品',
        productImage: images[0] || '',
        sellerNickname: o.seller?.nickname || o.seller?.username || (o.sellerId ? `卖家${o.sellerId.slice(0,8)}` : '未知卖家'),
        amount: Number(o.totalPrice) || 0,
        status: o.status,
        type: o.type,
        createdAt: o.createdAt,
      }
    })
  } catch (error) {
    console.error('Failed to load orders:', error)
    orders.value = []
  } finally {
    loading.value = false
  }
}

const handlePay = async (orderId: string) => {
  try {
    await ordersApi.updateStatus(orderId, 'paid')
    await loadOrders()
  } catch (error) {
    console.error('Payment failed:', error)
    alert('支付失败，请重试')
  }
}

const handleReceive = async (orderId: string) => {
  try {
    await ordersApi.updateStatus(orderId, 'delivered')
    await loadOrders()
  } catch (error) {
    console.error('Confirm failed:', error)
    alert('操作失败，请重试')
  }
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
        :class="{ active: filterStatus === 'pending' }"
        @click="filterStatus = 'pending'"
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
            {{ getTypeText(order.type) }}
          </span>
          <span class="status-badge" :class="getStatusBadge(order.status).class">
            {{ getStatusBadge(order.status).text }}
          </span>
        </div>

        <div class="order-body">
          <div class="product-image">
            <img v-if="order.productImage" :src="order.productImage" :alt="order.productTitle" />
            <span v-else class="placeholder-emoji">🃏</span>
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
            v-if="order.status === 'pending'" 
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

.type-badge.direct_purchase {
  background: #10b98133;
  color: #10b981;
}

.type-badge.buy_now {
  background: #f59e0b33;
  color: #f59e0b;
}

.type-badge.auction_win {
  background: #667eea33;
  color: #667eea;
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
  overflow: hidden;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
