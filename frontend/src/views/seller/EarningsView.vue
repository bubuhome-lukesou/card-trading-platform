<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

interface Transaction {
  id: string
  orderNumber: string
  productTitle: string
  amount: number
  fee: number
  netAmount: number
  status: 'completed' | 'pending' | 'failed'
  createdAt: string
}

const stats = ref({
  totalEarnings: 45680,
  pendingBalance: 8500,
  availableBalance: 37180,
  totalOrders: 18,
})

const transactions = ref<Transaction[]>([])
const loading = ref(true)

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('zh-HK', {
    style: 'currency',
    currency: 'HKD',
    minimumFractionDigits: 0,
  }).format(price)
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

const loadData = async () => {
  loading.value = true
  try {
    transactions.value = [
      { id: '1', orderNumber: 'ORD-2026-001', productTitle: 'Pokemon 1st Edition Base Set', amount: 12800, fee: 640, netAmount: 12160, status: 'completed', createdAt: '2026-04-21' },
      { id: '2', orderNumber: 'ORD-2026-002', productTitle: 'Yu-Gi-Oh Blue-Eyes White Dragon', amount: 6800, fee: 340, netAmount: 6460, status: 'completed', createdAt: '2026-04-20' },
      { id: '3', orderNumber: 'ORD-2026-003', productTitle: 'MTG Black Lotus', amount: 25000, fee: 1250, netAmount: 23750, status: 'pending', createdAt: '2026-04-19' },
      { id: '4', orderNumber: 'ORD-2026-004', productTitle: 'Doraemon Figure Collection', amount: 1800, fee: 90, netAmount: 1710, status: 'completed', createdAt: '2026-04-15' },
    ]
  } catch (error) {
    console.error('Failed to load earnings:', error)
  } finally {
    loading.value = false
  }
}

const handleWithdraw = () => {
  alert('提现功能开发中...')
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="earnings-management">
    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card primary">
        <div class="stat-header">
          <span class="stat-label">总收入</span>
          <span class="stat-icon">💰</span>
        </div>
        <div class="stat-value">{{ formatPrice(stats.totalEarnings) }}</div>
        <div class="stat-meta">已完成 {{ stats.totalOrders }} 笔订单</div>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-label">待结算</span>
          <span class="stat-icon">⏳</span>
        </div>
        <div class="stat-value">{{ formatPrice(stats.pendingBalance) }}</div>
        <div class="stat-meta">预计 7 天后到账</div>
      </div>

      <div class="stat-card success">
        <div class="stat-header">
          <span class="stat-label">可提现</span>
          <span class="stat-icon">✅</span>
        </div>
        <div class="stat-value">{{ formatPrice(stats.availableBalance) }}</div>
        <button @click="handleWithdraw" class="withdraw-btn">立即提现</button>
      </div>
    </div>

    <!-- Transaction History -->
    <div class="transactions-section">
      <h3 class="section-title">💳 交易记录</h3>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
      </div>

      <div v-else class="transactions-table">
        <table>
          <thead>
            <tr>
              <th>订单号</th>
              <th>商品</th>
              <th>销售额</th>
              <th>平台费 (5%)</th>
              <th>实际收入</th>
              <th>状态</th>
              <th>日期</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="tx in transactions" :key="tx.id">
              <td class="order-number">{{ tx.orderNumber }}</td>
              <td class="product-title">{{ tx.productTitle }}</td>
              <td class="amount">{{ formatPrice(tx.amount) }}</td>
              <td class="fee">-{{ formatPrice(tx.fee) }}</td>
              <td class="net-amount">{{ formatPrice(tx.netAmount) }}</td>
              <td>
                <span class="status-badge" :class="tx.status">
                  {{ tx.status === 'completed' ? '已完成' : tx.status === 'pending' ? '处理中' : '失败' }}
                </span>
              </td>
              <td>{{ formatDate(tx.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Withdrawal Info -->
    <div class="withdrawal-info">
      <h3 class="section-title">🏦 提现信息</h3>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">收款方式</span>
          <span class="info-value">银行转账</span>
        </div>
        <div class="info-item">
          <span class="info-label">收款账户</span>
          <span class="info-value">**** **** **** 5678</span>
        </div>
        <div class="info-item">
          <span class="info-label">开户银行</span>
          <span class="info-value">澳门国际银行</span>
        </div>
        <div class="info-item">
          <span class="info-label">开户姓名</span>
          <span class="info-value">Card Quest User</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.earnings-management {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
}

.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
}

.stat-card.primary {
  background: var(--primary-gradient);
  border: none;
}

.stat-card.success {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border: none;
}

.stat-card.primary .stat-label,
.stat-card.primary .stat-meta,
.stat-card.primary .stat-icon,
.stat-card.success .stat-label,
.stat-card.success .stat-meta,
.stat-card.success .stat-icon {
  color: rgba(255, 255, 255, 0.8);
}

.stat-card.primary .stat-value,
.stat-card.success .stat-value {
  color: white;
}

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
}

.stat-label {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.stat-icon {
  font-size: 20px;
}

.stat-value {
  font-family: var(--font-num);
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}

.stat-meta {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.withdraw-btn {
  margin-top: var(--space-3);
  padding: var(--space-2) var(--space-4);
  background: white;
  border: none;
  border-radius: var(--radius-md);
  color: #10b981;
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.withdraw-btn:hover {
  opacity: 0.9;
}

.transactions-section,
.withdrawal-info {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
}

.section-title {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-4);
}

.loading-state {
  text-align: center;
  padding: var(--space-8);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.transactions-table {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: var(--space-3);
  text-align: left;
  border-bottom: 1px solid var(--border);
}

th {
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--text-secondary);
}

td {
  font-size: var(--text-sm);
  color: var(--text-primary);
}

tr:last-child td {
  border-bottom: none;
}

.order-number {
  font-family: var(--font-num);
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.product-title {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.amount {
  font-family: var(--font-num);
}

.fee {
  font-family: var(--font-num);
  color: var(--text-secondary);
}

.net-amount {
  font-family: var(--font-num);
  font-weight: 700;
  color: #10b981;
}

.status-badge {
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 500;
}

.status-badge.completed {
  background: #10b9814d;
  color: #10b981;
}

.status-badge.pending {
  background: #f59e0b4d;
  color: #f59e0b;
}

.status-badge.failed {
  background: #ef44444d;
  color: #ef4444;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-4);
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: var(--space-3);
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
}

.info-label {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.info-value {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-primary);
}

@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
