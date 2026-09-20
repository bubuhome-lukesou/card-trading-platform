<script setup lang="ts">
import { formatDate, formatDateTime } from '@/utils/format'
import StateView from '@/components/common/StateView.vue'
import { computed, onMounted, ref, watch } from 'vue'
import { sellerApplicationApi } from '@/api/seller-application'

interface Application {
  id: string
  userId: string | null
  email: string
  nickname: string
  storeName: string
  storeDescription: string
  phone: string
  pickupInfo: string
  pickupQrCode: string
  status: 'pending' | 'approved' | 'rejected'
  rejectionReason: string
  reviewedAt?: string
  createdAt: string
}

const applications = ref<Application[]>([])
const loading = ref(true)
const apiTotal = ref(0)
const processingId = ref<string | null>(null)

// ===== 狀態 tabs =====
const TAB_DEFS: { key: string; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待審批' },
  { key: 'approved', label: '已通過' },
  { key: 'rejected', label: '已拒絕' },
]
const filterStatus = ref('all')

// ===== 搜尋 / 分頁（後端支援 status/search 篩選，2026-09-20 起） =====
const PAGE_SIZE = 20
const searchQuery = ref('')
const currentPage = ref(1)
watch([searchQuery, filterStatus], () => { currentPage.value = 1; loadApplications() })

const totalPages = computed(() => Math.max(1, Math.ceil(apiTotal.value / PAGE_SIZE)))
const goToPage = (p: number) => {
  if (p < 1 || p > totalPages.value) return
  currentPage.value = p
  loadApplications()
}

const loadApplications = async () => {
  loading.value = true
  try {
    const res = await sellerApplicationApi.getAllApplications(currentPage.value, PAGE_SIZE, filterStatus.value, searchQuery.value.trim() || undefined)
    applications.value = res.data.data || []
    apiTotal.value = res.data.total || 0
  } catch (e: any) {
    console.error('Failed to load applications', e)
    alert('載入失敗：' + (e?.response?.data?.message || e?.message || '未知錯誤'))
    applications.value = []
  } finally {
    loading.value = false
  }
}

// ===== 統計條（各狀態計數） =====
const summary = ref({ total: 0, pending: 0, approved: 0, rejected: 0 })
const loadSummary = async () => {
  try {
    const [all, pending, approved, rejected] = await Promise.all([
      sellerApplicationApi.getAllApplications(1, 1, 'all'),
      sellerApplicationApi.getAllApplications(1, 1, 'pending'),
      sellerApplicationApi.getAllApplications(1, 1, 'approved'),
      sellerApplicationApi.getAllApplications(1, 1, 'rejected'),
    ])
    summary.value = {
      total: all.data.total || 0,
      pending: pending.data.total || 0,
      approved: approved.data.total || 0,
      rejected: rejected.data.total || 0,
    }
  } catch { /* 統計失敗唔阻塞列表 */ }
}

const tabCount = (key: string): number => {
  if (key === 'all') return summary.value.total
  if (key === 'pending') return summary.value.pending
  if (key === 'approved') return summary.value.approved
  if (key === 'rejected') return summary.value.rejected
  return 0
}

// ===== 排序（表頭點擊，本地對當頁數據排序） =====
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('desc')
const sortableColumns = [
  { key: 'storeName', label: '商店', type: 'text' },
  { key: 'nickname', label: '申請人', type: 'text' },
  { key: 'status', label: '狀態', type: 'text' },
  { key: 'createdAt', label: '申請時間', type: 'time' },
] as const

const toggleSort = (key: string) => {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

const compareRows = (a: Application, b: Application, col: { key: string; type: string }): number => {
  let cmp = 0
  if (col.type === 'time') {
    cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  } else {
    const as = String((a as any)[col.key] ?? '')
    const bs = String((b as any)[col.key] ?? '')
    cmp = as < bs ? -1 : as > bs ? 1 : 0
  }
  return sortDir.value === 'asc' ? cmp : -cmp
}

const pagedApps = computed(() => {
  const col = sortableColumns.find(c => c.key === sortKey.value)
  if (!col) return applications.value
  return [...applications.value].sort((a, b) => compareRows(a, b, col))
})

// ===== 徽章 =====
const APP_STATUS: Record<string, { cls: string; text: string }> = {
  pending: { cls: 'st-pending', text: '待審批' },
  approved: { cls: 'st-approved', text: '已通過' },
  rejected: { cls: 'st-rejected', text: '已拒絕' },
}
const appStatus = (s: string) => APP_STATUS[s] || { cls: 'st-pending', text: s }

// ===== 操作：通過 / 拒絕 =====
const handleApprove = async (id: string) => {
  if (!confirm('確認通過此商家申請？（將自動創建商家帳號）')) return
  processingId.value = id
  try {
    await sellerApplicationApi.approve(id)
    await Promise.all([loadApplications(), loadSummary()])
    alert('已通過，商家帳號已創建')
  } catch (e: any) {
    console.error('Approve failed', e)
    alert('操作失敗：' + (e?.response?.data?.message || e?.message || '未知錯誤'))
  } finally {
    processingId.value = null
  }
}

const handleReject = async (id: string) => {
  const reason = prompt('請輸入拒絕原因：')
  if (reason === null) return
  processingId.value = id
  try {
    await sellerApplicationApi.reject(id, reason || undefined)
    await Promise.all([loadApplications(), loadSummary()])
  } catch (e: any) {
    console.error('Reject failed', e)
    alert('操作失敗：' + (e?.response?.data?.message || e?.message || '未知錯誤'))
  } finally {
    processingId.value = null
  }
}

const resolveImageUrl = (url: string) => {
  if (!url) return '/placeholder.png'
  if (url.startsWith('data:') || url.startsWith('http')) return url
  return '/api' + url
}

// ===== 詳情彈出層 =====
const detailApp = ref<Application | null>(null)
const openDetail = (app: Application) => { detailApp.value = app }
const closeDetail = () => { detailApp.value = null }

onMounted(() => {
  loadApplications()
  loadSummary()
})
</script>

<template>
  <div class="apps-management">
    <!-- 頂部統計條 -->
    <div v-if="!loading" class="summary-bar">
      <div class="stat-item" :class="{ alert: summary.pending > 0 }">
        <span class="stat-label">待審批</span>
        <span class="stat-value">{{ summary.pending }} <small>件</small></span>
      </div>
      <div class="stat-item">
        <span class="stat-label">已通過</span>
        <span class="stat-value">{{ summary.approved }} <small>件</small></span>
      </div>
      <div class="stat-item">
        <span class="stat-label">已拒絕</span>
        <span class="stat-value">{{ summary.rejected }} <small>件</small></span>
      </div>
      <div class="stat-item">
        <span class="stat-label">全部申請</span>
        <span class="stat-value">{{ summary.total }} <small>件</small></span>
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
        placeholder="🔍 搜尋商店名、申請人或 Email（按 Enter 搜尋）..."
        @keyup.enter="loadApplications()"
      />
      <button v-if="searchQuery" class="btn-clear-search" @click="searchQuery = ''">✕ 清除</button>
    </div>

    <StateView v-if="loading" state="loading" />
    <StateView v-else-if="!pagedApps.length" state="empty" icon="📋" title="暫無商家申請" />

    <!-- ===== 桌面表格（≥768px） ===== -->
    <div v-else class="list-table">
      <table class="desktop-table">
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
            <th>聯絡</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="app in pagedApps" :key="app.id">
            <td>
              <div class="store-cell">
                <span class="store-icon">🏪</span>
                <span class="store-name">{{ app.storeName }}</span>
              </div>
            </td>
            <td>
              <div class="app-name">{{ app.nickname }}</div>
              <div class="app-email">{{ app.email }}</div>
            </td>
            <td>
              <span class="status-badge" :class="appStatus(app.status).cls">{{ appStatus(app.status).text }}</span>
            </td>
            <td class="date">{{ formatDate(app.createdAt) }}</td>
            <td class="contact-cell">
              <div>{{ app.phone || '未填電話' }}</div>
              <div class="cell-sub" v-if="app.rejectionReason">拒絕：{{ app.rejectionReason.slice(0, 18) }}{{ app.rejectionReason.length > 18 ? '…' : '' }}</div>
            </td>
            <td>
              <div class="actions-cell">
                <button
                  v-if="app.status === 'pending'"
                  class="btn-action approve"
                  :disabled="processingId === app.id"
                  @click="handleApprove(app.id)"
                >{{ processingId === app.id ? '處理中...' : '通過' }}</button>
                <button
                  v-if="app.status === 'pending'"
                  class="btn-action reject"
                  :disabled="processingId === app.id"
                  @click="handleReject(app.id)"
                >拒絕</button>
                <button class="btn-action detail" @click="openDetail(app)">詳情</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ===== 手機卡片列表（<768px） ===== -->
    <div v-if="!loading && pagedApps.length" class="app-cards">
      <div v-for="app in pagedApps" :key="'m' + app.id" class="app-card" :class="app.status">
        <div class="card-top">
          <span class="store-icon">🏪</span>
          <div class="card-main">
            <div class="card-title">{{ app.storeName }}</div>
            <div class="card-meta">
              <span class="status-badge" :class="appStatus(app.status).cls">{{ appStatus(app.status).text }}</span>
            </div>
          </div>
        </div>
        <div class="card-mid">
          <span class="card-buyer">👤 {{ app.nickname }}</span>
          <span class="card-date">{{ formatDate(app.createdAt) }}</span>
        </div>
        <div class="card-actions">
          <button
            v-if="app.status === 'pending'"
            class="btn-action approve"
            :disabled="processingId === app.id"
            @click="handleApprove(app.id)"
          >{{ processingId === app.id ? '處理中...' : '通過' }}</button>
          <button
            v-if="app.status === 'pending'"
            class="btn-action reject"
            :disabled="processingId === app.id"
            @click="handleReject(app.id)"
          >拒絕</button>
          <button class="btn-action detail" @click="openDetail(app)">詳情</button>
        </div>
      </div>
    </div>

    <!-- 分頁 -->
    <div v-if="!loading && apiTotal > PAGE_SIZE" class="pagination">
      <button class="page-btn" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">‹ 上一頁</button>
      <span class="page-info">第 {{ currentPage }} / {{ totalPages }} 頁 · 共 {{ apiTotal }} 件</span>
      <button class="page-btn" :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)">下一頁 ›</button>
    </div>

    <!-- 詳情彈出層（商店簡介/取貨資訊/QR） -->
    <div v-if="detailApp" class="modal-overlay" @click.self="closeDetail">
      <div class="detail-modal">
        <div class="modal-header">
          <h3>申請詳情</h3>
          <button @click="closeDetail" class="modal-close">✕</button>
        </div>
        <div class="detail-body">
          <div class="detail-top">
            <span class="store-icon lg">🏪</span>
            <div class="da-main">
              <span class="da-name">{{ detailApp.storeName }}</span>
              <span class="da-sub">{{ detailApp.nickname }} · {{ detailApp.email }}</span>
            </div>
            <span class="status-badge" :class="appStatus(detailApp.status).cls">{{ appStatus(detailApp.status).text }}</span>
          </div>

          <div class="detail-grid">
            <div class="dg-item">
              <span class="dg-label">聯絡電話</span>
              <span class="dg-value">{{ detailApp.phone || '未填' }}</span>
            </div>
            <div class="dg-item">
              <span class="dg-label">申請時間</span>
              <span class="dg-value">{{ formatDateTime(detailApp.createdAt) }}</span>
            </div>
            <div class="dg-item" v-if="detailApp.reviewedAt">
              <span class="dg-label">審批時間</span>
              <span class="dg-value">{{ formatDateTime(detailApp.reviewedAt) }}</span>
            </div>
          </div>

          <div class="dg-section" v-if="detailApp.storeDescription">
            <span class="dg-label">商店簡介</span>
            <p class="dg-text">{{ detailApp.storeDescription }}</p>
          </div>

          <div class="dg-section" v-if="detailApp.pickupInfo">
            <span class="dg-label">取貨資訊</span>
            <pre class="pickup-info">{{ detailApp.pickupInfo }}</pre>
          </div>

          <div class="dg-section" v-if="detailApp.pickupQrCode">
            <span class="dg-label">WeChat 二維碼</span>
            <img :src="resolveImageUrl(detailApp.pickupQrCode)" alt="WeChat QR" class="qr-code" />
          </div>

          <div class="dg-section" v-if="detailApp.status === 'rejected' && detailApp.rejectionReason">
            <span class="dg-label">拒絕原因</span>
            <p class="reject-reason">{{ detailApp.rejectionReason }}</p>
          </div>

          <div class="detail-actions" v-if="detailApp.status === 'pending'">
            <button class="btn-action approve" :disabled="processingId === detailApp.id" @click="handleApprove(detailApp.id)">
              {{ processingId === detailApp.id ? '處理中...' : '✅ 通過' }}
            </button>
            <button class="btn-action reject" :disabled="processingId === detailApp.id" @click="handleReject(detailApp.id)">
              ❌ 拒絕
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.apps-management { display: flex; flex-direction: column; gap: var(--space-4); }

/* ===== 統計條 ===== */
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
.stat-item.alert { border-color: #f59e0b; background: rgba(245, 158, 11, 0.08); }
.stat-item.alert .stat-value { color: #f59e0b; }

/* ===== tabs ===== */
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

/* ===== 桌面表格 ===== */
.list-table {
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

.store-cell { display: flex; align-items: center; gap: var(--space-3); }
.store-icon {
  font-size: 18px;
  width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-elevated); border-radius: var(--radius-md); flex-shrink: 0;
}
.store-icon.lg { width: 48px; height: 48px; font-size: 22px; }
.store-name { font-weight: 500; }
.app-name { font-weight: 500; }
.app-email { font-size: var(--text-xs); color: var(--text-muted); }
.date { font-size: var(--text-xs); color: var(--text-muted); white-space: nowrap; }
.contact-cell { font-size: var(--text-xs); color: var(--text-secondary); }
.cell-sub { font-size: var(--text-xs); color: var(--text-muted); margin-top: 2px; }
.actions-cell { display: flex; gap: 6px; flex-wrap: wrap; }

.status-badge { padding: 2px 10px; border-radius: var(--radius-full); font-size: var(--text-xs); font-weight: 600; white-space: nowrap; }
.st-pending { background: #f59e0b4d; color: #f59e0b; }
.st-approved { background: #10b9814d; color: #10b981; }
.st-rejected { background: #ef44444d; color: #ef4444; }

.btn-action {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
  font-weight: 500;
}
.btn-action.approve { background: #10b981; color: white; }
.btn-action.approve:hover:not(:disabled) { background: #059669; }
.btn-action.reject { background: #ef4444; color: white; }
.btn-action.reject:hover:not(:disabled) { background: #dc2626; }
.btn-action.detail { background: var(--bg-elevated); color: var(--text-primary); }
.btn-action.detail:hover { background: var(--primary); color: white; }
.btn-action:disabled { opacity: 0.5; cursor: not-allowed; }

/* ===== 手機卡片（<768px 才顯示）===== */
.app-cards { display: none; }

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
.detail-top { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; }
.da-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.da-name { font-weight: 700; font-size: var(--text-base); }
.da-sub { font-size: var(--text-xs); color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}
.dg-item { display: flex; flex-direction: column; gap: 4px; }
.dg-label { font-size: var(--text-xs); color: var(--text-secondary); }
.dg-value { font-size: var(--text-sm); color: var(--text-primary); word-break: break-all; }
.dg-section { display: flex; flex-direction: column; gap: 6px; }
.dg-text { margin: 0; font-size: var(--text-sm); color: var(--text-primary); line-height: 1.6; }
.pickup-info {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-3);
  font-size: var(--text-sm);
  color: var(--text-primary);
  white-space: pre-wrap;
  margin: 0;
  font-family: inherit;
}
.reject-reason {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--radius-lg);
  padding: var(--space-3);
  font-size: var(--text-sm);
  color: #ef4444;
  margin: 0;
}
.qr-code {
  max-width: 150px;
  max-height: 150px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
}
.detail-actions { display: flex; gap: var(--space-3); flex-wrap: wrap; }
.detail-actions .btn-action { padding: var(--space-2) var(--space-5); font-size: var(--text-sm); }

/* ===== 手機版適配（<768px：表格收起，顯示卡片）===== */
@media (max-width: 767px) {
  .apps-management,
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

  .app-cards {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .app-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-left-width: 3px;
    border-radius: var(--radius-lg);
    padding: var(--space-3) var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    min-width: 0;
  }
  .app-card.pending { border-left-color: #f59e0b; }
  .app-card.approved { border-left-color: #10b981; }
  .app-card.rejected { border-left-color: #ef4444; }
  .card-top { display: flex; gap: var(--space-3); align-items: flex-start; min-width: 0; }
  .card-main { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .card-title {
    font-weight: 600;
    font-size: var(--text-sm);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .card-meta { display: flex; gap: 6px; flex-wrap: wrap; }
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
  .stat-item { flex: 1 1 40%; padding: var(--space-2) var(--space-3); }
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
  .apps-management { max-width: 100%; }
}
</style>