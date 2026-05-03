<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { auctionApi } from '@/api/auctions'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const auction = ref<any>(null)
const bids = ref<any[]>([])
const loading = ref(true)
const error = ref('')
const bidAmount = ref(0)
const placingBid = ref(false)
const bidError = ref('')
const bidSuccess = ref('')

const auctionId = computed(() => route.params.id as string)

const currentPrice = computed(() => {
  if (!auction.value) return 0
  return Number(auction.value.currentPrice || auction.value.startingPrice)
})

const minimumBid = computed(() => {
  if (!auction.value) return 0
  const increment = Number(auction.value.bidIncrement) || 10
  return currentPrice.value + increment
})

const timeRemaining = computed(() => {
  if (!auction.value?.endTime) return ''
  const end = new Date(auction.value.endTime)
  const now = new Date()
  const diff = end.getTime() - now.getTime()
  
  if (diff <= 0) return '已結束'
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  
  if (days > 0) return `${days}天 ${hours}小時`
  if (hours > 0) return `${hours}小時 ${minutes}分`
  return `${minutes}分 ${seconds}秒`
})

const isEnded = computed(() => {
  if (!auction.value) return false
  return auction.value.status === 'ended' || auction.value.status === 'cancelled' || timeRemaining.value === '已结束'
})

const isActive = computed(() => {
  if (!auction.value) return false
  return auction.value.status === 'active' && !isEnded.value
})

const isSeller = computed(() => {
  return authStore.user?.id === auction.value?.sellerId
})

const canBid = computed(() => {
  return authStore.isAuthenticated && !isSeller.value && !isEnded.value
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
    minute: '2-digit'
  })
}

const loadAuction = async () => {
  loading.value = true
  error.value = ''
  try {
    const response = await auctionApi.getAuction(auctionId.value)
    auction.value = response.data
    bids.value = response.data.bids || []
    bidAmount.value = Number(response.data.currentPrice || response.data.startingPrice) + 10
  } catch (err: any) {
    error.value = err?.response?.data?.message || '無法加載拍賣詳情'
  } finally {
    loading.value = false
  }
}

const handlePlaceBid = async () => {
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }
  
  if (bidAmount.value < minimumBid.value) {
    bidError.value = `最低出價金額為 ${formatPrice(minimumBid.value)}`
    return
  }
  
  bidError.value = ''
  bidSuccess.value = ''
  placingBid.value = true
  
  try {
    const response = await auctionApi.placeBid(auctionId.value, bidAmount.value)
    bidSuccess.value = '出價成功！'
    await loadAuction()
    setTimeout(() => bidSuccess.value = '', 3000)
  } catch (err: any) {
    bidError.value = err?.response?.data?.message || '出價失敗，請重試'
  } finally {
    placingBid.value = false
  }
}

// Poll for updates
let pollInterval: ReturnType<typeof setInterval>

onMounted(() => {
  loadAuction()
  pollInterval = setInterval(loadAuction, 10000) // Refresh every 10 seconds
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})
</script>

<template>
  <div class="auction-detail-page">
    <!-- Loading -->
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>加載中...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-container">
      <div class="error-icon">⚠️</div>
      <h2>{{ error }}</h2>
      <button @click="loadAuction" class="btn-retry">重試</button>
    </div>

    <!-- Auction Detail -->
    <div v-else-if="auction" class="auction-container">
      <div class="auction-main">
        <!-- Image Section -->
        <div class="auction-image-section">
          <div class="image-container">
            <img 
              v-if="auction.product?.images?.length" 
              :src="auction.product.images[0]" 
              :alt="auction.product?.titleEn"
              class="product-image"
            />
            <div v-else class="image-placeholder">🃏</div>
          </div>
        </div>

        <!-- Info Section -->
        <div class="auction-info-section">
          <div class="auction-header">
            <span class="category-badge">{{ auction.product?.category || '其他' }}</span>
            <span class="status-badge" :class="auction.status">
              {{ auction.status === 'active' ? '🔥 進行中' : auction.status === 'ended' ? '已結束' : '⏳ 待開始' }}
            </span>
          </div>

          <h1 class="product-title">{{ auction.product?.titleEn || auction.product?.titleZh || '卡牌商品' }}</h1>
          <p class="product-subtitle">{{ auction.product?.titleZh }}</p>

          <div class="product-description">
            {{ auction.product?.descriptionEn || auction.product?.descriptionZh || '暫無描述' }}
          </div>

          <!-- Specs -->
          <div class="product-specs">
            <div class="spec-item">
              <span class="spec-label">稀有度</span>
              <span class="spec-value">{{ auction.product?.rarity || '-' }}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">品相</span>
              <span class="spec-value">{{ auction.product?.condition || '-' }}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">賣家</span>
              <span class="spec-value">{{ auction.seller?.nickname || '未知' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Bid Section -->
      <div class="bid-section">
        <!-- Current Price -->
        <div class="price-card">
          <div class="price-info">
            <span class="price-label">當前價格</span>
            <span class="current-price">{{ formatPrice(currentPrice) }}</span>
            <span class="bid-count">{{ auction.bidCount || 0 }} 次出價</span>
          </div>

          <div class="time-info">
            <span class="time-label">剩餘時間</span>
            <span class="time-value" :class="{ 'ending-soon': timeRemaining.includes('分') && !timeRemaining.includes('天') }">
              ⏱️ {{ timeRemaining }}
            </span>
          </div>
        </div>

        <!-- Bid Form -->
        <div v-if="canBid" class="bid-form">
          <div class="bid-input-group">
            <span class="currency-prefix">MOP</span>
            <input 
              v-model.number="bidAmount" 
              type="number" 
              :min="minimumBid"
              step="10"
              class="bid-input"
            />
          </div>
          <p class="bid-hint">最低出價: {{ formatPrice(minimumBid) }}</p>
          
          <p v-if="bidError" class="bid-error">{{ bidError }}</p>
          <p v-if="bidSuccess" class="bid-success">{{ bidSuccess }}</p>
          
          <button 
            @click="handlePlaceBid" 
            class="btn-bid"
            :disabled="placingBid || !authStore.isAuthenticated"
          >
            <span v-if="placingBid" class="spinner-small"></span>
            {{ placingBid ? '出價中...' : '立即出價' }}
          </button>
          
          <p v-if="!authStore.isAuthenticated" class="login-hint">
            請先 <router-link to="/login">登入</router-link> 才能出價
          </p>
        </div>

        <!-- Seller View -->
        <div v-else-if="isSeller" class="seller-notice">
          <p>這是您的拍賣商品</p>
        </div>

        <!-- Auction Ended -->
        <div v-else-if="isEnded" class="ended-notice">
          <p v-if="auction.winner">🏆 成交價: {{ formatPrice(auction.currentPrice) }}</p>
          <p v-else>拍賣已結束</p>
        </div>

        <!-- Bid History -->
        <div v-if="bids.length > 0" class="bid-history">
          <h3>出價記錄</h3>
          <div class="bids-list">
            <div v-for="bid in bids.slice().reverse()" :key="bid.id" class="bid-item">
              <div class="bidder-info">
                <span class="bidder-name">{{ bid.bidder?.nickname || '匿名' }}</span>
                <span class="bid-time">{{ formatDateTime(bid.createdAt) }}</span>
              </div>
              <span class="bid-amount">{{ formatPrice(bid.amount) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auction-detail-page {
  min-height: 100vh;
  background: var(--bg-dark);
  padding: var(--space-6);
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  gap: var(--space-4);
}

.error-icon {
  font-size: 48px;
}

.btn-retry {
  padding: var(--space-3) var(--space-6);
  background: var(--primary);
  border: none;
  border-radius: var(--radius-lg);
  color: white;
  cursor: pointer;
}

.auction-container {
  max-width: 1200px;
  margin: 0 auto;
}

.auction-main {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-6);
  margin-bottom: var(--space-6);
}

@media (max-width: 768px) {
  .auction-main {
    grid-template-columns: 1fr;
  }
}

.image-container {
  aspect-ratio: 1;
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  overflow: hidden;
  border: 1px solid var(--border);
}

.product-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 80px;
  background: var(--bg-elevated);
}

.auction-info-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.auction-header {
  display: flex;
  gap: var(--space-3);
}

.category-badge {
  padding: var(--space-1) var(--space-3);
  background: var(--bg-elevated);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.status-badge {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 600;
}

.status-badge.active {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.status-badge.ended {
  background: var(--bg-elevated);
  color: var(--text-muted);
}

.status-badge.pending {
  background: rgba(234, 179, 8, 0.2);
  color: #f59e0b;
}

.product-title {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--text-primary);
}

.product-subtitle {
  font-size: var(--text-lg);
  color: var(--text-muted);
}

.product-description {
  color: var(--text-secondary);
  line-height: 1.6;
}

.product-specs {
  display: flex;
  gap: var(--space-6);
  padding: var(--space-4);
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
}

.spec-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.spec-label {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.spec-value {
  font-weight: 600;
  color: var(--text-primary);
}

/* Bid Section */
.bid-section {
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  border: 1px solid var(--border);
  padding: var(--space-6);
}

.price-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding-bottom: var(--space-6);
  border-bottom: 1px solid var(--border);
  margin-bottom: var(--space-6);
}

.price-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.price-label {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.current-price {
  font-size: 36px;
  font-weight: 700;
  color: var(--primary);
}

.bid-count {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.time-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  text-align: right;
}

.time-label {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.time-value {
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--text-primary);
}

.time-value.ending-soon {
  color: #ef4444;
}

/* Bid Form */
.bid-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.bid-input-group {
  display: flex;
  align-items: center;
  background: var(--bg-dark);
  border: 2px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: border-color 0.2s;
}

.bid-input-group:focus-within {
  border-color: var(--primary);
}

.currency-prefix {
  padding: var(--space-3) var(--space-4);
  background: var(--bg-elevated);
  color: var(--text-secondary);
  font-weight: 600;
}

.bid-input {
  flex: 1;
  padding: var(--space-3) var(--space-4);
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: var(--text-lg);
  font-weight: 600;
}

.bid-input:focus {
  outline: none;
}

.bid-hint {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.bid-error {
  color: var(--danger);
  font-size: var(--text-sm);
  background: rgba(239, 68, 68, 0.1);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
}

.bid-success {
  color: #22c55e;
  font-size: var(--text-sm);
  background: rgba(34, 197, 94, 0.1);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
}

.btn-bid {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-4);
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  border: none;
  border-radius: var(--radius-lg);
  color: white;
  font-size: var(--text-lg);
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-bid:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
}

.btn-bid:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner-small {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.login-hint {
  text-align: center;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.login-hint a {
  color: var(--primary);
  text-decoration: none;
}

.seller-notice,
.ended-notice {
  padding: var(--space-4);
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
  text-align: center;
  color: var(--text-secondary);
}

/* Bid History */
.bid-history {
  margin-top: var(--space-6);
  padding-top: var(--space-6);
  border-top: 1px solid var(--border);
}

.bid-history h3 {
  font-size: var(--text-lg);
  font-weight: 600;
  margin-bottom: var(--space-4);
}

.bids-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-height: 300px;
  overflow-y: auto;
}

.bid-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3);
  background: var(--bg-dark);
  border-radius: var(--radius-md);
}

.bidder-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.bidder-name {
  font-weight: 500;
  color: var(--text-primary);
}

.bid-time {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.bid-amount {
  font-weight: 700;
  color: var(--primary);
}

/* Spinner */
.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
</style>
