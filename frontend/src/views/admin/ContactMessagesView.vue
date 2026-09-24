<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import StateView from '@/components/common/StateView.vue'
import { formatDate, formatDateTime } from '@/utils/format'
import api from '@/api'

interface ContactMessage {
  id: string
  name: string
  email: string
  phone: string | null
  subject: string
  message: string
  status: 'new' | 'read' | 'handled'
  createdAt: string
}

const messages = ref<ContactMessage[]>([])
const loading = ref(true)
const apiTotal = ref(0)
const processingId = ref<string | null>(null)

// ===== 統計條 =====
const stats = ref({ new: 0, read: 0, handled: 0, total: 0 })

// ===== 狀態 tabs =====
const TAB_DEFS: { key: string; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'new', label: '未讀' },
  { key: 'read', label: '已讀' },
  { key: 'handled', label: '已處理' },
]
const filterStatus = ref('all')

// ===== 排序（表頭） =====
const sortKey = ref<'createdAt' | 'name' | 'email' | 'subject'>('createdAt')
const sortDir = ref<'asc' | 'desc'>('desc')
const sortableColumns = [
  { key: 'name', label: '寄件人' },
  { key: 'email', label: '電郵' },
  { key: 'subject', label: '主題' },
  { key: 'createdAt', label: '時間' },
] as const
const toggleSort = (key: string) => {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key as typeof sortKey.value
    sortDir.value = key === 'createdAt' ? 'desc' : 'asc'
  }
  loadMessages()
}

// ===== 搜尋 / 分頁（後端 status/search 篩選） =====
const PAGE_SIZE = 20
const searchQuery = ref('')
const appliedSearch = ref('')
const currentPage = ref(1)

const applySearch = () => {
  appliedSearch.value = searchQuery.value.trim()
  currentPage.value = 1
  loadMessages()
}
const clearSearch = () => {
  searchQuery.value = ''
  appliedSearch.value = ''
  currentPage.value = 1
  loadMessages()
}

const totalPages = computed(() => Math.max(1, Math.ceil(apiTotal.value / PAGE_SIZE)))
const goToPage = (p: number) => {
  if (p < 1 || p > totalPages.value) return
  currentPage.value = p
  loadMessages()
}

const tabCount = (key: string) => {
  if (key === 'all') return stats.value.total
  if (key === 'new') return stats.value.new
  if (key === 'read') return stats.value.read
  if (key === 'handled') return stats.value.handled
  return 0
}

const statusMeta = (s: string) => {
  if (s === 'new') return { cls: 'st-new', text: '未讀' }
  if (s === 'read') return { cls: 'st-read', text: '已讀' }
  return { cls: 'st-handled', text: '已處理' }
}

// 前端排序（後端按 createdAt desc 返回，其他欄位在客戶端排當頁）
const pagedMessages = computed(() => {
  const arr = [...messages.value]
  if (sortKey.value === 'createdAt') {
    arr.sort((a, b) => sortDir.value === 'asc'
      ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } else if (sortKey.value === 'name' || sortKey.value === 'email' || sortKey.value === 'subject') {
    arr.sort((a, b) => {
      const av = String((a as any)[sortKey.value] || '')
      const bv = String((b as any)[sortKey.value] || '')
      return sortDir.value === 'asc' ? av.localeCompare(bv, 'zh-Hant') : bv.localeCompare(av)
    })
  }
  return arr
})

const loadMessages = async () => {
  loading.value = true
  try {
    const res = await api.get('/contact-messages', {
      params: {
        page: currentPage.value,
        limit: PAGE_SIZE,
        status: filterStatus.value,
        search: appliedSearch.value || undefined,
      },
    })
    messages.value = res.data.data || []
    apiTotal.value = res.data.total || 0
  } catch (e: any) {
    console.error('Failed to load contact messages', e)
    alert('載入失敗：' + (e?.response?.data?.message || e?.message || '未知錯誤'))
    messages.value = []
  } finally {
    loading.value = false
  }
}

const loadStats = async () => {
  try {
    const res = await api.get('/contact-messages/stats')
    stats.value = res.data || { new: 0, read: 0, handled: 0, total: 0 }
  } catch (e) {
    console.error('Failed to load stats', e)
  }
}

const handleStatus = async (id: string, status: 'read' | 'handled') => {
  processingId.value = id
  try {
    await api.patch(`/contact-messages/${id}/status`, { status })
    await Promise.all([loadMessages(), loadStats()])
  } catch (e: any) {
    console.error('Update status failed', e)
    alert('操作失敗：' + (e?.response?.data?.message || e?.message || '未知錯誤'))
  } finally {
    processingId.value = null
  }
}

const handleDelete = async (id: string) => {
  if (!confirm('確定刪除此訊息？刪除後無法復原。')) return
  processingId.value = id
  try {
    await api.delete(`/contact-messages/${id}`)
    if (detailMsg.value?.id === id) detailMsg.value = null
    await Promise.all([loadMessages(), loadStats()])
  } catch (e: any) {
    console.error('Delete failed', e)
    alert('刪除失敗：' + (e?.response?.data?.message || e?.message || '未知錯誤'))
  } finally {
    processingId.value = null
  }
}

// ===== 詳情彈出層（打開時自動標記已讀） =====
const detailMsg = ref<ContactMessage | null>(null)
const openDetail = async (msg: ContactMessage) => {
  detailMsg.value = msg
  if (msg.status === 'new') {
    try {
      await api.patch(`/contact-messages/${msg.id}/status`, { status: 'read' })
      msg.status = 'read'
      await Promise.all([loadStats()])
    } catch { /* 標記失敗不影響查看 */ }
  }
}
const closeDetail = () => { detailMsg.value = null }

watch([filterStatus], () => {
  currentPage.value = 1
  loadMessages()
})

onMounted(() => {
  loadMessages()
  loadStats()
})
</script>

<template>
  <div class="msg-management">
    <!-- 頂部統計條 -->
    <div v-if="!loading" class="summary-bar">
      <div class="stat-item" :class="{ alert: stats.new > 0 }">
        <span class="stat-label">未讀</span>
        <span class="stat-value">{{ stats.new }} <small>條</small></span>
      </div>
      <div class="stat-item">
        <span class="stat-label">已讀</span>
        <span class="stat-value">{{ stats.read }} <small>條</small></span>
      </div>
      <div class="stat-item">
        <span class="stat-label">已處理</span>
        <span class="stat-value">{{ stats.handled }} <small>條</small></span>
      </div>
      <div class="stat-item">
        <span class="stat-label">全部訊息</span>
        <span class="stat-value">{{ stats.total }} <small>條</small></span>
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
        placeholder="🔍 搜尋寄件人、電郵、主題或內容（按 Enter 搜尋）..."
        @keyup.enter="applySearch"
      />
      <button v-if="searchQuery" class="btn-clear-search" @click="clearSearch">✕ 清除</button>
    </div>

    <StateView v-if="loading" state="loading" />
    <StateView v-else-if="!pagedMessages.length" state="empty" icon="📨" title="暫無聯絡訊息" />

    <!-- ===== 桌面表格（≥768px） ===== -->
    <div v-else class="list-table">
      <table class="desktop-table">
        <thead>
          <tr>
            <th>狀態</th>
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
          <tr v-for="msg in pagedMessages" :key="msg.id" :class="{ 'row-new': msg.status === 'new' }">
            <td>
              <span class="status-badge" :class="statusMeta(msg.status).cls">{{ statusMeta(msg.status).text }}</span>
            </td>
            <td>
              <div class="sender-name">{{ msg.name }}</div>
            </td>
            <td>
              <div class="msg-email">{{ msg.email }}</div>
              <div class="cell-sub" v-if="msg.phone">{{ msg.phone }}</div>
            </td>
            <td>
              <div class="msg-subject">{{ msg.subject }}</div>
              <div class="cell-sub">{{ msg.message.slice(0, 40) }}{{ msg.message.length > 40 ? '…' : '' }}</div>
            </td>
            <td class="date">{{ formatDateTime(msg.createdAt) }}</td>
            <td>
              <div class="actions-cell">
                <button class="btn-action detail" @click="openDetail(msg)">詳情</button>
                <button
                  v-if="msg.status !== 'handled'"
                  class="btn-action approve"
                  :disabled="processingId === msg.id"
                  @click="handleStatus(msg.id, 'handled')"
                >{{ processingId === msg.id ? '處理中...' : '標記已處理' }}</button>
                <button class="btn-action reject" :disabled="processingId === msg.id" @click="handleDelete(msg.id)">刪除</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ===== 手機卡片列表（<768px） ===== -->
    <div v-if="!loading && pagedMessages.length" class="msg-cards">
      <div v-for="msg in pagedMessages" :key="'m' + msg.id" class="msg-card" :class="msg.status">
        <div class="card-top">
          <div class="card-main">
            <div class="card-title">{{ msg.subject }}</div>
            <div class="card-meta">
              <span class="status-badge" :class="statusMeta(msg.status).cls">{{ statusMeta(msg.status).text }}</span>
              <span class="card-date">{{ formatDate(msg.createdAt) }}</span>
            </div>
          </div>
        </div>
        <div class="card-mid">
          <span class="card-buyer">👤 {{ msg.name }} · {{ msg.email }}</span>
        </div>
        <div class="card-actions">
          <button class="btn-action detail" @click="openDetail(msg)">詳情</button>
          <button
            v-if="msg.status !== 'handled'"
            class="btn-action approve"
            :disabled="processingId === msg.id"
            @click="handleStatus(msg.id, 'handled')"
          >標記已處理</button>
          <button class="btn-action reject" :disabled="processingId === msg.id" @click="handleDelete(msg.id)">刪除</button>
        </div>
      </div>
    </div>

    <!-- 分頁 -->
    <div v-if="!loading && apiTotal > PAGE_SIZE" class="pagination">
      <button class="page-btn" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">‹ 上一頁</button>
      <span class="page-info">第 {{ currentPage }} / {{ totalPages }} 頁 · 共 {{ apiTotal }} 條</span>
      <button class="page-btn" :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)">下一頁 ›</button>
    </div>

    <!-- 詳情彈出層 -->
    <div v-if="detailMsg" class="modal-overlay" @click.self="closeDetail">
      <div class="detail-modal">
        <div class="modal-header">
          <h3>訊息詳情</h3>
          <button @click="closeDetail" class="modal-close">✕</button>
        </div>
        <div class="detail-body">
          <div class="detail-top">
            <span class="sender-icon">📨</span>
            <div class="da-main">
              <span class="da-name">{{ detailMsg.subject }}</span>
              <span class="da-sub">{{ detailMsg.name }} · {{ detailMsg.email }}<template v-if="detailMsg.phone"> · {{ detailMsg.phone }}</template></span>
            </div>
            <span class="status-badge" :class="statusMeta(detailMsg.status).cls">{{ statusMeta(detailMsg.status).text }}</span>
          </div>

          <div class="message-content">{{ detailMsg.message }}</div>

          <div class="dg-item">
            <span class="dg-label">發送時間</span>
            <span class="dg-value">{{ formatDateTime(detailMsg.createdAt) }}</span>
          </div>

          <div class="detail-actions">
            <a
              :href="`mailto:${detailMsg.email}?subject=${encodeURIComponent('Re: ' + detailMsg.subject)}`"
              class="btn-action reply"
            >回覆（Email）</a>
            <button
              v-if="detailMsg.status !== 'handled'"
              class="btn-action approve"
              :disabled="processingId === detailMsg.id"
              @click="handleStatus(detailMsg.id, 'handled')"
            >{{ processingId === detailMsg.id ? '處理中...' : '標記已處理' }}</button>
            <button class="btn-action reject" :disabled="processingId === detailMsg.id" @click="handleDelete(detailMsg.id)">刪除</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.msg-management { display: flex; flex-direction: column; gap: var(--space-4); }

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
.row-new td { font-weight: 600; }

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

.sender-name { font-weight: 500; }
.msg-email { font-size: var(--text-xs); color: var(--text-muted); }
.msg-subject { font-weight: 500; max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cell-sub { font-size: var(--text-xs); color: var(--text-muted); margin-top: 2px; }
.date { font-size: var(--text-xs); color: var(--text-muted); white-space: nowrap; }
.actions-cell { display: flex; gap: 6px; flex-wrap: wrap; }

.status-badge { padding: 2px 10px; border-radius: var(--radius-full); font-size: var(--text-xs); font-weight: 600; white-space: nowrap; }
.st-new { background: #f59e0b4d; color: #f59e0b; }
.st-read { background: #3b82f64d; color: #3b82f6; }
.st-handled { background: #10b9814d; color: #10b981; }

.btn-action {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
  font-weight: 500;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
}
.btn-action.approve { background: #10b981; color: white; }
.btn-action.approve:hover:not(:disabled) { background: #059669; }
.btn-action.reject { background: #ef4444; color: white; }
.btn-action.reject:hover:not(:disabled) { background: #dc2626; }
.btn-action.detail { background: var(--bg-elevated); color: var(--text-primary); }
.btn-action.detail:hover { background: var(--primary); color: white; }
.btn-action.reply { background: var(--primary); color: white; }
.btn-action.reply:hover { background: var(--primary-dark, #4f46e5); }
.btn-action:disabled { opacity: 0.5; cursor: not-allowed; }

/* ===== 手機卡片（<768px 才顯示）===== */
.msg-cards { display: none; }

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
.detail-top { display: flex; align-items: flex-start; gap: var(--space-3); flex-wrap: wrap; }
.sender-icon {
  font-size: 20px;
  width: 44px; height: 44px;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-elevated); border-radius: var(--radius-md); flex-shrink: 0;
}
.da-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.da-name { font-weight: 700; font-size: var(--text-base); }
.da-sub { font-size: var(--text-xs); color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; }
.message-content {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  font-size: var(--text-sm);
  color: var(--text-primary);
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
  font-family: inherit;
}
.dg-item { display: flex; flex-direction: column; gap: 4px; }
.dg-label { font-size: var(--text-xs); color: var(--text-secondary); }
.dg-value { font-size: var(--text-sm); color: var(--text-primary); }
.detail-actions { display: flex; gap: var(--space-3); flex-wrap: wrap; }
.detail-actions .btn-action { padding: var(--space-2) var(--space-5); font-size: var(--text-sm); }

/* ===== 手機版適配（<768px：表格收起，顯示卡片）===== */
@media (max-width: 767px) {
  .msg-management,
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

  .msg-cards {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .msg-card {
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
  .msg-card.new { border-left-color: #f59e0b; }
  .msg-card.read { border-left-color: #3b82f6; }
  .msg-card.handled { border-left-color: #10b981; }
  .card-top { display: flex; gap: var(--space-3); align-items: flex-start; min-width: 0; }
  .card-main { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .card-title {
    font-weight: 600;
    font-size: var(--text-sm);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .card-meta { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
  .card-date { font-size: var(--text-xs); color: var(--text-muted); }
  .card-mid {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: var(--text-xs);
    color: var(--text-secondary);
  }
  .card-buyer { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
  .card-actions { display: flex; gap: 6px; }
  .card-actions .btn-action { flex: 1; text-align: center; justify-content: center; }

  .summary-bar { gap: var(--space-2); }
  .stat-item { flex: 1 1 40%; padding: var(--space-2) var(--space-3); }
  .stat-value { font-size: var(--text-base); }
  .list-tabs { gap: var(--space-1); }
  .list-tab { padding: var(--space-1) var(--space-3); font-size: var(--text-xs); }
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
  .msg-management { max-width: 100%; }
}
</style>