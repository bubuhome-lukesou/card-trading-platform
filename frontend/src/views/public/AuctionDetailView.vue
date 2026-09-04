<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { auctionApi } from '@/api/auctions'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()

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
const currentImageIndex = ref(0)
// U1: Tick ref to force timeRemaining re-evaluation every second
const tick = ref(0)

const auctionId = computed(() => route.params.id as string)

// Sort bids by amount DESC (highest first), then by time DESC (newest first)
const sortedBids = computed(() => {
  return [...bids.value].sort((a, b) => {
    const amountDiff = Number(b.amount) - Number(a.amount)
    if (amountDiff !== 0) return amountDiff
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
})

const parsedImages = computed<string[]>(() => {
  const imgs = auction.value?.product?.images
  if (!imgs) return []
  if (Array.isArray(imgs)) return imgs
  if (typeof imgs === 'string') {
    try { return JSON.parse(imgs) } catch { return [] }
  }
  return []
})

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
  // U1: Use tick to force re-evaluation every second
  void tick.value
  const end = new Date(auction.value.endTime)
  const now = new Date()
  const diff = end.getTime() - now.getTime()
  
  if (diff <= 0) return locale.value === 'zh' ? '已結束' : 'Ended'
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  
  if (days > 0) return locale.value === 'zh' ? `${days}天 ${hours}小時` : `${days}d ${hours}h`
  if (hours > 0) return locale.value === 'zh' ? `${hours}小時 ${minutes}分` : `${hours}h ${minutes}m`
  if (minutes > 0) return locale.value === 'zh' ? `${minutes}分 ${seconds}秒` : `${minutes}m ${seconds}s`
  // U1: Last minute — show seconds
  return `${seconds}s`
})

const isEndingSoon = computed(() => {
  if (!auction.value?.endTime) return false
  const diff = new Date(auction.value.endTime).getTime() - Date.now()
  return diff > 0 && diff < 10 * 60 * 1000 // less than 10 min
})

const isEnded = computed(() => {
  if (!auction.value) return false
  return auction.value.status === 'ended' || auction.value.status === 'cancelled' || timeRemaining.value === '已結束'
})

const isSeller = computed(() => {
  return authStore.user?.id === auction.value?.sellerId
})

const canBid = computed(() => {
  return authStore.isAuthenticated && !isSeller.value && !isEnded.value
})

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('zh-MO', {
    style: 'currency',
    currency: 'MOP',
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
    // Parse product images if stored as JSON string
    const rawImages = response.data?.product?.images
    if (typeof rawImages === 'string') {
      try {
        auction.value.product.images = JSON.parse(rawImages)
      } catch {
        auction.value.product.images = []
      }
    }
    bids.value = response.data.bids || []
    bidAmount.value = Number(response.data.currentPrice || response.data.startingPrice) + 10
  } catch (err: any) {
    error.value = err?.response?.data?.message || (locale.value === 'zh' ? '無法加載拍賣詳情' : 'Failed to load auction')
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
    bidError.value = locale.value === 'zh' ? `最低出價金額為 ${formatPrice(minimumBid.value)}` : `Minimum bid is ${formatPrice(minimumBid.value)}`
    return
  }
  
  bidError.value = ''
  bidSuccess.value = ''
  placingBid.value = true
  
  try {
    await auctionApi.placeBid(auctionId.value, bidAmount.value)
    bidSuccess.value = locale.value === 'zh' ? '出價成功！' : 'Bid placed successfully!'
    await loadAuction()
    setTimeout(() => bidSuccess.value = '', 3000)
  } catch (err: any) {
    bidError.value = err?.response?.data?.message || (locale.value === 'zh' ? '出價失敗，請重試' : 'Bid failed, please retry')
  } finally {
    placingBid.value = false
  }
}

// Poll for updates
let pollInterval: ReturnType<typeof setInterval>
let tickInterval: ReturnType<typeof setInterval>

onMounted(() => {
  loadAuction()
  pollInterval = setInterval(loadAuction, 10000)
  // U1: Tick every second for countdown accuracy
  tickInterval = setInterval(() => { tick.value++ }, 1000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
  if (tickInterval) clearInterval(tickInterval)
})
</script>

<template>
  <div class="auction-detail-page">
    <!-- Loading -->
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>{{ locale === 'zh' ? '加載中...' : 'Loading...' }}</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-container">
      <div class="error-icon">⚠️</div>
      <h2>{{ error }}</h2>
      <button @click="loadAuction" class="btn-retry">{{ locale === 'zh' ? '重試' : 'Retry' }}</button>
    </div>

    <!-- Auction Detail — 閒魚風格，桌面端雙列 -->
    <div v-else-if="auction" class="auction-container">

      <!-- ===== TOP: 出價記錄 — 圓形頭像 + 底下價格 ===== -->
      <div v-if="sortedBids.length > 0" class="bid-bar-section">
        <div class="bid-bar-header">
          <span class="bid-bar-title">{{ locale === 'zh' ? '出價記錄' : 'Bid History' }}</span>
          <span class="bid-bar-count">{{ sortedBids.length }}{{ locale === 'zh' ? '條' : ' bids' }}</span>
        </div>
        <div class="bid-avatars-scroll">
          <div
            v-for="(bid, idx) in sortedBids"
            :key="bid.id"
            class="bid-avatar-item"
            :class="{ 'bid-avatar-top': idx === 0 }"
          >
            <div class="bid-avatar-wrapper">
              <span v-if="idx === 0" class="crown">👑</span>
              <div class="bid-avatar">
                {{ (bid.bidder?.nickname || '匿').charAt(0) }}
              </div>
            </div>
            <span class="bid-avatar-name">{{ bid.bidder?.nickname || '匿名' }}</span>
            <span class="bid-avatar-amount">{{ formatPrice(Number(bid.amount)) }}</span>
          </div>
        </div>
      </div>
      <div v-else class="bid-bar-section bid-bar-empty">
        <span>{{ locale === 'zh' ? '暫無出價記錄，成為第一個出價者！' : 'No bids yet. Be the first!' }}</span>
      </div>

      <!-- ===== 雙列區：左=中間核心區  右=商品詳情 ===== -->
      <div class="two-col-layout">

        <!-- LEFT: 圖片 + 價格 + 計時 + 規則 + 出價 -->
        <div class="middle-section">

          <!-- 圖片輪播 -->
          <div class="image-gallery">
            <div class="image-container">
              <img
                v-if="parsedImages.length > 0"
                :src="parsedImages[currentImageIndex]"
                :alt="auction.product?.titleEn"
                class="product-image"
              />
              <div v-else class="image-placeholder">🃏</div>
            </div>
            <!-- 多圖指示器 -->
            <div v-if="parsedImages.length > 1" class="image-dots">
              <span
                v-for="(_, idx) in parsedImages"
                :key="idx"
                class="image-dot"
                :class="{ active: idx === currentImageIndex }"
                @click="currentImageIndex = idx"
              ></span>
            </div>
            <!-- 多圖左右切換 -->
            <template v-if="parsedImages.length > 1">
              <button v-if="currentImageIndex > 0" class="img-nav img-prev" @click="currentImageIndex--">‹</button>
              <button v-if="currentImageIndex < parsedImages.length - 1" class="img-nav img-next" @click="currentImageIndex++">›</button>
            </template>
            <!-- 圖片計數 -->
            <span v-if="parsedImages.length > 1" class="img-counter">{{ currentImageIndex + 1 }}/{{ parsedImages.length }}</span>
          </div>

          <!-- 當前價格 + 剩餘時間 -->
          <div class="price-time-card">
            <div class="price-block">
              <span class="price-label">{{ locale === 'zh' ? '當前最高價' : 'Current Price' }}</span>
              <span class="current-price">{{ formatPrice(currentPrice) }}</span>
              <span class="bid-count">{{ auction.bidCount || 0 }} {{ locale === 'zh' ? '次出價' : 'bids' }} · {{ locale === 'zh' ? '起拍價' : 'Start' }} {{ formatPrice(Number(auction.startingPrice)) }}</span>
            </div>
            <div class="time-block" :class="{ 'ending-soon': isEndingSoon }">
              <span class="time-label">{{ isEnded ? (locale === 'zh' ? '已結束' : 'Ended') : (locale === 'zh' ? '剩餘時間' : 'Time Left') }}</span>
              <span class="time-value">{{ timeRemaining }}</span>
            </div>
          </div>

          <!-- 拍賣規則 -->
          <div class="rules-card">
            <div class="rules-title">{{ locale === 'zh' ? '拍賣規則' : 'Auction Rules' }}</div>
            <div class="rules-list">
              <div class="rule-item">
                <span class="rule-key">{{ locale === 'zh' ? '起拍價' : 'Starting Price' }}</span>
                <span class="rule-val">{{ formatPrice(Number(auction.startingPrice)) }}</span>
              </div>
              <div v-if="auction.reservePrice" class="rule-item">
                <span class="rule-key">{{ locale === 'zh' ? '底價' : 'Reserve' }}</span>
                <span class="rule-val">{{ formatPrice(Number(auction.reservePrice)) }}</span>
              </div>
              <div v-if="auction.buyNowPrice" class="rule-item">
                <span class="rule-key">{{ locale === 'zh' ? '一口價' : 'Buy Now' }}</span>
                <span class="rule-val">{{ formatPrice(Number(auction.buyNowPrice)) }}</span>
              </div>
              <div class="rule-item">
                <span class="rule-key">{{ locale === 'zh' ? '最低加價' : 'Min Increment' }}</span>
                <span class="rule-val">{{ formatPrice(Number(auction.bidIncrement || 10)) }}</span>
              </div>
              <div class="rule-item">
                <span class="rule-key">{{ locale === 'zh' ? '結束延長' : 'Extension' }}</span>
                <span class="rule-val">{{ locale === 'zh' ? `最後${auction.extensionMinutes || 5}分鐘出價延長${auction.extensionMinutes || 5}分鐘` : `Last ${auction.extensionMinutes || 5} min → +${auction.extensionMinutes || 5} min` }}</span>
              </div>
              <div class="rule-item">
                <span class="rule-key">{{ locale === 'zh' ? '開始時間' : 'Start' }}</span>
                <span class="rule-val">{{ formatDateTime(auction.startTime) }}</span>
              </div>
              <div class="rule-item">
                <span class="rule-key">{{ locale === 'zh' ? '結束時間' : 'End' }}</span>
                <span class="rule-val">{{ formatDateTime(auction.endTime) }}</span>
              </div>
            </div>
          </div>

          <!-- 出價框 -->
          <div v-if="canBid" class="bid-action-card">
            <div class="bid-input-row">
              <span class="currency-prefix">MOP</span>
              <input
                v-model.number="bidAmount"
                type="number"
                :min="minimumBid"
                step="10"
                class="bid-input"
                :placeholder="locale === 'zh' ? '輸入出價金額' : 'Enter bid amount'"
              />
              <button
                @click="handlePlaceBid"
                class="btn-bid"
                :disabled="placingBid"
              >
                <span v-if="placingBid" class="spinner-small"></span>
                {{ placingBid ? (locale === 'zh' ? '出價中' : 'Bidding...') : (locale === 'zh' ? '立即出價' : 'Place Bid') }}
              </button>
            </div>
            <p class="bid-hint">{{ locale === 'zh' ? '最低出價' : 'Min bid' }}: {{ formatPrice(minimumBid) }}</p>
            <p v-if="bidError" class="bid-error">{{ bidError }}</p>
            <p v-if="bidSuccess" class="bid-success">{{ bidSuccess }}</p>
          </div>

          <!-- 賣家觀看 -->
          <div v-else-if="isSeller" class="seller-notice">
            <span>{{ locale === 'zh' ? '這是您的拍賣商品' : 'This is your auction' }}</span>
          </div>

          <!-- 已結束 -->
          <div v-else-if="isEnded" class="ended-notice">
            <span v-if="auction.winner">🏆 {{ locale === 'zh' ? '成交價' : 'Final Price' }}: {{ formatPrice(currentPrice) }}</span>
            <span v-else>{{ locale === 'zh' ? '拍賣已結束 — 無人出價' : 'Auction ended — no bids' }}</span>
          </div>

          <!-- 未登入 -->
          <div v-else class="login-notice">
            <button @click="router.push('/login')" class="btn-login">{{ locale === 'zh' ? '登入後出價' : 'Login to Bid' }}</button>
          </div>

        </div>

        <!-- RIGHT: 商品詳細資料 -->
        <div class="detail-section">
          <!-- 標題區 -->
          <div class="detail-card">
            <div class="detail-header">
              <span class="category-badge">{{ auction.product?.category || '其他' }}</span>
              <span class="status-badge" :class="auction.status">
                {{ auction.status === 'active' ? (locale === 'zh' ? '🔥 進行中' : '🔥 Active') : auction.status === 'ended' ? (locale === 'zh' ? '已結束' : 'Ended') : (locale === 'zh' ? '⏳ 待開始' : '⏳ Pending') }}
              </span>
            </div>
            <h1 class="product-title">{{ auction.product?.titleEn || (locale === 'zh' ? '卡牌商品' : 'Card Product') }}</h1>
            <p v-if="auction.product?.titleZh" class="product-subtitle">{{ auction.product?.titleZh }}</p>
            <p v-if="auction.product?.descriptionEn || auction.product?.descriptionZh" class="product-description">
              {{ auction.product?.descriptionEn || auction.product?.descriptionZh }}
            </p>
          </div>

          <!-- 規格表 -->
          <div class="detail-card">
            <h3 class="card-title">{{ locale === 'zh' ? '商品規格' : 'Specifications' }}</h3>
            <table class="spec-table">
              <tr><td>{{ locale === 'zh' ? '品相' : 'Condition' }}</td><td>{{ auction.product?.condition || '-' }}</td></tr>
              <tr><td>{{ locale === 'zh' ? '品牌' : 'Brand' }}</td><td>{{ auction.product?.brand || '-' }}</td></tr>
              <tr><td>{{ locale === 'zh' ? '系列' : 'Series' }}</td><td>{{ auction.product?.series || '-' }}</td></tr>
              <tr><td>{{ locale === 'zh' ? '語言' : 'Language' }}</td><td>{{ auction.product?.language || '-' }}</td></tr>
            </table>
          </div>

          <!-- 賣家資訊 -->
          <div class="detail-card">
            <h3 class="card-title">{{ locale === 'zh' ? '賣家資訊' : 'Seller Info' }}</h3>
            <div class="seller-row">
              <div class="seller-avatar">{{ (auction.seller?.nickname || '?').charAt(0) }}</div>
              <div class="seller-detail">
                <span class="seller-name">{{ auction.seller?.nickname || '未知' }}</span>
                <span class="seller-id">ID: {{ auction.seller?.id?.slice(0, 8) || '—' }}</span>
              </div>
            </div>
          </div>
        </div>

      </div><!-- /two-col-layout -->

    </div>
  </div>
</template>

<style scoped>
.auction-detail-page {
  min-height: 100vh;
  background: transparent;
  padding: var(--space-3);
  max-width: 1100px;
  margin: 0 auto;
}

/* ===== Loading / Error ===== */
.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  gap: var(--space-4);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.error-icon { font-size: 48px; }

.btn-retry {
  padding: var(--space-3) var(--space-6);
  background: var(--primary);
  border: none;
  border-radius: var(--radius-lg);
  color: white;
  cursor: pointer;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ===== TOP: 出價記錄 — 圓形頭像 ===== */
.bid-bar-section {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  padding: var(--space-3);
  margin-bottom: var(--space-3);
}

.bid-bar-empty {
  text-align: center;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.bid-bar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
}

.bid-bar-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-secondary);
}

.bid-bar-count {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.bid-avatars-scroll {
  display: flex;
  gap: var(--space-4);
  overflow-x: auto;
  overflow-y: hidden;
  padding: var(--space-2) var(--space-1);
  -webkit-overflow-scrolling: touch;
  touch-action: pan-x;
  scrollbar-width: thin;
}

.bid-avatars-scroll::-webkit-scrollbar { height: 3px; }
.bid-avatars-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

.bid-avatar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  width: 56px;
}

.bid-avatar-wrapper {
  position: relative;
  width: 44px;
  height: 44px;
}

.crown {
  position: absolute;
  top: -14px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 16px;
  z-index: 2;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
}

.bid-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--bg-elevated);
  border: 2px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--text-secondary);
}

.bid-avatar-top .bid-avatar {
  background: linear-gradient(135deg, #f59e0b, #f97316);
  border-color: #fbbf24;
  color: white;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
}

.bid-avatar-name {
  font-size: 10px;
  color: var(--text-muted);
  max-width: 56px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bid-avatar-amount {
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--primary);
}

.bid-avatar-top .bid-avatar-amount {
  color: #f59e0b;
}

/* ===== MIDDLE ===== */

/* 雙列佈局：桌面端左右並排，手機端單列 */
.two-col-layout {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.middle-section {
  margin-bottom: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

@media (min-width: 820px) {
  .two-col-layout {
    flex-direction: row;
    align-items: flex-start;
  }

  .middle-section {
    flex: 1;
    min-width: 0;
  }

  .detail-section {
    width: 340px;
    flex-shrink: 0;
  }
}

/* 圖片 */
.image-gallery {
  position: relative;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--bg-card);
  border: 1px solid var(--border);
  margin-bottom: var(--space-3);
}

.image-container {
  aspect-ratio: 1;
  width: 100%;
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

.image-dots {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
  z-index: 2;
}

.image-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  transition: all 0.2s;
}

.image-dot.active {
  background: white;
  width: 18px;
  border-radius: 4px;
}

.img-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(0,0,0,0.4);
  color: white;
  border: none;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 2;
  line-height: 1;
}

.img-prev { left: 8px; }
.img-next { right: 8px; }

.img-counter {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0,0,0,0.5);
  color: white;
  font-size: var(--text-xs);
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

/* 價格 + 計時 */
.price-time-card {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  overflow: hidden;
  margin-bottom: var(--space-3);
}

.price-block {
  flex: 1;
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.price-label {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.current-price {
  font-size: 28px;
  font-weight: 800;
  color: var(--primary);
  line-height: 1.2;
}

.bid-count {
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.time-block {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  gap: 2px;
  background: var(--bg-elevated);
  min-width: 100px;
}

.time-label {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.time-value {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--text-primary);
}

.time-block.ending-soon {
  background: rgba(239, 68, 68, 0.1);
}

.time-block.ending-soon .time-value {
  color: #ef4444;
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* 拍賣規則 */
.rules-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  padding: var(--space-4);
  margin-bottom: var(--space-3);
}

.rules-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: var(--space-3);
}

.rules-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.rule-item {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: var(--text-sm);
  gap: var(--space-3);
}

.rule-key {
  color: var(--text-muted);
  flex-shrink: 0;
}

.rule-val {
  color: var(--text-primary);
  font-weight: 500;
  text-align: right;
  word-break: break-word;
}

/* 出價框 */
.bid-action-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  padding: var(--space-4);
  margin-bottom: var(--space-3);
}

.bid-input-row {
  display: flex;
  align-items: stretch;
  gap: 0;
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.currency-prefix {
  display: flex;
  align-items: center;
  padding: 0 var(--space-3);
  background: var(--bg-elevated);
  color: var(--text-secondary);
  font-weight: 600;
  font-size: var(--text-sm);
}

.bid-input {
  flex: 1;
  padding: var(--space-3);
  background: var(--bg-dark);
  border: 1px solid var(--border);
  border-left: none;
  border-right: none;
  color: var(--text-primary);
  font-size: var(--text-lg);
  font-weight: 600;
  min-width: 0;
}

.bid-input:focus {
  outline: none;
  border-color: var(--primary);
}

.btn-bid {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  border: none;
  color: white;
  font-size: var(--text-base);
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.2s;
}

.btn-bid:hover:not(:disabled) { opacity: 0.9; }
.btn-bid:disabled { opacity: 0.6; cursor: not-allowed; }

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.bid-hint {
  margin-top: var(--space-2);
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.bid-error {
  margin-top: var(--space-2);
  color: #ef4444;
  font-size: var(--text-sm);
  background: rgba(239, 68, 68, 0.1);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
}

.bid-success {
  margin-top: var(--space-2);
  color: #22c55e;
  font-size: var(--text-sm);
  background: rgba(34, 197, 94, 0.1);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
}

.seller-notice,
.ended-notice,
.login-notice {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  padding: var(--space-5);
  text-align: center;
  color: var(--text-secondary);
  margin-bottom: var(--space-3);
}

.btn-login {
  padding: var(--space-3) var(--space-6);
  background: var(--primary);
  border: none;
  border-radius: var(--radius-lg);
  color: white;
  font-size: var(--text-base);
  font-weight: 600;
  cursor: pointer;
}

/* ===== BOTTOM: 商品詳情 ===== */
.detail-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.detail-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  padding: var(--space-4);
}

.detail-header {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.category-badge {
  padding: 2px 10px;
  background: var(--bg-elevated);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.status-badge {
  padding: 2px 10px;
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
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.product-subtitle {
  font-size: var(--text-base);
  color: var(--text-muted);
  margin-bottom: var(--space-3);
}

.product-description {
  color: var(--text-secondary);
  line-height: 1.6;
  font-size: var(--text-sm);
}

.card-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: var(--space-3);
}

/* 規格表 */
.spec-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.spec-table td {
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--border);
}

.spec-table td:first-child {
  color: var(--text-muted);
  width: 30%;
}

.spec-table td:last-child {
  color: var(--text-primary);
  font-weight: 500;
}

.spec-table tr:last-child td {
  border-bottom: none;
}

/* 賣家 */
.seller-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.seller-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-lg);
  font-weight: 700;
}

.seller-detail {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.seller-name {
  font-weight: 600;
  color: var(--text-primary);
}

.seller-id {
  font-size: var(--text-xs);
  color: var(--text-muted);
}
</style>