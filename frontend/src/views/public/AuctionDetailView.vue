<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { auctionApi } from '@/api/auctions'
import { useFavoritesStore } from '@/stores/favorites'
import { useI18n } from 'vue-i18n'
import StateView from '@/components/common/StateView.vue'
import { Heart, Loader2 } from 'lucide-vue-next'
import { productApi } from '@/api/products'
import { formatPrice } from '@/utils/format'
import ImageGallery from '@/components/product/detail/ImageGallery.vue'
import SpecTable from '@/components/product/detail/SpecTable.vue'
import SellerCard from '@/components/product/detail/SellerCard.vue'
import RelatedProducts from '@/components/product/detail/RelatedProducts.vue'
import { useProductInfo } from '@/composables/useProductInfo'

const { t, locale } = useI18n()

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const favoritesStore = useFavoritesStore()

const auction = ref<any>(null)
const bids = ref<any[]>([])
const loading = ref(true)
const error = ref('')
const bidAmount = ref(0)
const placingBid = ref(false)
const bidError = ref('')
const bidSuccess = ref('')
// U1: Tick ref to force timeRemaining re-evaluation every second
const tick = ref(0)

// T7：gallery 邏輯（index/nav/swipe/lightbox）已抽入 components/product/detail/ImageGallery.vue

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

const isFavorited = computed(() => {
  if (!auction.value?.productId) return false
  return favoritesStore.isFavorited(auction.value.productId)
})

const favoriteLoading = ref(false)

const handleToggleFavorite = async () => {
  if (!auction.value?.productId) return
  if (favoriteLoading.value) return
  if (!authStore.isAuthenticated) {
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  favoriteLoading.value = true
  try {
    await favoritesStore.toggleFavorite(auction.value.productId)
  } finally {
    favoriteLoading.value = false
  }
}

const canBid = computed(() => {
  return authStore.isAuthenticated && !isSeller.value && !isEnded.value
})

// 直購：有 buyNowPrice 且拍賣進行中、非賣家、非最高出價者
const hasBuyNow = computed(() => {
  return !!auction.value && Number(auction.value.buyNowPrice) > 0
})

const canBuyNow = computed(() => {
  return canBid.value && hasBuyNow.value && !isHighestBidder.value
})

const buyingNow = ref(false)

const handleBuyNow = async () => {
  if (!authStore.isAuthenticated) {
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  if (!confirm(locale.value === 'zh'
    ? `確定以 ${formatPrice(Number(auction.value.buyNowPrice))} 直購此商品？拍賣將立即結束，你會成為得標者。`
    : `Buy now at ${formatPrice(Number(auction.value.buyNowPrice))}? The auction will end immediately.`)) {
    return
  }
  buyingNow.value = true
  bidError.value = ''
  try {
    await auctionApi.buyNow(auctionId.value)
    bidSuccess.value = locale.value === 'zh' ? '直購成功！請到「我的訂單」完成付款。' : 'Buy now successful! Check "My Orders" to pay.'
    await loadAuction()
    setTimeout(() => bidSuccess.value = '', 5000)
  } catch (err: any) {
    bidError.value = err?.response?.data?.message || (locale.value === 'zh' ? '直購失敗，請重試' : 'Buy now failed, please retry')
    await loadAuction()
  } finally {
    buyingNow.value = false
  }
}

const isHighestBidder = computed(() => {
  return authStore.isAuthenticated && auction.value?.winnerId === authStore.user?.id
})

// T7 共用 helpers（原 inline 定義已抽去 composables/useProductInfo.ts）
const {
  getTitle,
  getDescription,
  getConditionColor,
} = useProductInfo()
const conditionColor = computed(() => getConditionColor(auction.value?.product?.condition))

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
    fetchRelatedProducts()
  } catch (err: any) {
    error.value = err?.response?.data?.message || (locale.value === 'zh' ? '無法加載拍賣詳情' : 'Failed to load auction')
  } finally {
    loading.value = false
  }
}

const handlePlaceBid = async () => {
  if (!authStore.isAuthenticated) {
    router.push({ path: '/login', query: { redirect: route.fullPath } })
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

// Related products
const relatedProducts = ref<any[]>([])
const relatedLoading = ref(false)

const fetchRelatedProducts = async () => {
  if (!auction.value?.product) return
  relatedLoading.value = true
  try {
    const res = await productApi.getProducts({
      category: auction.value.product.category,
      limit: 20,
      sortBy: 'newest'
    } as any)
    const matches = (res.data.data || [])
      .filter((p: any) => p.id !== auction.value.product.id && p.quantity > 0)
      .map((p: any) => {
        let score = 0
        if (p.productType === auction.value.product.productType) score += 3
        if (p.condition === auction.value.product.condition) score += 2
        return { ...p, _score: score }
      })
      .sort((a: any, b: any) => b._score - a._score)
      .slice(0, 6)
    relatedProducts.value = matches
  } catch (e) {
    console.error('Failed to fetch related products:', e)
  } finally {
    relatedLoading.value = false
  }
}

// Poll for updates
let pollInterval: ReturnType<typeof setInterval>
let tickInterval: ReturnType<typeof setInterval>

onMounted(() => {
  loadAuction()
  if (authStore.isAuthenticated) {
    favoritesStore.loadFavorites()
  }
  pollInterval = setInterval(loadAuction, 10000)
  // U1: Tick every second for countdown accuracy
  tickInterval = setInterval(() => { tick.value++ }, 1000)
})

// Reload on route param change (navigating between auctions)
watch(auctionId, (newId) => {
  if (newId) {
    loadAuction()
  }
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
  if (tickInterval) clearInterval(tickInterval)
})
</script>

<template>
  <div class="auction-detail-page">
    <!-- Loading -->
    <StateView v-if="loading" state="loading" />

    <StateView v-else-if="error" state="error" :title="error" retry @retry="loadAuction" />

    <!-- Auction Detail — 頂部出價記錄 + PDV 雙列佈局 -->
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

      <!-- ===== 雙列區：PDV 佈局 — 左=圖片庫  右=資訊卡（價格/規則/出價） ===== -->
      <div class="product-layout">

        <!-- LEFT: Image Gallery（與 ProductDetailView 佈局統一） -->
        <ImageGallery
          :images="parsedImages"
          :title="getTitle(auction.product)"
          :category="auction.product?.category || 'other'"
        />

        <!-- RIGHT: Info（PDV glass-card 佈局） -->
        <div class="info-wrap">
          <div class="glass-card">
            <!-- Title + 拍賣狀態 -->
            <h1 class="product-title">
              {{ getTitle(auction.product) }}
              <span class="status-badge" :class="auction.status">
                {{ auction.status === 'active' ? (locale === 'zh' ? '🔥 進行中' : '🔥 Active') : auction.status === 'ended' ? (locale === 'zh' ? '已結束' : 'Ended') : (locale === 'zh' ? '⏳ 待開始' : '⏳ Pending') }}
              </span>
            </h1>

            <!-- 賣家名稱（可點擊 → 跳轉該商家 marketplace 篩選頁） -->
            <SellerCard :seller="auction.seller" />

            <!-- Spec table -->
            <SpecTable :product="auction.product" :condition-color="conditionColor" />

            <!-- Description -->
            <div v-if="getDescription(auction.product)" class="description-block">
              <h3 class="desc-heading">{{ locale === 'zh' ? '商品描述' : 'Description' }}</h3>
              <p class="desc-text">{{ getDescription(auction.product) }}</p>
            </div>

            <!-- Price（PDV 風格：漸變大字 + 當前最高價 + 剩餘時間） -->
            <div class="price-block">
              <span class="price-label">{{ locale === 'zh' ? '當前最高價' : 'Current Price' }}</span>
              <div class="price-line">
                <span class="price-currency">MOP</span>
                <span class="price-amount">${{ currentPrice.toLocaleString() }}</span>
              </div>
              <div class="price-meta">
                <span>{{ auction.bidCount || 0 }} {{ locale === 'zh' ? '次出價' : 'bids' }}</span>
                <span class="meta-dot">·</span>
                <span>{{ locale === 'zh' ? '起拍價' : 'Start' }} {{ formatPrice(Number(auction.startingPrice)) }}</span>
              </div>
              <div v-if="!isEnded" class="time-row" :class="{ 'ending-soon': isEndingSoon }">
                <span class="time-label">{{ locale === 'zh' ? '剩餘時間' : 'Time Left' }}</span>
                <span class="time-value">⏱ {{ timeRemaining }}</span>
              </div>
              <div v-else class="time-row ended">
                <span class="time-label">{{ locale === 'zh' ? '拍賣已結束' : 'Auction Ended' }}</span>
              </div>
            </div>

            <!-- 拍賣規則（PDV reservation-box 風格） -->
            <div class="rules-box">
              <div class="rules-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                <span>{{ locale === 'zh' ? '拍賣規則' : 'Auction Rules' }}</span>
              </div>
              <div class="rules-grid">
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

            <!-- 出價區 -->
            <template v-if="canBid && !isHighestBidder">
              <div class="bid-box">
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
                </div>
                <p class="bid-hint">{{ locale === 'zh' ? '最低出價' : 'Min bid' }}: {{ formatPrice(minimumBid) }}</p>
                <div class="action-row">
                  <button class="btn btn-primary" :disabled="placingBid" @click="handlePlaceBid">
                    <Loader2 v-if="placingBid" class="btn-spinner" />
                    {{ placingBid ? (locale === 'zh' ? '出價中' : 'Bidding...') : (locale === 'zh' ? '立即出價' : 'Place Bid') }}
                  </button>
                  <button
                    class="btn btn-fav"
                    :class="{ active: isFavorited }"
                    :disabled="favoriteLoading"
                    @click="handleToggleFavorite"
                  >
                    <Heart class="fav-icon" :class="{ 'icon-filled': isFavorited }" />
                  </button>
                </div>
                <button
                  v-if="canBuyNow"
                  @click="handleBuyNow"
                  class="btn-buy-now"
                  :disabled="buyingNow || placingBid"
                >
                  <Loader2 v-if="buyingNow" class="btn-spinner" />
                  {{ buyingNow
                    ? (locale === 'zh' ? '直購中...' : 'Buying...')
                    : (locale === 'zh' ? `⚡ 直購 ${formatPrice(Number(auction.buyNowPrice))}` : `⚡ Buy Now ${formatPrice(Number(auction.buyNowPrice))}`) }}
                </button>
                <p v-if="canBuyNow" class="buy-now-hint">{{ locale === 'zh' ? '點擊直購立即得標，拍賣即時結束' : 'Buy now to win the auction instantly' }}</p>
                <p v-if="bidError" class="bid-error">{{ bidError }}</p>
                <p v-if="bidSuccess" class="bid-success">{{ bidSuccess }}</p>
              </div>
            </template>

            <!-- 最高出價者 -->
            <div v-else-if="isHighestBidder && !isEnded" class="state-notice success">
              <span>🏆 {{ locale === 'zh' ? '您目前是最高出價者，請等待其他人出價' : 'You are the highest bidder, wait for others to outbid' }}</span>
            </div>

            <!-- 賣家觀看 -->
            <div v-else-if="isSeller" class="state-notice">
              <span>{{ locale === 'zh' ? '這是您的拍賣商品' : 'This is your auction' }}</span>
            </div>

            <!-- 已結束 -->
            <div v-else-if="isEnded" class="state-notice">
              <span v-if="auction.winner">🏆 {{ locale === 'zh' ? '成交價' : 'Final Price' }}: {{ formatPrice(currentPrice) }}</span>
              <span v-else>{{ locale === 'zh' ? '拍賣已結束 — 無人出價' : 'Auction ended — no bids' }}</span>
            </div>

            <!-- 未登入 -->
            <div v-else class="action-row">
              <button @click="router.push({ path: '/login', query: { redirect: `/auction/${auctionId}` } })" class="btn btn-primary">
                {{ locale === 'zh' ? '登入後出價' : 'Login to Bid' }}
              </button>
            </div>
          </div>
        </div>

      </div><!-- /product-layout -->

      <!-- Related Products -->
      <RelatedProducts :products="relatedProducts" :loading="relatedLoading" />

    </div>
  </div>
</template>

<style scoped>
.auction-detail-page {
  min-height: 100vh;
  background: transparent;
  padding: var(--space-3);
  max-width: 1280px;
  margin: 0 auto;
}

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

/* ===== PDV 佈局（與 ProductDetailView 統一） ===== */
.product-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  align-items: start;
  animation: fadeUp 0.5s ease;
  min-width: 0;
  max-width: 100%;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 960px) {
  .product-layout {
    grid-template-columns: 1fr;
    gap: 24px;
  }
}

/* Price — PDV 風格 */
.price-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px 0;
}

.price-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.price-line {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.price-currency {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-muted);
  letter-spacing: 0.05em;
}

.price-amount {
  font-size: 2.6rem;
  font-weight: 800;
  background: linear-gradient(135deg, #6366f1, #818cf8);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -0.03em;
  line-height: 1;
}

.price-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.meta-dot { color: var(--text-muted); }

.time-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 4px;
  padding: 8px 12px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 10px;
}

.time-label {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.time-value {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.time-row.ending-soon {
  background: rgba(239, 68, 68, 0.08);
  border-color: rgba(239, 68, 68, 0.3);
}

.time-row.ending-soon .time-value {
  color: #ef4444;
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.time-row.ended .time-label {
  font-weight: 600;
}

/* 拍賣規則 — PDV reservation-box 風格 */
.rules-box {
  background: rgba(99, 102, 241, 0.06);
  border: 1px solid rgba(129, 140, 248, 0.2);
  border-radius: 12px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rules-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  font-weight: 700;
  color: #818cf8;
  letter-spacing: 0.02em;
}

.rules-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rule-item {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 0.85rem;
  gap: var(--space-3);
}

.rule-key {
  color: var(--text-muted);
  flex-shrink: 0;
}

.rule-val {
  color: var(--text-primary);
  font-weight: 600;
  text-align: right;
  word-break: break-word;
}

/* 出價區 — PDV 風格 */
.bid-box {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bid-input-row {
  display: flex;
  align-items: stretch;
  gap: 0;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.04);
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
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 1.05rem;
  font-weight: 700;
  min-width: 0;
}

.bid-input:focus {
  outline: none;
  background: rgba(129, 140, 248, 0.08);
}

.action-row {
  display: flex;
  gap: 10px;
}

.btn {
  padding: 15px 24px;
  font-size: 0.95rem;
  font-weight: 700;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.25s ease;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  letter-spacing: 0.01em;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  flex: 1;
  background: linear-gradient(135deg, #6366f1, #818cf8);
  color: white;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
}

.btn-fav {
  width: 52px;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  padding: 15px;
}

.btn-fav:hover:not(:disabled) {
  border-color: rgba(239, 68, 68, 0.4);
  color: #f87171;
  background: rgba(239, 68, 68, 0.08);
}

.btn-fav.active {
  border-color: rgba(239, 68, 68, 0.5);
  background: rgba(239, 68, 68, 0.12);
}

.btn-fav.active .fav-icon {
  color: #ef4444;
  fill: #ef4444;
}

.fav-icon {
  width: 20px;
  height: 20px;
}

.btn-spinner {
  width: 16px;
  height: 16px;
  animation: spin 0.8s linear infinite;
}

/* 狀態提示 — PDV notice 風格 */
.state-notice {
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-weight: 500;
  text-align: center;
}

.state-notice.success {
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #4ade80;
}

.bid-hint {
  margin-top: var(--space-2);
  font-size: var(--text-xs);
  color: var(--text-muted);
}

/* 直購按鈕 */
.btn-buy-now {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  width: 100%;
  margin-top: var(--space-3);
  padding: var(--space-3) var(--space-5);
  background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
  border: none;
  color: white;
  font-size: var(--text-base);
  font-weight: 700;
  cursor: pointer;
  border-radius: var(--radius-md, 10px);
  transition: opacity 0.2s, transform 0.15s;
}

.btn-buy-now:hover:not(:disabled) {
  opacity: 0.92;
  transform: translateY(-1px);
}

.btn-buy-now:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.buy-now-hint {
  margin-top: var(--space-2);
  font-size: var(--text-xs);
  color: var(--text-muted);
  text-align: center;
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

/* ===== RIGHT: 商品詳情 (與 ProductDetailView 統一) ===== */
.info-wrap {
  display: flex;
  flex-direction: column;
  min-width: 0;
  max-width: 100%;
  overflow-wrap: break-word;
}

.glass-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 36px 32px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  position: relative;
  overflow: visible;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(129, 140, 248, 0.5), transparent);
    border-radius: 16px 16px 0 0;
    pointer-events: none;
  }
}

.status-badge {
  padding: 3px 12px;
  border-radius: 100px;
  font-size: 0.75rem;
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

/* Title */
.product-title {
  font-size: 1.9rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.25;
  margin: 0;
  letter-spacing: -0.02em;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}


/* Description */
.description-block {
  padding: 16px 0;
  border-top: 1px solid var(--border);
}

.desc-heading {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin: 0 0 10px 0;
}

.desc-text {
  font-size: 0.92rem;
  line-height: 1.7;
  color: var(--text-secondary);
  margin: 0;
  white-space: pre-wrap;
}

/* Mobile: spec-table 保持兩列 */
@media (max-width: 480px) {
  .glass-card {
    padding: 20px 16px;
  }

  .product-title {
    font-size: 1.4rem;
  }

  .spec-row {
    grid-template-columns: 1fr 1fr;
  }

  .spec-cell {
    padding: 10px 12px;
  }
}

</style>