<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ordersApi } from '@/api/orders'
import { cartApi } from '@/api/cart'

const { t } = useI18n()

interface Order {
  id: string
  orderNumber: string
  productId: string
  productTitle: string
  productImage?: string
  quantity: number
  unitPrice: number
  fullPrice?: number // 商品全價（預約訂單用於顯示尾款參考）
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
  balanceReceipt?: string
  balanceTime?: string
  notes?: string // 預約時顯示"需到店支付尾款 XXX"
}

const orders = ref<Order[]>([])
const loading = ref(true)
const filterStatus = ref('all')
const processingId = ref<string | null>(null)
const showReceiptModal = ref(false)
const receiptImageUrl = ref('')
const apiBaseUrl = import.meta.env.VITE_API_URL || ''
const resolveImageUrl = (url: string) => {
  if (!url) return '/placeholder-card.png'
  if (url.startsWith('data:') || url.startsWith('http')) return url
  return apiBaseUrl + url
}
const showImageModal = ref(false)
const modalImageUrl = ref('')
const modalImageTitle = ref('')

const filteredOrders = computed(() => {
  if (filterStatus.value === 'all') return orders.value
  return orders.value.filter(o => o.status === filterStatus.value)
})

const loadOrders = async () => {
  loading.value = true
  try {
    const res = await ordersApi.getSellerOrders()
    orders.value = (res.data.data || []).map((o: any) => {
      let images: string[] = []
      try {
        images = typeof o.product?.images === 'string'
          ? JSON.parse(o.product.images)
          : (Array.isArray(o.product?.images) ? o.product.images : [])
      } catch {}
      // 預約訂單：amount = 訂金, fullPrice = 商品全價（顯示為尾款）
      const isReservation = o.type === 'reservation_deposit'
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        productId: o.productId || '',
        productTitle: o.product?.titleZh || o.product?.titleEn || '未知商品',
        productImage: images[0] || '',
        quantity: o.quantity || 1,
        unitPrice: o.product?.price ? Number(o.product.price) : (o.totalPrice ? Number(o.totalPrice) / (o.quantity || 1) : 0),
        fullPrice: isReservation ? Number(o.product?.price) || 0 : undefined,
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
        balanceReceipt: o.balanceReceipt,
        balanceTime: o.balanceTime,
        notes: o.notes || '',
      }
    })
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
    alert('操作失敗')
  }
}

const handleConfirmPayment = async (orderId: string) => {
  if (!confirm('確認已收到付款？')) return
  
  processingId.value = orderId
  try {
    await cartApi.confirmPayment(orderId)
    await loadOrders()
    alert('確認收款成功！')
  } catch (e) {
    console.error('Failed to confirm payment:', e)
    alert('操作失敗，請重試')
  } finally {
    processingId.value = null
  }
}

const handleConfirmDeposit = async (orderId: string) => {
  if (!confirm('確認已收到訂金？確認後請通知買家到店支付尾款。')) return
  processingId.value = orderId
  try {
    // 預約訂單確認訂金：更新 status = confirmed
    await ordersApi.updateStatus(orderId, 'confirmed')
    await loadOrders()
    alert('已確認收到訂金！請通知買家到店支付尾款。')
  } catch (e) {
    console.error('Failed to confirm deposit:', e)
    alert('操作失敗，請重試')
  } finally {
    processingId.value = null
  }
}

const handleConfirmBalance = async (orderId: string) => {
  if (!confirm('確認已收到尾款（到店支付）？')) return
  processingId.value = orderId
  try {
    // 預約訂單確認尾款：更新 status = delivered（完成）
    await ordersApi.updateStatus(orderId, 'delivered')
    await loadOrders()
    alert('已確認收到尾款，交易完成！')
  } catch (e) {
    console.error('Failed to confirm balance:', e)
    alert('操作失敗，請重試')
  } finally {
    processingId.value = null
  }
}

const viewReceipt = (url: string) => {
  receiptImageUrl.value = url
  showReceiptModal.value = true
}

const openImageModal = (url: string | undefined, title: string) => {
  if (!url) return
  modalImageUrl.value = url
  modalImageTitle.value = title
  showImageModal.value = true
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('zh-MO', { style: 'currency', currency: 'MOP', minimumFractionDigits: 0 }).format(price)
}

const formatDate = (dateStr: string) => {
  return dateStr ? new Date(dateStr).toLocaleDateString('zh-CN') : '-'
}

const getStatusBadge = (status: string) => {
  const map: Record<string, { class: string; text: string }> = {
    pending: { class: 'pending', text: '待付款' },
    pending_paid: { class: 'pending-paid', text: '待確認' },
    paid: { class: 'paid', text: '已付款' },
    shipped: { class: 'shipped', text: '已發貨' },
    delivered: { class: 'delivered', text: '已完成' },
    cancelled: { class: 'cancelled', text: '已取消' },
    refunded: { class: 'refunded', text: '已退款' },
    confirmed: { class: 'confirmed', text: '已確認' },
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
      <button :class="{ active: filterStatus === 'pending' }" @click="filterStatus = 'pending'">待付款 ({{ orders.filter(o => o.status === 'pending').length }})</button>
      <button :class="{ active: filterStatus === 'pending_paid' }" @click="filterStatus = 'pending_paid'">待確認 ({{ orders.filter(o => o.status === 'pending_paid').length }})</button>
      <button :class="{ active: filterStatus === 'paid' }" @click="filterStatus = 'paid'">已付款 ({{ orders.filter(o => o.status === 'paid').length }})</button>
      <button :class="{ active: filterStatus === 'confirmed' }" @click="filterStatus = 'confirmed'">已確認 ({{ orders.filter(o => o.status === 'confirmed').length }})</button>
      <button :class="{ active: filterStatus === 'shipped' }" @click="filterStatus = 'shipped'">已發貨 ({{ orders.filter(o => o.status === 'shipped').length }})</button>
      <button :class="{ active: filterStatus === 'delivered' }" @click="filterStatus = 'delivered'">已完成 ({{ orders.filter(o => o.status === 'delivered').length }})</button>
      <button :class="{ active: filterStatus === 'cancelled' }" @click="filterStatus = 'cancelled'">已取消 ({{ orders.filter(o => o.status === 'cancelled').length }})</button>
    </div>

    <div v-if="loading" class="loading-state">載入中...</div>
    <div v-else-if="!filteredOrders.length" class="empty-state">暫無訂單</div>
    <div v-else class="orders-table">
      <table>
        <thead>
          <tr>
            <th>訂單號</th>
            <th>商品</th>
            <th>數量</th>
            <th>單價</th>
            <th>合計</th>
            <th>買家</th>
            <th>狀態</th>
            <th>時間</th>
            <th>轉帳憑證</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in filteredOrders" :key="order.id">
            <td class="order-number">{{ order.orderNumber }}</td>
            <td class="product-cell">
              <div class="product-link" @click="openImageModal(order.productImage, order.productTitle)">
                <div class="product-image">
                  <img v-if="order.productImage" :src="order.productImage" :alt="order.productTitle" />
                  <span v-else class="placeholder-emoji">🃏</span>
                </div>
                <span class="product-name">{{ order.productTitle }}</span>
              </div>
            </td>
            <td class="quantity">x{{ order.quantity }}</td>
            <td class="unit-price">{{ formatPrice(order.unitPrice) }}</td>
            <td class="amount">
              <span v-if="order.type === 'reservation_deposit'" class="deposit-info">
                <span class="deposit-label">訂金</span>
                <span class="deposit-amount">{{ formatPrice(order.amount) }}</span>
                <span v-if="order.fullPrice" class="remaining-info">
                  <span class="remaining-label">+到尾款</span>
                  <span class="remaining-amount">{{ formatPrice(order.fullPrice - order.amount) }}</span>
                </span>
              </span>
              <span v-else>{{ formatPrice(order.amount) }}</span>
            </td>
            <td>
              <div>{{ order.buyerNickname }}</div>
              <div class="buyer-email">{{ order.buyerEmail }}</div>
            </td>
            <td>
              <span class="status-badge" :class="getStatusBadge(order.status).class">
                {{ getStatusBadge(order.status).text }}
              </span>
            </td>
            <td class="date">{{ formatDate(order.createdAt) }}</td>
            <td>
              <div class="receipts-cell">
                <!-- 訂金憑證 -->
                <div v-if="order.transferReceipt" class="receipt-row">
                  <span class="receipt-label">訂金</span>
                  <img
                    :src="resolveImageUrl(order.transferReceipt)"
                    class="receipt-thumbnail"
                    @click="viewReceipt(order.transferReceipt)"
                    alt="訂金憑證"
                  />
                </div>
                <!-- 尾款憑證 -->
                <div v-if="order.balanceReceipt" class="receipt-row">
                  <span class="receipt-label">尾款</span>
                  <img
                    :src="resolveImageUrl(order.balanceReceipt)"
                    class="receipt-thumbnail"
                    @click="viewReceipt(order.balanceReceipt)"
                    alt="尾款憑證"
                  />
                </div>
                <button
                  v-if="order.transferReceipt && (order.status === 'paid' || order.status === 'pending_paid')"
                  class="btn-action confirm"
                  @click="handleConfirmPayment(order.id)"
                  :disabled="processingId === order.id"
                >
                  {{ processingId === order.id ? '處理中...' : '確認收款' }}
                </button>
                <div v-if="!order.transferReceipt && order.status === 'pending_paid'" class="warning-text">
                  ⏳ 等待買家上傳憑證
                </div>
                <div v-if="!order.transferReceipt && order.status === 'paid'" class="warning-text">
                  ⚠️ 待確認
                </div>
              </div>
            </td>
            <td>
              <!-- 預約訂單：待確認訂金 -->
              <span v-if="order.type === 'reservation_deposit' && order.status === 'pending'" class="reservation-status pending">
                ⏳ 待付訂金
              </span>
              <!-- 預約訂單：已收到訂金，待商家確認 -->
              <span v-if="order.type === 'reservation_deposit' && order.status === 'pending_paid'" class="reservation-status">
                <button
                  class="btn-action confirm"
                  @click="handleConfirmDeposit(order.id)"
                  :disabled="processingId === order.id"
                >
                  {{ processingId === order.id ? '處理中...' : '確認收到訂金' }}
                </button>
              </span>
              <!-- 預約訂單：已確認訂金，待到店付尾款 -->
              <span v-if="order.type === 'reservation_deposit' && order.status === 'confirmed'" class="reservation-status">
                <span class="badge-reservation">📅 預約</span>
                <span class="badge-remaining">待到店付尾款 {{ formatPrice((order.fullPrice || 0) - order.amount) }}</span>
                <button
                  class="btn-action confirm"
                  @click="handleConfirmBalance(order.id)"
                  :disabled="processingId === order.id"
                >
                  {{ processingId === order.id ? '處理中...' : '確認收到尾款' }}
                </button>
              </span>
              <!-- 預約訂單：尾款已付（線下到店完成） -->
              <span v-if="order.type === 'reservation_deposit' && order.status === 'delivered'" class="reservation-status completed">
                ✅ 已完成
              </span>
              <!-- 普通訂單操作 -->
              <span v-if="order.type !== 'reservation_deposit'">
                <button
                  v-if="order.status === 'pending_paid'"
                  class="btn-warning"
                  @click="handleUpdateStatus(order.id, 'cancelled')"
                >
                  取消
                </button>
                <div v-if="order.status === 'pending_paid'" class="warning-text">
                  ⚠️ 買家未付款
                </div>
                <button
                  v-if="order.status === 'confirmed'"
                  @click="handleUpdateStatus(order.id, 'shipped')"
                  class="btn-action ship"
                >
                  發貨
                </button>
              </span>
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
        <h3>轉帳憑證</h3>
        <button @click="showReceiptModal = false" class="modal-close">✕</button>
      </div>
      <div class="modal-body">
        <img :src="resolveImageUrl(receiptImageUrl)" alt="轉帳憑證" class="receipt-image" />
      </div>
    </div>
  </div>

  <!-- Product Image Modal -->
  <div v-if="showImageModal" class="modal-overlay" @click.self="showImageModal = false">
    <div class="image-modal">
      <div class="modal-header">
        <h3>{{ modalImageTitle }}</h3>
        <button @click="showImageModal = false" class="modal-close">✕</button>
      </div>
      <div class="modal-body">
        <img :src="modalImageUrl" :alt="modalImageTitle" class="full-image" />
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
.product-cell { display: flex; align-items: center; gap: var(--space-3); }
.product-link { display: flex; flex-direction: column; align-items: center; gap: var(--space-1); text-decoration: none; color: inherit; cursor: pointer; }
.product-link:hover .product-name { color: var(--primary); text-decoration: underline; }
.product-image { width: 56px; height: 56px; border-radius: var(--radius-md); overflow: hidden; background: var(--bg-elevated); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.product-image img { width: 100%; height: 100%; object-fit: cover; }
.placeholder-emoji { font-size: 28px; }
.product-name { max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: var(--text-xs); text-align: center; width: 100%; transition: color 0.2s; }
.quantity { font-family: var(--font-num); font-size: var(--text-sm); color: var(--text-secondary); }
.unit-price { font-family: var(--font-num); font-size: var(--text-sm); color: var(--text-secondary); }
.buyer-email { font-size: var(--text-xs); color: var(--text-muted); }
.amount { font-family: var(--font-num); font-weight: 600; color: var(--primary); }
.date { font-size: var(--text-xs); color: var(--text-muted); }
.status-badge { padding: 2px 8px; border-radius: var(--radius-full); font-size: var(--text-xs); font-weight: 500; }
.status-badge.pending-paid { background: #f59e0b33; color: #f59e0b; }
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
.receipt-cell { display: flex; flex-direction: column; align-items: center; gap: var(--space-2); }
.receipt-thumbnail { width: 40px; height: 40px; border-radius: var(--radius-md); object-fit: cover; cursor: pointer; border: 2px solid var(--border); transition: border-color var(--transition-fast); }
.receipt-thumbnail:hover { border-color: var(--primary); }
.receipts-cell { display: flex; flex-direction: column; gap: var(--space-2); align-items: flex-start; }
.receipt-row { display: flex; align-items: center; gap: var(--space-2); }
.receipt-label { font-size: var(--text-xs); color: var(--text-muted); min-width: 24px; }
.deposit-info { display: flex; flex-direction: column; gap: 2px; font-size: var(--text-xs); }
.deposit-label { color: var(--text-muted); font-size: 10px; }
.deposit-amount { color: var(--primary); font-weight: 600; }
.remaining-info { display: flex; gap: 4px; align-items: center; }
.remaining-label { color: var(--text-muted); font-size: 10px; }
.remaining-amount { color: #f59e0b; font-weight: 600; }
.reservation-status { display: flex; flex-direction: column; gap: var(--space-1); }
.reservation-status.pending { color: var(--text-muted); font-size: var(--text-xs); }
.reservation-status.completed { color: #10b981; font-weight: 600; }
.badge-reservation { background: #f59e0b22; color: #f59e0b; padding: 2px 6px; border-radius: var(--radius-full); font-size: var(--text-xs); width: fit-content; }
.badge-remaining { color: #f59e0b; font-size: var(--text-xs); font-weight: 500; }

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

.image-modal {
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  max-width: 800px;
  width: 90%;
  max-height: 90vh;
  overflow: hidden;
}

.image-modal .modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4);
  border-bottom: 1px solid var(--border);
}

.image-modal .modal-header h3 {
  font-size: var(--text-lg);
  font-weight: 600;
}

.image-modal .modal-body {
  padding: var(--space-4);
  overflow-y: auto;
  max-height: calc(90vh - 60px);
}

.full-image {
  width: 100%;
  height: auto;
  display: block;
  border-radius: var(--radius-md);
}
</style>
