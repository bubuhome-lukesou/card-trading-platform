<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

interface Auction {
  id: string
  productId: string
  productTitle: string
  category: string
  startingPrice: number
  currentPrice: number
  bidCount: number
  startTime: string
  endTime: string
  status: 'pending' | 'active' | 'ended' | 'cancelled'
  winner?: string
}

const auctions = ref<Auction[]>([])
const loading = ref(true)
const filterStatus = ref('all')
const showModal = ref(false)

const formData = ref({
  productId: '',
  startingPrice: 100,
  bidIncrement: 10,
  reservePrice: 0,
  startTime: '',
  endTime: '',
})

const categories = [
  { value: 'pokemon', label: '宝可梦', emoji: '🎮' },
  { value: 'yugioh', label: '游戏王', emoji: '🐉' },
  { value: 'mtg', label: '万智牌', emoji: '🧙' },
  { value: 'ultraman', label: '奥特曼', emoji: '👾' },
  { value: 'onepiece', label: '海贼王', emoji: '⚔️' },
  { value: 'doraemon', label: '哆啦A梦', emoji: '🤖' },
  { value: 'sports', label: '体育卡', emoji: '⚽' },
  { value: 'other', label: '其他', emoji: '🎴' },
]

const filteredAuctions = computed(() => {
  if (filterStatus.value === 'all') return auctions.value
  return auctions.value.filter(a => a.status === filterStatus.value)
})

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('zh-HK', {
    style: 'currency',
    currency: 'HKD',
    minimumFractionDigits: 0,
  }).format(price)
}

const formatDateTime = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getStatusBadge = (status: string) => {
  const map: Record<string, { class: string; text: string }> = {
    pending: { class: 'pending', text: '待开始' },
    active: { class: 'active', text: '进行中' },
    ended: { class: 'ended', text: '已结束' },
    cancelled: { class: 'cancelled', text: '已取消' },
  }
  return map[status] || { class: 'default', text: status }
}

const getCategoryEmoji = (category: string) => {
  return categories.find(c => c.value === category)?.emoji || '🎴'
}

const getTimeRemaining = (endTime: string) => {
  const now = new Date().getTime()
  const end = new Date(endTime).getTime()
  const diff = end - now
  
  if (diff <= 0) return '已结束'
  
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return `${days}天 ${hours % 24}小时`
  }
  return `${hours}小时 ${minutes}分钟`
}

const loadAuctions = async () => {
  loading.value = true
  try {
    // Mock data
    auctions.value = [
      {
        id: '1',
        productId: '1',
        productTitle: 'Pokemon 1st Edition Base Set',
        category: 'pokemon',
        startingPrice: 5000,
        currentPrice: 12800,
        bidCount: 23,
        startTime: '2026-04-21 10:00',
        endTime: '2026-04-21 18:00',
        status: 'active',
      },
      {
        id: '2',
        productId: '2',
        productTitle: 'Yu-Gi-Oh Blue-Eyes White Dragon',
        category: 'yugioh',
        startingPrice: 3000,
        currentPrice: 6800,
        bidCount: 15,
        startTime: '2026-04-21 14:00',
        endTime: '2026-04-21 22:00',
        status: 'active',
      },
      {
        id: '3',
        productId: '3',
        productTitle: 'MTG Black Lotus',
        category: 'mtg',
        startingPrice: 10000,
        currentPrice: 25000,
        bidCount: 8,
        startTime: '2026-04-20 10:00',
        endTime: '2026-04-22 10:00',
        status: 'active',
      },
      {
        id: '4',
        productId: '4',
        productTitle: 'Vintage Card Assortment',
        category: 'other',
        startingPrice: 1000,
        currentPrice: 4200,
        bidCount: 12,
        startTime: '2026-04-19 10:00',
        endTime: '2026-04-20 10:00',
        status: 'ended',
        winner: 'Collector_001',
      },
    ]
  } catch (error) {
    console.error('Failed to load auctions:', error)
  } finally {
    loading.value = false
  }
}

const handleCreateAuction = () => {
  showModal.value = true
}

const handleSubmit = async () => {
  loading.value = true
  try {
    // TODO: Call API
    await new Promise(resolve => setTimeout(resolve, 1000))
    showModal.value = false
    loadAuctions()
  } catch (error) {
    console.error('Failed to create auction:', error)
  } finally {
    loading.value = false
  }
}

const handleCancel = async (auctionId: string) => {
  if (!confirm('确定要取消此拍卖吗？')) return
  
  try {
    // TODO: Call API
    await new Promise(resolve => setTimeout(resolve, 500))
    loadAuctions()
  } catch (error) {
    console.error('Failed to cancel auction:', error)
  }
}

onMounted(() => {
  loadAuctions()
})
</script>

<template>
  <div class="auctions-management">
    <!-- Header -->
    <div class="section-header">
      <div class="filter-tabs">
        <button 
          class="tab" 
          :class="{ active: filterStatus === 'all' }"
          @click="filterStatus = 'all'"
        >
          全部 ({{ auctions.length }})
        </button>
        <button 
          class="tab" 
          :class="{ active: filterStatus === 'active' }"
          @click="filterStatus = 'active'"
        >
          进行中 ({{ auctions.filter(a => a.status === 'active').length }})
        </button>
        <button 
          class="tab" 
          :class="{ active: filterStatus === 'pending' }"
          @click="filterStatus = 'pending'"
        >
          待开始 ({{ auctions.filter(a => a.status === 'pending').length }})
        </button>
        <button 
          class="tab" 
          :class="{ active: filterStatus === 'ended' }"
          @click="filterStatus = 'ended'"
        >
          已结束 ({{ auctions.filter(a => a.status === 'ended').length }})
        </button>
      </div>
      <button @click="handleCreateAuction" class="btn-primary">
        + 创建拍卖
      </button>
    </div>

    <!-- Auctions List -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <div v-else-if="filteredAuctions.length === 0" class="empty-state">
      <div class="empty-icon">🔨</div>
      <h3>暂无拍卖</h3>
      <p>创建一个拍卖来销售您的商品吧！</p>
      <button @click="handleCreateAuction" class="btn-primary">
        + 创建拍卖
      </button>
    </div>

    <div v-else class="auctions-table">
      <table>
        <thead>
          <tr>
            <th>商品</th>
            <th>起拍价</th>
            <th>当前价格</th>
            <th>出价次数</th>
            <th>截止时间</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="auction in filteredAuctions" :key="auction.id">
            <td>
              <div class="product-cell">
                <span class="category-emoji">{{ getCategoryEmoji(auction.category) }}</span>
                <span class="product-title">{{ auction.productTitle }}</span>
              </div>
            </td>
            <td class="price-cell">{{ formatPrice(auction.startingPrice) }}</td>
            <td class="price-cell highlight">{{ formatPrice(auction.currentPrice) }}</td>
            <td>{{ auction.bidCount }} 次</td>
            <td>
              <div class="time-cell">
                <span>{{ formatDateTime(auction.endTime) }}</span>
                <span v-if="auction.status === 'active'" class="time-remaining">
                  {{ getTimeRemaining(auction.endTime) }}
                </span>
              </div>
            </td>
            <td>
              <span class="status-badge" :class="getStatusBadge(auction.status).class">
                {{ getStatusBadge(auction.status).text }}
              </span>
            </td>
            <td>
              <div class="action-buttons">
                <button v-if="auction.status === 'active'" class="btn-action view">
                  查看
                </button>
                <button 
                  v-if="auction.status === 'pending' || auction.status === 'active'" 
                  class="btn-action cancel"
                  @click="handleCancel(auction.id)"
                >
                  取消
                </button>
                <span v-if="auction.status === 'ended' && auction.winner" class="winner-info">
                  赢家: {{ auction.winner }}
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal">
        <div class="modal-header">
          <h2>创建拍卖</h2>
          <button @click="showModal = false" class="modal-close">✕</button>
        </div>

        <form @submit.prevent="handleSubmit" class="modal-body">
          <div class="form-group">
            <label>选择商品</label>
            <select v-model="formData.productId" required>
              <option value="">请选择商品</option>
              <option value="1">Pokemon 1st Edition Base Set</option>
              <option value="2">Yu-Gi-Oh Blue-Eyes White Dragon</option>
            </select>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>起拍价 (HK$)</label>
              <input 
                v-model.number="formData.startingPrice" 
                type="number" 
                min="1"
                required
              />
            </div>

            <div class="form-group">
              <label>最低加价 (HK$)</label>
              <input 
                v-model.number="formData.bidIncrement" 
                type="number" 
                min="1"
                required
              />
            </div>
          </div>

          <div class="form-group">
            <label>保留价 (HK$) - 可选</label>
            <input 
              v-model.number="formData.reservePrice" 
              type="number" 
              min="0"
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>开始时间</label>
              <input 
                v-model="formData.startTime" 
                type="datetime-local" 
                required
              />
            </div>

            <div class="form-group">
              <label>截止时间</label>
              <input 
                v-model="formData.endTime" 
                type="datetime-local" 
                required
              />
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" @click="showModal = false" class="btn-cancel">
              取消
            </button>
            <button type="submit" class="btn-submit" :disabled="loading">
              {{ loading ? '创建中...' : '创建拍卖' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auctions-management {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-tabs {
  display: flex;
  gap: var(--space-2);
}

.tab {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--bg-card);
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tab:hover {
  border-color: var(--primary);
}

.tab.active {
  background: var(--primary-gradient);
  border: none;
  color: white;
}

.btn-primary {
  padding: var(--space-3) var(--space-6);
  background: var(--primary-gradient);
  border-radius: var(--radius-lg);
  color: white;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-2px);
}

.loading-state {
  text-align: center;
  padding: var(--space-16);
  color: var(--text-secondary);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto var(--space-4);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: var(--space-16);
  background: var(--bg-card);
  border: 1px dashed var(--border);
  border-radius: var(--radius-xl);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: var(--space-4);
}

.empty-state h3 {
  font-size: var(--text-lg);
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}

.empty-state p {
  color: var(--text-secondary);
  margin-bottom: var(--space-6);
}

.auctions-table {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: var(--space-4);
  text-align: left;
  border-bottom: 1px solid var(--border);
}

th {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--bg-elevated);
}

td {
  font-size: var(--text-sm);
  color: var(--text-primary);
}

tr:last-child td {
  border-bottom: none;
}

.product-cell {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.category-emoji {
  font-size: 24px;
}

.product-title {
  font-weight: 500;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.price-cell {
  font-family: var(--font-num);
}

.price-cell.highlight {
  color: var(--primary);
  font-weight: 700;
}

.time-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.time-remaining {
  font-size: var(--text-xs);
  color: var(--accent);
}

.status-badge {
  padding: 2px 10px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 600;
}

.status-badge.active {
  background: #10b9814d;
  color: #10b981;
}

.status-badge.pending {
  background: #f59e0b4d;
  color: #f59e0b;
}

.status-badge.ended {
  background: #6b72804d;
  color: #6b7280;
}

.status-badge.cancelled {
  background: #ef44444d;
  color: #ef4444;
}

.action-buttons {
  display: flex;
  gap: var(--space-2);
}

.btn-action {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-action.view {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.btn-action.view:hover {
  background: var(--primary);
  color: white;
}

.btn-action.cancel {
  background: #ef44444d;
  color: #ef4444;
}

.btn-action.cancel:hover {
  background: #ef4444;
  color: white;
}

.winner-info {
  font-size: var(--text-xs);
  color: var(--text-secondary);
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
  max-width: 500px;
  overflow: hidden;
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

.form-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-4);
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

.form-group input,
.form-group select {
  padding: var(--space-3) var(--space-4);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  color: var(--text-primary);
  font-size: var(--text-sm);
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--primary);
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

.btn-submit:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
