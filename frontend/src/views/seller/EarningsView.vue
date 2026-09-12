<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ordersApi } from '@/api/orders'

const { t } = useI18n()

const orders = ref<any[]>([])
const loading = ref(true)

const stats = computed(() => {
  const completed = orders.value.filter(o => ['paid', 'shipped', 'delivered'].includes(o.status))
  const pending = orders.value.filter(o => o.status === 'pending_paid')
  const totalEarned = completed.reduce((sum, o) => sum + (o.totalPrice || 0), 0)
  return {
    totalEarnings: totalEarned,
    pendingBalance: pending.reduce((sum, o) => sum + (o.totalPrice || 0), 0),
    totalOrders: completed.length,
  }
})

const transactions = computed(() => {
  return orders.value
    .filter(o => ['paid', 'shipped', 'delivered'].includes(o.status))
    .map(o => ({
      id: o.id,
      orderNumber: o.orderNumber,
      productTitle: o.product?.title || '-',
      amount: o.totalPrice || 0,
      status: o.status === 'delivered' ? 'completed' : 'pending',
      createdAt: o.createdAt,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
})

const loadData = async () => {
  loading.value = true
  try {
    const res = await ordersApi.getSellerOrders()
    orders.value = res.data.data || []
  } catch (e) {
    console.error('Failed to load earnings', e)
    orders.value = []
  } finally {
    loading.value = false
  }
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('zh-MO', { style: 'currency', currency: 'MOP', minimumFractionDigits: 0 }).format(price)
}

const formatDate = (dateStr: string) => {
  return dateStr ? new Date(dateStr).toLocaleDateString('zh-CN') : '-'
}

onMounted(() => loadData())
</script>

<template>
  <div class="earnings-management">
    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card primary">
        <div class="stat-header">
          <span class="stat-label">總收入</span>
          <span class="stat-icon">💰</span>
        </div>
        <div class="stat-value">{{ formatPrice(stats.totalEarnings) }}</div>
        <div class="stat-meta">已完成 {{ stats.totalOrders }} 筆記單</div>
      </div>
      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-label">待結算</span>
          <span class="stat-icon">⏳</span>
        </div>
        <div class="stat-value">{{ formatPrice(stats.pendingBalance) }}</div>
        <div class="stat-meta">買家付款後到帳</div>
      </div>
    </div>

    <!-- Transaction History -->
    <div class="transactions-section">
      <h3 class="section-title">💳 交易記錄</h3>
      <div v-if="loading" class="loading-state"><div class="spinner"></div></div>
      <div v-else-if="!transactions.length" class="empty-state">暫無交易記錄</div>
      <div v-else class="transactions-table">
        <table>
          <thead>
            <tr>
              <th>訂單號</th>
              <th>商品</th>
              <th>銷售額</th>
              <th>狀態</th>
              <th>日期</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="tx in transactions" :key="tx.id">
              <td class="order-number">{{ tx.orderNumber }}</td>
              <td class="product-title">{{ tx.productTitle }}</td>
              <td class="amount">{{ formatPrice(tx.amount) }}</td>
              <td>
                <span class="status-badge" :class="tx.status">
                  {{ tx.status === 'completed' ? '已完成' : '處理中' }}
                </span>
              </td>
              <td>{{ formatDate(tx.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.earnings-management { display: flex; flex-direction: column; gap: var(--space-6); }
.stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-4); }
.stat-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: var(--space-6); }
.stat-card.primary { background: var(--primary-gradient); border: none; }
.stat-card.success { background: linear-gradient(135deg, #10b981 0%, #059669 100%); border: none; }
.stat-card.primary .stat-label, .stat-card.primary .stat-meta, .stat-card.primary .stat-icon,
.stat-card.success .stat-label, .stat-card.success .stat-meta, .stat-card.success .stat-icon { color: rgba(255,255,255,0.8); }
.stat-card.primary .stat-value, .stat-card.success .stat-value { color: white; }
.stat-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3); }
.stat-label { font-size: var(--text-sm); color: var(--text-secondary); }
.stat-icon { font-size: 20px; }
.stat-value { font-family: var(--font-num); font-size: var(--text-2xl); font-weight: 700; color: var(--text-primary); margin-bottom: var(--space-2); }
.stat-meta { font-size: var(--text-xs); color: var(--text-muted); }
.transactions-section, .withdrawal-info { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: var(--space-6); }
.section-title { font-size: var(--text-base); font-weight: 600; color: var(--text-primary); margin-bottom: var(--space-4); }
.loading-state { text-align: center; padding: var(--space-8); }
.empty-state { text-align: center; padding: var(--space-8); color: var(--text-muted); }
.spinner { width: 32px; height: 32px; border: 3px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto; }
@keyframes spin { to { transform: rotate(360deg); } }
.transactions-table { overflow-x: auto; -webkit-overflow-scrolling: touch; touch-action: pan-x; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: var(--space-3); text-align: left; border-bottom: 1px solid var(--border); }
th { font-size: var(--text-xs); font-weight: 500; color: var(--text-secondary); }
td { font-size: var(--text-sm); color: var(--text-primary); }
tr:last-child td { border-bottom: none; }
.order-number { font-family: var(--font-num); font-size: var(--text-xs); color: var(--text-muted); }
.product-title { max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.amount { font-family: var(--font-num); font-weight: 700; color: #10b981; }
.status-badge { padding: 2px 8px; border-radius: var(--radius-full); font-size: var(--text-xs); font-weight: 500; }
.status-badge.completed { background: #10b9814d; color: #10b981; }
.status-badge.pending { background: #f59e0b4d; color: #f59e0b; }
@media (max-width: 1024px) { .stats-grid { grid-template-columns: 1fr; } }
</style>
