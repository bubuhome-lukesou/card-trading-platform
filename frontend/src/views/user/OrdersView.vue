<script setup lang="ts">
import { formatPrice, formatDate, formatDateTime } from '@/utils/format'
import StateView from '@/components/common/StateView.vue'
import { ref, computed, watch, onMounted } from 'vue'
import { ordersApi } from '@/api/orders'
import api from '@/api/index'

interface Order {
  id: string
  productTitle: string
  productImage?: string
  sellerId: string
  sellerNickname: string
  amount: number
  quantity: number
  status: string
  type: string
  createdAt: string
  transferReceipt?: string
  transferTime?: string
  balanceReceipt?: string
  balanceTime?: string
  fullPrice?: number // 預約商品全價（顯示為尾款）
  shippingAddress?: string
  trackingNumber?: string
  paymentTime?: string
  shippingTime?: string
  deliveryTime?: string
  notes?: string
}

const orders = ref<Order[]>([])
const loading = ref(true)
const uploadingReceipt = ref<string | null>(null)
const processingPay = ref<string | null>(null)
const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')
let toastTimer: ReturnType<typeof setTimeout> | null = null
const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
  toastMessage.value = msg
  toastType.value = type
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMessage.value = '' }, 3000)
}
const showReceiptModal = ref(false)
const receiptImageUrl = ref('')
const apiBaseUrl = import.meta.env.VITE_API_URL || ''
const resolveImageUrl = (url: string) => {
  if (!url) return '/placeholder-card.png'
  if (url.startsWith('data:') || url.startsWith('http')) return url
  return apiBaseUrl + url
}

// ===== 狀態 tabs（同 seller 訂單管理樣式；口徑按買家視角） =====
const TAB_DEFS: { key: string; label: string }[] = [
  { key: 'todo', label: '進行中' },
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待付款' },
  { key: 'pending_paid', label: '待確認' },
  { key: 'confirmed', label: '待收貨' },
  { key: 'shipped', label: '已發貨' },
  { key: 'delivered', label: '已完成' },
  { key: 'cancelled', label: '已取消' },
]
const TAB_STATUSES: Record<string, string[]> = {
  todo: ['pending', 'pending_paid', 'confirmed', 'shipped'],
  all: [],
  pending: ['pending'],
  pending_paid: ['pending_paid'],
  confirmed: ['confirmed'],
  shipped: ['shipped'],
  delivered: ['delivered'],
  cancelled: ['cancelled'],
}
const filterStatus = ref<string>('all')

const tabCount = (key: string): number => {
  const sts = TAB_STATUSES[key]
  if (!sts || !sts.length) return orders.value.length
  return orders.value.filter(o => sts.includes(o.status)).length
}

const todoCount = computed(() => tabCount('todo'))

// ===== 搜尋（後端 search 參數，Enter 觸發同 admin/users 模式）/ 排序 / 分頁 =====
const PAGE_SIZE = 20
const searchQuery = ref('')
const appliedSearch = ref('') // 已套用到後端嘅搜尋詞
const applySearch = () => {
  appliedSearch.value = searchQuery.value.trim()
  currentPage.value = 1
  loadOrders()
}
const clearSearch = () => {
  searchQuery.value = ''
  if (appliedSearch.value) {
    appliedSearch.value = ''
    currentPage.value = 1
    loadOrders()
  }
}
const currentPage = ref(1)
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('desc')

const sortableColumns = [
  { key: 'productTitle', label: '商品', type: 'text' },
  { key: 'sellerNickname', label: '商家', type: 'text' },
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

// 數字/時間按數值；文字按 UTF-16 二進碼序（與 seller 訂單管理一致）
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

// ===== 過濾：狀態 → 搜尋 =====
const filteredOrders = computed(() => {
  let result = orders.value
  const sts = TAB_STATUSES[filterStatus.value]
  if (sts && sts.length) {
    result = result.filter(o => sts.includes(o.status))
  }
  // 搜尋已由後端 ?search= 處理（商品名/商家 nickname），本地唔再過濾
  // 預設排序：進行中優先 → 最新在前
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
watch(filterStatus, () => { currentPage.value = 1 })

// ===== 統計條（同 seller summary-bar 風格） =====
// 累計消費口徑 = confirmed,shipped,delivered（全站收款口徑：訂金已確認即已付出，同 admin 用戶管理 totalSpend 一致）
const summary = computed(() => {
  const done = ['confirmed', 'shipped', 'delivered']
  return {
    total: orders.value.filter(o => o.status !== 'cancelled').length,
    todo: todoCount.value,
    shipped: orders.value.filter(o => o.status === 'shipped').length,
    totalSpent: orders.value
      .filter(o => done.includes(o.status))
      .reduce((s, o) => s + (Number(o.amount) || 0), 0),
  }
})

// ===== 類型 tag（色制同 seller：直購綠/拍賣粉/預約琥珀） =====
const ORDER_TYPE: Record<string, { text: string; cls: string }> = {
  direct_purchase: { text: '直購', cls: 't-sale' },
  buy_now: { text: '拍賣直購', cls: 't-auction' },
  auction_win: { text: '拍賣得標', cls: 't-auction' },
  reservation_deposit: { text: '預約訂金', cls: 't-reserve' },
  reservation_full: { text: '預約尾款', cls: 't-reserve' },
}
const typeTag = (type: string) => ORDER_TYPE[type] || { text: type, cls: 't-sale' }

// ===== 狀態徽章（買家視角：confirmed=待收貨/待付尾款） =====
const getStatusBadge = (status: string, orderType?: string) => {
  if (orderType === 'reservation_deposit') {
    const map: Record<string, { class: string; text: string }> = {
      pending: { class: 'st-pending', text: '待付訂金' },
      pending_paid: { class: 'st-pending-paid', text: '待商家確認' },
      confirmed: { class: 'st-confirmed', text: '待付尾款' },
      delivered: { class: 'st-delivered', text: '已完成' },
      cancelled: { class: 'st-cancelled', text: '已取消' },
    }
    return map[status] || { class: 'st-default', text: status }
  }
  const map: Record<string, { class: string; text: string }> = {
    pending: { class: 'st-pending', text: '待付款' },
    pending_paid: { class: 'st-pending-paid', text: '待商家確認' },
    confirmed: { class: 'st-confirmed', text: '待收貨' },
    shipped: { class: 'st-shipped', text: '已發貨' },
    delivered: { class: 'st-delivered', text: '已完成' },
    cancelled: { class: 'st-cancelled', text: '已取消' },
    refunded: { class: 'st-cancelled', text: '已退款' },
  }
  return map[status] || { class: 'st-default', text: status }
}

// ===== 下一步提示（買家視角） =====
const nextStepFor = (o: Order): string => {
  if (o.status === 'pending') return o.type === 'reservation_deposit' ? '請上傳訂金憑證' : '請上傳付款憑證'
  if (o.status === 'pending_paid') return '等待商家確認收款'
  if (o.status === 'confirmed') {
    return o.type === 'reservation_deposit' ? '請到店支付尾款' : '待商家發貨'
  }
  if (o.status === 'shipped') return '請確認收貨'
  return ''
}

const loadOrders = async () => {
  loading.value = true
  try {
    const res = await ordersApi.getMyOrders(1, 200, appliedSearch.value || undefined)
    const list = Array.isArray(res.data) ? res.data : (res.data?.data || [])
    orders.value = list.map((o: any) => {
      let images: string[] = []
      try {
        images = typeof o.product?.images === 'string'
          ? JSON.parse(o.product.images)
          : (Array.isArray(o.product?.images) ? o.product.images : [])
      } catch {}
      return {
        id: o.id,
        productTitle: o.product?.titleZh || o.product?.titleEn || '未知商品',
        productImage: images[0] || '',
        sellerId: o.sellerId || '',
        sellerNickname: o.seller?.nickname || '未知商家',
        amount: Number(o.totalPrice) || 0,
        quantity: o.quantity || 1,
        status: o.status,
        type: o.type,
        createdAt: o.createdAt,
        transferReceipt: o.transferReceipt || undefined,
        transferTime: o.transferTime || undefined,
        balanceReceipt: o.balanceReceipt || undefined,
        balanceTime: o.balanceTime || undefined,
        fullPrice: (o.type === 'reservation_deposit' || o.type === 'reservation_full') ? Number(o.product?.price) || 0 : undefined,
        shippingAddress: o.shippingAddress || undefined,
        trackingNumber: o.trackingNumber || undefined,
        paymentTime: o.paymentTime || undefined,
        shippingTime: o.shippingTime || undefined,
        deliveryTime: o.deliveryTime || undefined,
        notes: o.notes || undefined,
      }
    })
  } catch (error) {
    console.error('Failed to load orders:', error)
    orders.value = []
  } finally {
    loading.value = false
  }
}

// ===== 操作（全部保留原有流程） =====
const handlePay = async (orderId: string) => {
  processingPay.value = orderId
  try {
    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = 'image/*'
    fileInput.onchange = async (e: any) => {
      const file = e.target.files[0]
      if (!file) {
        processingPay.value = null
        return
      }
      try {
        await ordersApi.uploadTransferReceipt(orderId, file)
        await loadOrders()
      } catch (error) {
        console.error('Payment receipt upload failed:', error)
        showToast('上傳憑證失敗，請重試', 'error')
      } finally {
        processingPay.value = null
      }
    }
    fileInput.click()
  } catch (error) {
    console.error('Payment failed:', error)
    showToast('支付失敗，請重試', 'error')
    processingPay.value = null
  }
}

// 預約攞貨彈窗
const showPickupModal = ref(false)
const pickupInfo = ref('')
const pickupQrCode = ref('')
const pendingReserveOrderId = ref<string | null>(null)
const submittingReserve = ref(false)

const handleReserve = async (orderId: string, sellerId: string) => {
  try {
    const res = await api.get(`/users/seller/${sellerId}/pickup-info`)
    pickupInfo.value = res.data.pickupInfo || ''
    pickupQrCode.value = res.data.pickupQrCode || ''
  } catch (e) {
    pickupInfo.value = ''
    pickupQrCode.value = ''
  }
  pendingReserveOrderId.value = orderId
  showPickupModal.value = true
}

const confirmReserve = async () => {
  if (!pendingReserveOrderId.value) return
  submittingReserve.value = true
  try {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement
      if (target.files?.[0]) {
        try {
          await ordersApi.uploadTransferReceipt(pendingReserveOrderId.value!, target.files[0])
          await loadOrders()
          showPickupModal.value = false
          pendingReserveOrderId.value = null
          showToast('預約拿貨成功！請等待商家確認')
        } catch (error) {
          console.error('Upload receipt failed:', error)
          showToast('上傳憑證失敗，請重試', 'error')
        } finally {
          submittingReserve.value = false
        }
      } else {
        submittingReserve.value = false
      }
    }
    input.click()
  } catch (error) {
    console.error('Reserve failed:', error)
    showToast('操作失敗，請重試', 'error')
    submittingReserve.value = false
  }
}

const cancelReserve = () => {
  showPickupModal.value = false
  pendingReserveOrderId.value = null
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

const triggerBalanceUpload = (orderId: string) => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = (e: Event) => {
    const target = e.target as HTMLInputElement
    if (target.files?.[0]) {
      handleUploadBalance(orderId, target.files[0])
    }
  }
  input.click()
}

const handleUploadBalance = async (orderId: string, file: File) => {
  uploadingReceipt.value = orderId
  try {
    await ordersApi.uploadBalanceReceipt(orderId, file)
    showToast('尾款憑證上傳成功！')
    await loadOrders()
  } catch (error) {
    console.error('Upload failed:', error)
    showToast('上傳失敗，請重試', 'error')
  } finally {
    uploadingReceipt.value = null
  }
}

const handleUploadReceipt = async (orderId: string, file: File) => {
  uploadingReceipt.value = orderId
  try {
    await ordersApi.uploadTransferReceipt(orderId, file)
    showToast('上傳成功！')
    await loadOrders()
  } catch (error) {
    console.error('Upload failed:', error)
    showToast('上傳失敗，請重試', 'error')
  } finally {
    uploadingReceipt.value = null
  }
}

const handleReceive = async (orderId: string) => {
  try {
    await ordersApi.updateStatus(orderId, 'delivered')
    await loadOrders()
    showToast('已確認收貨')
  } catch (error) {
    console.error('Confirm failed:', error)
    showToast('操作失敗，請重試', 'error')
  }
}

const viewReceipt = (url: string) => {
  receiptImageUrl.value = url
  showReceiptModal.value = true
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
    { label: '商家確認收款', time: o.paymentTime || o.balanceTime || '', done: !!(o.paymentTime || o.balanceTime) },
    { label: '發貨', time: o.shippingTime || '', done: !!o.shippingTime },
    { label: '完成', time: o.deliveryTime || '', done: !!o.deliveryTime },
  ]
  if (o.type === 'reservation_deposit' && o.balanceTime) {
    items[2] = { label: '商家確認收款（含尾款）', time: o.balanceTime, done: true }
  }
  return items
})

onMounted(() => {
  loadOrders()
})
</script>

<template>
  <div class="orders-management">
    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toastMessage" class="toast" :class="toastType">
        {{ toastMessage }}
      </div>
    </Transition>

    <!-- 頂部統計條（同 seller summary-bar） -->
    <div v-if="!loading" class="summary-bar">
      <div class="stat-item">
        <span class="stat-label">訂單</span>
        <span class="stat-value">{{ summary.total }} <small>筆</small></span>
      </div>
      <div class="stat-item" :class="{ alert: summary.todo > 0 }">
        <span class="stat-label">進行中</span>
        <span class="stat-value">{{ summary.todo }} <small>筆</small></span>
      </div>
      <div class="stat-item">
        <span class="stat-label">待收貨</span>
        <span class="stat-value">{{ summary.shipped }} <small>筆</small></span>
      </div>
      <div class="stat-item">
        <span class="stat-label">累計消費</span>
        <span class="stat-value money">{{ formatPrice(summary.totalSpent) }}</span>
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

    <!-- 搜尋（按 Enter 搜尋，後端篩選） -->
    <div class="search-row">
      <input
        v-model="searchQuery"
        type="text"
        class="search-input"
        placeholder="🔍 搜尋商品或商家，按 Enter 搜尋..."
        @keyup.enter="applySearch"
      />
      <button v-if="searchQuery || appliedSearch" class="btn-clear-search" @click="clearSearch">✕ 清除</button>
    </div>

    <StateView v-if="loading" state="loading" />
    <StateView
      v-else-if="!filteredOrders.length"
      state="empty" icon="📦" title="暫無訂單" message="快去參與競拍或購買吧！"
    >
      <router-link to="/auctions" class="btn-primary">瀏覽拍賣</router-link>
    </StateView>

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
              <div class="buyer-name">{{ order.sellerNickname }}</div>
              <div class="cell-sub">x{{ order.quantity }}</div>
            </td>
            <td>
              <template v-if="order.type === 'reservation_deposit'">
                <div class="amount">訂金 {{ formatPrice(order.amount) }}</div>
                <div v-if="order.fullPrice" class="cell-sub">尾款 {{ formatPrice(order.fullPrice - order.amount) }}</div>
              </template>
              <template v-else>
                <div class="amount">{{ formatPrice(order.amount) }}</div>
              </template>
            </td>
            <td>
              <span class="status-badge" :class="getStatusBadge(order.status, order.type).class">
                {{ getStatusBadge(order.status, order.type).text }}
              </span>
            </td>
            <td class="date">{{ formatDate(order.createdAt) }}</td>
            <td>
              <span v-if="nextStepFor(order)" class="next-hint">{{ nextStepFor(order) }}</span>
              <span v-else class="cell-muted">—</span>
            </td>
            <td>
              <div class="actions-cell">
                <!-- 待付款 -->
                <button
                  v-if="order.status === 'pending'"
                  class="btn-action confirm"
                  :disabled="uploadingReceipt === order.id || processingPay === order.id"
                  @click="handlePay(order.id)"
                >{{ processingPay === order.id ? '處理中...' : (order.type === 'reservation_deposit' ? '上傳訂金憑證' : '立即支付') }}</button>
                <!-- 待付尾款 -->
                <button
                  v-if="order.status === 'confirmed' && order.type === 'reservation_deposit'"
                  class="btn-action confirm"
                  :disabled="uploadingReceipt === order.id"
                  @click="triggerBalanceUpload(order.id)"
                >{{ uploadingReceipt === order.id ? '上傳中...' : '上傳尾款憑證' }}</button>
                <!-- 已發貨 -->
                <button
                  v-if="order.status === 'shipped' && order.type !== 'reservation_deposit'"
                  class="btn-action confirm"
                  @click="handleReceive(order.id)"
                >確認收貨</button>
                <button
                  v-if="order.status === 'pending' && order.type !== 'reservation_deposit'"
                  class="btn-action detail"
                  @click="handleReserve(order.id, order.sellerId)"
                >預約拿貨</button>
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
              <span class="status-badge" :class="getStatusBadge(order.status, order.type).class">{{ getStatusBadge(order.status, order.type).text }}</span>
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
          <span class="card-buyer">🏪 {{ order.sellerNickname }}</span>
          <span class="card-date">{{ formatDate(order.createdAt) }}</span>
        </div>
        <div v-if="nextStepFor(order)" class="card-next">{{ nextStepFor(order) }}</div>
        <div class="card-actions">
          <button
            v-if="order.status === 'pending'"
            class="btn-action confirm"
            :disabled="uploadingReceipt === order.id || processingPay === order.id"
            @click="handlePay(order.id)"
          >{{ order.type === 'reservation_deposit' ? '上傳訂金憑證' : '立即支付' }}</button>
          <button
            v-if="order.status === 'confirmed' && order.type === 'reservation_deposit'"
            class="btn-action confirm"
            :disabled="uploadingReceipt === order.id"
            @click="triggerBalanceUpload(order.id)"
          >上傳尾款憑證</button>
          <button
            v-if="order.status === 'shipped' && order.type !== 'reservation_deposit'"
            class="btn-action confirm"
            @click="handleReceive(order.id)"
          >確認收貨</button>
          <button
            v-if="order.status === 'pending' && order.type !== 'reservation_deposit'"
            class="btn-action detail"
            @click="handleReserve(order.id, order.sellerId)"
          >預約拿貨</button>
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

    <!-- 訂單詳情彈出層 -->
    <div v-if="detailOrder" class="modal-overlay" @click.self="closeDetail">
      <div class="detail-modal">
        <div class="modal-header">
          <h3>訂單詳情</h3>
          <button @click="closeDetail" class="modal-close">✕</button>
        </div>
        <div class="detail-body">
          <div class="detail-top">
            <span class="type-tag" :class="ORDER_TYPE[detailOrder.type]?.cls">{{ ORDER_TYPE[detailOrder.type]?.text || detailOrder.type }}</span>
            <span class="status-badge" :class="getStatusBadge(detailOrder.status, detailOrder.type).class">{{ getStatusBadge(detailOrder.status, detailOrder.type).text }}</span>
          </div>

          <div class="detail-product">
            <img v-if="detailOrder.productImage" :src="resolveImageUrl(detailOrder.productImage)" class="detail-thumb" :alt="detailOrder.productTitle" />
            <span v-else class="card-emoji">🃏</span>
            <div class="dp-info">
              <span class="dp-title">{{ detailOrder.productTitle }}</span>
              <span class="dp-sub">x{{ detailOrder.quantity }} · 商家 {{ detailOrder.sellerNickname }}</span>
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
            <div class="dg-item">
              <span class="dg-label">下單時間</span>
              <span class="dg-value">{{ formatDateTime(detailOrder.createdAt) }}</span>
            </div>
          </div>

          <!-- 操作（詳情層內重複入口） -->
          <div class="detail-actions">
            <button
              v-if="detailOrder.status === 'pending'"
              class="btn-action confirm"
              :disabled="uploadingReceipt === detailOrder.id || processingPay === detailOrder.id"
              @click="handlePay(detailOrder.id)"
            >{{ detailOrder.type === 'reservation_deposit' ? '上傳訂金憑證' : '立即支付' }}</button>
            <button
              v-if="detailOrder.status === 'confirmed' && detailOrder.type === 'reservation_deposit'"
              class="btn-action confirm"
              :disabled="uploadingReceipt === detailOrder.id"
              @click="triggerBalanceUpload(detailOrder.id)"
            >上傳尾款憑證</button>
            <button
              v-if="detailOrder.status === 'shipped' && detailOrder.type !== 'reservation_deposit'"
              class="btn-action confirm"
              @click="handleReceive(detailOrder.id)"
            >確認收貨</button>
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

    <!-- 預約攞貨彈窗 -->
    <div v-if="showPickupModal" class="modal-overlay" @click.self="cancelReserve">
      <div class="pickup-modal">
        <div class="modal-header">
          <h3>📦 預約攞貨</h3>
          <button @click="cancelReserve" class="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <div v-if="pickupInfo" class="pickup-info">{{ pickupInfo }}</div>
          <div v-else class="pickup-empty">商家尚未設定預約資訊</div>
          <img v-if="pickupQrCode" :src="resolveImageUrl(pickupQrCode)" alt="WeChat 二維碼" class="qr-code" />
        </div>
        <div class="modal-footer">
          <button @click="cancelReserve" class="btn-cancel">返回</button>
          <button @click="confirmReserve" class="btn-confirm" :disabled="submittingReserve">
            {{ submittingReserve ? '確認中...' : '確認預約' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.orders-management { display: flex; flex-direction: column; gap: var(--space-4); }

/* ===== 統計條（同 seller）===== */
.summary-bar { display: flex; gap: var(--space-3); flex-wrap: wrap; }
.stat-item {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  min-width: 0;
}
.stat-label { font-size: var(--text-xs); color: var(--text-secondary); }
.stat-value { font-size: var(--text-lg); font-weight: 700; font-family: var(--font-num); color: var(--text-primary); }
.stat-value small { font-size: var(--text-xs); font-weight: 400; color: var(--text-secondary); }
.stat-value.money { color: #10b981; }
.stat-item.alert { border-color: #f59e0b; background: rgba(245, 158, 11, 0.08); }
.stat-item.alert .stat-value { color: #f59e0b; }

/* ===== tabs（同 seller list-tab）===== */
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
.list-tab.active { background: var(--primary-gradient); border: none; color: white; }
.tab-count {
  padding: 1px 8px;
  border-radius: var(--radius-full);
  background: rgba(0, 0, 0, 0.15);
  font-size: var(--text-xs);
  font-weight: 600;
}
.list-tab:not(.active) .tab-count { background: var(--bg-elevated); color: var(--text-secondary); }

/* ===== 搜尋 ===== */
.search-row { display: flex; gap: var(--space-2); align-items: center; }
.search-input {
  flex: 1;
  max-width: 420px;
  min-width: 0;
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

.btn-primary {
  padding: var(--space-3) var(--space-6);
  background: var(--primary-gradient);
  border-radius: var(--radius-lg);
  color: white;
  font-weight: 600;
  text-decoration: none;
  display: inline-block;
}

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
.amount { font-family: var(--font-num); font-weight: 600; color: var(--primary); white-space: nowrap; }
.cell-sub { font-size: var(--text-xs); color: var(--text-secondary); margin-top: 2px; font-family: var(--font-num); }
.date { font-size: var(--text-xs); color: var(--text-muted); white-space: nowrap; }
.cell-muted { color: var(--text-secondary); opacity: 0.5; }
.next-hint { font-size: var(--text-xs); color: #f59e0b; font-weight: 600; white-space: nowrap; }
.actions-cell { display: flex; gap: 6px; flex-wrap: wrap; }

/* 類型 tag（同 seller 色制）*/
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
.st-pending { background: #f59e0b4d; color: #f59e0b; }
.st-pending-paid { background: #fb923c4d; color: #fb923c; }
.st-confirmed { background: #10b9814d; color: #10b981; }
.st-shipped { background: #8b5cf64d; color: #8b5cf6; }
.st-delivered { background: #10b98166; color: #059669; }
.st-cancelled, .st-refunded { background: #ef44444d; color: #ef4444; }
.st-default { background: #6b72804d; color: #6b7280; }

.btn-action {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}
.btn-action.confirm { background: #10b981; color: white; }
.btn-action.confirm:hover:not(:disabled) { background: #059669; }
.btn-action.detail { background: var(--bg-elevated); color: var(--text-primary); }
.btn-action.detail:hover { background: var(--primary); color: white; }
.btn-action:disabled { opacity: 0.5; cursor: not-allowed; }

/* ===== 手機卡片（<768px 才顯示）===== */
.orders-cards { display: none; }

/* ===== 分頁 ===== */
.pagination { display: flex; align-items: center; justify-content: center; gap: var(--space-4); }
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
.dg-value.mono { font-family: var(--font-num); letter-spacing: 0.5px; }
.detail-actions { display: flex; gap: var(--space-3); flex-wrap: wrap; }
.detail-actions .btn-action { padding: var(--space-2) var(--space-5); font-size: var(--text-sm); }
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
.pickup-modal {
  width: min(480px, 100%);
  max-height: 85vh;
  overflow-y: auto;
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  border: 1px solid var(--border);
}
.modal-body {
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
}
.receipt-image { max-width: 100%; max-height: 70vh; border-radius: var(--radius-lg); }
.pickup-info { font-size: var(--text-sm); color: var(--text-primary); white-space: pre-wrap; width: 100%; }
.pickup-empty { font-size: var(--text-sm); color: var(--text-muted); }
.qr-code { max-width: 180px; border-radius: var(--radius-lg); border: 1px solid var(--border); }
.modal-footer {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--border);
}
.btn-cancel, .btn-confirm {
  flex: 1;
  padding: var(--space-3);
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  border: none;
}
.btn-cancel { background: var(--bg-elevated); color: var(--text-primary); }
.btn-confirm { background: var(--primary-gradient); color: white; }
.btn-confirm:disabled { opacity: 0.5; cursor: not-allowed; }

/* Toast */
.toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: 8px;
  background: var(--primary-gradient);
  color: white;
  font-size: 14px;
  font-weight: 500;
  z-index: 9999;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
.toast.error { background: #ef4444; }
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(-10px); }

/* ===== 手機版適配（<768px：表格收起，顯示卡片）===== */
@media (max-width: 767px) {
  .orders-management,
  .summary-bar,
  .stat-item,
  .list-tabs,
  .search-row,
  .search-input,
  .pagination {
    min-width: 0;
  }

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
  .stat-item { flex: 1 1 40%; padding: var(--space-2) var(--space-3); }
  .stat-value { font-size: var(--text-base); }
  .list-tabs { gap: var(--space-1); }
  .list-tab { padding: var(--space-1) var(--space-3); font-size: var(--text-xs); }
  .detail-grid { grid-template-columns: 1fr; }
  .modal-overlay { align-items: flex-end; padding: 0; }
  .detail-modal, .receipt-modal, .pickup-modal {
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