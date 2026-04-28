<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ordersApi } from '@/api/orders'
import { cartApi } from '@/api/cart'

const { t } = useI18n()

interface Order {
  id: string
  orderNumber: string
  productTitle: string
  buyerNickname: string
  buyerEmail: string
  amount: number
  status: string
  type: string
  createdAt: string
  paidAt?: string
  shippedAt?: string
  trackingNumber?: string
  transferReceipt?: string
  transferTime?: string
}

const orders = ref<Order[]>([])
const loading = ref(true)
const filterStatus = ref('all')
const processingId = ref<string | null>(null)
const showReceiptModal = ref(false)
const receiptImageUrl = ref('')

const filteredOrders = computed(() => {
  if (filterStatus.value === 'all') return orders.value
  return orders.value.filter(o => o.status === filterStatus.value)
})

const loadOrders = async () => {
  loading.value = true
  try {
    const res = await ordersApi.getSellerOrders()
    orders.value = (res.data.data || []).map((o: any) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      productTitle: o.product?.title || '-',
      buyerNickname: o.buyer?.nickname || '-',
      buyerEmail: o.buyer?.email || '-',
      amount: o.totalPrice || 0,
      status: o.status,
      type: o.type,
      createdAt: o.createdAt,
      paidAt: o.paidAt,
      shippedAt: o.shippedAt,
      trackingNumber: o.trackingNumber,
      transferReceipt: o.transferReceipt,
      transferTime: o.transferTime,
    }))
  } catch (e) {
    console.error('Failed to load orders', e)
    orders.value = []
  } finally {
    loading.value = false
  }
}

const handleUpdateStatus = async (id: string, newStatus: string) => {
  try {
    await ordersApi.updateStatus(id, newStatus)
    await loadOrders()
  } catch (e) {
    alert('操作失败')
  }
}

const handleConfirmPayment = async (orderId: string) => {
  if (!confirm('确认已收到付款？')) return
  
  processingId.value = orderId
  try {
    await cartApi.confirmPayment(orderId)
    await loadOrders()
    alert('确认收款成功！')
  } catch (e) {
    console.error('Failed to confirm payment:', e)
    alert('操作失败，请重试')
  } finally {
    processingId.value = null
  }
}

const viewReceipt = (url: string) => {
  receiptImageUrl.value = url
  showReceiptModal.value = true
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('zh-HK', { style: 'currency', currency: 'HKD', minimumFractionDigits: 0 }).format(price)
}

const formatDate = (dateStr: string) => {
  return dateStr ? new Date(dateStr).toLocaleDateString('zh-CN') : '-'
}

const getStatusBadge = (status: string) => {
  const map: Record<string, { class: string; text: string }> = {
    pending_paid: { class: 'pending', text: '待付款' },
    paid: { class: 'paid', text: '已付款' },
    shipped: { class: 'shipped', text: '已发货' },
    delivered: { class: 'delivered', text: '已完成' },
    cancelled: { class: 'cancelled', text: '已取消' },
    refunded: { class: 'refunded', text: '已退款' },
    confirmed: { class: 'confirmed', text: '已确认' },
  }
  return map[status] || { class: 'default', text: status }
}

onMounted(() => loadOrders())
</script>

<template>
  <div class="orders-management">
    <!-- Tabs -->
    <div class="tabs">
      <button :class="{ active: filterStatus === 'all' }" @click="filterStatus = 'all'">全部 ({{ orders.length }})</button>
      <button :class="{ active: filterStatus === 'pending_paid' }" @click="filterStatus = 'pending_paid'">待付款 ({{ orders.filter(o => o.status === 'pending_paid').length }})</button>
      <button :class="{ active: filterStatus === 'paid' }" @click="filterStatus = 'paid'">已付款 ({{ orders.filter(o => o.status === 'paid').length }})</button>
      <button :class="{ active: filterStatus === 'shipped' }" @click="filterStatus = 'shipped'">已发货 ({{ orders.filter(o => o.status === 'shipped').length }})</button>
      <button :class="{ active: filterStatus === 'delivered' }" @click="filterStatus = 'delivered'">已完成 ({{ orders.filter(o => o.status === 'delivered').length }})</button>
    </div>

    <div v-if="loading" class="loading-state">加载中...</div>
    <div v-else-if="!filteredOrders.length" class="empty-state">暂无订单</div>
    <div v-else class="orders-table">
      <table>
        <thead>
          <tr>
            <th>订单号</th>
            <th>商品</th>
            <th>买家</th>
            <th>金额</th>
            <th>状态</th>
            <th>时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in filteredOrders" :key="order.id">
            <td class="order-number">{{ order.orderNumber }}</td>
            <td class="product-title">{{ order.productTitle }}</td>
            <td>
              <div>{{ order.buyerNickname }}</div>
              <div class="buyer-email">{{ order.buyerEmail }}</div>
            </td>
            <td class="amount">{{ formatPrice(order.amount) }}</td>
            <td>
              <span class="status-badge" :class="getStatusBadge(order.status).class">
                {{ getStatusBadge(order.status).text }}
              </span>
            </td>
            <td class="date">{{ formatDate(order.createdAt) }}</td>
            <td>
              <button
                v-if="order.status === 'pending_paid'"
                class="btn-warning"
                @click="handleUpdateStatus(order.id, 'cancelled')"
              >
                取消
              </button>
              <div v-if="order.status === 'pending_paid'" class="warning-text">
                ⚠️ 买家未付款
              </div>
              <template v-if="order.status === 'paid'">
                <img 
                  v-if="order.transferReceipt" 
                  :src="order.transferReceipt" 
                  class="receipt-thumbnail"
                  @click="viewReceipt(order.transferReceipt)"
                  alt="转账凭证"
                />
                <button
                  v-if="order.transferReceipt"
                  class="btn-action confirm"
                  @click="handleConfirmPayment(order.id)"
                  :disabled="processingId === order.id"
                >
                  {{ processingId === order.id ? '处理中...' : '确认收款' }}
                </button>
                <div v-else class="warning-text">
                  ⏳ 等待买家上传凭证
                </div>
              </template>
              <button
                v-if="order.status === 'confirmed'"
                @click="handleUpdateStatus(order.id, 'shipped')"
                class="btn-action ship"
              >
                发货
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Receipt Modal -->
  <div v-if="showReceiptModal" class="modal-overlay" @click.self="showReceiptModal = false">
    <div class="receipt-modal">
      <div class="modal-header">
        <h3>转账凭证</h3>
        <button @click="showReceiptModal = false" class="modal-close">✕</button>
      </div>
      <div class="modal-body">
        <img :src="receiptImageUrl" alt="转账凭证" class="receipt-image" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.orders-management { display: flex; flex-direction: column; gap: var(--space-4); }
.tabs { display: flex; gap: var(--space-2); flex-wrap: wrap; }
.tabs button {
  padding: var(--space-2) var(--space-4); background: var(--bg-card); border: 1px solid var(--border);
  border-radius: var(--radius-lg); color: var(--text-secondary); cursor: pointer; font-size: var(--text-sm); transition: all 0.2s;
}
.tabs button.active { background: var(--primary-gradient); color: white; border-color: transparent; }
.orders-table, .empty-state, .loading-state {
  background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-xl);
}
.empty-state, .loading-state { text-align: center; padding: var(--space-12); color: var(--text-muted); }
table { width: 100%; border-collapse: collapse; }
th, td { padding: var(--space-4); text-align: left; border-bottom: 1px solid var(--border); }
th { font-size: var(--text-xs); font-weight: 500; color: var(--text-secondary); background: var(--bg-elevated); }
td { font-size: var(--text-sm); color: var(--text-primary); }
tr:last-child td { border-bottom: none; }
.order-number { font-family: var(--font-num); font-size: var(--text-xs); color: var(--text-muted); }
.product-title { max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.buyer-email { font-size: var(--text-xs); color: var(--text-muted); }
.amount { font-family: var(--font-num); font-weight: 600; color: var(--primary); }
.date { font-size: var(--text-xs); color: var(--text-muted); }
.status-badge { padding: 2px 8px; border-radius: var(--radius-full); font-size: var(--text-xs); font-weight: 500; }
.status-badge.pending { background: #f59e0b33; color: #f59e0b; }
.status-badge.paid { background: #3b82f633; color: #3b82f6; }
.status-badge.shipped { background: #8b5cf633; color: #8b5cf6; }
.status-badge.delivered { background: #10b98133; color: #10b981; }
.status-badge.cancelled, .status-badge.refunded { background: #ef444433; color: #ef4444; }
.status-badge.confirmed { background: #10b98133; color: #10b981; }
.btn-action { padding: var(--space-1) var(--space-3); border-radius: var(--radius-md); font-size: var(--text-xs); border: none; cursor: pointer; }
.btn-action.ship { background: #10b981; color: white; }
.btn-action.cancel { background: #ef444433; color: #ef4444; }
.btn-action.confirm { background: #10b981; color: white; margin-top: var(--space-2); }
.btn-warning { background: #ef444433; color: #ef4444; padding: var(--space-1) var(--space-3); border-radius: var(--radius-md); font-size: var(--text-xs); border: none; cursor: pointer; }
.warning-text { font-size: var(--text-xs); color: var(--text-muted); margin-top: var(--space-2); }
.receipt-thumbnail { width: 40px; height: 40px; border-radius: var(--radius-md); object-fit: cover; cursor: pointer; border: 2px solid var(--border); display: block; margin-bottom: var(--space-2); }
.receipt-thumbnail:hover { border-color: var(--primary); }

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.receipt-modal {
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow: hidden;
}

.receipt-modal .modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4);
  border-bottom: 1px solid var(--border);
}

.receipt-modal .modal-header h3 {
  font-size: var(--text-lg);
  font-weight: 600;
}

.modal-close {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  border: none;
  background: var(--bg-elevated);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.receipt-image {
  width: 100%;
  height: auto;
  display: block;
}
</style>
