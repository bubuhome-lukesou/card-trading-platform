<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

interface Transaction {
  id: string
  type: 'deposit' | 'withdraw' | 'payment' | 'refund'
  amount: number
  description: string
  createdAt: string
}

const balance = ref(15000)
const pendingBalance = ref(3500)
const loading = ref(true)
const transactions = ref<Transaction[]>([])
const showWithdrawModal = ref(false)

const withdrawAmount = ref(0)

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

const getTransactionIcon = (type: string) => {
  const map: Record<string, string> = {
    deposit: '💰',
    withdraw: '🏧',
    payment: '💳',
    refund: '↩️',
  }
  return map[type] || '💱'
}

const getTransactionClass = (type: string) => {
  const map: Record<string, string> = {
    deposit: 'success',
    withdraw: 'warning',
    payment: 'danger',
    refund: 'info',
  }
  return map[type] || 'default'
}

const loadData = async () => {
  loading.value = true
  try {
    transactions.value = [
      { id: '1', type: 'deposit', amount: 20000, description: '充值', createdAt: '2026-04-20' },
      { id: '2', type: 'payment', amount: -12800, description: '購買 Pokemon 1st Edition Base Set', createdAt: '2026-04-21' },
      { id: '3', type: 'payment', amount: -6800, description: '購買 Yu-Gi-Oh Blue-Eyes White Dragon', createdAt: '2026-04-20' },
      { id: '4', type: 'refund', amount: 500, description: '退款', createdAt: '2026-04-19' },
    ]
  } catch (error) {
    console.error('Failed to load wallet:', error)
  } finally {
    loading.value = false
  }
}

const handleWithdraw = () => {
  if (withdrawAmount.value <= 0) {
    alert('請輸入有效金額')
    return
  }
  if (withdrawAmount.value > balance.value) {
    alert('餘額不足')
    return
  }
  alert(`提現 ${formatPrice(withdrawAmount.value)} - 功能開發中`)
  showWithdrawModal.value = false
  withdrawAmount.value = 0
}

const handleDeposit = () => {
  alert('充值功能開發中...')
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="wallet-page">
    <h1 class="page-title">我的錢包</h1>

    <!-- Balance Cards -->
    <div class="balance-grid">
      <div class="balance-card primary">
        <div class="balance-label">總餘額</div>
        <div class="balance-value">{{ formatPrice(balance) }}</div>
        <div class="balance-hint">可提現</div>
      </div>
      <div class="balance-card">
        <div class="balance-label">待確認</div>
        <div class="balance-value secondary">{{ formatPrice(pendingBalance) }}</div>
        <div class="balance-hint">預計 7 天後到賬</div>
      </div>
    </div>

    <!-- Actions -->
    <div class="action-buttons">
      <button class="btn-deposit" @click="handleDeposit">
        💰 充值
      </button>
      <button class="btn-withdraw" @click="showWithdrawModal = true">
        🏧 提現
      </button>
    </div>

    <!-- Transaction History -->
    <div class="transactions-section">
      <h3 class="section-title">💳 交易記錄</h3>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
      </div>

      <div v-else-if="transactions.length === 0" class="empty-state">
        <p>暫無交易記錄</p>
      </div>

      <div v-else class="transactions-list">
        <div v-for="tx in transactions" :key="tx.id" class="transaction-item">
          <div class="tx-icon" :class="getTransactionClass(tx.type)">
            {{ getTransactionIcon(tx.type) }}
          </div>
          <div class="tx-info">
            <div class="tx-desc">{{ tx.description }}</div>
            <div class="tx-date">{{ formatDate(tx.createdAt) }}</div>
          </div>
          <div class="tx-amount" :class="tx.amount > 0 ? 'positive' : 'negative'">
            {{ tx.amount > 0 ? '+' : '' }}{{ formatPrice(Math.abs(tx.amount)) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Withdraw Modal -->
    <div v-if="showWithdrawModal" class="modal-overlay" @click.self="showWithdrawModal = false">
      <div class="modal">
        <div class="modal-header">
          <h2>提現</h2>
          <button @click="showWithdrawModal = false" class="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="balance-info">
            目前可提現餘額: <strong>{{ formatPrice(balance) }}</strong>
          </div>
          <div class="form-group">
            <label>提現金額 (HK$)</label>
            <input 
              v-model.number="withdrawAmount" 
              type="number" 
              :max="balance"
              min="1"
              placeholder="請輸入提現金額"
            />
          </div>
          <div class="withdraw-info">
            <p>⚠️ 提現將在 1-3 個工作日內到賬</p>
            <p>收款賬戶: **** **** **** 5678</p>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showWithdrawModal = false" class="btn-cancel">取消</button>
          <button @click="handleWithdraw" class="btn-submit">確認提現</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wallet-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.page-title {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--text-primary);
}

.balance-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-4);
}

.balance-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
}

.balance-card.primary {
  background: var(--primary-gradient);
  border: none;
}

.balance-label {
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: var(--space-2);
}

.balance-card:not(.primary) .balance-label {
  color: var(--text-secondary);
}

.balance-value {
  font-family: var(--font-num);
  font-size: var(--text-2xl);
  font-weight: 700;
  color: white;
  margin-bottom: var(--space-1);
}

.balance-value.secondary {
  color: var(--text-primary);
}

.balance-hint {
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.6);
}

.balance-card:not(.primary) .balance-hint {
  color: var(--text-muted);
}

.action-buttons {
  display: flex;
  gap: var(--space-4);
}

.btn-deposit,
.btn-withdraw {
  flex: 1;
  padding: var(--space-4);
  border-radius: var(--radius-xl);
  font-size: var(--text-base);
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-deposit {
  background: #10b981;
  color: white;
}

.btn-deposit:hover {
  background: #059669;
}

.btn-withdraw {
  background: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-primary);
}

.btn-withdraw:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.transactions-section {
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

.empty-state {
  text-align: center;
  padding: var(--space-8);
  color: var(--text-secondary);
}

.transactions-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.transaction-item {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3);
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
}

.tx-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.tx-icon.success {
  background: #10b98133;
}

.tx-icon.warning {
  background: #f59e0b33;
}

.tx-icon.danger {
  background: #ef444433;
}

.tx-icon.info {
  background: #3b82f633;
}

.tx-info {
  flex: 1;
}

.tx-desc {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-primary);
}

.tx-date {
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.tx-amount {
  font-family: var(--font-num);
  font-size: var(--text-base);
  font-weight: 700;
}

.tx-amount.positive {
  color: #10b981;
}

.tx-amount.negative {
  color: var(--text-primary);
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: #000000b3;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-6);
}

.modal {
  background: var(--bg-card);
  border-radius: var(--radius-2xl);
  width: 100%;
  max-width: 400px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-6);
  border-bottom: 1px solid var(--border);
}

.modal-header h2 {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--text-primary);
}

.modal-close {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-lg);
  border: none;
  background: var(--bg-elevated);
  color: var(--text-secondary);
  cursor: pointer;
}

.modal-close:hover {
  background: var(--danger);
  color: white;
}

.modal-body {
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.balance-info {
  padding: var(--space-3);
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.balance-info strong {
  color: var(--primary);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-group label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
}

.form-group input {
  padding: var(--space-3) var(--space-4);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  color: var(--text-primary);
  font-size: var(--text-base);
}

.form-group input:focus {
  outline: none;
  border-color: var(--primary);
}

.withdraw-info {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.withdraw-info p {
  margin-bottom: var(--space-1);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-6);
  border-top: 1px solid var(--border);
  background: var(--bg-elevated);
}

.btn-cancel {
  padding: var(--space-3) var(--space-6);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  color: var(--text-primary);
  font-weight: 500;
  cursor: pointer;
}

.btn-submit {
  padding: var(--space-3) var(--space-6);
  background: var(--primary-gradient);
  border: none;
  border-radius: var(--radius-lg);
  color: white;
  font-weight: 600;
  cursor: pointer;
}
</style>
