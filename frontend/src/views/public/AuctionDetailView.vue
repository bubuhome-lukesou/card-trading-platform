<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { auctionApi } from '@/api/auctions'
import { useFavoritesStore } from '@/stores/favorites'
import { useI18n } from 'vue-i18n'
import { Heart, Loader2 } from 'lucide-vue-next'
import { productApi } from '@/api/products'
import ProductCard from '@/components/product/ProductCard.vue'

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
const currentImageIndex = ref(0)
const showLightbox = ref(false)
// U1: Tick ref to force timeRemaining re-evaluation every second
const tick = ref(0)

// Touch/swipe state for mobile
const touchStartX = ref(0)
const touchEndX = ref(0)

const onTouchStart = (e: TouchEvent) => {
  touchStartX.value = e.changedTouches[0].screenX
}

const onTouchEnd = (e: TouchEvent) => {
  touchEndX.value = e.changedTouches[0].screenX
  handleSwipe()
}

const handleSwipe = () => {
  const diff = touchStartX.value - touchEndX.value
  if (Math.abs(diff) < 30) return
  if (diff > 0) {
    // Swipe left — next image
    if (currentImageIndex.value < parsedImages.value.length - 1) {
      currentImageIndex.value++
    }
  } else {
    // Swipe right — prev image
    if (currentImageIndex.value > 0) {
      currentImageIndex.value--
    }
  }
}

const openLightbox = () => {
  if (parsedImages.value.length > 0) showLightbox.value = true
}

const closeLightbox = () => {
  showLightbox.value = false
}

const lightboxPrev = () => {
  if (currentImageIndex.value > 0) currentImageIndex.value--
}

const lightboxNext = () => {
  if (currentImageIndex.value < parsedImages.value.length - 1) currentImageIndex.value++
}

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

const isHighestBidder = computed(() => {
  return authStore.isAuthenticated && auction.value?.winnerId === authStore.user?.id
})

const formatPrice = (price: number) => {
  return `MOP $${Number(price).toLocaleString()}`
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

// === Product info helpers (synced with ProductDetailView) ===
const categoryInfo = computed(() => ({
  pokemon: { emoji: '🎮', zh: '寶可夢', en: 'Pokemon', color: '#e74c3c' },
  yugioh: { emoji: '⚡', zh: '遊戲王', en: 'Yu-Gi-Oh!', color: '#f39c12' },
  mtg: { emoji: '🧙', zh: '萬智牌', en: 'Magic: The Gathering', color: '#1abc9c' },
  ultraman: { emoji: '👾', zh: '奧特曼', en: 'Ultraman', color: '#3498db' },
  onepiece: { emoji: '🏴‍☠️', zh: '海賊王', en: 'One Piece', color: '#e74c3c' },
  doraemon: { emoji: '🤖', zh: '哆啦A夢', en: 'Doraemon', color: '#2196f3' },
  sports: { emoji: '⚽', zh: '體育卡', en: 'Sports Cards', color: '#27ae60' },
  other: { emoji: '📦', zh: '其他', en: 'Other', color: '#9b59b6' }
}))

const getCategoryInfo = (category: string) => {
  return categoryInfo.value[category as keyof typeof categoryInfo.value] || { emoji: '📦', zh: category, en: category }
}

const getCategoryLabel = (category: string) => {
  const info = getCategoryInfo(category)
  return locale.value === 'zh' ? info.zh : info.en
}

const getTitle = (product: any) => {
  return locale.value === 'zh' ? (product?.titleZh || product?.titleEn) : (product?.titleEn || product?.titleZh)
}

const getDescription = (product: any) => {
  if (locale.value === 'zh') return product?.descriptionZh || product?.descriptionEn || ''
  return product?.descriptionEn || product?.descriptionZh || ''
}

const conditionColor = computed(() => ({
  'S': '#22c55e',
  'A': '#84cc16',
  'B': '#eab308',
  'C': '#f97316',
  'D': '#ef4444'
} as Record<string, string>)[auction.value?.product?.condition as string] || '#6366f1')

const productTypeLabels: Record<string, { zh: string; en: string }> = {
  graded_card: { zh: '評分卡', en: 'Graded Card' },
  original_box: { zh: '原箱', en: 'Original Box' },
  original_case: { zh: '原盒', en: 'Original Case' },
  original_bag: { zh: '原袋', en: 'Original Bag' },
  raw_card: { zh: '裸卡', en: 'Raw Card' },
  other: { zh: '其它', en: 'Other' },
}

const getProductTypeLabel = (type: string | null | undefined) => {
  if (!type) return '—'
  const labels = productTypeLabels[type]
  if (!labels) return type
  return labels[locale.value as 'zh' | 'en'] || labels.zh
}

const languageLabels: Record<string, { zh: string; en: string }> = {
  japanese: { zh: '日文', en: 'Japanese' },
  english: { zh: '英文', en: 'English' },
  traditional_chinese: { zh: '繁體中文', en: 'Traditional Chinese' },
  simplified_chinese: { zh: '簡體中文', en: 'Simplified Chinese' },
  korean: { zh: '韓文', en: 'Korean' },
  other: { zh: '其他', en: 'Other' }
}

const getLanguageLabel = (lang: string | null | undefined) => {
  if (!lang) return ''
  const labels = languageLabels[lang]
  if (!labels) return lang
  return locale.value === 'zh' ? labels.zh : labels.en
}

const getGeneralTags = (product: any) => {
  if (!product?.tags) return []
  return product.tags.filter((tag: any) => tag.type !== 'product_type' && tag.type !== 'PRODUCT_TYPE')
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
        if (p.brand === auction.value.product.brand) score += 1
        if (p.series === auction.value.product.series) score += 1
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
    currentImageIndex.value = 0
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
            <div class="image-container" @touchstart="onTouchStart" @touchend="onTouchEnd">
              <!-- Favorite button (login required) -->
              <button
                v-if="authStore.isAuthenticated"
                class="fav-btn-detail"
                :class="{ active: isFavorited }"
                @click="handleToggleFavorite"
              >
                <Heart class="fav-icon-detail" :class="{ 'icon-filled': isFavorited }" />
              </button>
              <img
                v-if="parsedImages.length > 0"
                :src="parsedImages[currentImageIndex]"
                :alt="auction.product?.titleEn"
                class="product-image"
                @click="openLightbox"
              />
              <div v-else class="image-placeholder">🃏</div>
              <!-- Zoom hint -->
              <div v-if="parsedImages.length > 0" class="zoom-hint">
                {{ locale === 'zh' ? '點擊放大' : 'Click to zoom' }}
              </div>
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
          <div v-if="canBid && !isHighestBidder" class="bid-action-card">
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

          <!-- 最高出價者 -->
          <div v-else-if="isHighestBidder && !isEnded" class="highest-bidder-notice">
            <span>🏆 {{ locale === 'zh' ? '您目前是最高出價者，請等待其他人出價' : 'You are the highest bidder, wait for others to outbid' }}</span>
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
            <button @click="router.push({ path: '/login', query: { redirect: `/auction/${auctionId}` } })" class="btn-login">{{ locale === 'zh' ? '登入後出價' : 'Login to Bid' }}</button>
          </div>

        </div>

        <!-- RIGHT: 商品詳細資料 (與 ProductDetailView 統一) -->
        <div class="info-wrap">
          <div class="glass-card">
            <!-- Category badge + Status -->
            <div class="detail-header">
              <span class="category-badge">{{ getCategoryInfo(auction.product?.category).emoji }} {{ getCategoryLabel(auction.product?.category || 'other') }}</span>
              <span class="status-badge" :class="auction.status">
                {{ auction.status === 'active' ? (locale === 'zh' ? '🔥 進行中' : '🔥 Active') : auction.status === 'ended' ? (locale === 'zh' ? '已結束' : 'Ended') : (locale === 'zh' ? '⏳ 待開始' : '⏳ Pending') }}
              </span>
            </div>

            <!-- Title -->
            <h1 class="product-title">{{ getTitle(auction.product) }}</h1>

            <!-- 賣家名稱 -->
            <div v-if="auction.seller" class="seller-info-row">
              <span class="seller-label">{{ locale === 'zh' ? '商鋪' : 'Seller' }}</span>
              <div class="seller-avatar-sm">{{ (auction.seller?.nickname || '?').charAt(0) }}</div>
              <span class="seller-name-text">{{ auction.seller?.nickname || (locale === 'zh' ? '未知商家' : 'Unknown Seller') }}</span>
            </div>

            <!-- Spec table -->
            <div class="spec-table">
              <div class="spec-row">
                <div class="spec-cell">
                  <span class="spec-label">{{ locale === 'zh' ? '品牌' : 'Brand' }}</span>
                  <span class="spec-value">{{ getCategoryInfo(auction.product?.category).emoji }} {{ getCategoryLabel(auction.product?.category || 'other') }}</span>
                </div>
                <div class="spec-cell">
                  <span class="spec-label">{{ locale === 'zh' ? '語言' : 'Language' }}</span>
                  <span class="spec-value">{{ getLanguageLabel(auction.product?.language) || '—' }}</span>
                </div>
              </div>
              <div class="spec-row">
                <div class="spec-cell">
                  <span class="spec-label">{{ locale === 'zh' ? '品相' : 'Condition' }}</span>
                  <span class="spec-value">
                    <span class="condition-dot" :style="{ backgroundColor: conditionColor }"></span>
                    {{ auction.product?.condition || '—' }}{{ locale === 'zh' ? '品, ' + ({ S: '完美品相', A: '輕微瑕疵', B: '正常使用痕跡', C: '較明顯磨損', D: '嚴重磨損' } as Record<string, string>)[auction.product?.condition] || '' : '' }}
                  </span>
                </div>
                <div class="spec-cell">
                  <span class="spec-label">{{ locale === 'zh' ? '商品種類' : 'Type' }}</span>
                  <span class="spec-value">{{ getProductTypeLabel(auction.product?.productType) }}</span>
                </div>
              </div>
              <div class="spec-row" v-if="auction.product?.series">
                <div class="spec-cell">
                  <span class="spec-label">{{ locale === 'zh' ? '系列' : 'Series' }}</span>
                  <span class="spec-value">{{ auction.product?.series }}</span>
                </div>
                <div class="spec-cell">
                  <span class="spec-label">{{ locale === 'zh' ? '品牌' : 'Brand' }}</span>
                  <span class="spec-value">{{ auction.product?.brand || '—' }}</span>
                </div>
              </div>
              <div class="spec-row" v-if="getGeneralTags(auction.product).length > 0">
                <div class="spec-cell spec-cell-full">
                  <span class="spec-label">{{ locale === 'zh' ? '其它標籤' : 'Tags' }}</span>
                  <span class="spec-value spec-tags">
                    <span
                      v-for="tag in getGeneralTags(auction.product)"
                      :key="tag.id"
                      class="tag-chip"
                      :style="tag.color ? { '--tag-color': tag.color } : {}"
                      @click="router.push({ path: '/marketplace', query: { search: tag.name } })"
                    >
                      <span class="tag-dot" :style="{ backgroundColor: tag.color || '#818cf8' }"></span>
                      {{ tag.name }}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <!-- Description -->
            <div v-if="getDescription(auction.product)" class="description-block">
              <h3 class="desc-heading">{{ locale === 'zh' ? '商品描述' : 'Description' }}</h3>
              <p class="desc-text">{{ getDescription(auction.product) }}</p>
            </div>
          </div>
        </div>

      </div><!-- /two-col-layout -->

      <!-- Related Products -->
      <section v-if="!loading && relatedProducts.length > 0" class="related-section">
        <h2 class="related-title">{{ locale === 'zh' ? '你可能喜歡' : 'You May Also Like' }}</h2>
        <div v-if="relatedLoading" class="related-loading">
          <Loader2 class="spinner" />
        </div>
        <div v-else class="related-grid">
          <ProductCard
            v-for="p in relatedProducts"
            :key="p.id"
            :product="p"
          />
        </div>
      </section>

    </div>

    <!-- Lightbox -->
    <div v-if="showLightbox" class="lightbox" @click="closeLightbox">
      <button class="lightbox-close" @click="closeLightbox">✕</button>
      <button v-if="currentImageIndex > 0" class="lightbox-nav lightbox-prev" @click.stop="lightboxPrev">‹</button>
      <img :src="parsedImages[currentImageIndex]" class="lightbox-img" @click.stop />
      <button v-if="currentImageIndex < parsedImages.length - 1" class="lightbox-nav lightbox-next" @click.stop="lightboxNext">›</button>
      <span v-if="parsedImages.length > 1" class="lightbox-counter">{{ currentImageIndex + 1 }} / {{ parsedImages.length }}</span>
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

.fav-btn-detail {
  position: absolute;
  top: 12px;
  left: 12px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 5;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.7);
    transform: scale(1.1);
  }

  &.active .fav-icon-detail {
    color: #ef4444;
    fill: #ef4444;
  }
}

.fav-icon-detail {
  width: 18px;
  height: 18px;
  color: white;
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
.login-notice,
.highest-bidder-notice {
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

.detail-header {
  display: flex;
  gap: 8px;
  align-items: center;
}

.category-badge {
  padding: 3px 12px;
  background: var(--bg-elevated);
  border-radius: 100px;
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-weight: 500;
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
}

/* 賣家名稱行 */
.seller-info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: var(--space-2);
  padding: 8px 12px;
  background: var(--bg-elevated);
  border-radius: var(--radius-md);
  width: fit-content;
}

.seller-label {
  font-size: var(--text-xs);
  color: var(--text-muted);
  font-weight: 400;
}

.seller-avatar-sm {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

.seller-name-text {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
}

/* Spec table — 與 ProductDetailView 統一 */
.spec-table {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg-elevated);
  min-width: 0;
  max-width: 100%;
}

.spec-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-width: 0;

  & + .spec-row {
    border-top: 1px solid var(--border);
  }
}

.spec-cell {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  overflow-wrap: break-word;
  word-break: break-word;

  & + .spec-cell {
    border-left: 1px solid var(--border);
  }
}

.spec-cell-full {
  grid-column: 1 / -1;
  border-left: none;
}

.spec-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.spec-value {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.condition-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 8px currentColor;
}

.spec-tags {
  gap: 8px;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 100px;
  font-size: 0.75rem;
  font-weight: 500;
  background: color-mix(in srgb, var(--tag-color, #818cf8) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--tag-color, #818cf8) 30%, transparent);
  color: var(--tag-color, #818cf8);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    background: color-mix(in srgb, var(--tag-color, #818cf8) 18%, transparent);
    box-shadow: 0 4px 12px color-mix(in srgb, var(--tag-color, #818cf8) 20%, transparent);
  }
}

.tag-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
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

/* Zoom hint */
.zoom-hint {
  position: absolute;
  bottom: 8px;
  right: 8px;
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  border-radius: 100px;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.8);
  pointer-events: none;
}

/* Lightbox */
.lightbox {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.lightbox-img {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 8px;
  cursor: default;
}

.lightbox-close {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
}

.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  font-size: 28px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
}

.lightbox-prev { left: 20px; }
.lightbox-next { right: 20px; }

.lightbox-counter {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
}

/* Related Products */
.related-section {
  margin-top: 48px;
}

.related-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 20px;
}

.related-loading {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.related-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

@media (max-width: 768px) {
  .related-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .related-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>