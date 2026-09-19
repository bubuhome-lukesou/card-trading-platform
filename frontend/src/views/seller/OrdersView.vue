<script setup lang="ts">
import { formatPrice, formatDate, formatDateTime } from '@/utils/format'
import StateView from '@/components/common/StateView.vue'
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ordersApi } from '@/api/orders'
import { cartApi } from '@/api/cart'
import { productApi } from '@/api/products'

const route = useRoute()

interface Order {
  id: string
  productIdKey: string
  productTitle: string
  productImage?: string
  quantity: number
  unitPrice: number
  fullPrice?: number
  buyerNickname: string
  buyerEmail: string
  amount: number
  status: string
  type: string
  createdAt: string
  transferReceipt?: string
  transferTime?: string
  balanceReceipt?: string
  balanceTime?: string
  shippingAddress?: string
  trackingNumber?: string
  paymentTime?: string
  shippingTime?: string
  deliveryTime?: string
  notes?: string
}

const orders = ref<Order[]>([])
const loading = ref(true)
const filterProductId = ref('') // 從商品列表「完整訂單頁」跳入時按商品篩選
const processingId = ref<string | null>(null)
const showReceiptModal = ref(false)
const receiptImageUrl = ref('')
const apiBaseUrl = import.meta.env.VITE_API_URL || ''
const resolveImageUrl = (url: string) => {
  if (!url) return '/placeholder-card.png'
  if (url.startsWith('data:') || url.startsWith('http')) return url
  return apiBaseUrl + url
}

// productId → 商品名對照（訂單 0 筆也能顯示商品名）
const filterProductMap = ref<Record<string, string>>({})

// ===== 狀態 tabs =====
type TabKey = typeof ALL_TABS[number]
const ALL_TABS = ['all', 'pending', 'pending_paid', 'paid', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const
const filterStatus = ref<string>('all')

// tab 定義：全部／待處理（聚合）／各狀態
const TAB_DEFS: { key: string; label: string }[] = [
  { key: 'todo', label: '待處理' },
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待付款' },
  { key: 'pending_paid', label: '待確認' },
  { key: 'confirmed', label: '待發貨' },
  { key: 'shipped', label: '已發貨' },
  { key: 'delivered', label: '已完成' },
  { key: 'cancelled', label: '已取消' },
]
const TAB_STATUSES: Record<string, string[]> = {
  todo: ['pending', 'pending_paid', 'paid', 'confirmed'],
  all: [],
  pending: ['pending'],
  pending_paid: ['pending_paid'],
  confirmed: ['confirmed'],
  shipped: ['shipped'],
  delivered: ['delivered'],
  cancelled: ['cancelled'],
}

const todoCount = computed(() =>
  orders.value.filter(o => TAB_STATUSES.todo.includes(o.status)).length
)

const tabCount = (key: string): number => {
  if (key === 'todo') return todoCount.value
  const sts = TAB_STATUSES[key]
  if (!sts || !sts.length) return orders.value.length
  return orders.value.filter(o => sts.includes(o.status)).length
}

// ===== 搜尋 / 排序 / 分頁 =====
const PAGE_SIZE = 20
const searchQuery = ref('')
const currentPage = ref(1)
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('desc')

const sortableColumns = [
  { key: 'productTitle', label: '商品', type: 'text' },
  { key: 'buyerNickname', label: '買家', type: 'text' },
  { key: 'amount', label: '金額', type: 'number' },
  { key: 'status', label: '狀態', type: 'text' },
  { key: 'createdAt', label: '時間', type: 'time' },
] as const

const toggleSort = (key: string) => {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
  currentPage.value = 1
}

// 數字/時間按數值；文字按 UTF-16 二進碼序（與商品列表一致）
const compareOrders = (a: Order, b: Order, col: { key: string; type: string }): number => {
  let cmp = 0
  if (col.type === 'number' || col.type === 'time') {
    cmp =
      (Number(col.type === 'time' ? new Date(a.createdAt).getTime() : (a as any)[col.key]) || 0) -
      (Number(col.type === 'time' ? new Date(b.createdAt).getTime() : (b as any)[col.key]) || 0)
  } else {
    const as = String((a as any)[col.key] ?? '')
    const bs = String((b as any)[col.key] ?? '')
    cmp = as < bs ? -1 : as > bs ? 1 : 0
  }
  return sortDir.value === 'asc' ? cmp : -cmp
}

// ===== 過濾：商品 → 狀態 → 搜尋 =====
const filteredOrders = computed(() => {
  let result = orders.value
  if (filterProductId.value) {
    result = result.filter(o => o.productIdKey === filterProductId.value)
  }
  const sts = TAB_STATUSES[filterStatus.value]
  if (sts && sts.length) {
    result = result.filter(o => sts.includes(o.status))
  }
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    result = result.filter(o =>
      o.productTitle.toLowerCase().includes(q) ||
      o.buyerNickname.toLowerCase().includes(q) ||
      o.buyerEmail.toLowerCase().includes(q)
    )
  }
  // 預設排序：待處理優先 → 最新在前
  if (!sortKey.value) {
    const todoIdx = (s: string) => (TAB_STATUSES.todo.includes(s) ? 0 : 1)
    return [...result].sort(
      (a, b) =>
        todoIdx(a.status) - todoIdx(b.status) ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }
  const col = sortableColumns.find(c => c.key === sortKey.value)
  if (!col) return result
  return [...result].sort((a, b) => compareOrders(a, b, col))
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredOrders.value.length / PAGE_SIZE)))
const pagedOrders = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return filteredOrders.value.slice(start, start + PAGE_SIZE)
})
const goToPage = (p: number) => {
  if (p < 1 || p > totalPages.value) return
  currentPage.value = p
}
watch(searchQuery, () => { currentPage.value = 1 })
watch(filterStatus, () => { currentPage.value = 1 })

// 當前篩選商品名（訂單 0 筆也顯示）
const filterProductTitle = computed(() => {
  if (!filterProductId.value) return ''
  const o = orders.value.find(x => x.productIdKey === filterProductId.value)
  return o?.productTitle || filterProductMap.value[filterProductId.value] || '查詢中...'
})

// ===== 統計條（與商品列表 summary-bar 一致）=====
const summary = computed(() => {
  const list = orders.value.filter(o => !filterProductId.value || o.productIdKey === filterProductId.value)
  return {
    orders: list.filter(o => o.status !== 'cancelled').length,
    pending: list.filter(o => TAB_STATUSES.todo.includes(o.status)).length,
    received: list
      .filter(o => ['confirmed', 'shipped', 'delivered'].includes(o.status))
      .reduce((s, o) => s + o.amount, 0),
  }
})

const loadOrders = async () => {
  loading.value = true
  try {
    // limit=200：確保商品篩選能看到該商品所有訂單
    const res = await ordersApi.getSellerOrders(1, 200)
    orders.value = (res.data?.data || []).map((o: any) => {
      let images: string[] = []
      try {
        images = typeof o.product?.images === 'string'
          ? JSON.parse(o.product.images)
          : (Array.isArray(o.product?.images) ? o.product.images : [])
      } catch {}
      const isReservation = o.type === 'reservation_deposit'
      return {
        id: o.id,
        productIdKey: o.productId || '',
        productTitle: o.product?.titleZh || o.product?.titleEn || '未知商品',
        productImage: images[0] || '',
        quantity: o.quantity || 1,
        unitPrice: o.product?.price ? Number(o.product.price) : (o.totalPrice ? Number(o.totalPrice) / (o.quantity || 1) : 0),
        fullPrice: isReservation ? Number(o.product?.price) || 0 : undefined,
        buyerNickname: o.buyer?.nickname || '-',
        buyerEmail: o.buyer?.email || '-',
        amount: Number(o.totalPrice) || 0,
        status: o.status,
        type: o.type,
        createdAt: o.createdAt,
        transferReceipt: o.transferReceipt || undefined,
        transferTime: o.transferTime || undefined,
        balanceReceipt: o.balanceReceipt || undefined,
        balanceTime: o.balanceTime || undefined,
        shippingAddress: o.shippingAddress || undefined,
        trackingNumber: o.trackingNumber || undefined,
        paymentTime: o.paymentTime || undefined,
        shippingTime: o.shippingTime || undefined,
        deliveryTime: o.deliveryTime || undefined,
        notes: o.notes || undefined,
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

// ===== 訂單類型 tag（色制同商品列表：直購綠/拍賣粉/預約琥珀）=====
const ORDER_TYPE: Record<string, { text: string; cls: string }> = {
  direct_purchase: { text: '直購', cls: 't-sale' },
  buy_now: { text: '拍賣直購', cls: 't-auction' },
  auction_win: { text: '拍賣得標', cls: 't-auction' },
  reservation_deposit: { text: '預約訂金', cls: 't-reserve' },
  reservation_full: { text: '預約尾款', cls: 't-reserve' },
}
const typeTag = (type: string) => ORDER_TYPE[type] || { text: type, cls: 't-sale' }

// 下一步提示
const nextStepFor = (o: Order): string => {
  if (o.status === 'pending') return '等待買家付款'
  if (o.status === 'pending_paid') {
    return o.transferReceipt || o.balanceReceipt ? '請確認收款' : '等待買家上傳憑證'
  }
  if (o.status === 'confirmed') {
    return o.type === 'reservation_deposit' ? '待買家到店付尾款' : '待發貨'
  }
  if (o.status === 'shipped') return '待買家確認收貨'
  return ''
}

// ===== 訂單詳情彈出層 =====
const detailOrder = ref<Order | null>(null)
const openDetail = (o: Order) => { detailOrder.value = o }
const closeDetail = () => { detailOrder.value = null }

const detailTimeline = computed(() => {
  const o = detailOrder.value
  if (!o) return []
  const items: { label: string; time: string; done: boolean }[] = [
    { label: '訂單建立', time: o.createdAt, done: true },
    { label: o.type === 'reservation_deposit' ? '訂金憑證上傳' : '付款憑證上傳', time: o.transferTime || '', done: !!o.transferTime },
    { label: '收款確認', time: o.paymentTime || o.balanceTime || '', done: !!(o.paymentTime || o.balanceTime) },
    { label: '發貨', time: o.shippingTime || '', done: !!o.shippingTime },
    { label: '完成', time: o.deliveryTime || '', done: !!o.deliveryTime },
  ]
  if (o.type === 'reservation_deposit' && o.balanceTime) {
    items[2] = { label: '收款確認（含尾款）', time: o.balanceTime, done: true }
  }
  return items
})

const clearProductFilter = () => { filterProductId.value = '' }

onMounted(async () => {
  // 從商品列表「完整訂單頁」跳入：/seller/orders?productId=xxx
  if (route.query.productId) {
    filterProductId.value = String(route.query.productId)
    try {
      const p = await productApi.getProduct(filterProductId.value)
      filterProductMap.value[filterProductId.value] = p.data?.titleZh || p.data?.titleEn || ''
    } catch { /* 商品名取得失敗不影響列表 */ }
  }
  loadOrders()
})
</script>

<template>
  <div class="orders-management">
    <!-- 商品篩選提示條（從商品列表跳入時顯示） -->
    <div v-if="filterProductId" class="product-filter-banner">
      <span class="banner-icon">📦</span>
      <span class="banner-text">商品：<strong>{{ filterProductTitle }}</strong> 的訂單（{{ filteredOrders.length }} 筆）</span>
      <button class="btn-clear-filter" @click="clearProductFilter">✕ 顯示全部訂單</button>
    </div>

    <!-- 頂部統計條（同商品列表 summary-bar） -->
    <div v-if="!loading" class="summary-bar">
      <div class="stat-item">
        <span class="stat-label">訂單</span>
        <span class="stat-value">{{ summary.orders }} <small>筆</small></span>
      </div>
      <div class="stat-item" :class="{ alert: summary.pending > 0 }">
        <span class="stat-label">待處理</span>
        <span class="stat-value">{{ summary.pending }} <small>筆</small></span>
      </div>
      <div class="stat-item">
        <span class="stat-label">已收款</span>
        <span class="stat-value money">{{ formatPrice(summary.received) }}</span>
      </div>
    </div>

    <!-- 狀態 tabs -->
    <div class="list-tabs">
      <button
        v-for="tab in TAB_DEFS"
        :key="tab.key"
        class="list-tab"
        :class="{ active: filterStatus === tab.key }"
        @click="filterStatus = tab.key"
      >
        {{ tab.label }}
        <span class="tab-count">{{ tabCount(tab.key) }}</span>
      </button>
    </div>

    <!-- 搜尋 -->
    <div class="search-row">
      <input
        v-model="searchQuery"
        type="text"
        class="search-input"
        placeholder="🔍 搜尋商品、買家名稱或電郵..."
      />
      <button v-if="searchQuery" class="btn-clear-search" @click="searchQuery = ''">✕ 清除</button>
    </div>

    <StateView v-if="loading" state="loading" />
    <StateView v-else-if="!filteredOrders.length" state="empty" icon="📋" title="暫無訂單" />

    <!-- ===== 桌面表格（≥768px） ===== -->
    <div v-else class="orders-table">
      <table class="desktop-table">
        <thead>
          <tr>
            <th>商品</th>
            <th
              v-for="col in sortableColumns.filter(c => c.key !== 'productTitle')"
              :key="col.key"
              class="sortable-th"
              :class="{ sorted: sortKey === col.key }"
              @click="toggleSort(col.key)"
            >
              <span class="th-label">{{ col.label }}</span>
              <span class="sort-arrow" :class="{ active: sortKey === col.key, desc: sortKey === col.key && sortDir === 'desc' }">↕</span>
            </th>
            <th>下一步</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in pagedOrders" :key="order.id">
            <td>
              <div class="product-cell">
                <img v-if="order.productImage" :src="resolveImageUrl(order.productImage)" class="row-thumb" :alt="order.productTitle" />
                <span v-else class="placeholder-emoji">🃏</span>
                <div class="product-info">
                  <span class="product-name">{{ order.productTitle }}</span>
                  <span class="type-tag" :class="ORDER_TYPE[order.type]?.cls">{{ ORDER_TYPE[order.type]?.text || order.type }}</span>
                </div>
              </div>
            </td>
            <td>
              <div class="buyer-name">{{ order.buyerNickname }}</div>
              <div class="buyer-email">{{ order.buyerEmail }}</div>
            </td>
            <td>
              <template v-if="order.type === 'reservation_deposit'">
                <div class="amount">訂金 {{ formatPrice(order.amount) }}</div>
                <div v-if="order.fullPrice" class="cell-sub">尾款 {{ formatPrice(order.fullPrice - order.amount) }}</div>
              </template>
              <template v-else>
                <div class="amount">{{ formatPrice(order.amount) }}</div>
                <div class="cell-sub">x{{ order.quantity }}</div>
              </template>
            </td>
            <td>
              <span class="status-badge" :class="getStatusBadge(order.status).class">
                {{ getStatusBadge(order.status).text }}
              </span>
            </td>
            <td class="date">{{ formatDate(order.createdAt) }}</td>
            <td>
              <span v-if="nextStepFor(order)" class="next-hint">{{ nextStepFor(order) }}</span>
              <span v-else class="cell-muted">—</span>
            </td>
            <td>
              <div class="actions-cell">
                <button
                  v-if="order.status === 'pending_paid' && order.type === 'reservation_deposit'"
                  class="btn-action confirm"
                  :disabled="processingId === order.id"
                  @click="handleConfirmDeposit(order.id)"
                >{{ processingId === order.id ? '處理中...' : '確認訂金' }}</button>
                <button
                  v-else-if="order.status === 'pending_paid'"
                  class="btn-action confirm"
                  :disabled="processingId === order.id"
                  @click="handleConfirmPayment(order.id)"
                >{{ processingId === order.id ? '處理中...' : '確認收款' }}</button>
                <button
                  v-if="order.status === 'confirmed' && order.type === 'reservation_deposit'"
                  class="btn-action confirm"
                  :disabled="processingId === order.id"
                  @click="handleConfirmBalance(order.id)"
                >{{ processingId === order.id ? '處理中...' : '確認尾款' }}</button>
                <button
                  v-else-if="order.status === 'confirmed'"
                  class="btn-action ship"
                  :disabled="processingId === order.id"
                  @click="handleUpdateStatus(order.id, 'shipped')"
                >{{ processingId === order.id ? '處理中...' : '發貨' }}</button>
                <button class="btn-action detail" @click="openDetail(order)">詳情</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ===== 手機卡片列表（<768px） ===== -->
    <div v-if="!loading && filteredOrders.length" class="orders-cards">
      <div v-for="order in pagedOrders" :key="'m' + order.id" class="order-card">
        <div class="card-top">
          <img v-if="order.productImage" :src="resolveImageUrl(order.productImage)" class="card-thumb" :alt="order.productTitle" />
          <span v-else class="card-emoji">🃏</span>
          <div class="card-main">
            <div class="card-title">{{ order.productTitle }}</div>
            <div class="card-meta">
              <span class="type-tag" :class="ORDER_TYPE[order.type]?.cls">{{ ORDER_TYPE[order.type]?.text || order.type }}</span>
              <span class="status-badge" :class="getStatusBadge(order.status).class">{{ getStatusBadge(order.status).text }}</span>
            </div>
          </div>
          <div class="card-amount">
            <template v-if="order.type === 'reservation_deposit'">
              <div class="amount">訂金 {{ formatPrice(order.amount) }}</div>
              <div v-if="order.fullPrice" class="cell-sub">尾款 {{ formatPrice(order.fullPrice - order.amount) }}</div>
            </template>
            <template v-else>
              <div class="amount">{{ formatPrice(order.amount) }}</div>
            </template>
          </div>
        </div>
        <div class="card-mid">
          <span class="card-buyer">👤 {{ order.buyerNickname }}</span>
          <span class="card-date">{{ formatDate(order.createdAt) }}</span>
        </div>
        <div v-if="nextStepFor(order)" class="card-next">{{ nextStepFor(order) }}</div>
        <div class="card-actions">
          <button
            v-if="order.status === 'pending_paid' && order.type === 'reservation_deposit'"
            class="btn-action confirm"
            :disabled="processingId === order.id"
            @click="handleConfirmDeposit(order.id)"
          >{{ processingId === order.id ? '處理中...' : '確認訂金' }}</button>
          <button
            v-else-if="order.status === 'pending_paid'"
            class="btn-action confirm"
            :disabled="processingId === order.id"
            @click="handleConfirmPayment(order.id)"
          >{{ processingId === order.id ? '處理中...' : '確認收款' }}</button>
          <button
            v-if="order.status === 'confirmed' && order.type === 'reservation_deposit'"
            class="btn-action confirm"
            :disabled="processingId === order.id"
            @click="handleConfirmBalance(order.id)"
          >{{ processingId === order.id ? '處理中...' : '確認尾款' }}</button>
          <button
            v-else-if="order.status === 'confirmed'"
            class="btn-action ship"
            :disabled="processingId === order.id"
            @click="handleUpdateStatus(order.id, 'shipped')"
          >{{ processingId === order.id ? '處理中...' : '發貨' }}</button>
          <button class="btn-action detail" @click="openDetail(order)">詳情</button>
        </div>
      </div>
    </div>

    <!-- 分頁 -->
    <div v-if="!loading && filteredOrders.length" class="pagination">
      <button class="page-btn" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">‹ 上一頁</button>
      <span class="page-info">第 {{ currentPage }} / {{ totalPages }} 頁 · 共 {{ filteredOrders.length }} 筆</span>
      <button class="page-btn" :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)">下一頁 ›</button>
    </div>

    <!-- 訂單詳情彈出層（桌面+手機共用，手機底部貼邊） -->
    <div v-if="detailOrder" class="modal-overlay" @click.self="closeDetail">
      <div class="detail-modal">
        <div class="modal-header">
          <h3>訂單詳情</h3>
          <button @click="closeDetail" class="modal-close">✕</button>
        </div>
        <div class="detail-body">
          <div class="detail-top">
            <span class="type-tag" :class="ORDER_TYPE[detailOrder.type]?.cls">{{ ORDER_TYPE[detailOrder.type]?.text || detailOrder.type }}</span>
            <span class="status-badge" :class="getStatusBadge(detailOrder.status).class">{{ getStatusBadge(detailOrder.status).text }}</span>
          </div>

          <div class="detail-product">
            <img v-if="detailOrder.productImage" :src="resolveImageUrl(detailOrder.productImage)" class="detail-thumb" :alt="detailOrder.productTitle" />
            <span v-else class="card-emoji">🃏</span>
            <div class="dp-info">
              <span class="dp-title">{{ detailOrder.productTitle }}</span>
              <span class="dp-sub">x{{ detailOrder.quantity }} · 單價 {{ formatPrice(detailOrder.unitPrice) }}</span>
            </div>
            <div class="dp-amount">
              <template v-if="detailOrder.type === 'reservation_deposit'">
                <div class="amount">訂金 {{ formatPrice(detailOrder.amount) }}</div>
                <div v-if="detailOrder.fullPrice" class="cell-sub">＋尾款 {{ formatPrice(detailOrder.fullPrice - detailOrder.amount) }}＝全價 {{ formatPrice(detailOrder.fullPrice) }}</div>
              </template>
              <template v-else>
                <div class="amount">{{ formatPrice(detailOrder.amount) }}</div>
              </template>
            </div>
          </div>

          <div class="detail-grid">
            <div class="dg-item">
              <span class="dg-label">買家</span>
              <span class="dg-value">{{ detailOrder.buyerNickname }}<small>{{ detailOrder.buyerEmail }}</small></span>
            </div>
            <div class="dg-item" v-if="detailOrder.shippingAddress">
              <span class="dg-label">收件地址</span>
              <span class="dg-value">{{ detailOrder.shippingAddress }}</span>
            </div>
            <div class="dg-item" v-if="detailOrder.trackingNumber">
              <span class="dg-label">快遞單號</span>
              <span class="dg-value mono">{{ detailOrder.trackingNumber }}</span>
            </div>
            <div class="dg-item" v-if="detailOrder.notes">
              <span class="dg-label">備註</span>
              <span class="dg-value">{{ detailOrder.notes }}</span>
            </div>
          </div>

          <!-- 憑證 -->
          <div v-if="detailOrder.transferReceipt || detailOrder.balanceReceipt" class="detail-receipts">
            <div v-if="detailOrder.transferReceipt" class="dr-item">
              <span class="dg-label">{{ detailOrder.type === 'reservation_deposit' ? '訂金憑證' : '付款憑證' }}</span>
              <img :src="resolveImageUrl(detailOrder.transferReceipt)" class="receipt-thumb lg" @click="viewReceipt(detailOrder.transferReceipt!)" alt="付款憑證" />
            </div>
            <div v-if="detailOrder.balanceReceipt" class="dr-item">
              <span class="dg-label">尾款憑證</span>
              <img :src="resolveImageUrl(detailOrder.balanceReceipt)" class="receipt-thumb lg" @click="viewReceipt(detailOrder.balanceReceipt!)" alt="尾款憑證" />
            </div>
          </div>

          <!-- 時間線 -->
          <div class="detail-timeline">
            <span class="dg-label">進度</span>
            <div class="timeline">
              <div
                v-for="(t, i) in detailTimeline"
                :key="i"
                class="tl-item"
                :class="{ done: t.done, current: t.done && !(detailTimeline[i + 1] && detailTimeline[i + 1].done) }"
              >
                <span class="tl-dot"></span>
                <span class="tl-label">{{ t.label }}</span>
                <span class="tl-time">{{ t.time ? formatDateTime(t.time) : '待處理' }}</span>
              </div>
            </div>
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
  </div>
</template>

<style scoped>
.orders-management { display: flex; flex-direction: column; gap: var(--space-4); }

/* ===== 商品篩選提示條 ===== */
.product-filter-banner {
  display: flex; align-items: center; gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--bg-elevated);
  border: 1px solid var(--primary);
  border-radius: var(--radius-lg);
  flex-wrap: wrap;
}
.banner-icon { font-size: 18px; }
.banner-text { font-size: var(--text-sm); color: var(--text-primary); }
.banner-text strong { color: var(--primary); }
.btn-clear-filter {
  margin-left: auto;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: var(--text-xs);
  transition: all var(--transition-fast);
}
.btn-clear-filter:hover { color: var(--text-primary); border-color: var(--primary); }

/* ===== 統計條（同商品列表）===== */
.summary-bar {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
}
.stat-item {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}
.stat-label { font-size: var(--text-xs); color: var(--text-secondary); }
.stat-value {
  font-size: var(--text-lg);
  font-weight: 700;
  font-family: var(--font-num);
  color: var(--text-primary);
}
.stat-value small { font-size: var(--text-xs); font-weight: 400; color: var(--text-secondary); }
.stat-item.alert { border-color: #f59e0b; background: rgba(245, 158, 11, 0.08); }
.stat-item.alert .stat-value { color: #f59e0b; }
.stat-value.money { color: #10b981; }

/* ===== tabs（同商品列表 list-tab）===== */
.list-tabs { display: flex; gap: var(--space-2); flex-wrap: wrap; }
.list-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: var(--space-2) var(--space-5);
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--bg-card);
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.list-tab:hover { border-color: var(--primary); }
.list-tab.active {
  background: var(--primary-gradient);
  border: none;
  color: white;
}
.tab-count {
  padding: 1px 8px;
  border-radius: var(--radius-full);
  background: rgba(0, 0, 0, 0.15);
  font-size: var(--text-xs);
  font-weight: 600;
}
.list-tab:not(.active) .tab-count {
  background: var(--bg-elevated);
  color: var(--text-secondary);
}

/* ===== 搜尋（同商品列表）===== */
.search-row { display: flex; gap: var(--space-2); align-items: center; }
.search-input {
  flex: 1;
  max-width: 420px;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: var(--text-sm);
  outline: none;
  transition: border-color var(--transition-fast);
}
.search-input:focus { border-color: var(--primary); }
.btn-clear-search {
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: var(--text-xs);
}
.btn-clear-search:hover { color: var(--text-primary); border-color: var(--primary); }

/* ===== 桌面表格 ===== */
.orders-table {
  background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-xl);
  overflow: hidden;
}
table { width: 100%; border-collapse: collapse; }
th, td { padding: var(--space-4); text-align: left; border-bottom: 1px solid var(--border); vertical-align: middle; }
th { font-size: var(--text-sm); font-weight: 500; color: var(--text-secondary); background: var(--bg-elevated); }
td { font-size: var(--text-sm); color: var(--text-primary); }
tr:last-child td { border-bottom: none; }

.sortable-th { cursor: pointer; user-select: none; white-space: nowrap; }
.sortable-th:hover { color: var(--text-primary); }
.sortable-th .th-label { margin-right: 4px; }
.sort-arrow {
  display: inline-block;
  font-size: var(--text-xs);
  color: var(--text-muted);
  opacity: 0.5;
  transition: all var(--transition-fast);
}
.sortable-th:hover .sort-arrow { opacity: 1; }
.sort-arrow.active { opacity: 1; color: var(--primary); font-weight: 700; }
.sort-arrow.active.desc { transform: rotate(180deg); }

.product-cell { display: flex; align-items: center; gap: var(--space-3); }
.row-thumb {
  width: 44px; height: 44px; border-radius: var(--radius-md);
  object-fit: cover; background: var(--bg-elevated); flex-shrink: 0;
}
.placeholder-emoji {
  font-size: 22px;
  width: 44px; height: 44px;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-elevated); border-radius: var(--radius-md); flex-shrink: 0;
}
.product-cell .product-name {
  font-weight: 500;
  max-width: 240px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.buyer-name { font-weight: 500; }
.buyer-email { font-size: var(--text-xs); color: var(--text-muted); }
.amount { font-family: var(--font-num); font-weight: 600; color: var(--primary); white-space: nowrap; }
.cell-sub { font-size: var(--text-xs); color: var(--text-secondary); margin-top: 2px; font-family: var(--font-num); }
.date { font-size: var(--text-xs); color: var(--text-muted); white-space: nowrap; }
.cell-muted { color: var(--text-secondary); opacity: 0.5; }
.next-hint { font-size: var(--text-xs); color: #f59e0b; font-weight: 600; white-space: nowrap; }
.actions-cell { display: flex; gap: 6px; flex-wrap: wrap; }

/* 類型 tag（同商品列表色制）*/
.type-tag {
  padding: 1px 8px;
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  width: fit-content;
}
.type-tag.t-sale { background: rgba(16, 185, 129, 0.18); color: #10b981; }
.type-tag.t-auction { background: rgba(236, 72, 153, 0.18); color: #ec4899; }
.type-tag.t-reserve { background: rgba(245, 158, 11, 0.18); color: #f59e0b; }

.status-badge { padding: 2px 10px; border-radius: var(--radius-full); font-size: var(--text-xs); font-weight: 600; white-space: nowrap; }
.status-badge.pending-paid { background: #fb923c4d; color: #fb923c; }
.status-badge.pending { background: #f59e0b4d; color: #f59e0b; }
.status-badge.paid { background: #3b82f633; color: #3b82f6; }
.status-badge.shipped { background: #8b5cf64d; color: #8b5cf6; }
.status-badge.delivered { background: #10b9814d; color: #059669; }
.status-badge.cancelled, .status-badge.refunded { background: #ef44444d; color: #ef4444; }
.status-badge.confirmed { background: #10b9814d; color: #10b981; }
.status-badge.default { background: #6b72804d; color: #6b7280; }

.btn-action {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}
.btn-action.ship { background: var(--primary); color: white; }
.btn-action.confirm { background: #10b981; color: white; }
.btn-action.confirm:hover:not(:disabled) { background: #059669; }
.btn-action.detail { background: var(--bg-elevated); color: var(--text-primary); }
.btn-action.detail:hover { background: var(--primary); color: white; }
.btn-action:disabled { opacity: 0.5; cursor: not-allowed; }

/* ===== 手機卡片（<768px 才顯示）===== */
.orders-cards { display: none; }

/* ===== 分頁（同商品列表）===== */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
}
.page-btn {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: var(--text-sm);
  transition: all var(--transition-fast);
}
.page-btn:hover:not(:disabled) { border-color: var(--primary); color: var(--text-primary); }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-info { font-size: var(--text-sm); color: var(--text-secondary); }

/* ===== Modal ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-4);
}
.detail-modal {
  width: min(640px, 100%);
  max-height: 85vh;
  overflow-y: auto;
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  border: 1px solid var(--border);
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--border);
}
.modal-header h3 { margin: 0; font-size: var(--text-lg); }
.modal-close {
  background: none;
  border: none;
  font-size: 18px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-md);
}
.modal-close:hover { background: var(--bg-elevated); color: var(--text-primary); }
.detail-body {
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.detail-top { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
.detail-product {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
}
.card-emoji {
  font-size: 22px;
  width: 48px; height: 48px;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-card); border-radius: var(--radius-md); flex-shrink: 0;
}
.dp-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.dp-title { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dp-sub { font-size: var(--text-xs); color: var(--text-secondary); }
.dp-amount { text-align: right; }
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}
.dg-item { display: flex; flex-direction: column; gap: 4px; }
.dg-label { font-size: var(--text-xs); color: var(--text-secondary); }
.dg-value { font-size: var(--text-sm); color: var(--text-primary); word-break: break-all; }
.dg-value small { display: block; color: var(--text-secondary); font-size: var(--text-xs); }
.dg-value.mono { font-family: var(--font-num); letter-spacing: 0.5px; }
.detail-receipts { display: flex; gap: var(--space-6); }
.dr-item { display: flex; flex-direction: column; gap: 6px; }
.receipt-thumb {
  width: 40px; height: 40px;
  border-radius: var(--radius-md);
  object-fit: cover;
  cursor: pointer;
  border: 1px solid var(--border);
  transition: transform var(--transition-fast);
}
.receipt-thumb:hover { transform: scale(1.08); }
.receipt-thumb.lg { width: 64px; height: 64px; }
.detail-timeline { display: flex; flex-direction: column; gap: var(--space-2); }
.timeline { display: flex; flex-direction: column; }
.tl-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
}
.tl-item:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 5px;
  top: 28px;
  bottom: -6px;
  width: 2px;
  background: var(--border);
}
.tl-item.done:not(:last-child)::before { background: #10b981; opacity: 0.5; }
.tl-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--border); flex-shrink: 0; }
.tl-item.done .tl-dot { background: #10b981; }
.tl-item.current .tl-dot { box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.25); }
.tl-label { font-size: var(--text-sm); color: var(--text-secondary); min-width: 110px; }
.tl-item.done .tl-label { color: var(--text-primary); }
.tl-time { font-size: var(--text-xs); color: var(--text-secondary); font-family: var(--font-num); }
.receipt-modal {
  width: min(560px, 100%);
  max-height: 85vh;
  overflow-y: auto;
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  border: 1px solid var(--border);
}
.modal-body {
  padding: var(--space-5);
  display: flex;
  justify-content: center;
}
.receipt-image { max-width: 100%; max-height: 70vh; border-radius: var(--radius-lg); }

/* ===== 手機版適配（<768px：表格收起，顯示卡片）===== */
@media (max-width: 767px) {
  .desktop-table { display: none; }
  .orders-table { overflow: visible; }
  .orders-cards {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .order-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-3) var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .card-top { display: flex; gap: var(--space-3); align-items: flex-start; }
  .card-thumb, .card-main { min-width: 0; }
  .card-thumb { width: 48px; height: 48px; border-radius: var(--radius-md); object-fit: cover; flex-shrink: 0; }
  .card-main { flex: 1; display: flex; flex-direction: column; gap: 4px; }
  .card-title {
    font-weight: 600;
    font-size: var(--text-sm);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .card-meta { display: flex; gap: 6px; flex-wrap: wrap; }
  .card-amount { text-align: right; flex-shrink: 0; }
  .card-mid {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: var(--text-xs);
    color: var(--text-secondary);
  }
  .card-next {
    font-size: var(--text-xs);
    color: #f59e0b;
    font-weight: 600;
    padding: var(--space-1) var(--space-2);
    background: rgba(245, 158, 11, 0.1);
    border-radius: var(--radius-md);
    width: fit-content;
  }
  .card-actions { display: flex; gap: 6px; flex-wrap: wrap; }
  .card-actions .btn-action { flex: 1; text-align: center; }

  .summary-bar { gap: var(--space-2); }
  .stat-item { flex: 1 1 30%; padding: var(--space-2) var(--space-3); }
  .stat-value { font-size: var(--text-base); }
  .list-tabs { gap: var(--space-1); }
  .list-tab { padding: var(--space-1) var(--space-3); font-size: var(--text-xs); }
  .detail-grid { grid-template-columns: 1fr; }
  .modal-overlay { align-items: flex-end; padding: 0; }
  .detail-modal {
    width: 100%;
    max-height: 88vh;
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    border-bottom: none;
  }
  .detail-body { padding: var(--space-4); }
  .pagination { flex-wrap: wrap; gap: var(--space-2); }
  .page-info { font-size: var(--text-xs); }
}

/* 桌面寬屏適配 */
@media (min-width: 820px) {
  .orders-management { max-width: 100%; }
}
</style>