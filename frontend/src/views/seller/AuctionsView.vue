<script setup lang="ts">
import { formatPrice, formatDate, formatDateTime } from '@/utils/format'
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { productApi } from '@/api/products'
import { auctionApi } from '@/api/auctions'
import { reservationApi } from '@/api/reservations'
import { ordersApi } from '@/api/orders'
import { cartApi } from '@/api/cart'
import ProductFormModal from '@/components/seller/ProductFormModal.vue'
import { CategoryLogo, CATEGORY_OPTIONS } from '@/components/brand/CategoryLogos'

const router = useRouter()
const route = useRoute()

// ===== 三個分頁：拍賣 / 預訂 / 銷售 =====
type TabKey = 'auction' | 'reservation' | 'sale'
const activeTab = ref<TabKey>('auction')

const tabs: { key: TabKey; label: string; icon: string }[] = [
  { key: 'auction', label: '拍賣', icon: '🔨' },
  { key: 'reservation', label: '預訂', icon: '📅' },
  { key: 'sale', label: '銷售', icon: '🏷️' },
]

const loading = ref(true)
const error = ref('')

// ===== 訂單資料（一次載入，三個 tab 共用統計） =====
interface OrderRow {
  id: string
  orderNumber: string
  productId: string
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
  paymentMethod?: string
  paymentTime?: string
  shippingTime?: string
  deliveryTime?: string
  notes?: string
}

const orders = ref<OrderRow[]>([])

const parseImages = (images: any): string[] => {
  if (Array.isArray(images)) return images
  try { const arr = JSON.parse(images); return Array.isArray(arr) ? arr : [] } catch { return [] }
}

const resolveImage = (url: string) => {
  if (!url) return ''
  if (url.startsWith('data:') || url.startsWith('http')) return url
  return (import.meta.env.VITE_API_URL || '') + url
}

const mapOrder = (o: any): OrderRow => {
  const imgs = parseImages(o.product?.images)
  const isReservation = o.type === 'reservation_deposit'
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    productId: o.productId || '',
    productTitle: o.product?.titleZh || o.product?.titleEn || '未知商品',
    productImage: imgs[0] || '',
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
    paymentMethod: o.paymentMethod || undefined,
    paymentTime: o.paymentTime || undefined,
    shippingTime: o.shippingTime || undefined,
    deliveryTime: o.deliveryTime || undefined,
    notes: o.notes || undefined,
  }
}

// orders = {data,total} 包裝；limit=200 拉全部再前端分組統計
const loadOrders = async () => {
  try {
    const res = await ordersApi.getSellerOrders(1, 200)
    orders.value = (res.data?.data || []).map(mapOrder)
  } catch (e) {
    console.error('Failed to load orders', e)
    orders.value = []
  }
}

// ===== 商品行 =====
interface Row {
  id: string
  productId: string
  title: string
  productNumber: string
  image: string
  category: string
  price: string          // 主價（拍賣=當前價 / 預訂=訂金 / 銷售=售價）
  priceValue: number     // 排序用數值
  priceLabel: string
  extra: string          // 輔助資訊（出價數/庫存）
  status: string         // 狀態 badge
  statusKey: string
  timeText: string       // 截止時間 / 到期時間
  timeValue: number      // 排序用 timestamp（0 = 無時間）
  createdValue: number   // 上架時間（預設排序用）
  // —— 訂單統計（由 orders 前端分組計出）——
  orderCount: number     // 有效訂單筆數（剔除 cancelled）
  pendingCount: number   // 待處理（等確認收款/等確認訂金/待發貨）
  receivedValue: number  // 已收款（confirmed/shipped/delivered）
  totalValue: number     // 總額（全部有效訂單）
  raw: any               // 原始商品資料（詳情/編輯用）
}

const rows = ref<Row[]>([])
const counts = ref<Record<TabKey, number>>({ auction: 0, reservation: 0, sale: 0 })

// ===== 訂單統計 helper =====
const DONE_STATUSES = ['confirmed', 'shipped', 'delivered']
const PENDING_ACTION_STATUSES = ['pending_paid', 'paid', 'confirmed']

const orderStatsFor = (pid: string) => {
  const os = orders.value.filter(o => o.productId === pid && o.status !== 'cancelled')
  const received = os
    .filter(o => DONE_STATUSES.includes(o.status))
    .reduce((s, o) => s + o.amount, 0)
  const pending = orders.value.filter(
    o => o.productId === pid && PENDING_ACTION_STATUSES.includes(o.status)
  ).length
  return {
    orderCount: os.length,
    pendingCount: pending,
    receivedValue: received,
    totalValue: os.reduce((s, o) => s + o.amount, 0),
  }
}

// 某商品嘅訂單列表（展開面板用，最新在前）
const productOrders = (pid: string): OrderRow[] =>
  orders.value
    .filter(o => o.productId === pid)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

// ===== 搜尋 / 分頁 / 排序 =====
const PAGE_SIZE = 20
const searchQuery = ref('')
const currentPage = ref(1)
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')

const categories: Record<string, string> = {
  pokemon: '🎯', yugioh: '🎯', onepiece: '🎯',
  sports: '⚽', other: '🎴',
}

// ===== 排序欄定義（隨分頁切換 label；商品/操作欄以外全部可排序） =====
const sortableColumns = computed(() => {
  const cols: { key: string; label: string; type: 'text' | 'number' | 'time' }[] = [
    { key: 'title', label: '商品', type: 'text' },
    {
      key: 'priceValue',
      label: activeTab.value === 'auction' ? '當前價' : activeTab.value === 'reservation' ? '訂金' : '售價',
      type: 'number',
    },
    { key: 'orderCount', label: '訂單', type: 'number' },
    { key: 'pendingCount', label: '待處理', type: 'number' },
    { key: 'receivedValue', label: '收款/總額', type: 'number' },
    { key: 'status', label: '狀態', type: 'text' },
    {
      key: 'timeValue',
      label: activeTab.value === 'auction' ? '截止時間' : activeTab.value === 'reservation' ? '預約截止' : '時間',
      type: 'time',
    },
  ]
  return cols
})

const TOTAL_COLS = 8

const toggleSort = (key: string) => {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
  currentPage.value = 1
}

// 比較器：數字/時間按大小，文字按 UTF-16 二進碼（code unit）順序
const compareRows = (a: Row, b: Row, col: { key: string; type: string }): number => {
  let cmp = 0
  if (col.type === 'number' || col.type === 'time') {
    cmp = (Number((a as any)[col.key]) || 0) - (Number((b as any)[col.key]) || 0)
  } else {
    const as = String((a as any)[col.key] ?? '')
    const bs = String((b as any)[col.key] ?? '')
    cmp = as < bs ? -1 : as > bs ? 1 : 0
  }
  return sortDir.value === 'asc' ? cmp : -cmp
}

// ===== 拍賣分頁：GET /auctions/seller/my =====
// ⚠️ 同一商品可能有多條 auction 記錄（舊場 cancelled + 重開場）— 按 productId 去重，
// 每件商品只顯示一行，保留最活躍記錄：active > pending > ended > cancelled，同優先級取最新
const AUCTION_PRIORITY: Record<string, number> = { active: 4, pending: 3, ended: 2, cancelled: 1 }

const loadAuctionRows = async () => {
  const res = await auctionApi.getMyAuctions({ limit: 200 })
  const list = res.data?.data || []

  // 按 productId 去重：優先級高者勝，同級取 createdAt 最新
  const byProduct = new Map<string, any>()
  for (const a of list) {
    const pid = a.productId
    if (!pid) continue
    const existing = byProduct.get(pid)
    if (!existing) {
      byProduct.set(pid, a)
      continue
    }
    const pa = AUCTION_PRIORITY[(a.status || '').toLowerCase()] ?? 0
    const pe = AUCTION_PRIORITY[(existing.status || '').toLowerCase()] ?? 0
    if (pa > pe) {
      byProduct.set(pid, a)
    } else if (pa === pe && new Date(a.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
      byProduct.set(pid, a)
    }
  }

  return Array.from(byProduct.values()).map((a: any): Row => {
    const p = a.product || {}
    const imgs = parseImages(p.images)
    const st = (a.status || 'active').toLowerCase()
    const stats = orderStatsFor(a.productId)
    return {
      id: a.id,
      productId: a.productId,
      title: p.titleZh || p.titleEn || '未知商品',
      productNumber: p.productNumber ? `#${p.productNumber}` : '',
      image: resolveImage(imgs[0] || ''),
      category: p.category || 'other',
      price: formatPrice(a.currentPrice),
      priceValue: Number(a.currentPrice) || 0,
      priceLabel: '當前價',
      extra: a.bidCount ? `🔨 ${a.bidCount} 次出價` : '',
      statusKey: st,
      status: st === 'active' ? '進行中' : st === 'pending' ? '待開始' : st === 'ended' ? '已結束' : '已取消',
      timeText: a.endTime ? formatDateTime(a.endTime) : '',
      timeValue: a.endTime ? new Date(a.endTime).getTime() : 0,
      createdValue: a.createdAt ? new Date(a.createdAt).getTime() : 0,
      raw: { ...p, listingType: 'auction' },
      ...stats,
    }
  })
}

// ===== 預訂分頁：全部 listingType=reservation 商品（含 0 預約）+ 預約記錄合併 =====
const loadReservationRows = async () => {
  // 並行拉：預約記錄（訂單數統計）+ 全部預訂商品（補 0 預約商品）
  const [resRes, prodRes] = await Promise.all([
    reservationApi.getSellerReservations(),
    productApi.getMyProducts({ limit: 200 }),
  ])
  const list = resRes.data?.data || resRes.data || []
  const prodList = (Array.isArray(prodRes.data) ? prodRes.data : (prodRes.data as any)?.data) || []
  const reservationProducts = prodList.filter((p: any) => p.listingType === 'reservation')

  // 按 productId 合併預約記錄（同一商品多名買家）
  const byProduct = new Map<string, { product: any; count: number; qty: number; latest: any }>()
  for (const r of list) {
    const p = r.product || {}
    const key = r.productId
    const entry = byProduct.get(key) || { product: p, count: 0, qty: 0, latest: r }
    entry.count++
    entry.qty += r.quantity || 1
    byProduct.set(key, entry)
  }

  // 以商品為主行：有預約記錄用記錄統計，0 預約顯示 0 單
  return reservationProducts.map((p: any): Row => {
    const imgs = parseImages(p.images)
    const entry = byProduct.get(p.id)
    const st = entry?.latest.status?.toLowerCase() || 'none'
    const stats = orderStatsFor(p.id)
    return {
      id: entry?.latest.id || p.id,
      productId: p.id,
      title: p.titleZh || p.titleEn || '未知商品',
      productNumber: p.productNumber ? `#${p.productNumber}` : '',
      image: resolveImage(imgs[0] || ''),
      category: p.category || 'other',
      price: formatPrice(p.reservationDeposit ?? entry?.latest.depositAmount ?? 0),
      priceValue: Number(p.reservationDeposit ?? entry?.latest.depositAmount) || 0,
      priceLabel: '訂金',
      extra: entry ? `已訂 ${entry.count} 單 / ${entry.qty} 件` : '暫無預約',
      statusKey: st === 'deposit_paid' ? 'confirmed' : st === 'none' ? 'active' : st,
      status: st === 'deposit_paid' ? '已付訂金' : st === 'pending' ? '待付訂金' : st === 'confirmed' ? '已確認' : st === 'completed' ? '已完成' : st === 'cancelled' ? '已取消' : st === 'expired' ? '已過期' : '接受預約中',
      timeText: p.reservationDeadline ? `截止 ${formatDate(p.reservationDeadline)}` : '',
      timeValue: p.reservationDeadline ? new Date(p.reservationDeadline).getTime() : 0,
      createdValue: p.createdAt ? new Date(p.createdAt).getTime() : 0,
      raw: { ...p, listingType: 'reservation' },
      ...stats,
    }
  })
}

// ===== 銷售分頁：GET /products/seller（listingType=sale）=====
const loadSaleRows = async () => {
  const res = await productApi.getMyProducts({ limit: 200 })
  const list = (Array.isArray(res.data) ? res.data : (res.data as any)?.data) || []
  return list
    .filter((p: any) => (p.listingType || 'sale') === 'sale')
    .map((p: any): Row => {
      const imgs = parseImages(p.images)
      const st = p.status || 'active'
      const stats = orderStatsFor(p.id)
      return {
        id: p.id,
        productId: p.id,
        title: p.titleZh || p.titleEn || '未知商品',
        productNumber: p.productNumber ? `#${p.productNumber}` : '',
        image: resolveImage(imgs[0] || ''),
        category: p.category || 'other',
        price: formatPrice(p.price),
        priceValue: Number(p.price) || 0,
        priceLabel: '售價',
        extra: `庫存 ${p.quantity ?? p.stock ?? 0}`,
        statusKey: st,
        status: st === 'active' ? '在售' : st === 'draft' ? '草稿' : st === 'sold' ? '已售' : st === 'removed' ? '已下架' : st,
        timeText: p.createdAt ? formatDate(p.createdAt) : '',
        timeValue: 0,
        createdValue: p.createdAt ? new Date(p.createdAt).getTime() : 0,
        raw: p,
        ...stats,
      }
    })
}

const loadTab = async () => {
  loading.value = true
  error.value = ''
  try {
    // 訂單先載（統計依賴），再載當前 tab 商品列
    await loadOrders()
    if (activeTab.value === 'auction') rows.value = await loadAuctionRows()
    else if (activeTab.value === 'reservation') rows.value = await loadReservationRows()
    else rows.value = await loadSaleRows()
  } catch (e: any) {
    console.error('Failed to load list:', e)
    error.value = e.response?.data?.message || '載入失敗，請重試'
    rows.value = []
  } finally {
    loading.value = false
  }
}

// 操作後刷新（唔閃 loading）
const refreshData = async () => {
  try {
    await loadOrders()
    if (activeTab.value === 'auction') rows.value = await loadAuctionRows()
    else if (activeTab.value === 'reservation') rows.value = await loadReservationRows()
    else rows.value = await loadSaleRows()
  } catch { /* 靜默 */ }
}

const switchTab = (key: TabKey) => {
  if (activeTab.value === key) return
  activeTab.value = key
  // 切分頁：重置搜尋/排序/頁碼/展開（欄位定義不同）
  searchQuery.value = ''
  sortKey.value = ''
  sortDir.value = 'asc'
  currentPage.value = 1
  expandedId.value = ''
  loadTab()
}

// ===== 過濾 → 排序 → 分頁 =====
const filteredRows = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return rows.value
  return rows.value.filter(r =>
    r.title.toLowerCase().includes(q) ||
    r.status.toLowerCase().includes(q)
  )
})

const sortedRows = computed(() => {
  const col = sortableColumns.value.find(c => c.key === sortKey.value)
  const base = [...filteredRows.value]
  if (!col) {
    // 預設排序：待處理多 → 最新上架
    return base.sort((a, b) =>
      (b.pendingCount - a.pendingCount) || (b.createdValue - a.createdValue)
    )
  }
  return base.sort((a, b) => compareRows(a, b, col))
})

// ===== 頂部統計條（當前 tab）=====
const summary = computed(() => {
  const rs = filteredRows.value
  return {
    products: rs.length,
    orders: rs.reduce((s, r) => s + r.orderCount, 0),
    pending: rs.reduce((s, r) => s + r.pendingCount, 0),
    received: rs.reduce((s, r) => s + r.receivedValue, 0),
  }
})

const totalPages = computed(() => Math.max(1, Math.ceil(sortedRows.value.length / PAGE_SIZE)))

const pagedRows = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return sortedRows.value.slice(start, start + PAGE_SIZE)
})

const goToPage = (p: number) => {
  if (p < 1 || p > totalPages.value) return
  currentPage.value = p
}

// 搜尋變更 → 回第一頁
watch(searchQuery, () => { currentPage.value = 1 })

// 初始載入三個 tab 數量（拍賣即時載，其餘兩個並行統計）
const loadCounts = async () => {
  try {
    const [a, p] = await Promise.all([
      auctionApi.getMyAuctions({ limit: 200 }),
      productApi.getMyProducts({ limit: 200 }),
    ])
    const pl = (Array.isArray(p.data) ? p.data : (p.data as any)?.data) || []
    counts.value = {
      auction: (a.data?.data || []).length,
      // 預訂 = 全部 listingType=reservation 商品數（與下方列表行數一致，含 0 預約商品）
      reservation: pl.filter((x: any) => x.listingType === 'reservation').length,
      sale: pl.filter((x: any) => (x.listingType || 'sale') === 'sale').length,
    }
  } catch { /* counts 非關鍵 */ }
}

const getStatusClass = (key: string) => {
  const map: Record<string, string> = {
    active: 'active', confirmed: 'active',
    pending: 'pending', deposit_paid: 'pending',
    ended: 'ended', completed: 'ended', sold: 'ended',
    cancelled: 'cancelled', removed: 'cancelled', expired: 'cancelled',
    draft: 'pending',
  }
  return map[key] || 'ended'
}

// ===== 行內展開 =====
const expandedId = ref('')
const toggleExpand = (row: Row) => {
  expandedId.value = expandedId.value === row.productId ? '' : row.productId
}

// ===== 訂單類型 / 狀態 / 下一步 =====
const ORDER_TYPE: Record<string, { text: string; cls: string }> = {
  direct_purchase: { text: '直購', cls: 't-sale' },
  buy_now: { text: '拍賣直購', cls: 't-auction' },
  auction_win: { text: '拍賣得標', cls: 't-auction' },
  reservation_deposit: { text: '預約訂金', cls: 't-reserve' },
  reservation_full: { text: '預約尾款', cls: 't-reserve' },
}
const typeTag = (type: string) => ORDER_TYPE[type] || { text: type, cls: 't-sale' }

const ORDER_STATUS: Record<string, { cls: string; text: string }> = {
  pending: { cls: 'st-pending', text: '待付款' },
  pending_paid: { cls: 'st-pending-paid', text: '待確認' },
  paid: { cls: 'st-paid', text: '已付款' },
  confirmed: { cls: 'st-confirmed', text: '已確認' },
  shipped: { cls: 'st-shipped', text: '已發貨' },
  delivered: { cls: 'st-delivered', text: '已完成' },
  cancelled: { cls: 'st-cancelled', text: '已取消' },
  refunded: { cls: 'st-cancelled', text: '已退款' },
}
const orderStatus = (s: string) => ORDER_STATUS[s] || { cls: 'st-cancelled', text: s }

const nextStepFor = (o: OrderRow): string => {
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

// ===== 訂單操作（同 OrdersView 邏輯）=====
const processingId = ref<string | null>(null)

const handleConfirmPayment = async (orderId: string) => {
  if (!confirm('確認已收到付款？')) return
  processingId.value = orderId
  try {
    await cartApi.confirmPayment(orderId)
    await refreshData()
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
    await refreshData()
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
    await refreshData()
    alert('已確認收到尾款，交易完成！')
  } catch (e) {
    console.error('Failed to confirm balance:', e)
    alert('操作失敗，請重試')
  } finally {
    processingId.value = null
  }
}

const handleShip = async (orderId: string) => {
  if (!confirm('確認已發貨？')) return
  processingId.value = orderId
  try {
    await ordersApi.updateStatus(orderId, 'shipped')
    await refreshData()
    alert('已標記發貨！')
  } catch (e) {
    console.error('Failed to ship:', e)
    alert('操作失敗，請重試')
  } finally {
    processingId.value = null
  }
}

const handleCancel = async (orderId: string) => {
  if (!confirm('確認取消此訂單？')) return
  processingId.value = orderId
  try {
    await ordersApi.updateStatus(orderId, 'cancelled')
    await refreshData()
    alert('訂單已取消')
  } catch (e) {
    console.error('Failed to cancel:', e)
    alert('操作失敗，請重試')
  } finally {
    processingId.value = null
  }
}

// ===== 憑證大圖 Modal =====
const showReceiptModal = ref(false)
const receiptImageUrl = ref('')
const viewReceipt = (url?: string) => {
  if (!url) return
  receiptImageUrl.value = url
  showReceiptModal.value = true
}

// ===== 訂單詳情彈出層 =====
const detailOrder = ref<OrderRow | null>(null)
const openOrderDetail = (o: OrderRow) => { detailOrder.value = o }
const closeOrderDetail = () => { detailOrder.value = null }

// 詳情彈出層時間線
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
  // 預約單：尾款憑證時間補入
  if (o.type === 'reservation_deposit' && o.balanceTime) {
    items[2] = { label: '收款確認（含尾款）', time: o.balanceTime, done: true }
  }
  return items
})

// ===== 商品編輯 / 刪除 / 商品詳情（合併自 ProductsView）=====
const formOpen = ref(false)
const formProduct = ref<any>(null)
const openEdit = (row: Row) => { formProduct.value = row.raw; formOpen.value = true }

// 詳情層「編輯此商品」：先抓快照、關詳情層、再開表單（同一函數保證 product 賦值先於 open）
const openEditFromDetail = () => {
  const snapshot = detailProduct.value
  detailProduct.value = null
  formProduct.value = snapshot
  formOpen.value = true
}

const onFormSaved = async () => {
  // 表單保存成功 → 刷新商品列+訂單統計
  await refreshData()
  loadCounts()
}

const handleDelete = async (row: Row) => {
  if (!confirm(`確定要刪除此商品（${row.title}）嗎？`)) return
  try {
    await productApi.deleteProduct(row.productId)
    await refreshData()
    loadCounts()
    alert('商品已刪除')
  } catch (e: any) {
    console.error('Failed to delete product:', e)
    const msg = e?.response?.data?.message || '刪除失敗（商品可能有活躍拍賣/預約/未完成訂單）'
    alert(msg)
  }
}

// ===== 商品規格詳情彈出層 =====
const detailProduct = ref<any>(null)
const openDetail = (row: Row) => { detailProduct.value = row.raw }
const closeDetail = () => { detailProduct.value = null }

const PRODUCT_TYPE_TEXT: Record<string, string> = {
  graded_card: '評分卡',
  original_box: '原箱',
  original_case: '原盒',
  original_bag: '原袋',
  raw_card: '裸卡',
  other: '其它',
}

const LANGUAGE_TEXT: Record<string, string> = {
  japanese: '日文',
  english: '英文',
  traditional_chinese: '繁體中文',
  simplified_chinese: '簡體中文',
  korean: '韓文',
  other: '其他',
}

const CONDITION_TEXT: Record<string, string> = {
  S: 'S級 - 完美品相',
  A: 'A級 - 輕微瑕疵',
  B: 'B級 - 少量瑕疵',
  C: 'C級 - 磨損可見',
  D: 'D級 - 嚴重磨損',
}

const CATEGORY_TEXT: Record<string, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map((c: any) => [c.value, c.label])
)

onMounted(() => {
  loadTab()
  loadCounts()
  // query 開表單：?action=create（Dashboard 快捷）或 ?action=edit&id=xxx（舊商品管理連結）
  if (route.query.action === 'create') {
    router.replace({ query: {} })
    formProduct.value = null
    formOpen.value = true
  } else if (route.query.action === 'edit' && route.query.id) {
    const pid = String(route.query.id)
    router.replace({ query: {} })
    // 列表載入後取商品資料開表單
    productApi.getProduct(pid).then((res) => {
      formProduct.value = res.data
      formOpen.value = true
    }).catch(() => { /* 商品取不到靜默 */ })
  }
})

const goCreate = () => { formProduct.value = null; formOpen.value = true }
const goOrdersPage = (pid: string) => router.push(`/seller/orders?productId=${pid}`)
</script>

<template>
  <div class="product-list-management">
    <!-- Tab 分頁 -->
    <div class="list-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="list-tab"
        :class="{ active: activeTab === tab.key }"
        @click="switchTab(tab.key)"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        {{ tab.label }}
        <span class="tab-count">{{ counts[tab.key] }}</span>
      </button>
      <button class="btn-new" @click="goCreate">+ 發布新商品</button>
    </div>

    <!-- 頂部統計條（當前 tab） -->
    <div v-if="!loading && !error && rows.length > 0" class="summary-bar">
      <div class="stat-item">
        <span class="stat-label">商品</span>
        <span class="stat-value">{{ summary.products }} <small>件</small></span>
      </div>
      <div class="stat-item">
        <span class="stat-label">有效訂單</span>
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

    <!-- 關鍵字搜尋 -->
    <div class="search-row">
      <input
        v-model="searchQuery"
        type="text"
        class="search-input"
        placeholder="🔍 搜尋商品名稱或狀態..."
      />
      <button v-if="searchQuery" class="btn-clear-search" @click="searchQuery = ''">✕ 清除</button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>加載中...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button class="btn-retry" @click="loadTab">重試</button>
    </div>

    <!-- Empty (no data at all) -->
    <div v-else-if="rows.length === 0" class="empty-state">
      <div class="empty-icon">{{ activeTab === 'auction' ? '🔨' : activeTab === 'reservation' ? '📅' : '🏷️' }}</div>
      <h3>暫無{{ tabs.find(t => t.key === activeTab)?.label }}商品</h3>
      <p>點击「+ 發布新商品」並選擇對應銷售模式即可創建。</p>
    </div>

    <!-- Empty (search no match) -->
    <div v-else-if="filteredRows.length === 0" class="empty-state">
      <div class="empty-icon">🔍</div>
      <h3>無符合搜尋結果</h3>
      <p>試試其他關鍵字，或清除搜尋查看全部。</p>
    </div>

    <!-- 手機卡片列表（<768px，同訂單管理卡片設計） -->
    <div v-if="!loading && !error && rows.length > 0 && filteredRows.length > 0" class="product-cards">
      <div v-for="row in pagedRows" :key="'m' + activeTab + row.id" class="product-card">
        <div class="pc-top">
          <img v-if="row.image" :src="row.image" class="pc-thumb" :alt="row.title" />
          <span v-else class="pc-emoji">{{ categories[row.category] || '🎴' }}</span>
          <div class="pc-main">
            <div class="pc-title">{{ row.title }}</div>
            <div class="pc-meta">
              <span class="status-badge" :class="getStatusClass(row.statusKey)">{{ row.status }}</span>
              <span v-if="row.productNumber" class="pc-number">{{ row.productNumber }}</span>
            </div>
          </div>
          <div class="pc-amount">
            <div class="pc-price">{{ row.price }}</div>
            <div v-if="row.extra" class="pc-extra">{{ row.extra }}</div>
          </div>
        </div>
        <div class="pc-mid">
          <span class="pc-orders">📋 {{ row.orderCount }} 筆</span>
          <span v-if="row.pendingCount > 0" class="pc-pending">⚠ 待處理 {{ row.pendingCount }}</span>
          <span class="pc-money">已收 {{ formatPrice(row.receivedValue) }}</span>
        </div>
        <div v-if="row.timeText" class="pc-time">🕐 {{ row.timeText }}</div>
        <div class="pc-actions">
          <button class="btn-action detail" @click="openDetail(row)">詳情</button>
          <button v-if="row.raw?.status !== 'sold'" class="btn-action edit" @click="openEdit(row)">編輯</button>
          <button class="btn-action delete" @click="handleDelete(row)">刪除</button>
          <button class="btn-action view" @click="toggleExpand(row)">
            訂單 <span v-if="row.pendingCount > 0" class="btn-dot">{{ row.pendingCount }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- List (table)：桌面 ≥768px -->
    <div v-if="!loading && !error && rows.length > 0 && filteredRows.length > 0" class="list-table">
      <table>
        <thead>
          <tr>
            <th
              v-for="col in sortableColumns"
              :key="col.key"
              class="sortable-th"
              :class="{ sorted: sortKey === col.key }"
              @click="toggleSort(col.key)"
            >
              <span class="th-label">{{ col.label }}</span>
              <span class="sort-arrow" :class="{ active: sortKey === col.key, desc: sortKey === col.key && sortDir === 'desc' }">↕</span>
            </th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="row in pagedRows" :key="activeTab + row.id">
            <!-- 主行 -->
            <tr :class="{ 'row-expanded': expandedId === row.productId }">
              <td>
                <div class="product-cell">
                  <img v-if="row.image" :src="row.image" class="row-thumb" :alt="row.title" />
                  <span v-else class="category-emoji">{{ categories[row.category] || '🎴' }}</span>
                  <div class="product-info">
                    <span class="product-title">{{ row.title }}</span>
                    <span v-if="row.productNumber" class="product-number">{{ row.productNumber }}</span>
                  </div>
                </div>
              </td>
              <td>
                <div class="price-cell highlight">{{ row.price }}</div>
                <div class="cell-sub">
                  <span v-if="row.extra" class="cell-extra">{{ row.extra }}</span>
                  <span class="price-label">{{ row.priceLabel }}</span>
                </div>
              </td>
              <td class="order-count-cell">
                <span v-if="row.orderCount > 0">{{ row.orderCount }} 筆</span>
                <span v-else class="cell-muted">—</span>
              </td>
              <td>
                <span v-if="row.pendingCount > 0" class="pending-badge">{{ row.pendingCount }}</span>
                <span v-else class="cell-muted">—</span>
              </td>
              <td>
                <div class="money-cell">
                  <span class="money-received">已收 {{ formatPrice(row.receivedValue) }}</span>
                  <span class="money-total">總額 {{ formatPrice(row.totalValue) }}</span>
                </div>
              </td>
              <td>
                <span class="status-badge" :class="getStatusClass(row.statusKey)">{{ row.status }}</span>
              </td>
              <td class="time-cell">{{ row.timeText || '—' }}</td>
              <td>
                <div class="actions-cell">
                  <button class="btn-action detail" @click="openDetail(row)">詳情</button>
                  <button v-if="row.raw?.status !== 'sold'" class="btn-action edit" @click="openEdit(row)">編輯</button>
                  <span v-else class="sold-locked" title="已售商品不可編輯">🔒</span>
                  <button class="btn-action delete" @click="handleDelete(row)">刪除</button>
                  <button class="btn-action view" :class="{ active: expandedId === row.productId }" @click="toggleExpand(row)">
                    訂單 <span class="chevron" :class="{ open: expandedId === row.productId }">▾</span>
                    <span v-if="row.pendingCount > 0" class="btn-dot">{{ row.pendingCount }}</span>
                  </button>
                </div>
              </td>
            </tr>
            <!-- 展開行：該商品訂單明細 -->
            <tr v-if="expandedId === row.productId" class="expand-tr">
              <td :colspan="TOTAL_COLS">
                <div class="orders-panel">
                  <div class="panel-header">
                    <span class="panel-title">訂單明細</span>
                    <span class="panel-stats">
                      共 {{ row.orderCount }} 筆
                      <template v-if="row.pendingCount > 0"> · <b class="pending-text">待處理 {{ row.pendingCount }}</b></template>
                      · 已收 {{ formatPrice(row.receivedValue) }} / 總額 {{ formatPrice(row.totalValue) }}
                    </span>
                    <button class="btn-link" @click="goOrdersPage(row.productId)">完整訂單頁 ↗</button>
                  </div>

                  <div v-if="row.orderCount === 0" class="panel-empty">
                    此商品暫無有效訂單
                  </div>

                  <div v-else class="order-items">
                    <div v-for="o in productOrders(row.productId)" :key="o.id" class="order-item">
                      <!-- 欄 1：訂單號 + 類型 + 狀態 -->
                      <div class="oi-col oi-main">
                        <span class="type-tag" :class="typeTag(o.type).cls">{{ typeTag(o.type).text }}</span>
                        <span class="order-status-badge" :class="orderStatus(o.status).cls">{{ orderStatus(o.status).text }}</span>
                      </div>
                      <!-- 欄 2：買家 -->
                      <div class="oi-col oi-buyer">
                        <div class="buyer-name">{{ o.buyerNickname }}</div>
                        <div class="buyer-email">{{ o.buyerEmail }}</div>
                      </div>
                      <!-- 欄 3：數量 + 金額 -->
                      <div class="oi-col oi-amount">
                        <div class="oi-qty">x{{ o.quantity }}</div>
                        <template v-if="o.type === 'reservation_deposit'">
                          <div class="oi-money">訂金 {{ formatPrice(o.amount) }}</div>
                          <div v-if="o.fullPrice" class="oi-money-sub">尾款 {{ formatPrice(o.fullPrice - o.amount) }}</div>
                        </template>
                        <div v-else class="oi-money">{{ formatPrice(o.amount) }}</div>
                      </div>
                      <!-- 欄 4：憑證 -->
                      <div class="oi-col oi-receipts">
                        <img
                          v-if="o.transferReceipt"
                          :src="resolveImage(o.transferReceipt)"
                          class="receipt-thumb"
                          title="訂金/付款憑證"
                          @click="viewReceipt(o.transferReceipt)"
                          alt="付款憑證"
                        />
                        <img
                          v-if="o.balanceReceipt"
                          :src="resolveImage(o.balanceReceipt)"
                          class="receipt-thumb"
                          title="尾款憑證"
                          @click="viewReceipt(o.balanceReceipt)"
                          alt="尾款憑證"
                        />
                        <span v-if="!o.transferReceipt && !o.balanceReceipt" class="cell-muted">無憑證</span>
                      </div>
                      <!-- 欄 5：下一步提示 -->
                      <div class="oi-col oi-next">
                        <span v-if="nextStepFor(o)" class="next-hint">{{ nextStepFor(o) }}</span>
                        <span v-else class="cell-muted">—</span>
                      </div>
                      <!-- 欄 6：操作 -->
                      <div class="oi-col oi-actions">
                        <button
                          v-if="o.status === 'pending_paid' && o.type === 'reservation_deposit'"
                          class="btn-action confirm"
                          :disabled="processingId === o.id"
                          @click="handleConfirmDeposit(o.id)"
                        >{{ processingId === o.id ? '處理中...' : '確認收到訂金' }}</button>
                        <button
                          v-else-if="o.status === 'pending_paid'"
                          class="btn-action confirm"
                          :disabled="processingId === o.id"
                          @click="handleConfirmPayment(o.id)"
                        >{{ processingId === o.id ? '處理中...' : '確認收款' }}</button>
                        <button
                          v-if="o.status === 'confirmed' && o.type === 'reservation_deposit'"
                          class="btn-action confirm"
                          :disabled="processingId === o.id"
                          @click="handleConfirmBalance(o.id)"
                        >{{ processingId === o.id ? '處理中...' : '確認收到尾款' }}</button>
                        <button
                          v-else-if="o.status === 'confirmed'"
                          class="btn-action ship"
                          :disabled="processingId === o.id"
                          @click="handleShip(o.id)"
                        >{{ processingId === o.id ? '處理中...' : '發貨' }}</button>
                        <button
                          v-if="o.status === 'pending_paid' && o.type !== 'reservation_deposit'"
                          class="btn-action cancel"
                          :disabled="processingId === o.id"
                          @click="handleCancel(o.id)"
                        >取消</button>
                        <button class="btn-action detail" @click="openOrderDetail(o)">詳情</button>
                      </div>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- 分頁 -->
    <div v-if="!loading && !error && sortedRows.length > 0" class="pagination">
      <button class="page-btn" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">‹ 上一頁</button>
      <span class="page-info">第 {{ currentPage }} / {{ totalPages }} 頁 · 共 {{ sortedRows.length }} 件</span>
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
            <span class="type-tag" :class="typeTag(detailOrder.type).cls">{{ typeTag(detailOrder.type).text }}</span>
            <span class="order-status-badge" :class="orderStatus(detailOrder.status).cls">{{ orderStatus(detailOrder.status).text }}</span>
          </div>

          <div class="detail-grid">
            <div class="dg-item">
              <span class="dg-label">買家</span>
              <span class="dg-value">
                {{ detailOrder.buyerNickname }}
                <small>{{ detailOrder.buyerEmail }}</small>
              </span>
            </div>
            <div class="dg-item">
              <span class="dg-label">商品</span>
              <span class="dg-value">{{ detailOrder.productTitle }}</span>
            </div>
            <div class="dg-item">
              <span class="dg-label">數量</span>
              <span class="dg-value">x{{ detailOrder.quantity }}（單價 {{ formatPrice(detailOrder.unitPrice) }}）</span>
            </div>
            <div class="dg-item">
              <span class="dg-label">金額</span>
              <span class="dg-value">
                <template v-if="detailOrder.type === 'reservation_deposit'">
                  訂金 {{ formatPrice(detailOrder.amount) }}
                  <span v-if="detailOrder.fullPrice" class="dg-sub">＋尾款 {{ formatPrice(detailOrder.fullPrice - detailOrder.amount) }}＝全價 {{ formatPrice(detailOrder.fullPrice) }}</span>
                </template>
                <template v-else>{{ formatPrice(detailOrder.amount) }}</template>
              </span>
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
              <img :src="resolveImage(detailOrder.transferReceipt)" class="receipt-thumb lg" @click="viewReceipt(detailOrder.transferReceipt)" alt="付款憑證" />
            </div>
            <div v-if="detailOrder.balanceReceipt" class="dr-item">
              <span class="dg-label">尾款憑證</span>
              <img :src="resolveImage(detailOrder.balanceReceipt)" class="receipt-thumb lg" @click="viewReceipt(detailOrder.balanceReceipt)" alt="尾款憑證" />
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
          <img :src="resolveImage(receiptImageUrl)" alt="轉帳憑證" class="receipt-image" />
        </div>
      </div>
    </div>
  </div>

  <!-- 商品規格詳情彈出層（合併自商品管理） -->
  <div v-if="detailProduct" class="modal-overlay" @click.self="closeDetail">
    <div class="detail-modal product-detail-modal">
      <div class="modal-header">
        <h3>商品詳情</h3>
        <button @click="closeDetail" class="modal-close">✕</button>
      </div>
      <div class="detail-body">
        <div class="detail-top">
          <span v-if="detailProduct.productNumber" class="detail-number">#{{ detailProduct.productNumber }}</span>
        </div>

        <div class="detail-product">
          <img v-if="parseImages(detailProduct.images)[0]" :src="resolveImage(parseImages(detailProduct.images)[0])" class="detail-thumb" :alt="detailProduct.titleZh" />
          <span v-else class="pd-emoji"><CategoryLogo :category="detailProduct.category" :size="26" /></span>
          <div class="dp-info">
            <span class="dp-title">{{ detailProduct.titleZh || detailProduct.titleEn }}</span>
            <span class="dp-sub">{{ detailProduct.titleEn }}</span>
          </div>
          <div class="dp-amount">
            <div class="amount">{{ formatPrice(detailProduct.price) }}</div>
          </div>
        </div>

        <div class="detail-grid">
          <div class="dg-item">
            <span class="dg-label">類別</span>
            <span class="dg-value">{{ CATEGORY_TEXT[detailProduct.category] || detailProduct.category }}</span>
          </div>
          <div class="dg-item">
            <span class="dg-label">品相</span>
            <span class="dg-value">{{ detailProduct.condition ? (CONDITION_TEXT[detailProduct.condition] || detailProduct.condition) : '不指定' }}</span>
          </div>
          <div class="dg-item">
            <span class="dg-label">商品種類</span>
            <span class="dg-value">{{ PRODUCT_TYPE_TEXT[detailProduct.productType] || '不指定' }}</span>
          </div>
          <div class="dg-item">
            <span class="dg-label">語言</span>
            <span class="dg-value">{{ LANGUAGE_TEXT[detailProduct.language] || '不指定' }}</span>
          </div>
          <div class="dg-item">
            <span class="dg-label">庫存</span>
            <span class="dg-value">{{ detailProduct.quantity ?? 0 }} 件</span>
          </div>
          <div class="dg-item">
            <span class="dg-label">上架時間</span>
            <span class="dg-value">{{ formatDate(detailProduct.createdAt) }}</span>
          </div>
          <div class="dg-item">
            <span class="dg-label">瀏覽</span>
            <span class="dg-value">{{ detailProduct.viewCount || 0 }} 次</span>
          </div>
          <div class="dg-item">
            <span class="dg-label">收藏</span>
            <span class="dg-value">{{ detailProduct.favoriteCount || 0 }} 人</span>
          </div>
          <div v-if="detailProduct.listingType === 'auction'" class="dg-item">
            <span class="dg-label">起拍價</span>
            <span class="dg-value">{{ formatPrice(detailProduct.startingPrice || 0) }}</span>
          </div>
          <div v-if="detailProduct.listingType === 'auction' && detailProduct.auctionEndTime" class="dg-item">
            <span class="dg-label">拍賣截止</span>
            <span class="dg-value">{{ formatDateTime(detailProduct.auctionEndTime) }}</span>
          </div>
          <div v-if="detailProduct.listingType === 'reservation'" class="dg-item">
            <span class="dg-label">預約名額</span>
            <span class="dg-value">{{ detailProduct.reservationMax || 0 }}</span>
          </div>
          <div v-if="detailProduct.listingType === 'reservation'" class="dg-item">
            <span class="dg-label">訂金</span>
            <span class="dg-value">{{ formatPrice(detailProduct.reservationDeposit || 0) }}</span>
          </div>
          <div v-if="detailProduct.listingType === 'reservation' && detailProduct.reservationDeadline" class="dg-item">
            <span class="dg-label">預約截止</span>
            <span class="dg-value">{{ formatDateTime(detailProduct.reservationDeadline) }}</span>
          </div>
          <div class="dg-item" v-if="detailProduct.tags && detailProduct.tags.length">
            <span class="dg-label">標籤</span>
            <span class="dg-value">{{ detailProduct.tags.map((tg: any) => tg.name || tg).join('、') }}</span>
          </div>
        </div>

        <div v-if="detailProduct.descriptionZh || detailProduct.descriptionEn" class="detail-desc">
          <span class="dg-label">商品描述</span>
          <p>{{ detailProduct.descriptionZh || detailProduct.descriptionEn }}</p>
        </div>

        <div class="detail-actions">
          <button
            v-if="detailProduct.status !== 'sold'"
            class="btn-action detail"
            @click="openEditFromDetail"
          >✏️ 編輯此商品</button>
        </div>
      </div>
    </div>
  </div>

  <!-- 商品創建/編輯表單（共用組件，合併自商品管理） -->
  <ProductFormModal v-model:open="formOpen" :product="formProduct" @saved="onFormSaved" />
</template>

<style scoped>
.product-list-management {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.list-tabs {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.list-tab {
  display: flex;
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

.list-tab:hover {
  border-color: var(--primary);
}

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

.tab-icon {
  font-size: 14px;
}

.btn-new {
  margin-left: auto;
  padding: var(--space-2) var(--space-5);
  background: var(--primary-gradient);
  border-radius: var(--radius-lg);
  color: white;
  font-weight: 600;
  border: none;
  cursor: pointer;
  font-size: var(--text-sm);
  transition: all var(--transition-fast);
}

.btn-new:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* ===== 頂部統計條 ===== */
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

.stat-label {
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.stat-value {
  font-size: var(--text-lg);
  font-weight: 700;
  font-family: var(--font-num);
  color: var(--text-primary);
}

.stat-value small {
  font-size: var(--text-xs);
  font-weight: 400;
  color: var(--text-secondary);
}

.stat-item.alert {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.08);
}

.stat-item.alert .stat-value {
  color: #f59e0b;
}

.stat-value.money {
  color: #10b981;
}

/* ===== 搜尋列 ===== */
.search-row {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

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

.search-input:focus {
  border-color: var(--primary);
}

.btn-clear-search {
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: var(--text-xs);
}

.btn-clear-search:hover {
  color: var(--text-primary);
  border-color: var(--primary);
}

/* ===== 排序表頭 ===== */
.sortable-th {
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.sortable-th:hover {
  color: var(--text-primary);
}

.sortable-th .th-label {
  margin-right: 4px;
}

.sort-arrow {
  display: inline-block;
  font-size: var(--text-xs);
  color: var(--text-muted);
  opacity: 0.5;
  transition: all var(--transition-fast);
}

.sortable-th:hover .sort-arrow {
  opacity: 1;
}

.sort-arrow.active {
  opacity: 1;
  color: var(--primary);
  font-weight: 700;
}

.sort-arrow.active.desc {
  transform: rotate(180deg);
}

/* ===== 分頁 ===== */
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

.page-btn:hover:not(:disabled) {
  border-color: var(--primary);
  color: var(--text-primary);
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-info {
  font-size: var(--text-sm);
  color: var(--text-secondary);
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

.error-state {
  text-align: center;
  padding: var(--space-10);
  background: var(--bg-card);
  border: 1px solid var(--danger);
  border-radius: var(--radius-xl);
  color: var(--danger);
}

.btn-retry {
  margin-top: var(--space-4);
  padding: var(--space-2) var(--space-5);
  background: var(--primary-gradient);
  border: none;
  border-radius: var(--radius-lg);
  color: white;
  cursor: pointer;
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
}

.list-table {
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
  vertical-align: middle;
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

tbody tr:last-child td {
  border-bottom: none;
}

.expand-tr td {
  padding: 0;
  border-bottom: 1px solid var(--border);
  background: var(--bg-elevated);
}

tr.row-expanded td {
  border-bottom: none;
}

.product-cell {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.product-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.row-thumb {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  object-fit: cover;
  background: var(--bg-elevated);
  flex-shrink: 0;
}

.category-emoji {
  font-size: 24px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-elevated);
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.product-title {
  font-size: var(--text-sm); /* 2026-09-20 明確聲明，同訂單管理 .product-name 一致 — 全局樣式污染防護 */
  font-weight: 500;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-number {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  font-family: var(--font-num);
}

.price-cell {
  font-family: var(--font-num);
  font-weight: 700;
  color: var(--primary);
}

.cell-sub {
  display: flex;
  gap: var(--space-2);
  font-size: var(--text-xs);
  color: var(--text-secondary);
  margin-top: 2px;
}

.cell-extra {
  white-space: nowrap;
}

.price-label {
  opacity: 0.7;
}

.cell-muted {
  color: var(--text-secondary);
  opacity: 0.5;
}

.pending-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: #f59e0b4d;
  color: #f59e0b;
  font-weight: 700;
  font-size: var(--text-xs);
}

.money-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-family: var(--font-num);
}

.money-received {
  color: #10b981;
  font-weight: 600;
}

.money-total {
  color: var(--text-secondary);
  font-size: var(--text-xs);
}

.time-cell {
  white-space: nowrap;
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.status-badge {
  padding: 2px 10px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 600;
  white-space: nowrap;
}

.status-badge.active {
  background: #10b9814d;
  color: #10b981;
}

.status-badge.pending {
  background: #f59e0b4d;
  color: #f59e0b;
}

.status-badge.ended {
  background: #6b72804d;
  color: #6b7280;
}

.status-badge.cancelled {
  background: #ef44444d;
  color: #ef4444;
}

.btn-action {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.btn-action.view {
  background: var(--bg-elevated);
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.btn-action.view:hover,
.btn-action.view.active {
  background: var(--primary);
  color: white;
}

.chevron {
  display: inline-block;
  transition: transform var(--transition-fast);
}

.chevron.open {
  transform: rotate(180deg);
}

.btn-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: var(--radius-full);
  background: #f59e0b;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
}

.btn-action.confirm {
  background: #10b981;
  color: white;
}

.btn-action.confirm:hover:not(:disabled) {
  background: #059669;
}

.btn-action.ship {
  background: var(--primary);
  color: white;
}

.btn-action.detail {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.btn-action.detail:hover {
  background: var(--primary);
  color: white;
}

.btn-action.cancel {
  background: transparent;
  border: 1px solid #ef4444;
  color: #ef4444;
}

.btn-action.cancel:hover:not(:disabled) {
  background: #ef4444;
  color: white;
}

.btn-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ===== 操作欄（詳情/編輯/刪除/訂單）===== */
.actions-cell {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  align-items: center;
}

.btn-action.detail,
.btn-action.edit,
.btn-action.delete {
  background: var(--bg-elevated);
  color: var(--text-secondary);
}

.btn-action.detail:hover {
  background: var(--primary);
  color: white;
}

.btn-action.edit:hover {
  background: #10b981;
  color: white;
}

.btn-action.delete:hover {
  background: #ef4444;
  color: white;
}

.sold-locked {
  font-size: 13px;
  cursor: default;
}

/* ===== 商品規格詳情層（同訂單詳情 modal 風格）===== */
.product-detail-modal .pd-emoji {
  font-size: 22px;
  width: 48px; height: 48px;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-card); border-radius: var(--radius-md); flex-shrink: 0;
  overflow: hidden;
}

/* ===== 手機卡片（<768px 顯示，同訂單管理卡片設計）===== */
.product-cards { display: none; }

/* ===== 展開訂單面板 ===== */
.orders-panel {
  padding: var(--space-4) var(--space-5);
}

.panel-header {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-3);
  flex-wrap: wrap;
}

.panel-title {
  font-weight: 700;
  font-size: var(--text-sm);
}

.panel-stats {
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.pending-text {
  color: #f59e0b;
}

.btn-link {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--primary);
  font-size: var(--text-xs);
  cursor: pointer;
  padding: 0;
}

.btn-link:hover {
  text-decoration: underline;
}

.panel-empty {
  padding: var(--space-6);
  text-align: center;
  color: var(--text-secondary);
  font-size: var(--text-sm);
}

.order-items {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.order-item {
  display: grid;
  grid-template-columns: 230px 170px 140px 90px 1fr auto;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-3) var(--space-4);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}

.oi-col {
  min-width: 0;
}

.oi-main {
  display: flex;
  flex-direction: column;
  gap: 3px;
  align-items: flex-start;
}

.type-tag {
  padding: 1px 8px;
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.type-tag.t-sale {
  background: rgba(16, 185, 129, 0.18);
  color: #10b981;
}

.type-tag.t-auction {
  background: rgba(236, 72, 153, 0.18);
  color: #ec4899;
}

.type-tag.t-reserve {
  background: rgba(245, 158, 11, 0.18);
  color: #f59e0b;
}

.order-status-badge {
  padding: 1px 8px;
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.order-status-badge.st-pending {
  background: #f59e0b4d;
  color: #f59e0b;
}

.order-status-badge.st-pending-paid {
  background: #fb923c4d;
  color: #fb923c;
}

.order-status-badge.st-paid {
  background: #10b98133;
  color: #10b981;
}

.order-status-badge.st-confirmed {
  background: #10b9814d;
  color: #10b981;
}

.order-status-badge.st-shipped {
  background: #8b5cf64d;
  color: #8b5cf6;
}

.order-status-badge.st-delivered {
  background: #10b98166;
  color: #059669;
}

.order-status-badge.st-cancelled {
  background: #ef44444d;
  color: #ef4444;
}

.oi-buyer {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.buyer-name {
  font-weight: 500;
  font-size: var(--text-sm);
}

.buyer-email {
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.oi-amount {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.oi-qty {
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.oi-money {
  font-family: var(--font-num);
  font-weight: 700;
  color: var(--text-primary);
}

.oi-money-sub {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  font-family: var(--font-num);
}

.oi-receipts {
  display: flex;
  gap: 6px;
  align-items: center;
}

.receipt-thumb {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  object-fit: cover;
  cursor: pointer;
  border: 1px solid var(--border);
  transition: transform var(--transition-fast);
}

.receipt-thumb:hover {
  transform: scale(1.08);
}

.receipt-thumb.lg {
  width: 64px;
  height: 64px;
}

.next-hint {
  font-size: var(--text-xs);
  color: #f59e0b;
  font-weight: 600;
}

.oi-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

/* ===== Modal 通用 ===== */
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

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--border);
}

.modal-header h3 {
  margin: 0;
  font-size: var(--text-lg);
}

.modal-close {
  background: none;
  border: none;
  font-size: 18px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-md);
}

.modal-close:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

/* ===== 訂單詳情彈出層 ===== */
.detail-modal {
  width: min(640px, 100%);
  max-height: 85vh;
  overflow-y: auto;
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  border: 1px solid var(--border);
}

.detail-body {
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.detail-top {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.dg-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dg-label {
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.dg-value {
  font-size: var(--text-sm);
  color: var(--text-primary);
  word-break: break-all;
}

.dg-value small {
  display: block;
  color: var(--text-secondary);
  font-size: var(--text-xs);
}

.dg-value.mono {
  font-family: var(--font-num);
  letter-spacing: 0.5px;
}

.dg-sub {
  display: block;
  font-size: var(--text-xs);
  color: var(--text-secondary);
  margin-top: 2px;
}

.detail-receipts {
  display: flex;
  gap: var(--space-6);
}

.dr-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* 時間線 */
.detail-timeline {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.timeline {
  display: flex;
  flex-direction: column;
}

.tl-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0 var(--space-2) 0;
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

.tl-item.done:not(:last-child)::before {
  background: #10b981;
  opacity: 0.5;
}

.tl-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--border);
  flex-shrink: 0;
}

.tl-item.done .tl-dot {
  background: #10b981;
}

.tl-item.current .tl-dot {
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.25);
}

.tl-label {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  min-width: 110px;
}

.tl-item.done .tl-label {
  color: var(--text-primary);
}

.tl-time {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  font-family: var(--font-num);
}

/* 憑證大圖 Modal */
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

.receipt-image {
  max-width: 100%;
  max-height: 70vh;
  border-radius: var(--radius-lg);
}

/* 桌面寬屏適配 */
@media (min-width: 820px) {
  .product-list-management {
    max-width: 100%;
  }
}

@media (max-width: 1100px) {
  .order-item {
    grid-template-columns: 200px 150px 130px 80px 1fr auto;
  }
}

@media (max-width: 900px) {
  .order-item {
    grid-template-columns: 1fr 1fr;
  }
  .oi-actions {
    justify-content: flex-start;
  }
}

/* ===== 手機版適配（<768px：表格收起，顯示卡片，同訂單管理一致）===== */
@media (max-width: 767px) {
  /* min-width 傳遞鏈修復 — flex 內容不再撐爆容器（375px 實測溢出 31px 根因） */
  .product-list-management,
  .list-tabs,
  .summary-bar,
  .stat-item,
  .search-row,
  .search-input,
  .list-table,
  .pagination {
    min-width: 0;
  }

  .desktop-only {
    display: none !important;
  }

  /* 表格收起、卡片顯示 */
  .list-table { display: none !important; }
  .product-cards {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .product-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-3) var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    min-width: 0;
  }
  .pc-top { display: flex; gap: var(--space-3); align-items: flex-start; min-width: 0; }
  .pc-thumb {
    width: 48px; height: 48px;
    border-radius: var(--radius-md);
    object-fit: cover;
    flex-shrink: 0;
    background: var(--bg-elevated);
  }
  .pc-emoji {
    font-size: 22px;
    width: 48px; height: 48px;
    display: flex; align-items: center; justify-content: center;
    background: var(--bg-elevated);
    border-radius: var(--radius-md);
    flex-shrink: 0;
  }
  .pc-main { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .pc-title {
    font-weight: 600;
    font-size: var(--text-sm);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }
  .pc-meta { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
  .pc-number { font-size: 11px; color: var(--text-secondary); font-family: var(--font-num); }
  .pc-amount { text-align: right; flex-shrink: 0; min-width: 0; }
  .pc-price { font-family: var(--font-num); font-weight: 700; color: var(--primary); white-space: nowrap; }
  .pc-extra { font-size: 11px; color: var(--text-secondary); white-space: nowrap; }
  .pc-mid {
    display: flex;
    gap: var(--space-3);
    align-items: center;
    flex-wrap: wrap;
    font-size: var(--text-xs);
    color: var(--text-secondary);
  }
  .pc-pending {
    color: #f59e0b;
    font-weight: 600;
    padding: 2px 8px;
    background: rgba(245, 158, 11, 0.1);
    border-radius: var(--radius-md);
  }
  .pc-money { font-family: var(--font-num); color: #10b981; }
  .pc-time {
    font-size: var(--text-xs);
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .pc-actions { display: flex; gap: 6px; flex-wrap: wrap; }
  .pc-actions .btn-action { flex: 1; text-align: center; }
  .btn-action.edit { background: var(--bg-elevated); color: var(--text-primary); }
  .btn-action.edit:hover { background: var(--primary); color: white; }

  /* 展開面板手機適配：訂單 grid 單欄 */
  .orders-panel { padding: var(--space-3); }
  .order-item {
    grid-template-columns: 1fr 1fr;
  }
  .oi-actions { justify-content: flex-start; }

  /* 舊 640 適配吸收（summary/tabs/detail） */
  .summary-bar { gap: var(--space-2); }
  .stat-item { flex: 1 1 40%; padding: var(--space-2) var(--space-3); }
  .stat-value { font-size: var(--text-base); }
  .list-tabs { gap: var(--space-1); flex-wrap: wrap; }
  .list-tab { padding: var(--space-1) var(--space-3); font-size: var(--text-xs); }
  .btn-new { margin-left: 0; width: 100%; }
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

@media (max-width: 640px) {
  .list-tabs {
    flex-wrap: wrap;
  }
  .btn-new {
    margin-left: 0;
    width: 100%;
  }
  .summary-bar {
    gap: var(--space-2);
  }
  .stat-item {
    flex: 1 1 40%;
    padding: var(--space-2) var(--space-3);
  }
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>