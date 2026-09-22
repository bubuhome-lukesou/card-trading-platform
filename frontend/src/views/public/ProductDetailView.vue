<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { Heart, Loader2 } from 'lucide-vue-next'
import { productApi } from '@/api/products'
import { cartApi } from '@/api/cart'
import { favoritesApi } from '@/api/favorites'
import { useFavoritesStore } from '@/stores/favorites'
import { reservationApi } from '@/api/reservations'
import { useAuthStore } from '@/stores/auth'
import { tagApi } from '@/api/tags'
import { formatDate, formatDateTime } from '@/utils/format'
import ProductCard from '@/components/product/ProductCard.vue'
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

const loading = ref(true)
const product = ref<any>(null)
const processing = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')
const selectedQuantity = ref(1)
// P2: Use favoritesStore for sync across pages
const isFavorited = computed(() => favoritesStore.isFavorited(product.value?.id || ''))
const favoriteLoading = ref(false)

// T7 共用 helpers（原 inline 定義已抽去 composables/useProductInfo.ts）
const {
  getTitle,
  getDescription,
  copied,
  copyProductNumber,
  getConditionColor,
  getProductTypeLabel,
  getLanguageLabel,
  getGeneralTags,
} = useProductInfo()
const conditionColor = computed(() => getConditionColor(product.value?.condition))

const relatedProducts = ref<any[]>([])
const relatedLoading = ref(false)
const allTags = ref<any[]>([])

// Load favorites on mount
const loadFavorites = async () => {
  if (authStore.isAuthenticated) {
    await favoritesStore.loadFavorites()
  }
}

// Toggle favorite via store
const handleToggleFavorite = async () => {
  if (!authStore.isAuthenticated) {
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  if (favoriteLoading.value) return
  favoriteLoading.value = true
  await favoritesStore.toggleFavorite(product.value.id)
  favoriteLoading.value = false
}

// T7：categoryColor（--cat-color 變數用；categoryInfo 已抽入 composable）
const CATEGORY_COLORS: Record<string, string> = {
  pokemon: '#e74c3c', yugioh: '#f39c12', mtg: '#1abc9c', ultraman: '#3498db',
  onepiece: '#e74c3c', doraemon: '#2196f3', sports: '#27ae60', other: '#9b59b6',
}
const categoryColor = computed(() =>
  (product.value?.category && CATEGORY_COLORS[product.value.category]) || '#6366f1'
)

// Fetch related products (you may like)
const fetchRelatedProducts = async () => {
  if (!product.value) return
  relatedLoading.value = true
  try {
    // Fetch products with same category, limit 10 to compute match score
    const res = await productApi.getProducts({
      category: product.value.category,
      limit: 20,
      sortBy: 'newest'
    })
    // Filter out current product and score by matching attributes
    const matches = (res.data.data || [])
      .filter((p: any) => p.id !== product.value.id && p.quantity > 0)
      .map((p: any) => {
        let score = 0
        // Same category: +1
        if (p.category === product.value.category) score += 1
        // Same productType: +3
        if ((p as any).productType === (product.value as any).productType) score += 3
        // Same condition: +1
        if (p.condition === product.value.condition) score += 1
        // Shared tags: +2 per shared tag
        if (product.value.tags && p.tags) {
          const productTagIds = new Set(product.value.tags.map((t: any) => t.id))
          p.tags.forEach((t: any) => {
            if (productTagIds.has(t.id)) score += 2
          })
        }
        return { ...p, _score: score }
      })
      .filter((p: any) => p._score > 0)
      .sort((a: any, b: any) => b._score - a._score)
      .slice(0, 6)
    relatedProducts.value = matches
  } catch (err) {
    console.error('Failed to fetch related products:', err)
  } finally {
    relatedLoading.value = false
  }
}

// Old favorite functions removed — now using favoritesStore

// Load product data (shared by mount and route watcher)
const loadProduct = async () => {
  loading.value = true
  try {
    const [productRes, tagsRes] = await Promise.all([
      productApi.getProduct(route.params.id as string),
      tagApi.getTags()
    ])
    product.value = productRes.data
    allTags.value = tagsRes.data || []
    selectedQuantity.value = 1
    await fetchRelatedProducts()
  } catch (error) {
    console.error('Failed to load product:', error)
  } finally {
    loading.value = false
  }
}

// Watch for route param changes (same route, different product)
watch(
  () => route.params.id,
  (newId, oldId) => {
    if (newId && newId !== oldId) {
      loadProduct()
    }
  }
)

onMounted(async () => {
  await loadProduct()
  // P2: Load favorites from store for cross-page sync
  await loadFavorites()
  // U10: Load user's reservations to check if they've already reserved this product
  if (authStore.isAuthenticated) {
    try {
      const res = await reservationApi.getMyReservations()
      myReservations.value = Array.isArray(res.data) ? res.data : (res.data?.data || [])
    } catch {
      myReservations.value = []
    }
  }
})

// T7：gallery 邏輯（index/nav/swipe/lightbox/keydown）已全部抽入 components/product/detail/ImageGallery.vue

const isOutOfStock = () => {
  return product.value && (product.value.quantity === 0 || product.value.quantity === undefined)
}

const getMaxQuantity = () => {
  if (!product.value) return 1
  const remaining = getRemainingSpots()
  const userLimit = product.value.reservationLimitPerUser ?? remaining
  return Math.min(remaining, userLimit, product.value.quantity ?? 1)
}

const decreaseQuantity = () => {
  if (selectedQuantity.value > 1) {
    selectedQuantity.value--
  }
}

const increaseQuantity = () => {
  if (selectedQuantity.value < getMaxQuantity()) {
    selectedQuantity.value++
  }
}

const handleBuyNow = async () => {
  if (!authStore.isAuthenticated) {
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  if (!product.value) return
  if (isOutOfStock()) {
    message.value = '商品已售罄'
    messageType.value = 'error'
    return
  }
  if (selectedQuantity.value > getMaxQuantity()) {
    message.value = `庫存不足！最多只能購買 ${getMaxQuantity()} 件`
    messageType.value = 'error'
    return
  }

  processing.value = true
  message.value = ''
  try {
    const orderData = {
      productId: product.value.id,
      type: 'direct_purchase' as const,
      quantity: selectedQuantity.value,
      totalPrice: product.value.price * selectedQuantity.value,
    }
    const { ordersApi } = await import('@/api/orders')
    const response = await ordersApi.createOrder(orderData)
    message.value = t('product.buySuccess') || '購買成功！即將跳轉...'
    messageType.value = 'success'
    setTimeout(() => {
      router.push(`/user/orders`)
    }, 1500)
  } catch (error: any) {
    message.value = error?.response?.data?.message || (t('common.error') || '操作失敗')
    messageType.value = 'error'
  } finally {
    processing.value = false
  }
}

const handleAddToCart = async () => {
  if (!authStore.isAuthenticated) {
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  if (!product.value) return
  if (isOutOfStock()) {
    message.value = '商品已售罄'
    messageType.value = 'error'
    return
  }

  processing.value = true
  message.value = ''
  try {
    if (selectedQuantity.value > getMaxQuantity()) {
      message.value = `庫存不足！最多只能購買 ${getMaxQuantity()} 件`
      messageType.value = 'error'
      processing.value = false
      return
    }
    await cartApi.addItem(product.value.id, selectedQuantity.value)
    message.value = t('product.addToCartSuccess') || '已加入購物車！'
    messageType.value = 'success'
    setTimeout(() => {
      router.push('/user/cart')
    }, 1500)
  } catch (error: any) {
    message.value = error?.response?.data?.message || (t('common.error') || '操作失敗')
    messageType.value = 'error'
  } finally {
    processing.value = false
  }
}

// Handle reservation (for reservation listing type)
const handleReserve = async () => {
  if (!authStore.isAuthenticated) {
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  if (!product.value) return

  processing.value = true
  message.value = ''
  try {
    await reservationApi.createReservation(product.value.id, selectedQuantity.value)
    message.value = locale.value === 'zh' ? `預約成功！已預約 ${selectedQuantity.value} 件` : `Reservation successful! Reserved ${selectedQuantity.value} item(s)`
    messageType.value = 'success'
    // Reload product to get updated reservation count
    await loadProduct()
    // Reload user's reservations to update hasReserved
    try {
      const res = await reservationApi.getMyReservations()
      myReservations.value = Array.isArray(res.data) ? res.data : (res.data?.data || [])
    } catch {}
  } catch (error: any) {
    message.value = error?.response?.data?.message || (t('common.error') || '操作失敗')
    messageType.value = 'error'
  } finally {
    processing.value = false
  }
}

// Check if reservation is still open (deadline not passed and spots available)
const isReservationOpen = computed(() => {
  if (!product.value || product.value.listingType !== 'reservation') return false
  if (product.value.reservationDeadline) {
    const deadline = new Date(product.value.reservationDeadline)
    if (new Date() > deadline) return false
  }
  // Check remaining spots
  const remaining = getRemainingSpots()
  if (remaining <= 0) return false
  // Check per-user limit
  if (product.value.reservationLimitPerUser) {
    const userReserved = product.value.reservationCount || 0
    if (userReserved >= product.value.reservationLimitPerUser) return false
  }
  return true
})

// Get remaining reservation spots
const getRemainingSpots = () => {
  if (!product.value) return 0
  const total = product.value.quantity || 0
  const reserved = product.value.reservationCount || 0
  return Math.max(0, total - reserved)
}

// Display text for reservation spots
const reservationDisplayText = computed(() => {
  if (!product.value) return ''
  const remaining = getRemainingSpots()
  return `${remaining} ${locale.value === 'zh' ? '位剩餘' : 'spots left'}`
})

// Whether the current user has already made a reservation for this product
const myReservations = ref<any[]>([])
const hasReserved = computed(() => {
  if (!product.value || !authStore.isAuthenticated) return false
  return myReservations.value.some(r =>
    r.productId === product.value.id &&
    (r.status === 'pending' || r.status === 'deposit_paid' || r.status === 'confirmed')
  )
})

// Check if product is suspended (cancelled/ended)
const isProductSuspended = computed(() => {
  if (!product.value) return false
  return product.value.status === 'cancelled' || product.value.status === 'ended'
})
</script>

<template>
  <div class="product-detail">
    <div class="container">
      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <Loader2 class="spinner" />
        <p>{{ t('common.loading') || '加載中...' }}</p>
      </div>

      <!-- Product exists -->
      <div v-else-if="product" class="product-layout">
        <!-- ════════════════ LEFT: Image Gallery ════════════════ -->
        <!-- gallery-col：grid item 拉滿欄高，sticky 範圍涵蓋整條右欄 -->
        <div class="gallery-col">
          <ImageGallery
            :images="product.images || []"
            :title="getTitle(product)"
            :category="product.category"
            :cat-color="categoryColor"
          />
        </div>

        <!-- ════════════════ RIGHT: Info (Glass Card) ════════════════ -->
        <div class="info-wrap">
          <div class="glass-card">
            <!-- Title -->
            <h1 class="product-title">
              {{ getTitle(product) }}
              <span v-if="isProductSuspended" class="suspended-badge">{{ locale === 'zh' ? '已下架' : 'Suspended' }}</span>
            </h1>

            <!-- 賣家名稱（可點擊 → 跳轉該商家 marketplace 篩選頁） -->
            <SellerCard :seller="product.seller" />

            <!-- Spec table -->
            <SpecTable :product="product" :condition-color="conditionColor" />

            <!-- Description -->
            <div v-if="getDescription(product)" class="description-block">
              <h3 class="desc-heading">{{ locale === 'zh' ? '商品描述' : 'Description' }}</h3>
              <p class="desc-text">{{ getDescription(product) }}</p>
            </div>

            <!-- Price -->
            <div class="price-block">
              <span class="price-currency">MOP</span>
              <span class="price-amount">${{ Number(product.price).toLocaleString() }}</span>
            </div>

            <!-- Quantity selector -->
            <div v-if="product.quantity > 0" class="quantity-section">
              <span class="qty-label">{{ locale === 'zh' ? '數量' : 'Quantity' }}</span>
              <div class="qty-controls">
                <button class="qty-btn" @click="decreaseQuantity" :disabled="selectedQuantity <= 1">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
                <input
                  type="number"
                  class="qty-input"
                  v-model.number="selectedQuantity"
                  :min="1"
                  :max="getMaxQuantity()"
                  @change="selectedQuantity = Math.max(1, Math.min(selectedQuantity, getMaxQuantity()))"
                />
                <button class="qty-btn" @click="increaseQuantity" :disabled="selectedQuantity >= getMaxQuantity()">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
              </div>
              <span v-if="product.quantity !== undefined" class="stock-info">
                {{ locale === 'zh' ? '庫存' : 'Stock' }}: {{ product.quantity }}
              </span>
            </div>
            <div v-else class="out-of-stock">
              {{ locale === 'zh' ? '已售罄' : 'Out of Stock' }}
            </div>

            <!-- Message -->
            <transition name="msg-fade">
              <div v-if="message" class="action-message" :class="messageType">
                {{ message }}
              </div>
            </transition>

            <!-- Reservation mode UI -->
            <template v-if="product && product.listingType === 'reservation'">
              <div class="reservation-box">
                <div class="res-header">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <span>{{ locale === 'zh' ? '預約資訊' : 'Reservation Info' }}</span>
                </div>
                <div class="res-grid">
                  <div class="res-item">
                    <span class="res-label">{{ locale === 'zh' ? '預約名額' : 'Spots' }}</span>
                    <span class="res-value">{{ reservationDisplayText }}</span>
                  </div>
                  <div class="res-item" v-if="product.reservationDeposit">
                    <span class="res-label">{{ locale === 'zh' ? '訂金' : 'Deposit' }}</span>
                    <span class="res-value">MOP ${{ product.reservationDeposit }}</span>
                  </div>
                  <div class="res-item" v-if="product.reservationDeadline">
                    <span class="res-label">{{ locale === 'zh' ? '截止報名' : 'Deadline' }}</span>
                    <span class="res-value">{{ formatDateTime(product.reservationDeadline) }}</span>
                  </div>
                </div>
              </div>

              <div class="action-row">
                <div v-if="hasReserved" class="already-reserved-notice">
                  {{ locale === 'zh' ? '您已預約此商品' : 'You have already reserved this item' }}
                </div>
                <button
                  v-else
                  class="btn btn-primary"
                  :disabled="processing || !isReservationOpen || isProductSuspended"
                  @click="handleReserve"
                >
                  <Loader2 v-if="processing" class="btn-spinner" />
                  {{ processing ? (t('common.loading') || '處理中...') : (!authStore.isAuthenticated ? (locale === 'zh' ? '登入後預約' : 'Login to Reserve') : (locale === 'zh' ? '立即預約' : 'Reserve Now')) }}
                </button>
                <button
                  v-if="authStore.isAuthenticated"
                  class="btn btn-fav"
                  :class="{ active: isFavorited }"
                  :disabled="favoriteLoading"
                  @click="handleToggleFavorite"
                >
                  <Heart class="fav-icon" :class="{ 'icon-filled': isFavorited }" />
                </button>
              </div>
            </template>

            <!-- Normal purchase UI -->
            <template v-else>
              <div class="action-row">
                <button
                  class="btn btn-primary"
                  :disabled="processing || isOutOfStock() || isProductSuspended"
                  @click="handleBuyNow"
                >
                  <Loader2 v-if="processing" class="btn-spinner" />
                  {{ processing ? (t('common.loading') || '處理中...') : (!authStore.isAuthenticated ? (locale === 'zh' ? '登入後購買' : 'Login to Buy') : (locale === 'zh' ? '立即購買' : 'Buy Now')) }}
                </button>
                <button
                  v-if="authStore.isAuthenticated"
                  class="btn btn-secondary"
                  :disabled="processing || isOutOfStock() || isProductSuspended"
                  @click="handleAddToCart"
                >
                  {{ locale === 'zh' ? '加到購物車' : 'Add to Cart' }}
                </button>
                <button
                  v-if="authStore.isAuthenticated"
                  class="btn btn-fav"
                  :class="{ active: isFavorited }"
                  :disabled="favoriteLoading"
                  @click="handleToggleFavorite"
                >
                  <Heart class="fav-icon" :class="{ 'icon-filled': isFavorited }" />
                </button>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- Error -->
      <div v-else class="error-state">
        <p>{{ t('common.error') || '商品不存在' }}</p>
      </div>

      <!-- ════════════════ You May Also Like ════════════════ -->
      <RelatedProducts :products="relatedProducts" :loading="relatedLoading" />
    </div>
  </div>
</template>

<style scoped lang="scss">
// ============================================
// Product Detail — Premium Minimalist Dark
// Gradient: #6366f1 → #818cf8 · 16px radius · glassmorphism
// ============================================

$grad-start: #6366f1;
$grad-end: #818cf8;
$bg-page: #0a0a0f;
$bg-card-glass: rgba(30, 30, 46, 0.95);
$border-glass: rgba(255, 255, 255, 0.12);
$text-hi: #f4f4f8;
$text-mid: #a0a0b0;
$text-lo: #6b6b7b;
$radius: 16px;

// ── Animations ──
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

// ── Base ──
.product-detail {
  min-height: 100vh;
  background: transparent;
  padding: 0;
}

.container {
  position: relative;
  z-index: 1;
  max-width: 1280px;
  margin: 0 auto;
  padding: 32px 24px 80px;
}

.spinner {
  animation: spin 1s linear infinite;
  width: 28px;
  height: 28px;
  color: $grad-end;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 80px 0;
  color: $text-mid;
  font-size: 0.95rem;
}

.error-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
  color: $text-mid;
  font-size: 1.1rem;
}

// ════════════════════════════════════════════
// Layout — Two columns
// ════════════════════════════════════════════
.product-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  align-items: stretch; /* 兩欄拉滿同高 — gallery-col sticky 範圍涵蓋整條右欄 */
  animation: fadeUp 0.5s ease;
  min-width: 0;
  max-width: 100%;
}

/* Gallery 欄：grid item 拉滿欄高（align-self:stretch），內部 gallery sticky。
   sticky 範圍 = gallery-col 高度 = 右欄高度 → 圖片框滾動時全程跟貼 viewport 頂 */
.gallery-col {
  align-self: stretch;
  min-width: 0;
}

@media (max-width: 960px) {
  .product-layout {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  /* 手機單欄：gallery-col 唔再 stretch，gallery 已 static（組件內 960 media） */
  .gallery-col {
    align-self: auto;
  }
}

// ════════════════════════════════════════════
// Gallery (Left) — 已抽入 components/product/detail/ImageGallery.vue（T7 2026-09-21）
// ════════════════════════════════════════════

// ════════════════════════════════════════════
// Info — Glass Card (Right)
// ════════════════════════════════════════════
.info-wrap {
  display: flex;
  flex-direction: column;
  min-width: 0;
  max-width: 100%;
  overflow-wrap: break-word;
}

.glass-card {
  background: $bg-card-glass;
  border: 1px solid $border-glass;
  border-radius: $radius;
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
    border-radius: $radius $radius 0 0;
    pointer-events: none;
  }
}

// Title
.product-title {
  font-size: 1.9rem;
  font-weight: 800;
  color: $text-hi;
  line-height: 1.25;
  margin: 0;
  display: flex;
  align-items: center;
}
.product-title {
  gap: 12px;
  flex-wrap: wrap;
  letter-spacing: -0.02em;
}

.suspended-badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.7rem;
  font-weight: 700;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  padding: 3px 10px;
  border-radius: 100px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

// Spec table — 已抽入 components/product/detail/SpecTable.vue（T7 2026-09-21）

// Price
.price-block {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 4px 0;
}

.price-currency {
  font-size: 1rem;
  font-weight: 600;
  color: $text-lo;
  letter-spacing: 0.05em;
}

.price-amount {
  font-size: 2.6rem;
  font-weight: 800;
  background: linear-gradient(135deg, $grad-start, $grad-end);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -0.03em;
  line-height: 1;
}

// Description
.description-block {
  padding: 16px 0;
  border-top: 1px solid $border-glass;
}

.desc-heading {
  font-size: 0.8rem;
  font-weight: 700;
  color: $text-lo;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin: 0 0 10px 0;
}

.desc-text {
  font-size: 0.92rem;
  line-height: 1.7;
  color: $text-mid;
  margin: 0;
  white-space: pre-wrap;
}

// Quantity
.quantity-section {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.qty-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: $text-lo;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.qty-controls {
  display: flex;
  align-items: center;
  gap: 0;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid $border-glass;
  border-radius: 12px;
  overflow: hidden;
}

.qty-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: $text-hi;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: rgba(129, 140, 248, 0.15);
    color: $grad-end;
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
}

.qty-input {
  width: 60px;
  height: 44px;
  background: transparent;
  border: none;
  border-left: 1px solid $border-glass;
  border-right: 1px solid $border-glass;
  color: $text-hi;
  font-size: 1.05rem;
  font-weight: 700;
  text-align: center;
  -moz-appearance: textfield;

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  &:focus {
    outline: none;
    background: rgba(129, 140, 248, 0.08);
  }
}

.stock-info {
  font-size: 0.82rem;
  color: $text-lo;
  font-weight: 500;
}

.out-of-stock {
  font-size: 0.95rem;
  font-weight: 700;
  color: #ef4444;
  padding: 8px 0;
}

// Message
.action-message {
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 0.88rem;
  font-weight: 500;

  &.success {
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.25);
    color: #4ade80;
  }

  &.error {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.25);
    color: #f87171;
  }
}

.msg-fade-enter-active, .msg-fade-leave-active {
  transition: all 0.3s ease;
}
.msg-fade-enter-from, .msg-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

// Reservation box
.reservation-box {
  background: rgba(99, 102, 241, 0.06);
  border: 1px solid rgba(129, 140, 248, 0.2);
  border-radius: 12px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.res-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  font-weight: 700;
  color: $grad-end;
  letter-spacing: 0.02em;
}

.res-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.res-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
}

.res-label {
  color: $text-lo;
}

.res-value {
  color: $text-hi;
  font-weight: 600;
}

// Action buttons
.action-row {
  display: flex;
  gap: 10px;
  margin-top: 4px;
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

.already-reserved-notice {
  flex: 1;
  text-align: center;
  padding: 12px 16px;
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 8px;
  color: #4ade80;
  font-size: 14px;
  font-weight: 500;
}

.btn-primary {
  flex: 1;
  background: linear-gradient(135deg, $grad-start, $grad-end);
  color: white;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }
}

.btn-secondary {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  color: $text-hi;
  border: 1px solid $border-glass;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(129, 140, 248, 0.4);
    transform: translateY(-2px);
  }
}

.btn-fav {
  width: 52px;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid $border-glass;
  color: $text-mid;
  padding: 15px;

  &:hover:not(:disabled) {
    border-color: rgba(239, 68, 68, 0.4);
    color: #f87171;
    background: rgba(239, 68, 68, 0.08);
  }

  &.active {
    border-color: rgba(239, 68, 68, 0.5);
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
  }
}

.fav-icon {
  width: 20px;
  height: 20px;
  transition: all 0.25s ease;
}

.icon-filled {
  fill: #ef4444;
}

.btn-spinner {
  width: 18px;
  height: 18px;
  animation: spin 1s linear infinite;
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

// ════════════════════════════════════════════
// Related Products + Lightbox — 已抽入 components/product/detail/（T7 2026-09-21）
// ════════════════════════════════════════════

// ════════════════════════════════════════════
// Responsive
// ════════════════════════════════════════════
@media (max-width: 960px) {
  .container {
    padding: 20px 16px 60px;
  }

  .glass-card {
    padding: 28px 20px;
  }

  .product-title {
    font-size: 1.5rem;
  }

  .price-amount {
    font-size: 2.1rem;
  }

  .main-image {
    min-height: 340px;
  }

  .hero-img {
    max-height: 380px;
  }
}

@media (max-width: 640px) {
  .container {
    padding: 16px 12px 48px;
  }

  .product-layout {
    gap: 16px;
  }

  .glass-card {
    padding: 24px 16px;
    gap: 16px;
    overflow: visible;
  }

  .product-title {
    font-size: 1.3rem;
  }

  .price-amount {
    font-size: 1.8rem;
  }

  .main-image {
    min-height: 280px;
  }

  .hero-img {
    max-height: 300px;
  }

  .nav-btn {
    width: 36px;
    height: 36px;
    opacity: 1; // always visible on mobile
  }

  .nav-prev { left: 10px; }
  .nav-next { right: 10px; }

  .thumb {
    width: 60px;
    height: 60px;
  }

  .spec-row {
    grid-template-columns: 1fr 1fr;
  }

  .spec-cell + .spec-cell {
    border-left: 1px solid $border-glass;
    border-top: none;
  }

  .spec-cell-full {
    border-top: 1px solid $border-glass;
    border-left: none;
  }

  .spec-label {
    font-size: 0.68rem;
  }

  .spec-value {
    font-size: 0.85rem;
    word-break: break-word;
    overflow-wrap: break-word;
  }

  // Description always visible on mobile
  .description-block {
    display: block !important;
  }

  .desc-heading {
    font-size: 0.75rem;
  }

  .desc-text {
    font-size: 0.88rem;
    word-break: break-word;
    overflow-wrap: break-word;
  }

  .qty-btn {
    width: 40px;
    height: 40px;
  }

  .qty-input {
    width: 50px;
    height: 40px;
    font-size: 0.95rem;
  }

  .action-row {
    flex-direction: column;
    gap: 8px;
  }

  .btn {
    width: 100%;
    padding: 14px 20px;
  }

  .btn-fav {
    width: 100%;
    height: 48px;
  }

  .related-section {
    margin-top: 40px;
  }

  .related-title {
    font-size: 1.15rem;
  }

  .related-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .lb-nav {
    width: 42px;
    height: 42px;
  }

  .lb-prev { left: 12px; }
  .lb-next { right: 12px; }

  .lb-close {
    width: 40px;
    height: 40px;
    top: 14px;
    right: 14px;
  }

  .lb-counter {
    bottom: 48px;
    font-size: 0.78rem;
  }

  .lb-hint {
    font-size: 0.68rem;
  }
}
</style>