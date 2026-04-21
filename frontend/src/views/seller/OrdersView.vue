<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

interface Order {
  id: string
  orderNumber: string
  productTitle: string
  buyerNickname: string
  buyerEmail: string
  amount: number
  status: 'pending_paid' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
  type: 'purchase' | 'auction'
  createdAt: string
  paidAt?: string
  shippedAt?: string
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
      {
        id: '1',
        orderNumber: 'ORD-2026-001',
        productTitle: 'Pokemon 1st Edition Base Set',
        buyerNickname: 'Collector_001',
        buyerEmail: 'collector@email.com',
        amount: 12800,
        status: 'paid',
        type: 'auction',
        createdAt: '2026-04-21',
        paidAt: '2026-04-21',
      },
      {
        id: '2',
        orderNumber: 'ORD-2026-002',
        productTitle: 'Yu-Gi-Oh Blue-Eyes White Dragon',
        buyerNickname: 'DragonMaster',
        buyerEmail: 'dragon@email.com',
        amount: 6800,
        status: 'shipped',
        type: 'auction',
        createdAt: '2026-04-20',
        paidAt: '2026-04-20',
        shippedAt: '2026-04-21',
      },
      {
        id: '3',
        orderNumber: 'ORD-2026-003',
        productTitle: 'MTG Black Lotus',
        buyerNickname: 'MagicPlayer',
        buyerEmail: 'magic@email.com',
        amount: 25000,
        status: 'pending_paid',
        type: 'auction',
        createdAt: '2026-04-19',
      },
      {
        id: '4',
        orderNumber: 'ORD-2026-004',
        productTitle: 'Doraemon Figure Collection',
        buyerNickname: 'DoraFan',
        buyerEmail: 'dora@email.com',
        amount: 1800,
        status: 'delivered',
        type: 'purchase',
        createdAt: '2026-04-15',
        paidAt: '2026-04-15',
        shippedAt: '2026-04-16',
      },
    ]
  } catch (error) {
    console.error('Failed to load orders:', error)
  } finally {
    loading.value = false
  }
}

const handleMarkShipped = async (orderId: string) => {
  // TODO: Call API
  await new Promise(resolve => setTimeout(resolve, 500))
  loadOrders()
}

onMounted(() => {
  loadOrders()
})
</script>

<template>
  <div class="orders-management">
    <!-- Header -->
    <div class="section-header">
      <div class="filter-tabs">
        <button 
          class="tab" 
          :class="{ active: filterStatus === 'all' }"
          @click="filterStatus = 'all'"
        >
          全部 ({{ orders.length }})
        </button>
        <button 
          class="tab" 
          :class="{ active: filterStatus === 'pending_paid' }"
          @click="filterStatus = 'pending_paid'"
        >
          待付款 ({{ orders.filter(o => o.status === 'pending_paid').length }})
        </button>
        <button 
          class="tab" 
          :class="{ active: filterStatus === 'paid' }"
          @click="filterStatus = 'paid'"
        >
          已付款 ({{ orders.filter(o => o.status === 'paid').length }})
        </button>
        <button 
          class="tab" 
          :class="{ active: filterStatus === 'shipped' }"
          @click="filterStatus = 'shipped'"
        >
          已发货 ({{ orders.filter(o => o.status === 'shipped').length }})
        </button>
      </div>
    </div>

    <!-- Orders Table -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <div v-else class="orders-table">
      <table>
        <thead>
          <tr>
            <th>订单号</th>
            <th>商品</th>
            <th>买家</th>
            <th>金额</th>
            <th>类型</th>
            <th>状态</th>
            <th>日期</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in filteredOrders" :key="order.id">
            <td class="order-number">{{ order.orderNumber }}</td>
            <td class="product-title">{{ order.productTitle }}</td>
            <td>
              <div class="buyer-info">
                <span>{{ order.buyerNickname }}</span>
                <span class="buyer-email">{{ order.buyerEmail }}</span>
              </div>
            </td>
            <td class="amount">{{ formatPrice(order.amount) }}</td>
            <td>
              <span class="type-badge" :class="order.type">
                {{ order.type === 'auction' ? '拍卖' : '购买' }}
              </span>
            </td>
            <td>
              <span class="status-badge" :class="getStatusBadge(order.status).class">
                {{ getStatusBadge(order.status).text }}
              </span>
            </td>
            <td>{{ formatDate(order.createdAt) }}</td>
            <td>
              <button 
                v-if="order.status === 'paid'"
                class="btn-action"
                @click="handleMarkShipped(order.id)"
              >
                确认发货
              </button>
              <span v-else-if="order.status === 'shipped' || order.status === 'delivered'" class="action-done">
                已处理
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.orders-management {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-tabs {
  display: flex;
  gap: var(--space-2);
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
  color: var(--text-secondary);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto var(--space-4);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.orders-table {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: var(--space-4);
  text-align: left;
  border-bottom: 1px solid var(--border);
}

th {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--bg-elevated);
}

td {
  font-size: var(--text-sm);
  color: var(--text-primary);
}

tr:last-child td {
  border-bottom: none;
}

.order-number {
  font-family: var(--font-num);
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.product-title {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.buyer-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.buyer-email {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.amount {
  font-family: var(--font-num);
  font-weight: 700;
  color: var(--primary);
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

.status-badge.cancelled {
  background: #ef44444d;
  color: #ef4444;
}

.status-badge.refunded {
  background: #6b72804d;
  color: #6b7280;
}

.btn-action {
  padding: var(--space-2) var(--space-3);
  background: var(--primary-gradient);
  border: none;
  border-radius: var(--radius-md);
  color: white;
  font-size: var(--text-xs);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-action:hover {
  opacity: 0.9;
}

.action-done {
  font-size: var(--text-xs);
  color: var(--text-muted);
}
</style>
