<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/api'

const stats = ref({
  totalUsers: 0,
  totalSellers: 0,
  totalProducts: 0,
  activeAuctions: 0,
  totalOrders: 0,
  pendingOrders: 0,
  totalRevenue: 0,
})

const recentUsers = ref<any[]>([])
const loading = ref(true)

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('zh-MO', {
    style: 'currency',
    currency: 'MOP',
    minimumFractionDigits: 0,
  }).format(price)
}

const getStatusBadge = (status: string) => {
  const map: Record<string, { class: string; text: string }> = {
    active: { class: 'success', text: '正常' },
    suspended: { class: 'danger', text: '已封禁' },
  }
  return map[status] || { class: 'default', text: status }
}

const loadData = async () => {
  loading.value = true
  try {
    const [statsRes, usersRes] = await Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/recent-users', { params: { limit: 5 } }),
    ])
    stats.value = statsRes.data
    recentUsers.value = usersRes.data || []
  } catch (e) {
    console.error('Failed to load admin dashboard:', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => loadData())
</script>

<template>
  <div class="admin-dashboard">
    <!-- Stats Grid -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon users">👥</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.totalUsers.toLocaleString() }}</div>
          <div class="stat-label">總用戶</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon sellers">🏪</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.totalSellers }}</div>
          <div class="stat-label">商家</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon products">📦</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.totalProducts }}</div>
          <div class="stat-label">商品</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon auctions">🔨</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.activeAuctions }}</div>
          <div class="stat-label">進行中拍賣</div>
        </div>
      </div>
      <div class="stat-card highlight">
        <div class="stat-icon revenue">💰</div>
        <div class="stat-content">
          <div class="stat-value">{{ formatPrice(stats.totalRevenue) }}</div>
          <div class="stat-label">已完成訂單總額</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon pending">⏳</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.pendingOrders }}</div>
          <div class="stat-label">待確認訂單</div>
        </div>
      </div>
    </div>

    <!-- Activity Grid -->
    <div class="activity-grid">
      <!-- Recent Users -->
      <div class="card">
        <div class="card-header">
          <h3>👥 最新用戶</h3>
          <router-link to="/admin/users" class="see-all">查看全部</router-link>
        </div>
        <div class="card-body">
          <div v-for="user in recentUsers" :key="user.id" class="item-row">
            <div class="item-info">
              <div class="item-title">{{ user.nickname }}</div>
              <div class="item-meta">{{ user.email }}</div>
            </div>
            <div class="item-actions">
              <span class="role-badge" :class="user.role">{{ user.role }}</span>
              <span class="status-badge" :class="getStatusBadge(user.status).class">
                {{ getStatusBadge(user.status).text }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions">
      <router-link to="/admin/users" class="action-card">
        <span class="action-icon">👥</span>
        <span class="action-text">用戶管理</span>
      </router-link>
      <router-link to="/admin/sellers" class="action-card">
        <span class="action-icon">🏪</span>
        <span class="action-text">商家審核</span>
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.admin-dashboard {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: var(--space-4);
}

.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.stat-card.highlight {
  background: var(--primary-gradient);
  border: none;
}

.stat-card.highlight .stat-value,
.stat-card.highlight .stat-label {
  color: white;
}

.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.stat-icon.users { background: #3b82f633; }
.stat-icon.sellers { background: #10b98133; }
.stat-icon.products { background: #8b5cf633; }
.stat-icon.auctions { background: #f59e0b33; }
.stat-icon.revenue { background: rgba(255,255,255,0.2); }
.stat-icon.pending { background: #ef444433; }

.stat-value {
  font-family: var(--font-num);
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--text-primary);
}

.stat-label {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.activity-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-6);
}

.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--border);
}

.card-header h3 {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-primary);
}

.see-all {
  font-size: var(--text-sm);
  color: var(--primary);
  text-decoration: none;
}

.card-body {
  padding: var(--space-4);
}

.item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3);
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-2);
}

.item-row:last-child {
  margin-bottom: 0;
}

.item-title {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.item-meta {
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.item-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.status-badge {
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 500;
}

.status-badge.warning { background: #f59e0b33; color: #f59e0b; }
.status-badge.success { background: #10b98133; color: #10b981; }
.status-badge.danger { background: #ef444433; color: #ef4444; }

.role-badge {
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 500;
}

.role-badge.user { background: #3b82f633; color: #3b82f6; }
.role-badge.seller { background: #10b98133; color: #10b981; }

.btn-approve, .btn-reject {
  padding: 2px 8px;
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  font-weight: 500;
  border: none;
  cursor: pointer;
}

.btn-approve { background: #10b981; color: white; }
.btn-reject { background: #ef4444; color: white; }

.quick-actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
}

.action-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  text-decoration: none;
  transition: all var(--transition-fast);
}

.action-card:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
}

.action-icon { font-size: 28px; }
.action-text { font-size: var(--text-sm); font-weight: 600; color: var(--text-primary); }

@media (max-width: 1280px) {
  .stats-grid { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 1024px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .activity-grid, .quick-actions { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 640px) {
  .stats-grid, .activity-grid, .quick-actions { grid-template-columns: 1fr; }
}
</style>
