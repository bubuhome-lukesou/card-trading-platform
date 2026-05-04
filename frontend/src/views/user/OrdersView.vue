<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ordersApi } from '@/api/orders'
import { cartApi } from '@/api/cart'
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
  quantity: number
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded' | 'pending_paid' | 'confirmed'
  type: 'direct_purchase' | 'buy_now' | 'auction_win'
  createdAt: string
  transferReceipt?: string
  transferTime?: string
}

const orders = ref<Order[]>([])
const loading = ref(true)
const filterStatus = ref('all')
const uploadingReceipt = ref<string | null>(null)
const showReceiptModal = ref(false)
const receiptImageUrl = ref('')
const apiBaseUrl = import.meta.env.VITE_API_URL || ''
const resolveImageUrl = (url: string) => {
  if (!url) return '/placeholder-card.png'
  if (url.startsWith('data:') || url.startsWith('http')) return url
  return apiBaseUrl + url
}

const filteredOrders = computed(() => {
  if (filterStatus.value === 'all') return orders.value
  return orders.value.filter(o => o.status === filterStatus.value)
})

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('zh-MO', {
    style: 'currency',
    currency: 'MOP',
    minimumFractionDigits: 0,
  }).format(price)
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

const getStatusBadge = (status: string) => {
  const map: Record<string, { class: string; text: string }> = {
    pending: { class: 'pending', text: '待付款' },
    pending_paid: { class: 'pending-paid', text: '待確認' },
    paid: { class: 'paid', text: '已付款' },
    confirmed: { class: 'confirmed', text: '已確認' },
    shipped: { class: 'shipped', text: '已發貨' },
    delivered: { class: 'delivered', text: '已完成' },
    cancelled: { class: 'cancelled', text: '已取消' },
    refunded: { class: 'refunded', text: '已退款' },
  }
  return map[status] || { class: 'default', text: status }
}

const getTypeText = (type: string) => {
  const map: Record<string, string> = {
    direct_purchase: '直購',
    buy_now: '立即購買',
    auction_win: '拍賣贏取',
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
        sellerNickname: o.seller?.nickname || o.seller?.username || (o.sellerId ? `賣家${o.sellerId.slice(0,8)}` : '未知賣家'),
        amount: Number(o.totalPrice) || 0,
        status: o.status,
        type: o.type,
        createdAt: o.createdAt,
        transferReceipt: o.transferReceipt,
        transferTime: o.transferTime,
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
    alert('支付失敗，請重試')
  }
}

const handleReceive = async (orderId: string) => {
  try {
    await ordersApi.updateStatus(orderId, 'delivered')
    await loadOrders()
  } catch (error) {
    console.error('Confirm failed:', error)
    alert('操作失敗，請重試')
  }
}

const handleReserve = async (orderId: string) => {
  try {
    // 預約拿貨 — 改為 pending_paid 狀態，等待商家確認
    await ordersApi.updateStatus(orderId, 'pending_paid')
    await loadOrders()
    alert('預約拿貨成功！')
  } catch (error) {
    console.error('Reserve failed:', error)
    alert('操作失敗，請重試')
  }
}

const handleUploadReceipt = async (orderId: string, file: File) => {
  uploadingReceipt.value = orderId
  try {
    await cartApi.uploadTransferReceipt(orderId, file)
    alert('上傳成功！')
    await loadOrders()
  } catch (error) {
    console.error('Upload failed:', error)
    alert('上傳失敗，請重試')
  } finally {
    uploadingReceipt.value = null
  }
}

const triggerReceiptUpload = (orderId: string) => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = (e: Event) => {
    const target = e.target as HTMLInputElement
    if (target.files?.[0]) {
      handleUploadReceipt(orderId, target.files[0])
    }
  }
  input.click()
}

const viewReceipt = (url: string) => {
  receiptImageUrl.value = url
  showReceiptModal.value = true
}

onMounted(() => {
  loadOrders()
})
</script>

<template>
  <div class="orders-page">
    <h1 class="page-title">我的訂單</h1>

    <!-- Filter Tabs -->
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
        :class="{ active: filterStatus === 'pending' }"
        @click="filterStatus = 'pending'"
      >
        待付款 ({{ orders.filter(o => o.status === 'pending').length }})
      </button>
      <button 
        class="tab" 
        :class="{ active: filterStatus === 'pending_paid' }"
        @click="filterStatus = 'pending_paid'"
      >
        待確認 ({{ orders.filter(o => o.status === 'pending_paid').length }})
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
        :class="{ active: filterStatus === 'confirmed' }"
        @click="filterStatus = 'confirmed'"
      >
        已確認 ({{ orders.filter(o => o.status === 'confirmed').length }})
      </button>
      <button 
        class="tab" 
        :class="{ active: filterStatus === 'shipped' }"
        @click="filterStatus = 'shipped'"
      >
        已發貨 ({{ orders.filter(o => o.status === 'shipped').length }})
      </button>
      <button 
        class="tab" 
        :class="{ active: filterStatus === 'delivered' }"
        @click="filterStatus = 'delivered'"
      >
        已完成 ({{ orders.filter(o => o.status === 'delivered').length }})
      </button>
      <button 
        class="tab" 
        :class="{ active: filterStatus === 'cancelled' }"
        @click="filterStatus = 'cancelled'"
      >
        已取消 ({{ orders.filter(o => o.status === 'cancelled').length }})
      </button>
      <button 
        class="tab" 
        :class="{ active: filterStatus === 'refunded' }"
        @click="filterStatus = 'refunded'"
      >
        已退款 ({{ orders.filter(o => o.status === 'refunded').length }})
      </button>
    </div>

    <!-- Orders List -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <div v-else-if="filteredOrders.length === 0" class="empty-state">
      <div class="empty-icon">📦</div>
      <h3>暫無訂單</h3>
      <p>快去參與競拍或購買吧！</p>
      <router-link to="/auctions" class="btn-primary">瀏覽拍賣</router-link>
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
              賣家: {{ order.sellerNickname }} | {{ formatDate(order.createdAt) }}
            </div>
          </div>
          <div class="order-amount">
            <div class="amount-label">金額</div>
            <div class="amount-value">{{ formatPrice(order.amount) }}</div>
          </div>
        </div>

        <div class="order-actions">
          <button
            v-if="order.status === 'pending'"
            class="btn-pay"
            @click="handlePay(order.id)"
            disabled
          >
            立即支付
          </button>
          <button
            v-if="order.status === 'pending'"
            class="btn-reserve"
            @click="handleReserve(order.id)"
          >
            預約拿貨
          </button>
          <button
            v-if="order.status === 'pending' || order.status === 'pending_paid'"
            class="btn-upload"
            @click="triggerReceiptUpload(order.id)"
            :disabled="uploadingReceipt === order.id"
          >
            {{ uploadingReceipt === order.id ? '上傳中...' : '上傳轉帳憑證' }}
          </button>
          <img 
            v-if="order.transferReceipt" 
            :src="resolveImageUrl(order.transferReceipt)" 
            class="receipt-thumbnail"
            @click="viewReceipt(order.transferReceipt)"
            alt="轉帳憑證"
          />
          <button 
            v-if="order.status === 'shipped'" 
            class="btn-receive"
            @click="handleReceive(order.id)"
          >
            確認收貨
          </button>
          <router-link :to="`/product/${order.id}`" class="btn-detail">
            訂單詳情
          </router-link>
        </div>
      </div>
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

.status-badge.pending-paid {
  background: #f59e0b4d;
  color: #f59e0b;
}

.status-badge.confirmed {
  background: #10b9814d;
  color: #10b981;
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

.btn-pay:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--bg-elevated);
  color: var(--text-muted);
}

.btn-reserve {
  background: #8b5cf6;
  color: white;
}

.btn-reserve:hover {
  background: #7c3aed;
}

.btn-upload {
  background: #f59e0b;
  color: white;
}

.btn-upload:hover:not(:disabled) {
  background: #d97706;
}

.btn-upload:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.receipt-thumbnail {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  object-fit: cover;
  cursor: pointer;
  border: 2px solid var(--border);
}

.receipt-thumbnail:hover {
  border-color: var(--primary);
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
