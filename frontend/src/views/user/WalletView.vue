<script setup lang="ts">
import { formatPrice, formatPriceExact, formatDate } from '@/utils/format'
import StateView from '@/components/common/StateView.vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import api from '@/api'

const { t, locale } = useI18n()
const authStore = useAuthStore()

interface Transaction {
  id: string
  type: 'deposit' | 'withdraw' | 'payment' | 'refund' | 'receive'
  amount: number
  description: string
  createdAt: string
}

// P3: Use real balance from auth store
const balance = computed(() => Number(authStore.user?.balance) || 0)
const loading = ref(true)
const transactions = ref<Transaction[]>([])

const getTransactionIcon = (type: string) => {
  const map: Record<string, string> = { deposit: '💰', withdraw: '🏧', payment: '💳', refund: '↩️', receive: '📥' }
  return map[type] || '💱'
}

// ===== 狀態 tabs（類型篩選） =====
const TAB_DEFS: { key: string; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'income', label: '收入' },
  { key: 'expense', label: '支出' },
]
const filterType = ref('all')
const TAB_TYPES: Record<string, string[]> = {
  all: [],
  income: ['deposit', 'refund', 'receive'],
  expense: ['withdraw', 'payment'],
}

// ===== 搜尋 / 排序 / 分頁 =====
const PAGE_SIZE = 20
const searchQuery = ref('')
const currentPage = ref(1)
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('desc')

const sortableColumns = [
  { key: 'description', label: '項目', type: 'text' },
  { key: 'amount', label: '金額', type: 'number' },
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

const compareTx = (a: Transaction, b: Transaction, col: { key: string; type: string }): number => {
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

const filteredTx = computed(() => {
  let result = transactions.value
  const types = TAB_TYPES[filterType.value]
  if (types && types.length) {
    result = result.filter(t => types.includes(t.type))
  }
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    result = result.filter(t => (t.description || '').toLowerCase().includes(q))
  }
  if (!sortKey.value) {
    return [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }
  const col = sortableColumns.find(c => c.key === sortKey.value)
  if (!col) return result
  return [...result].sort((a, b) => compareTx(a, b, col))
})

const tabCount = (key: string): number => {
  const types = TAB_TYPES[key]
  if (!types || !types.length) return transactions.value.length
  return transactions.value.filter(t => types.includes(t.type)).length
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
watch([searchQuery, filterType], () => { currentPage.value = 1 })

// Load real wallet transactions from wallet API
const loadData = async () => {
  loading.value = true
  try {
    // Load wallet transactions + balance in parallel
    const [txRes, balRes] = await Promise.all([
      api.get('/wallet/transactions?page=1&limit=200'),
      api.get('/wallet'),
    ])
    const txList = txRes.data?.data || txRes.data || []
    transactions.value = txList.map((tx: any) => ({
      id: tx.id,
      type: tx.type === 'withdrawal' ? 'withdraw' as const : tx.type === 'deposit' ? 'deposit' as const : tx.type === 'refund' ? 'refund' as const : tx.type === 'receive' ? 'receive' as const : 'payment' as const,
      amount: Number(tx.amount) || 0,
      description: tx.description || tx.type,
      createdAt: tx.createdAt,
    }))
    // Update auth store balance from wallet API
    const newBalance = Number(balRes.data?.balance) || 0
    if (authStore.user) {
      authStore.user.balance = newBalance
    }
  } catch (error) {
    console.error('Failed to load wallet:', error)
    transactions.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="wallet-page">
    <h1 class="page-title">{{ locale === 'zh' ? '我的帳戶' : 'My Wallet' }}</h1>

    <!-- Balance Cards -->
    <div class="balance-grid">
      <div class="balance-card primary">
        <div class="balance-label">總餘額</div>
        <div class="balance-value">{{ formatPriceExact(balance) }}</div>
        <div class="balance-hint">充值及提現功能即將推出</div>
      </div>
    </div>

    <!-- Actions: 充值/提現暫時隱藏 — 等接入真實支付網關（MPay/銀聯）後重開 -->
    <!-- 訂單交易目前走銀行轉帳+憑證上傳流程，不經過錢包 -->
    <div class="action-buttons maintenance-notice">
      <div class="notice-card">
        <span class="notice-icon">🔒</span>
        <span class="notice-text">{{ locale === 'zh' ? '充值及提現功能即將推出，目前訂單交易透過銀行轉帳進行，不影響買賣流程。' : 'Deposit & withdrawal coming soon. Orders are settled via bank transfer.' }}</span>
      </div>
    </div>

    <!-- Transaction History -->
    <div class="transactions-section">
      <h3 class="section-title">💳 交易記錄</h3>

      <!-- 類型 tabs -->
      <div class="list-tabs">
        <button
          v-for="tab in TAB_DEFS"
          :key="tab.key"
          class="list-tab"
          :class="{ active: filterType === tab.key }"
          @click="filterType = tab.key"
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
          placeholder="🔍 搜尋項目..."
        />
        <button v-if="searchQuery" class="btn-clear-search" @click="searchQuery = ''">✕ 清除</button>
      </div>

      <StateView v-if="loading" state="loading" />

      <StateView v-else-if="filteredTx.length === 0" state="empty" icon="💳" title="暫無交易記錄" />

      <div v-else class="transactions-list">
        <div v-for="tx in pagedTx" :key="tx.id" class="transaction-item">
          <div class="tx-icon" :class="tx.amount > 0 ? 'positive' : 'negative'">
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

      <!-- 分頁 -->
      <div v-if="!loading && filteredTx.length > PAGE_SIZE" class="pagination">
        <button class="page-btn" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">‹ 上一頁</button>
        <span class="page-info">第 {{ currentPage }} / {{ totalPages }} 頁 · 共 {{ filteredTx.length }} 筆</span>
        <button class="page-btn" :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)">下一頁 ›</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wallet-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.page-title {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--text-primary);
}

.balance-grid {
  display: grid;
  grid-template-columns: 1fr;
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

.balance-value {
  font-family: var(--font-num);
  font-size: var(--text-2xl);
  font-weight: 700;
  color: white;
  margin-bottom: var(--space-1);
}

.balance-hint {
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.6);
}

/* 充值/提現暫停通知卡 */
.action-buttons.maintenance-notice { display: block; }
.notice-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  background: var(--bg-elevated);
  border: 1px dashed var(--border);
  border-radius: var(--radius-lg);
}
.notice-icon { font-size: 20px; flex-shrink: 0; }
.notice-text { font-size: var(--text-sm); color: var(--text-secondary); line-height: 1.5; }

/* ===== 交易記錄（同四分頁組件風格）===== */
.transactions-section {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
}

.section-title {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

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
  background: var(--bg-elevated);
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
.list-tab:not(.active) .tab-count { background: var(--bg-card); color: var(--text-secondary); }

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
  min-width: 0;
}

.tx-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.tx-icon.positive { background: #10b98133; }
.tx-icon.negative { background: #ef444433; }

.tx-info {
  flex: 1;
  min-width: 0;
}

.tx-desc {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tx-date {
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.tx-amount {
  font-family: var(--font-num);
  font-size: var(--text-base);
  font-weight: 700;
  flex-shrink: 0;
}

.tx-amount.positive {
  color: #10b981;
}

.tx-amount.negative {
  color: var(--text-primary);
}

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

/* ===== 手機適配（<768px）===== */
@media (max-width: 767px) {
  .wallet-page,
  .balance-grid,
  .transactions-section,
  .list-tabs,
  .search-row,
  .search-input,
  .pagination {
    min-width: 0;
  }

  .list-tabs { gap: var(--space-1); }
  .list-tab { padding: var(--space-1) var(--space-3); font-size: var(--text-xs); }
  .search-row { flex-wrap: wrap; }
  .search-input { max-width: 100%; flex: 1 1 100%; }
  .transactions-section { padding: var(--space-4); }
  .transaction-item { gap: var(--space-3); }
  .pagination { flex-wrap: wrap; gap: var(--space-2); }
  .page-info { font-size: var(--text-xs); }
}
</style>