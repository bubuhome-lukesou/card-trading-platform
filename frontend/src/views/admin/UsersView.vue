<script setup lang="ts">
import { formatPrice, formatDate, formatDateTime } from '@/utils/format'
import StateView from '@/components/common/StateView.vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/api'

const route = useRoute()

interface UserRow {
  id: string
  nickname: string
  email: string | null
  phone: string | null
  role: string
  status: string
  balance: number
  totalSpend: number
  orderCount: number
  lastLoginAt?: string
  createdAt: string
}

// ===== 統計條 + tabs =====
// 用戶/商家/管理員總數從一次 role=xxx 三請求拉取太散 — 用同後端同口徑：本地按 tab 拉全部 page=1&limit=200 計數
const users = ref<UserRow[]>([])
const loading = ref(true)
const activeTab = ref<string>('all')
const apiTotal = ref(0)

const TAB_DEFS: { key: string; label: string; role?: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'user', label: '普通用戶', role: 'user' },
  { key: 'seller', label: '商家', role: 'seller' },
  { key: 'admin', label: '管理員', role: 'admin' },
]

// tab 與 role 對應：切 tab 直接向後端要該 role 列表（後端 role 篩選）
const fetchUsers = async () => {
  loading.value = true
  try {
    const tab = TAB_DEFS.find(t => t.key === activeTab.value)
    const params: any = { page: currentPage.value, limit: PAGE_SIZE }
    if (tab?.role) params.role = tab.role
    if (filterStatus.value !== 'all') params.status = filterStatus.value
    if (searchQuery.value.trim()) params.search = searchQuery.value.trim()
    const res = await api.get('/admin/users', { params })
    users.value = (res.data.data || []).map((u: any) => ({
      ...u,
      balance: Number(u.balance) || 0,
      totalSpend: Number(u.totalSpend) || 0,
      orderCount: Number(u.orderCount) || 0,
    }))
    apiTotal.value = res.data.total || 0
  } catch (e) {
    console.error('Failed to fetch users', e)
    users.value = []
  } finally {
    loading.value = false
  }
}

// ===== 統計條（單獨拉一次全量計數，唔受 tab 影響） =====
const summary = ref({ total: 0, user: 0, seller: 0, admin: 0, suspended: 0 })
const loadSummary = async () => {
  try {
    const [all, userR, sellerR, adminR, suspended] = await Promise.all([
      api.get('/admin/users', { params: { page: 1, limit: 1 } }),
      api.get('/admin/users', { params: { page: 1, limit: 1, role: 'user' } }),
      api.get('/admin/users', { params: { page: 1, limit: 1, role: 'seller' } }),
      api.get('/admin/users', { params: { page: 1, limit: 1, role: 'admin' } }),
      api.get('/admin/users', { params: { page: 1, limit: 1, status: 'suspended' } }),
    ])
    summary.value = {
      total: all.data.total || 0,
      user: userR.data.total || 0,
      seller: sellerR.data.total || 0,
      admin: adminR.data.total || 0,
      suspended: suspended.data.total || 0,
    }
  } catch { /* 統計失敗唔阻塞列表 */ }
}

// ===== 搜尋 / 分頁 =====
const PAGE_SIZE = 20
const searchQuery = ref('')
const filterStatus = ref('all')
const currentPage = ref(1)
watch([searchQuery, filterStatus, activeTab], () => { currentPage.value = 1 })
watch([searchQuery, filterStatus, activeTab], () => { fetchUsers() })

const totalPages = computed(() => Math.max(1, Math.ceil(apiTotal.value / PAGE_SIZE)))
const goToPage = (p: number) => {
  if (p < 1 || p > totalPages.value) return
  currentPage.value = p
  fetchUsers()
}

const tabCount = (key: string): number => {
  if (key === 'all') return summary.value.total
  if (key === 'user') return summary.value.user
  if (key === 'seller') return summary.value.seller
  if (key === 'admin') return summary.value.admin
  return 0
}

// ===== 排序（表頭點擊，本地對當頁數據排序） =====
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('desc')
const sortableColumns = [
  { key: 'nickname', label: '用戶', type: 'text' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'role', label: '角色', type: 'text' },
  { key: 'status', label: '狀態', type: 'text' },
  { key: 'createdAt', label: '註冊時間', type: 'time' },
  { key: 'totalSpend', label: '累計消費', type: 'number' },
] as const

const toggleSort = (key: string) => {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

const compareRows = (a: UserRow, b: UserRow, col: { key: string; type: string }): number => {
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

const pagedUsers = computed(() => {
  const col = sortableColumns.find(c => c.key === sortKey.value)
  if (!col) return users.value
  return [...users.value].sort((a, b) => compareRows(a, b, col))
})

// ===== 操作：封禁 / 解封 / 改角色 =====
const processingId = ref<string | null>(null)
const roles = ['user', 'seller', 'admin']

const handleSuspend = async (u: UserRow) => {
  const suspend = u.status === 'active'
  if (!confirm(suspend ? `確定要封禁「${u.nickname}」嗎？` : `確定要解封「${u.nickname}」嗎？`)) return
  processingId.value = u.id
  try {
    await api.patch(`/admin/users/${u.id}`, { status: suspend ? 'suspended' : 'active' })
    await Promise.all([fetchUsers(), loadSummary()])
  } catch (e) {
    console.error('操作失敗', e)
    alert('操作失敗，請重試')
  } finally {
    processingId.value = null
  }
}

const handleChangeRole = async (u: UserRow) => {
  const roleNames: Record<string, string> = { user: '普通用戶', seller: '商家', admin: '管理員' }
  const next = prompt(`將「${u.nickname}」角色改為：\n輸入 user（普通用戶）/ seller（商家）/ admin（管理員）\n目前：${roleNames[u.role] || u.role}`)
  if (!next || !roles.includes(next)) return
  if (next === u.role) return
  processingId.value = u.id
  try {
    await api.patch(`/admin/users/${u.id}`, { role: next })
    await Promise.all([fetchUsers(), loadSummary()])
    alert(`已改為${roleNames[next]}`)
  } catch (e) {
    console.error('操作失敗', e)
    alert('操作失敗，請重試')
  } finally {
    processingId.value = null
  }
}

// ===== 徽章 =====
const ROLE_BADGE: Record<string, { cls: string; text: string }> = {
  user: { cls: 'r-user', text: '普通用戶' },
  seller: { cls: 'r-seller', text: '商家' },
  admin: { cls: 'r-admin', text: '管理員' },
}
const roleBadge = (r: string) => ROLE_BADGE[r] || { cls: 'r-user', text: r }

const STATUS_BADGE: Record<string, { cls: string; text: string }> = {
  active: { cls: 's-active', text: '正常' },
  suspended: { cls: 's-suspended', text: '已封禁' },
}
const statusBadge = (s: string) => STATUS_BADGE[s] || { cls: 's-active', text: s }

// ===== 詳情彈出層 =====
const detailUser = ref<UserRow | null>(null)
const openDetail = (u: UserRow) => { detailUser.value = u }
const closeDetail = () => { detailUser.value = null }

// query 重放：/admin/users?role=seller（商家管理併入後跳入）
onMounted(() => {
  const qRole = String(route.query.role || '')
  if (qRole && TAB_DEFS.some(t => t.role === qRole)) {
    activeTab.value = qRole
  }
  fetchUsers()
  loadSummary()
})
</script>

<template>
  <div class="users-management">
    <!-- 頂部統計條 -->
    <div v-if="!loading" class="summary-bar">
      <div class="stat-item">
        <span class="stat-label">用戶</span>
        <span class="stat-value">{{ summary.total }} <small>位</small></span>
      </div>
      <div class="stat-item">
        <span class="stat-label">商家</span>
        <span class="stat-value">{{ summary.seller }} <small>位</small></span>
      </div>
      <div class="stat-item" :class="{ alert: summary.suspended > 0 }">
        <span class="stat-label">已封禁</span>
        <span class="stat-value">{{ summary.suspended }} <small>位</small></span>
      </div>
      <div class="stat-item">
        <span class="stat-label">管理員</span>
        <span class="stat-value">{{ summary.admin }} <small>位</small></span>
      </div>
    </div>

    <!-- 角色 tabs -->
    <div class="list-tabs">
      <button
        v-for="tab in TAB_DEFS"
        :key="tab.key"
        class="list-tab"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
        <span class="tab-count">{{ tabCount(tab.key) }}</span>
      </button>
    </div>

    <!-- 搜尋 + 狀態篩選 -->
    <div class="search-row">
      <input
        v-model="searchQuery"
        type="text"
        class="search-input"
        placeholder="🔍 搜尋暱稱、Email 或電話..."
      />
      <button v-if="searchQuery" class="btn-clear-search" @click="searchQuery = ''">✕ 清除</button>
      <select v-model="filterStatus" class="status-select">
        <option value="all">全部狀態</option>
        <option value="active">正常</option>
        <option value="suspended">已封禁</option>
      </select>
    </div>

    <StateView v-if="loading" state="loading" />
    <StateView v-else-if="!pagedUsers.length" state="empty" icon="👥" title="暫無用戶" />

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
            <th>消費訂單</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in pagedUsers" :key="u.id">
            <td>
              <div class="user-cell" @click="openDetail(u)">
                <div class="user-avatar">{{ u.nickname?.charAt(0).toUpperCase() || 'U' }}</div>
                <span class="user-name">{{ u.nickname }}</span>
              </div>
            </td>
            <td class="email-cell">{{ u.email || '未綁定' }}</td>
            <td>
              <span class="role-badge" :class="roleBadge(u.role).cls">{{ roleBadge(u.role).text }}</span>
            </td>
            <td>
              <span class="status-badge" :class="statusBadge(u.status).cls">{{ statusBadge(u.status).text }}</span>
            </td>
            <td class="date">{{ formatDate(u.createdAt) }}</td>
            <td>
              <div class="amount">{{ formatPrice(u.totalSpend) }}</div>
              <div class="cell-sub">{{ u.orderCount }} 筆訂單</div>
            </td>
            <td>
              <div class="actions-cell">
                <button
                  class="btn-action"
                  :class="u.status === 'active' ? 'suspend' : 'activate'"
                  :disabled="processingId === u.id"
                  @click="handleSuspend(u)"
                >{{ processingId === u.id ? '處理中...' : (u.status === 'active' ? '封禁' : '解封') }}</button>
                <button class="btn-action detail" :disabled="processingId === u.id" @click="handleChangeRole(u)">改角色</button>
                <button class="btn-action detail" @click="openDetail(u)">詳情</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ===== 手機卡片列表（<768px） ===== -->
    <div v-if="!loading && pagedUsers.length" class="user-cards">
      <div v-for="u in pagedUsers" :key="'m' + u.id" class="user-card">
        <div class="card-top">
          <div class="user-avatar">{{ u.nickname?.charAt(0).toUpperCase() || 'U' }}</div>
          <div class="card-main">
            <div class="card-title">{{ u.nickname }}</div>
            <div class="card-meta">
              <span class="role-badge" :class="roleBadge(u.role).cls">{{ roleBadge(u.role).text }}</span>
              <span class="status-badge" :class="statusBadge(u.status).cls">{{ statusBadge(u.status).text }}</span>
            </div>
          </div>
          <div class="card-amount">
            <div class="amount">{{ formatPrice(u.totalSpend) }}</div>
            <div class="cell-sub">{{ u.orderCount }} 筆</div>
          </div>
        </div>
        <div class="card-mid">
          <span class="card-email">{{ u.email || '未綁定' }}</span>
          <span class="card-date">{{ formatDate(u.createdAt) }}</span>
        </div>
        <div class="card-actions">
          <button
            class="btn-action"
            :class="u.status === 'active' ? 'suspend' : 'activate'"
            :disabled="processingId === u.id"
            @click="handleSuspend(u)"
          >{{ u.status === 'active' ? '封禁' : '解封' }}</button>
          <button class="btn-action detail" :disabled="processingId === u.id" @click="handleChangeRole(u)">改角色</button>
          <button class="btn-action detail" @click="openDetail(u)">詳情</button>
        </div>
      </div>
    </div>

    <!-- 分頁 -->
    <div v-if="!loading && apiTotal > PAGE_SIZE" class="pagination">
      <button class="page-btn" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">‹ 上一頁</button>
      <span class="page-info">第 {{ currentPage }} / {{ totalPages }} 頁 · 共 {{ apiTotal }} 位</span>
      <button class="page-btn" :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)">下一頁 ›</button>
    </div>

    <!-- 用戶詳情彈出層 -->
    <div v-if="detailUser" class="modal-overlay" @click.self="closeDetail">
      <div class="detail-modal">
        <div class="modal-header">
          <h3>用戶詳情</h3>
          <button @click="closeDetail" class="modal-close">✕</button>
        </div>
        <div class="detail-body">
          <div class="detail-top">
            <div class="user-avatar lg">{{ detailUser.nickname?.charAt(0).toUpperCase() || 'U' }}</div>
            <div class="du-main">
              <span class="du-name">{{ detailUser.nickname }}</span>
              <span class="du-sub">{{ detailUser.email || '未綁定 Email' }}</span>
            </div>
            <div class="du-badges">
              <span class="role-badge" :class="roleBadge(detailUser.role).cls">{{ roleBadge(detailUser.role).text }}</span>
              <span class="status-badge" :class="statusBadge(detailUser.status).cls">{{ statusBadge(detailUser.status).text }}</span>
            </div>
          </div>

          <div class="detail-grid">
            <div class="dg-item">
              <span class="dg-label">電話</span>
              <span class="dg-value">{{ detailUser.phone || '未綁定' }}</span>
            </div>
            <div class="dg-item">
              <span class="dg-label">錢包餘額</span>
              <span class="dg-value">{{ formatPrice(detailUser.balance) }}</span>
            </div>
            <div class="dg-item">
              <span class="dg-label">累計消費</span>
              <span class="dg-value money">{{ formatPrice(detailUser.totalSpend) }}<small>{{ detailUser.orderCount }} 筆已完成</small></span>
            </div>
            <div class="dg-item">
              <span class="dg-label">最後登入</span>
              <span class="dg-value">{{ detailUser.lastLoginAt ? formatDateTime(detailUser.lastLoginAt) : '從未登入' }}</span>
            </div>
            <div class="dg-item">
              <span class="dg-label">註冊時間</span>
              <span class="dg-value">{{ formatDateTime(detailUser.createdAt) }}</span>
            </div>
          </div>

          <div class="detail-actions">
            <button
              class="btn-action"
              :class="detailUser.status === 'active' ? 'suspend' : 'activate'"
              :disabled="processingId === detailUser.id"
              @click="handleSuspend(detailUser)"
            >{{ detailUser.status === 'active' ? '封禁此用戶' : '解封此用戶' }}</button>
            <button class="btn-action detail" :disabled="processingId === detailUser.id" @click="handleChangeRole(detailUser)">更改角色</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.users-management { display: flex; flex-direction: column; gap: var(--space-4); }

/* ===== 統計條（同 seller 四頁）===== */
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
.stat-item.alert { border-color: #ef4444; background: rgba(239, 68, 68, 0.08); }
.stat-item.alert .stat-value { color: #ef4444; }

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
.search-row { display: flex; gap: var(--space-2); align-items: center; flex-wrap: wrap; }
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
.status-select {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: var(--text-sm);
  cursor: pointer;
}

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

.user-cell { display: flex; align-items: center; gap: var(--space-3); cursor: pointer; }
.user-avatar {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: var(--primary-gradient);
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; color: white;
  flex-shrink: 0;
}
.user-avatar.lg { width: 48px; height: 48px; font-size: 18px; }
.user-name { font-weight: 500; }
.email-cell { font-size: var(--text-xs); color: var(--text-muted); }
.amount { font-family: var(--font-num); font-weight: 600; color: var(--primary); white-space: nowrap; }
.cell-sub { font-size: var(--text-xs); color: var(--text-secondary); margin-top: 2px; font-family: var(--font-num); }
.date { font-size: var(--text-xs); color: var(--text-muted); white-space: nowrap; }
.actions-cell { display: flex; gap: 6px; flex-wrap: wrap; }

.role-badge { padding: 2px 10px; border-radius: var(--radius-full); font-size: var(--text-xs); font-weight: 600; white-space: nowrap; }
.r-user { background: #3b82f633; color: #3b82f6; }
.r-seller { background: #10b98133; color: #10b981; }
.r-admin { background: #ef444433; color: #ef4444; }
.status-badge { padding: 2px 10px; border-radius: var(--radius-full); font-size: var(--text-xs); font-weight: 600; white-space: nowrap; }
.s-active { background: #10b9814d; color: #10b981; }
.s-suspended { background: #ef44444d; color: #ef4444; }

.btn-action {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}
.btn-action.suspend, .btn-action.activate { background: var(--bg-elevated); color: var(--text-primary); }
.btn-action.suspend:hover:not(:disabled) { background: #ef4444; color: white; }
.btn-action.activate:hover:not(:disabled) { background: #10b981; color: white; }
.btn-action.detail { background: var(--bg-elevated); color: var(--text-primary); }
.btn-action.detail:hover { background: var(--primary); color: white; }
.btn-action:disabled { opacity: 0.5; cursor: not-allowed; }

/* ===== 手機卡片（<768px 才顯示）===== */
.user-cards { display: none; }

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
.du-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.du-name { font-weight: 700; font-size: var(--text-base); }
.du-sub { font-size: var(--text-xs); color: var(--text-secondary); }
.du-badges { display: flex; gap: 6px; flex-wrap: wrap; }
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}
.dg-item { display: flex; flex-direction: column; gap: 4px; }
.dg-label { font-size: var(--text-xs); color: var(--text-secondary); }
.dg-value { font-size: var(--text-sm); color: var(--text-primary); word-break: break-all; }
.dg-value small { display: block; color: var(--text-secondary); font-size: var(--text-xs); }
.dg-value.money { color: #10b981; font-weight: 600; font-family: var(--font-num); }
.detail-actions { display: flex; gap: var(--space-3); flex-wrap: wrap; }
.detail-actions .btn-action { padding: var(--space-2) var(--space-5); font-size: var(--text-sm); }

/* ===== 手機版適配（<768px：表格收起，顯示卡片）===== */
@media (max-width: 767px) {
  .users-management,
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

  .user-cards {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .user-card {
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
  .user-card .user-avatar { width: 40px; height: 40px; }
  .card-main { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
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
    gap: var(--space-2);
  }
  .card-email { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
  .card-actions { display: flex; gap: 6px; }
  .card-actions .btn-action { flex: 1; text-align: center; }

  .summary-bar { gap: var(--space-2); }
  .stat-item { flex: 1 1 40%; padding: var(--space-2) var(--space-3); }
  .stat-value { font-size: var(--text-base); }
  .list-tabs { gap: var(--space-1); }
  .list-tab { padding: var(--space-1) var(--space-3); font-size: var(--text-xs); }
  .search-row { flex-wrap: wrap; }
  .search-input { max-width: 100%; flex: 1 1 100%; }
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
  .users-management { max-width: 100%; }
}
</style>