<script setup lang="ts">
import { formatPrice, formatDate, formatDateTime } from '@/utils/format'
import StateView from '@/components/common/StateView.vue'
import { computed, onMounted, ref } from 'vue'
import api from '@/api'
import { sellerApplicationApi } from '@/api/seller-application'

// ===== 統計條（同四分頁 summary-bar/stat-item 風格）=====
// 口徑：待審批申請（alert）/ 總用戶 / 商品（含模式明細）/ 有效訂單 / 平台收入（delivered 總額）
const stats = ref({
  totalUsers: 0,
  totalSellers: 0,
  totalProducts: 0,
  activeProducts: 0,
  activeAuctions: 0,
  totalOrders: 0,
  totalRevenue: 0,
  pendingApps: 0,
})

const recentUsers = ref<any[]>([])
const loading = ref(true)

const parseImages = (images: any): string[] => {
  if (Array.isArray(images)) return images
  try { const arr = JSON.parse(images); return Array.isArray(arr) ? arr : [] } catch { return [] }
}

const loadData = async () => {
  loading.value = true
  try {
    const [statsRes, usersRes, appsRes] = await Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/recent-users', { params: { limit: 5 } }),
      sellerApplicationApi.getAllApplications(1, 1, 'pending'),
    ])
    const s = statsRes.data || {}
    stats.value = {
      totalUsers: Number(s.totalUsers) || 0,
      totalSellers: Number(s.totalSellers) || 0,
      totalProducts: Number(s.totalProducts) || 0,
      activeProducts: Number(s.activeProducts) || 0,
      activeAuctions: Number(s.activeAuctions) || 0,
      totalOrders: Number(s.totalOrders) || 0,
      totalRevenue: Number(s.totalRevenue) || 0,
      pendingApps: appsRes.data?.total || 0,
    }
    recentUsers.value = usersRes.data || []
  } catch (e) {
    console.error('Failed to load admin dashboard:', e)
  } finally {
    loading.value = false
  }
}

// ===== 徽章（同用戶管理一致） =====
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

onMounted(() => loadData())
</script>

<template>
  <div class="admin-dashboard">
    <!-- 統計條（同四分頁 summary-bar/stat-item 風格） -->
    <div v-if="!loading" class="summary-bar">
      <div class="stat-item" :class="{ alert: stats.pendingApps > 0 }">
        <span class="stat-label">待審批申請</span>
        <span class="stat-value">{{ stats.pendingApps }} <small>件</small></span>
      </div>
      <div class="stat-item">
        <span class="stat-label">用戶</span>
        <span class="stat-value">{{ stats.totalUsers }} <small>位</small></span>
        <small class="stat-meta">商家 {{ stats.totalSellers }}</small>
      </div>
      <div class="stat-item">
        <span class="stat-label">商品</span>
        <span class="stat-value">{{ stats.totalProducts }} <small>件</small></span>
        <small class="stat-meta">上架中 {{ stats.activeProducts }} · 拍賣 {{ stats.activeAuctions }}</small>
      </div>
      <div class="stat-item">
        <span class="stat-label">訂單</span>
        <span class="stat-value">{{ stats.totalOrders }} <small>筆</small></span>
      </div>
      <div class="stat-item primary">
        <span class="stat-label">平台總收入</span>
        <span class="stat-value money">{{ formatPrice(stats.totalRevenue) }}</span>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions">
      <router-link to="/admin/users" class="action-card">
        <span class="action-icon">👥</span>
        <span class="action-text">用戶管理</span>
      </router-link>
      <router-link to="/admin/seller-applications" class="action-card" :class="{ 'has-alert': stats.pendingApps > 0 }">
        <span class="action-icon">📝</span>
        <span class="action-text">入駐審批{{ stats.pendingApps > 0 ? `（${stats.pendingApps}）` : '' }}</span>
      </router-link>
      <router-link to="/admin/settings" class="action-card">
        <span class="action-icon">⚙️</span>
        <span class="action-text">平台設定</span>
      </router-link>
    </div>

    <!-- 最新用戶（行結構同用戶管理列表一致） -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">👥 最新用戶</h3>
        <router-link to="/admin/users" class="see-all">查看全部</router-link>
      </div>
      <div class="card-body">
        <StateView v-if="loading" state="loading" title="加載中..." />
        <StateView v-else-if="!recentUsers.length" state="empty" icon="👥" title="暫無用戶" />
        <div v-else class="user-list">
          <div v-for="user in recentUsers" :key="user.id" class="user-item">
            <div class="user-avatar">{{ user.nickname?.charAt(0).toUpperCase() || 'U' }}</div>
            <div class="ui-info">
              <div class="ui-name">{{ user.nickname }}</div>
              <div class="ui-meta">{{ user.email || '未綁定 Email' }}</div>
            </div>
            <div class="ui-badges">
              <span class="role-badge" :class="roleBadge(user.role).cls">{{ roleBadge(user.role).text }}</span>
              <span class="status-badge" :class="statusBadge(user.status).cls">{{ statusBadge(user.status).text }}</span>
            </div>
            <div class="ui-right">
              <div class="ui-date">{{ formatDate(user.createdAt) }}</div>
              <div class="ui-sub">註冊</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-dashboard { display: flex; flex-direction: column; gap: var(--space-4); }

/* ===== 統計條（同四分頁 summary-bar/stat-item）===== */
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
  min-width: 0;
}

.stat-label { font-size: var(--text-xs); color: var(--text-secondary); white-space: nowrap; }

.stat-value {
  font-size: var(--text-lg);
  font-weight: 700;
  font-family: var(--font-num);
  color: var(--text-primary);
}

.stat-value small { font-size: var(--text-xs); font-weight: 400; color: var(--text-secondary); }
.stat-value.money { color: #10b981; }
.stat-meta { font-size: var(--text-xs); color: var(--text-muted); margin-left: 4px; white-space: nowrap; }
.stat-item.alert { border-color: #f59e0b; background: rgba(245, 158, 11, 0.08); }
.stat-item.alert .stat-value { color: #f59e0b; }
.stat-item.primary { border-color: rgba(99, 102, 241, 0.5); background: rgba(99, 102, 241, 0.08); }

/* ===== Quick Actions ===== */
.quick-actions { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); }

.action-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  text-decoration: none;
  transition: all var(--transition-fast);
}

.action-card:hover { border-color: var(--primary); transform: translateY(-2px); box-shadow: 0 4px 16px #667eea33; }
.action-card.has-alert { border-color: #f59e0b; }
.action-icon { font-size: 26px; }
.action-text { font-size: var(--text-sm); font-weight: 600; color: var(--text-primary); }

/* ===== 最新用戶 ===== */
.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  overflow: hidden;
  min-width: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--border);
}

.card-title { font-size: var(--text-base); font-weight: 600; color: var(--text-primary); }
.see-all { font-size: var(--text-sm); color: var(--primary); text-decoration: none; }
.see-all:hover { text-decoration: underline; }
.card-body { padding: var(--space-4); }

.user-list { display: flex; flex-direction: column; gap: var(--space-2); }

.user-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
  min-width: 0;
}

.user-avatar {
  width: 40px; height: 40px;
  border-radius: 50%;
  background: var(--primary-gradient);
  display: flex; align-items: center; justify-content: center;
  font-size: 15px; font-weight: 700; color: white;
  flex-shrink: 0;
}

.ui-info, .ui-main { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.ui-name { font-size: var(--text-sm); font-weight: 500; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ui-meta { font-size: var(--text-xs); color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ui-badges { display: flex; gap: 6px; flex-wrap: wrap; flex-shrink: 0; }
.ui-right { text-align: right; flex-shrink: 0; }
.ui-date { font-size: var(--text-xs); color: var(--text-muted); font-family: var(--font-num); }
.ui-sub { font-size: var(--text-xs); color: var(--text-muted); }

.role-badge { padding: 2px 8px; border-radius: var(--radius-full); font-size: 11px; font-weight: 600; white-space: nowrap; }
.r-user { background: #3b82f633; color: #3b82f6; }
.r-seller { background: #10b98133; color: #10b981; }
.r-admin { background: #ef444433; color: #ef4444; }

.status-badge { padding: 2px 8px; border-radius: var(--radius-full); font-size: 11px; font-weight: 600; white-space: nowrap; }
.s-active { background: #10b9814d; color: #10b981; }
.s-suspended { background: #ef44444d; color: #ef4444; }

/* ===== 手機適配（<768px，同四分頁）===== */
@media (max-width: 767px) {
  .admin-dashboard,
  .summary-bar,
  .stat-item,
  .quick-actions,
  .card {
    min-width: 0;
  }

  .summary-bar { gap: var(--space-2); }
  .stat-item { flex: 1 1 40%; padding: var(--space-2) var(--space-3); flex-wrap: wrap; }
  .stat-value { font-size: var(--text-base); }
  .stat-meta { display: none; }

  .quick-actions { grid-template-columns: repeat(2, 1fr); gap: var(--space-2); }
  .action-card { padding: var(--space-4); }

  .card-header { padding: var(--space-3) var(--space-4); }
  .card-body { padding: var(--space-3); }
  .user-item { flex-wrap: wrap; }
  .ui-badges { margin-left: 52px; }
}

/* 桌面寬屏適配 */
@media (min-width: 820px) {
  .admin-dashboard { max-width: 100%; }
}
</style>