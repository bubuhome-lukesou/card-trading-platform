<script setup lang="ts">
import { formatPrice, formatDate, formatDateTime } from '@/utils/format'
import StateView from '@/components/common/StateView.vue'
import { ref, computed, watch, onMounted } from 'vue'
import { ordersApi } from '@/api/orders'

interface Tx {
  id: string
  productTitle: string
  productImage?: string
  buyerNickname: string
  buyerEmail: string
  amount: number
  type: string          // 訂單類型（直購/拍賣得標/預約訂金/尾款）
  status: string        // 訂單狀態
  txStatus: 'completed' | 'pending'
  createdAt: string
  paymentTime?: string
  deliveryTime?: string
  notes?: string
}

const orders = ref<any[]>([])
const loading = ref(true)
const apiBaseUrl = import.meta.env.VITE_API_URL || ''
const resolveImageUrl = (url: string) => {
  if (!url) return ''
  if (url.startsWith('data:') || url.startsWith('http')) return url
  return apiBaseUrl + url
}

// ===== 狀態 tabs（同訂單管理）=====
const TAB_DEFS: { key: string; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'completed', label: '已入帳' },
  { key: 'pending', label: '待入帳' },
]
const filterStatus = ref('all')

// ===== 搜尋 / 排序 / 分頁 =====
const PAGE_SIZE = 20
const searchQuery = ref('')
const currentPage = ref(1)
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('desc')

const sortableColumns = [
  { key: 'productTitle', label: '商品', type: 'text' },
  { key: 'amount', label: '金額', type: 'number' },
  { key: 'txStatus', label: '狀態', type: 'text' },
  { key: 'createdAt', label: '日期', type: 'time' },
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

// 數字/時間按數值；文字按 UTF-16 二進碼序
const compareTx = (a: Tx, b: Tx, col: { key: string; type: string }): number => {
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

const transactions = computed<Tx[]>(() => {
  return orders.value
    // 已收款（confirmed/shipped/delivered）+ 待入帳（pending/pending_paid）— 排除 cancelled/refunded
    .filter(o => ['confirmed', 'paid', 'pending', 'pending_paid', 'shipped', 'delivered'].includes(o.status))
    .map(o => {
      const images: string[] = (() => {
        try {
          const arr = typeof o.product?.images === 'string' ? JSON.parse(o.product.images) : o.product?.images
          return Array.isArray(arr) ? arr : []
        } catch { return [] }
      })()
      return {
        id: o.id,
        productTitle: o.product?.titleZh || o.product?.titleEn || '-',
        productImage: images[0] || '',
        buyerNickname: o.buyer?.nickname || '-',
        buyerEmail: o.buyer?.email || '-',
        amount: Number(o.totalPrice) || 0,
        type: o.type,
        status: o.status,
        // 已入帳 = 已確認收款（confirmed 同預約單訂金確認，paid 係直購流程）
        txStatus: (['confirmed', 'paid', 'shipped', 'delivered'].includes(o.status) ? 'completed' : 'pending') as 'completed' | 'pending',
        createdAt: o.createdAt,
        paymentTime: o.paymentTime || undefined,
        deliveryTime: o.deliveryTime || undefined,
        notes: o.notes || undefined,
      }
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
})

const filteredTx = computed(() => {
  let result = transactions.value
  const sts = TAB_STATUSES[filterStatus.value]
  if (sts && sts.length) {
    result = result.filter(t => sts.includes(t.txStatus))
  }
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    result = result.filter(t =>
      t.productTitle.toLowerCase().includes(q) ||
      t.buyerNickname.toLowerCase().includes(q)
    )
  }
  if (!sortKey.value) return result
  const col = sortableColumns.find(c => c.key === sortKey.value)
  if (!col) return result
  return [...result].sort((a, b) => compareTx(a, b, col))
})

const TAB_STATUSES: Record<string, string[]> = {
  all: [],
  completed: ['completed'],
  pending: ['pending'],
}

const tabCount = (key: string): number => {
  const sts = TAB_STATUSES[key]
  if (!sts || !sts.length) return transactions.value.length
  return transactions.value.filter(t => sts.includes(t.txStatus)).length
}

const totalPages = computed(() => Math.max(1, Math.ceil(filteredTx.value.length / PAGE_SIZE)))
const pagedTx = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return filteredTx.value.slice(start, start + PAGE_SIZE)
})
const goToPage = (p: number) => {
  if (p < 1 || p > totalPages.value) return
  currentPage.value = p
}
watch([searchQuery, filterStatus], () => { currentPage.value = 1 })

// ===== 統計卡（同 summary-bar 風格）=====
// 口徑（全站統一，2026-09-19 修正）：
// 總收入 = confirmed/shipped/delivered（confirmed=訂金已確認，同訂單管理「已收款」一致；
//         預約單流程 pending→pending_paid→confirmed→delivered 冇經過 paid）
// 待入帳 = pending/pending_paid（未確認收款）
const summary = computed(() => {
  const completed = orders.value.filter(o => ['confirmed', 'shipped', 'delivered'].includes(o.status))
  const pending = orders.value.filter(o => ['pending', 'pending_paid'].includes(o.status))
  return {
    totalEarnings: completed.reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0),
    pendingBalance: pending.reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0),
    totalOrders: completed.length,
    pendingCount: pending.length,
  }
})

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
}
const orderStatus = (s: string) => ORDER_STATUS[s] || { cls: 'st-cancelled', text: s }

// ===== 詳情彈出層 =====
const detailTx = ref<Tx | null>(null)
const openDetail = (tx: Tx) => { detailTx.value = tx }
const closeDetail = () => { detailTx.value = null }

const detailTimeline = computed(() => {
  const o = detailTx.value
  if (!o) return []
  return [
    { label: '訂單建立', time: o.createdAt, done: true },
    { label: '付款', time: o.paymentTime || (o.txStatus === 'completed' ? o.createdAt : ''), done: o.txStatus === 'completed' },
    { label: '完成', time: o.deliveryTime || '', done: !!o.deliveryTime },
  ]
})

const loadData = async () => {
  loading.value = true
  try {
    // limit=200 拉全部（同訂單管理一致）
    const res = await ordersApi.getSellerOrders(1, 200)
    orders.value = res.data?.data || []
  } catch (e) {
    console.error('Failed to load earnings', e)
    orders.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => loadData())
</script>

<template>
  <div class="earnings-management">
    <!-- 統計卡（同 summary-bar 風格） -->
    <div v-if="!loading" class="summary-bar">
      <div class="stat-item primary">
        <span class="stat-label">總收入</span>
        <span class="stat-value money">{{ formatPrice(summary.totalEarnings) }}</span>
        <small class="stat-meta">已完成 {{ summary.totalOrders }} 筆</small>
      </div>
      <div class="stat-item" :class="{ alert: summary.pendingCount > 0 }">
        <span class="stat-label">待入帳</span>
        <span class="stat-value">{{ formatPrice(summary.pendingBalance) }}</span>
        <small class="stat-meta">{{ summary.pendingCount }} 筆</small>
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
        placeholder="🔍 搜尋商品或買家..."
      />
      <button v-if="searchQuery" class="btn-clear-search" @click="searchQuery = ''">✕ 清除</button>
    </div>

    <StateView v-if="loading" state="loading" />
    <StateView v-else-if="!filteredTx.length" state="empty" icon="💳" title="暫無交易記錄" />

    <!-- ===== 桌面表格（≥768px） ===== -->
    <div v-else class="list-table">
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
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tx in pagedTx" :key="tx.id">
            <td>
              <div class="product-cell">
                <img v-if="tx.productImage" :src="resolveImageUrl(tx.productImage)" class="row-thumb" :alt="tx.productTitle" />
                <span v-else class="placeholder-emoji">🃏</span>
                <div class="product-info">
                  <span class="product-name">{{ tx.productTitle }}</span>
                  <span class="type-tag" :class="typeTag(tx.type).cls">{{ typeTag(tx.type).text }}</span>
                </div>
              </div>
            </td>
            <td>
              <div class="buyer-name">{{ tx.buyerNickname }}</div>
              <div class="buyer-email">{{ tx.buyerEmail }}</div>
            </td>
            <td class="amount-cell">{{ formatPrice(tx.amount) }}</td>
            <td>
              <span class="status-badge" :class="orderStatus(tx.status).cls">{{ orderStatus(tx.status).text }}</span>
            </td>
            <td class="date">{{ formatDate(tx.createdAt) }}</td>
            <td>
              <button class="btn-action detail" @click="openDetail(tx)">詳情</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ===== 手機卡片列表（<768px） ===== -->
    <div v-if="!loading && filteredTx.length" class="tx-cards">
      <div v-for="tx in pagedTx" :key="'m' + tx.id" class="tx-card">
        <div class="card-top">
          <img v-if="tx.productImage" :src="resolveImageUrl(tx.productImage)" class="card-thumb" :alt="tx.productTitle" />
          <span v-else class="card-emoji">🃏</span>
          <div class="card-main">
            <div class="card-title">{{ tx.productTitle }}</div>
            <div class="card-meta">
              <span class="type-tag" :class="typeTag(tx.type).cls">{{ typeTag(tx.type).text }}</span>
              <span class="status-badge" :class="orderStatus(tx.status).cls">{{ orderStatus(tx.status).text }}</span>
            </div>
          </div>
          <div class="card-amount">{{ formatPrice(tx.amount) }}</div>
        </div>
        <div class="card-mid">
          <span class="card-buyer">👤 {{ tx.buyerNickname }}</span>
          <span class="card-date">{{ formatDate(tx.createdAt) }}</span>
        </div>
        <div class="card-actions">
          <button class="btn-action detail" @click="openDetail(tx)">詳情</button>
        </div>
      </div>
    </div>

    <!-- 分頁 -->
    <div v-if="!loading && filteredTx.length" class="pagination">
      <button class="page-btn" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">‹ 上一頁</button>
      <span class="page-info">第 {{ currentPage }} / {{ totalPages }} 頁 · 共 {{ filteredTx.length }} 筆</span>
      <button class="page-btn" :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)">下一頁 ›</button>
    </div>

    <!-- 交易詳情彈出層 -->
    <div v-if="detailTx" class="modal-overlay" @click.self="closeDetail">
      <div class="detail-modal">
        <div class="modal-header">
          <h3>交易詳情</h3>
          <button @click="closeDetail" class="modal-close">✕</button>
        </div>
        <div class="detail-body">
          <div class="detail-top">
            <span class="type-tag" :class="typeTag(detailTx.type).cls">{{ typeTag(detailTx.type).text }}</span>
            <span class="status-badge" :class="orderStatus(detailTx.status).cls">{{ orderStatus(detailTx.status).text }}</span>
            <span class="detail-amount">{{ formatPrice(detailTx.amount) }}</span>
          </div>

          <div class="detail-product">
            <img v-if="detailTx.productImage" :src="resolveImageUrl(detailTx.productImage)" class="detail-thumb" :alt="detailTx.productTitle" />
            <span v-else class="card-emoji">🃏</span>
            <div class="dp-info">
              <span class="dp-title">{{ detailTx.productTitle }}</span>
              <span class="dp-sub">{{ detailTx.buyerNickname }} · {{ detailTx.buyerEmail }}</span>
            </div>
          </div>

          <div class="detail-grid">
            <div class="dg-item">
              <span class="dg-label">入帳狀態</span>
              <span class="dg-value">{{ detailTx.txStatus === 'completed' ? '✅ 已入帳' : '⏳ 待入帳（確認收款後）' }}</span>
            </div>
            <div class="dg-item" v-if="detailTx.notes">
              <span class="dg-label">備註</span>
              <span class="dg-value">{{ detailTx.notes }}</span>
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
  </div>
</template>

<style scoped>
.earnings-management { display: flex; flex-direction: column; gap: var(--space-4); }

/* ===== 統計卡（同 summary-bar）===== */
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

.stat-item.primary {
  border-color: rgba(99, 102, 241, 0.5);
  background: rgba(99, 102, 241, 0.08);
}

.stat-label { font-size: var(--text-xs); color: var(--text-secondary); }

.stat-value {
  font-size: var(--text-lg);
  font-weight: 700;
  font-family: var(--font-num);
  color: var(--text-primary);
}

.stat-value.money { color: #10b981; font-size: var(--text-xl); }
.stat-meta { font-size: var(--text-xs); color: var(--text-muted); margin-left: 4px; }
.stat-item.alert { border-color: #f59e0b; background: rgba(245, 158, 11, 0.08); }
.stat-item.alert .stat-value { color: #f59e0b; }

/* ===== tabs（同商品列表）===== */
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
.list-table {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
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
.placeholder-emoji {
  font-size: 22px;
  width: 44px; height: 44px;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-elevated); border-radius: var(--radius-md); flex-shrink: 0;
}
.product-cell img {
  width: 44px; height: 44px;
  border-radius: var(--radius-md);
  object-fit: cover;
  background: var(--bg-elevated);
  flex-shrink: 0;
}
.product-info { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.product-name {
  font-weight: 500;
  max-width: 240px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.buyer-name { font-weight: 500; }
.buyer-email { font-size: var(--text-xs); color: var(--text-muted); }
.amount-cell { font-family: var(--font-num); font-weight: 700; color: #10b981; white-space: nowrap; }
.date { font-size: var(--text-xs); color: var(--text-muted); white-space: nowrap; }

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
.st-pending { background: #f59e0b4d; color: #f59e0b; }
.st-pending-paid { background: #fb923c4d; color: #fb923c; }
.st-paid { background: #3b82f633; color: #3b82f6; }
.st-confirmed { background: #10b9814d; color: #10b981; }
.st-shipped { background: #8b5cf64d; color: #8b5cf6; }
.st-delivered { background: #10b98166; color: #059669; }
.st-cancelled { background: #ef44444d; color: #ef4444; }

.btn-action {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.btn-action.detail { background: var(--bg-elevated); color: var(--text-primary); }
.btn-action.detail:hover { background: var(--primary); color: white; }

/* ===== 手機卡片（<768px 才顯示）===== */
.tx-cards { display: none; }

/* ===== 分頁（同訂單管理）===== */
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

/* ===== Modal（同訂單管理）===== */
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
.detail-amount { margin-left: auto; font-family: var(--font-num); font-weight: 700; color: #10b981; font-size: var(--text-lg); }

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

.detail-thumb {
  width: 48px; height: 48px;
  border-radius: var(--radius-md);
  object-fit: cover;
  flex-shrink: 0;
}

.dp-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.dp-title { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dp-sub { font-size: var(--text-xs); color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.dg-item { display: flex; flex-direction: column; gap: 4px; }
.dg-label { font-size: var(--text-xs); color: var(--text-secondary); }
.dg-value { font-size: var(--text-sm); color: var(--text-primary); word-break: break-all; }

/* 時間線（同訂單管理）*/
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

/* ===== 手機版適配（<768px：表格收起，顯示卡片）===== */
@media (max-width: 767px) {
  /* min-width 傳遞鏈修復 — flex 內容不再撐爆容器 */
  .earnings-management,
  .summary-bar,
  .stat-item,
  .list-tabs,
  .search-row,
  .search-input,
  .pagination {
    min-width: 0;
  }

  .desktop-table { display: none; }
  .list-table { overflow: visible; }

  .tx-cards {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .tx-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-3) var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    min-width: 0;
  }

  .card-top { display: flex; gap: var(--space-3); align-items: flex-start; min-width: 0; }
  .card-thumb { width: 48px; height: 48px; border-radius: var(--radius-md); object-fit: cover; flex-shrink: 0; }
  .card-main { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .card-title {
    font-weight: 600;
    font-size: var(--text-sm);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }
  .card-meta { display: flex; gap: 6px; flex-wrap: wrap; }
  .card-amount {
    text-align: right;
    flex-shrink: 0;
    font-family: var(--font-num);
    font-weight: 700;
    color: #10b981;
  }
  .card-mid {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: var(--text-xs);
    color: var(--text-secondary);
  }
  .card-actions { display: flex; gap: 6px; }
  .card-actions .btn-action { flex: 1; text-align: center; }

  .summary-bar { gap: var(--space-2); }
  .stat-item { flex: 1 1 40%; padding: var(--space-2) var(--space-3); flex-wrap: wrap; }
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
  .earnings-management { max-width: 100%; }
}
</style>