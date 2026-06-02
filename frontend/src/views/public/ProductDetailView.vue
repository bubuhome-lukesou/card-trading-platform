<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { Heart, Loader2 } from 'lucide-vue-next'
import { productApi } from '@/api/products'
import { cartApi } from '@/api/cart'
import { favoritesApi } from '@/api/favorites'
import { reservationApi } from '@/api/reservations'
import { useAuthStore } from '@/stores/auth'
import { tagApi } from '@/api/tags'
import ProductCard from '@/components/product/ProductCard.vue'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const loading = ref(true)
const product = ref<any>(null)
const currentImageIndex = ref(0)
const processing = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')
const selectedQuantity = ref(1)
const lightboxOpen = ref(false)
const isFavorited = ref(false)
const favoriteLoading = ref(false)
const relatedProducts = ref<any[]>([])
const relatedLoading = ref(false)
const allTags = ref<any[]>([])

// Touch/swipe state for mobile
const touchStartX = ref(0)
const touchEndX = ref(0)

// Category emoji & labels
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

const categoryColor = computed(() => {
  const info = categoryInfo.value[product.value?.category as keyof typeof categoryInfo.value]
  return info?.color || '#6366f1'
})

const conditionColor = computed(() => ({
  'S': '#22c55e',
  'A': '#84cc16',
  'B': '#eab308',
  'C': '#f97316',
  'D': '#ef4444'
} as Record<string, string>)[product.value?.condition as string] || '#6366f1')

// Get title based on locale
const getTitle = (product: any) => {
  return locale.value === 'zh' ? (product.titleZh || product.titleEn) : (product.titleEn || product.titleZh)
}

// Get description based on locale
const getDescription = (product: any) => {
  if (locale.value === 'zh') {
    return product.descriptionZh || product.descriptionEn || ''
  }
  return product.descriptionEn || product.descriptionZh || ''
}

// Get category info
const getCategoryInfo = (category: string) => {
  return categoryInfo.value[category as keyof typeof categoryInfo.value] || { emoji: '📦', zh: category, en: category }
}

// Get category label only
const getCategoryLabel = (category: string) => {
  const info = getCategoryInfo(category)
  return locale.value === 'zh' ? info.zh : info.en
}

// Get product type tag (from productTypeTagId)
const getProductTypeTag = (product: any) => {
  const tagId = (product as any).productTypeTagId
  if (!tagId) return null
  return allTags.value.find(t => t.id === tagId && (t.type === 'product_type' || t.type === 'PRODUCT_TYPE')) || null
}

// Get general tags
const getGeneralTags = (product: any) => {
  if (!product.tags) return []
  return product.tags.filter((tag: any) => tag.type !== 'product_type' && tag.type !== 'PRODUCT_TYPE')
}

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
        // Same productTypeTagId: +3
        if ((p as any).productTypeTagId === (product.value as any).productTypeTagId) score += 3
        // Same condition: +1
        if (p.condition === product.value.condition) score += 1
        // Same brand: +1
        if (p.brand && product.value.brand && p.brand === product.value.brand) score += 1
        // Same series: +1
        if (p.series && product.value.series && p.series === product.value.series) score += 1
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

// Check if favorited
const checkFavorite = async () => {
  if (!authStore.isAuthenticated || !product.value) return
  try {
    const res = await favoritesApi.check(product.value.id)
    isFavorited.value = res.data.isFavorite
  } catch (err) {
    // Ignore
  }
}

// Toggle favorite
const handleToggleFavorite = async () => {
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }
  if (favoriteLoading.value) return
  favoriteLoading.value = true
  try {
    if (isFavorited.value) {
      await favoritesApi.remove(product.value.id)
      isFavorited.value = false
    } else {
      await favoritesApi.add(product.value.id)
      isFavorited.value = true
    }
  } catch (err: any) {
    message.value = err?.response?.data?.message || (t('common.error') || '操作失敗')
    messageType.value = 'error'
  } finally {
    favoriteLoading.value = false
  }
}

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
    currentImageIndex.value = 0
    selectedQuantity.value = 1
    await checkFavorite()
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
  window.addEventListener('keydown', handleKeydown)
  await loadProduct()
})

const selectImage = (index: number) => {
  currentImageIndex.value = index
}

const openLightbox = () => {
  lightboxOpen.value = true
  document.body.style.overflow = 'hidden'
}

const closeLightbox = () => {
  lightboxOpen.value = false
  document.body.style.overflow = ''
}

const prevImage = () => {
  if (!product.value?.images?.length) return
  currentImageIndex.value = currentImageIndex.value > 0
    ? currentImageIndex.value - 1
    : product.value.images.length - 1
}

const nextImage = () => {
  if (!product.value?.images?.length) return
  currentImageIndex.value = currentImageIndex.value < product.value.images.length - 1
    ? currentImageIndex.value + 1
    : 0
}

// Touch handlers for mobile swipe
const onTouchStart = (e: TouchEvent) => {
  e.preventDefault()
  touchStartX.value = e.changedTouches[0].screenX
}

const onTouchEnd = (e: TouchEvent) => {
  e.preventDefault()
  touchEndX.value = e.changedTouches[0].screenX
  handleSwipe()
}

const handleSwipe = () => {
  if (!product.value?.images?.length || product.value.images.length <= 1) return
  const diff = touchStartX.value - touchEndX.value
  if (Math.abs(diff) > 50) {
    if (diff > 0) {
      nextImage()
    } else {
      prevImage()
    }
  }
}

// Keyboard navigation for lightbox
const handleKeydown = (e: KeyboardEvent) => {
  if (!lightboxOpen.value) return
  if (e.key === 'ArrowLeft') prevImage()
  if (e.key === 'ArrowRight') nextImage()
  if (e.key === 'Escape') closeLightbox()
}

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})

const isOutOfStock = () => {
  return product.value && (product.value.quantity === 0 || product.value.quantity === undefined)
}

const formatDate = (dateStr: string, showTime = false) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (showTime) {
    return d.toLocaleString('zh-TW', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  return d.toLocaleDateString('zh-TW', { year: 'numeric', month: 'numeric', day: 'numeric' })
}

const getMaxQuantity = () => {
  return product.value?.quantity ?? 1
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
    router.push('/login')
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
    router.push('/login')
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

// Handle reservation (for reservation_only listing type)
const handleReserve = async () => {
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }
  if (!product.value) return

  processing.value = true
  message.value = ''
  try {
    await reservationApi.createReservation({ productId: product.value.id })
    message.value = locale.value === 'zh' ? '預約成功！' : 'Reservation successful!'
    messageType.value = 'success'
    // Reload product to get updated reservation count
    await loadProduct()
  } catch (error: any) {
    message.value = error?.response?.data?.message || (t('common.error') || '操作失敗')
    messageType.value = 'error'
  } finally {
    processing.value = false
  }
}

// Check if reservation is still open (deadline not passed and spots available)
const isReservationOpen = computed(() => {
  if (!product.value || product.value.listingType !== 'reservation_only') return false
  if (product.value.reservationDeadline) {
    const deadline = new Date(product.value.reservationDeadline)
    if (new Date() > deadline) return false
  }
  if (product.value.reservationMax && product.value.reservationCount !== undefined) {
    if (product.value.reservationCount >= product.value.reservationMax) return false
  }
  return true
})

// Display text for reservation spots
const reservationDisplayText = computed(() => {
  if (!product.value) return ''
  const spots = product.value.reservationMax || 0
  const count = product.value.reservationCount || 0
  return `${count}/${spots}`
})

// Whether the current user has already made a reservation (simplified - always false for now)
const hasReserved = computed(() => false)
</script>

<template>
  <div class="product-detail">
    <div class="container">
      <div v-if="loading" class="loading-state">
        <Loader2 class="spinner" />
        <p>{{ t('common.loading') || '加載中...' }}</p>
      </div>
      <div v-else-if="product" class="product-layout">
        <!-- Images -->
        <div class="product-images">
          <!-- Vintage Card Display — no frame, just aged card presentation -->
          <div
            class="vintage-card"
            :style="{ '--cat-color': categoryColor }"
            @touchstart="onTouchStart"
            @touchend="onTouchEnd"
          >
            <!-- Category badge -->
            <div class="category-badge">
              <span class="cat-emoji">{{ getCategoryInfo(product.category).emoji }}</span>
              <span class="cat-name">{{ getCategoryLabel(product.category) }}</span>
            </div>

            <button v-if="product.images?.length > 1" class="nav-btn nav-prev" @click.stop="prevImage">‹</button>
            <img
              :src="product.images?.[currentImageIndex] || '/placeholder-card.png'"
              :alt="getTitle(product)"
              @click="openLightbox"
              style="cursor: zoom-in;"
            />
            <button v-if="product.images?.length > 1" class="nav-btn nav-next" @click.stop="nextImage">›</button>
            <div v-if="product.images?.length > 1" class="image-counter">{{ currentImageIndex + 1 }} / {{ product.images.length }}</div>
            <div class="zoom-hint">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
                <path d="M11 8v6M8 11h6"/>
              </svg>
              {{ locale === 'zh' ? '點擊放大' : 'Click to zoom' }}
            </div>
          </div>

          <div v-if="product.images?.length > 1" class="thumbnail-list">
            <img
              v-for="(img, idx) in product.images"
              :key="idx"
              :src="img"
              :alt="`${getTitle(product)} ${Number(idx) + 1}`"
              class="thumbnail"
              :class="{ active: idx === currentImageIndex }"
              @click="selectImage(Number(idx))"
            />
          </div>
        </div>

        <!-- Info -->
        <div class="product-info">
          <!-- 商品名稱 -->
          <h1 class="product-title">{{ getTitle(product) }}</h1>

          <!-- 類別emoji 類別名稱 . 商品種類 . 品相 -->
          <div class="product-meta-row">
            <span class="meta-emoji">{{ getCategoryInfo(product.category).emoji }}</span>
            <span class="meta-category">{{ getCategoryLabel(product.category) }}</span>
            <span class="meta-sep">·</span>
            <span v-if="getProductTypeTag(product)" class="meta-product-type">{{ getProductTypeTag(product).name }}</span>
            <span v-if="getProductTypeTag(product)" class="meta-sep">·</span>
            <span class="meta-condition">{{ product.condition }}</span>
          </div>

          <!-- 標簽 -->
          <div v-if="getGeneralTags(product).length > 0" class="product-tags">
            <span
              v-for="tag in getGeneralTags(product)"
              :key="tag.id"
              class="product-tag"
              :style="tag.color ? { backgroundColor: tag.color + '18', color: tag.color, borderColor: tag.color + '50' } : {}"
              @click="router.push({ path: '/marketplace', query: { search: tag.name } })"
            >
              <span class="tag-dot" :style="{ backgroundColor: tag.color || '#6366f1' }"></span>
              {{ tag.name }}
            </span>
          </div>

          <!-- 商品描述 -->
          <div v-if="getDescription(product)" class="product-description">
            <p>{{ getDescription(product) }}</p>
          </div>

          <!-- MOP 200 價格 -->
          <div class="price-section">
            <span class="price">MOP ${{ Number(product.price).toLocaleString() }}</span>
          </div>

          <!-- -數量+  庫存:x -->
          <div v-if="product.quantity > 0" class="quantity-row">
            <div class="qty-controls">
              <button class="qty-btn" @click="decreaseQuantity" :disabled="selectedQuantity <= 1">−</button>
              <input
                type="number"
                class="qty-input"
                v-model.number="selectedQuantity"
                :min="1"
                :max="getMaxQuantity()"
                @change="selectedQuantity = Math.max(1, Math.min(selectedQuantity, getMaxQuantity()))"
              />
              <button class="qty-btn" @click="increaseQuantity" :disabled="selectedQuantity >= getMaxQuantity()">+</button>
            </div>
            <span v-if="product.quantity !== undefined" class="stock-count">
              {{ locale === 'zh' ? '庫存:' : 'Stock:' }} {{ product.quantity }}
            </span>
          </div>
          <div v-else class="stock-count out-of-stock-text">
            {{ locale === 'zh' ? '已售罄' : 'Out of Stock' }}
          </div>

          <!-- Message -->
          <div v-if="message" class="action-message" :class="messageType">
            {{ message }}
          </div>

          <!-- 預約模式 UI -->
          <template v-if="product && product.listingType === 'reservation_only'">
            <div class="reservation-info">
              <div class="reservation-item">
                <span class="reservation-label">{{ locale === 'zh' ? '預約名額' : 'Spots' }}</span>
                <span class="reservation-value">{{ reservationDisplayText }}</span>
              </div>
              <div class="reservation-item" v-if="product.reservationDeposit">
                <span class="reservation-label">{{ locale === 'zh' ? '訂金' : 'Deposit' }}</span>
                <span class="reservation-value">MOP ${{ product.reservationDeposit }}</span>
              </div>
              <div class="reservation-item" v-if="product.reservationDeadline">
                <span class="reservation-label">{{ locale === 'zh' ? '截止報名' : 'Deadline' }}</span>
                <span class="reservation-value">{{ formatDate(product.reservationDeadline, true) }}</span>
              </div>
            </div>
            <div class="action-buttons">
              <button
                class="btn btn-primary btn-lg"
                :disabled="processing || !isReservationOpen"
                @click="handleReserve"
              >
                {{ processing ? (t('common.loading') || '處理中...') : (locale === 'zh' ? '立即預約' : 'Reserve Now') }}
              </button>
            </div>
          </template>

          <!-- 一般購買 UI -->
          <template v-else>
            <div class="action-buttons">
              <button
                class="btn btn-primary btn-lg"
                :disabled="processing || isOutOfStock()"
                @click="handleBuyNow"
              >
                {{ processing ? (t('common.loading') || '處理中...') : (locale === 'zh' ? '立即購買' : 'Buy Now') }}
              </button>
              <button
                class="btn btn-outline"
                :disabled="processing || isOutOfStock()"
                @click="handleAddToCart"
              >
                {{ locale === 'zh' ? '加到購物車' : 'Add to Cart' }}
              </button>
            </div>
          </template>

          <!-- 加到我的最愛 -->
          <button
            class="btn btn-favorite"
            :class="{ active: isFavorited }"
            :disabled="favoriteLoading"
            @click="handleToggleFavorite"
          >
            <Heart class="favorite-icon" :class="{ 'icon-filled': isFavorited }" />
            {{ favoriteLoading ? (t('common.loading') || '...') : (isFavorited ? (locale === 'zh' ? '已加入我的最愛' : 'Saved') : (locale === 'zh' ? '加到我的最愛' : 'Add to Favorites')) }}
          </button>
        </div>
      </div>
      <div v-else class="error-state">
        <p>{{ t('common.error') || '商品不存在' }}</p>
      </div>

      <!-- 你可能喜歡 -->
      <div v-if="!loading && relatedProducts.length > 0" class="related-section">
        <h2 class="related-title">{{ locale === 'zh' ? '你可能喜歡' : 'You May Also Like' }}</h2>
        <div v-if="relatedLoading" class="loading-state">
          <Loader2 class="spinner" />
        </div>
        <div v-else class="products-grid">
          <ProductCard
            v-for="p in relatedProducts"
            :key="p.id"
            :product="p"
          />
        </div>
      </div>
    </div>
  </div>

  <!-- Lightbox for image zoom -->
  <div v-if="lightboxOpen" class="lightbox" @click.self="closeLightbox">
    <button class="lightbox-close" @click="closeLightbox">✕</button>
    <button v-if="product.images?.length > 1" class="lightbox-nav lightbox-prev" @click.stop="prevImage">‹</button>
    <img :src="product.images?.[currentImageIndex]" :alt="getTitle(product)" class="lightbox-img" @click.stop />
    <button v-if="product.images?.length > 1" class="lightbox-nav lightbox-next" @click.stop="nextImage">›</button>
    <div v-if="product.images?.length > 1" class="lightbox-counter">{{ currentImageIndex + 1 }} / {{ product.images.length }}</div>
    <div class="lightbox-hint">{{ locale === 'zh' ? '按 ESC 關閉 · 左右鍵切換' : 'Press ESC to close · Arrow keys to navigate' }}</div>
  </div>
</template>

<style scoped lang="scss">
// ============================================
// Product Detail - Premium Background Design
// ============================================

.spinner {
  animation: spin 1s linear infinite;
  width: 24px;
  height: 24px;
  color: var(--primary);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px;
  color: var(--text-secondary);
}

// ════════════════════════════════════════════
// 🎴 Background Layer — immersive card theme
// ════════════════════════════════════════════
.product-detail {
  position: relative;
  min-height: 100vh;
  background: #0d0d1a;
}

.container {
  position: relative;
  z-index: 1;
}

// ════════════════════════════════════════════
// Product Layout — glassmorphism card
// ════════════════════════════════════════════
.product-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  padding: 32px 0;
  width: 100%;
  box-sizing: border-box;
}

@media (max-width: 900px) {
  .product-layout {
    grid-template-columns: 1fr;
    gap: 24px;
    padding: 0;
  }
}

// ════════════════════════════════════════════
// 🎴 Product Images — Vintage Card Style
// ════════════════════════════════════════════
.product-images {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  position: relative;
}

// Vintage card — clean display with no border
.vintage-card {
  position: relative;
  background: #0e0c0a;
  border-radius: 8px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;

  img {
    max-width: 100%;
    max-height: 520px;
    object-fit: contain;
    display: block;
    border-radius: 6px;
  }
}

// Floating category badge — vintage leather tag style
.category-badge {
  position: absolute;
  top: 24px;
  left: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #3d2b1f 0%, #2a1f16 100%);
  border: 1px solid rgba(210,180,140,0.3);
  border-radius: 8px;
  padding: 8px 14px 8px 10px;
  z-index: 10;
  box-shadow:
    0 2px 8px rgba(0,0,0,0.5),
    inset 0 1px 0 rgba(255,255,255,0.08);
  backdrop-filter: blur(8px);

  .cat-emoji {
    font-size: 1.3rem;
    line-height: 1;
    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));
  }

  .cat-name {
    font-size: 0.78rem;
    font-weight: 600;
    color: #d4b896;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
}

.zoom-hint {
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(0, 0, 0, 0.6);
  color: rgba(255, 255, 255, 0.8);
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
}

@media (max-width: 640px) {
  .zoom-hint { display: none; }
  .category-badge { top: 16px; left: 16px; }
  .vintage-card { padding: 14px; }
  .vintage-card img { max-height: 320px; }
}

.nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(61,43,31,0.9) 0%, rgba(42,31,22,0.9) 100%);
  color: #d4b896;
  border: 1px solid rgba(210,180,140,0.2);
  font-size: 24px;
  cursor: pointer;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: linear-gradient(135deg, rgba(80,60,40,0.95) 0%, rgba(60,45,30,0.95) 100%);
    border-color: rgba(210,180,140,0.4);
  }
}

.nav-prev { left: 12px; }
.nav-next { right: 12px; }

.image-counter {
  position: absolute;
  bottom: 48px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(42,31,22,0.85);
  color: #d4b896;
  padding: 4px 14px;
  border-radius: 20px;
  font-size: 12px;
  border: 1px solid rgba(210,180,140,0.15);
}

.thumbnail-list {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 4px;
  scrollbar-width: thin;
  scrollbar-color: rgba(210,180,140,0.2) transparent;
}

.thumbnail {
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: 6px;
  border: 2px solid rgba(210,180,140,0.15);
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
}

.thumbnail:hover {
  opacity: 0.8;
  transform: translateY(-2px);
  border-color: rgba(210,180,140,0.3);
}

.thumbnail.active {
  border-color: #d4b896;
  box-shadow: 0 0 12px rgba(212,184,150,0.4);
}

.product-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.product-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.3;
  position: relative;
}

// Anime card info strip
.product-meta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  font-size: 0.85rem;
}

.meta-emoji {
  font-size: 1.2rem;
  filter: drop-shadow(0 0 4px rgba(255,255,255,0.3));
}

.meta-category {
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.01em;
}

.meta-sep {
  color: var(--text-secondary);
  opacity: 0.4;
  font-size: 0.75rem;
}

.meta-product-type {
  font-weight: 700;
  color: var(--primary);
}

.meta-condition {
  color: var(--text-secondary);
  font-size: 0.8rem;
}

/* 標簽 — anime badge style */
.product-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.product-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-full);
  font-size: 0.8rem;
  border: 1px solid;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
  letter-spacing: 0.02em;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    opacity: 0.9;
  }
}

.tag-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

// ════════════════════════════════════════════
// 💰 Price Section — Vintage Gold Bar Style
// ════════════════════════════════════════════
.price-section {
  display: flex;
  align-items: baseline;
  gap: 8px;
  background: transparent !important;
  padding: 0;
  border-radius: 0;
  border: none;
  box-shadow: none;
}

.price {
  font-size: 2.1rem;
  font-weight: 800;
  color: #d4b896;
  text-shadow: 0 0 20px rgba(212,184,150,0.3);
  position: relative;
  z-index: 1;
  letter-spacing: -0.01em;
}

.price-unit {
  font-size: 0.9rem;
  color: #8a7a6a;
  font-weight: 500;
  position: relative;
  z-index: 1;
}

/* 商品描述 */
.product-description {
  padding: 16px 0;
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border);
}

.product-description p {
  margin: 0;
  white-space: pre-wrap;
}

/* MOP 200 價格 */

/* 數量 + 庫存 row */
.quantity-row {
  display: flex;
  align-items: center;
  gap: 20px;
}

.qty-controls {
  display: flex;
  flex-direction: row;
  gap: 25px;
  align-items: center;
}

.qty-btn {
  width: 52px;
  height: 52px;
  font-size: 24px;
  line-height: 1;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
}

.qty-input {
  width: 140px;
  height: 52px;
  padding: 0 16px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: var(--text-lg);
  text-align: center;
  font-family: var(--font-num);
}

.qty-input:focus {
  outline: none;
  border-color: var(--primary);
}

.stock-count {
  color: var(--text-secondary);
  font-size: var(--text-base);
}

.out-of-stock-text {
  color: var(--danger);
  font-weight: 600;
}

/* Reservation info */
.reservation-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  margin: 16px 0;
}

.reservation-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
}

.reservation-label {
  color: var(--text-secondary);
}

.reservation-value {
  color: var(--text-primary);
  font-weight: 600;
}

/* Action buttons */
.action-buttons {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.btn {
  flex: 1;
  padding: 16px 24px;
  font-size: 1rem;
  font-weight: 600;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover:not(:disabled) { background: var(--primary-dark); }

.btn-outline {
  background: transparent;
  color: var(--primary);
  border: 2px solid var(--primary);
}

.btn-outline:hover:not(:disabled) { background: var(--primary-light); }

.btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* 加到我的最愛按鈕 */
.btn-favorite {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: 1;
  padding: 14px 24px;
  font-size: 0.95rem;
  font-weight: 600;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all 0.2s;
  background: transparent;
  color: var(--text-secondary);
  border: 2px solid var(--border);
}

.btn-favorite:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}

.btn-favorite.active {
  border-color: var(--accent);
  color: var(--accent);
  background: rgba(239, 68, 68, 0.08);
}

.btn-favorite .favorite-icon {
  width: 18px;
  height: 18px;
  transition: all 0.2s;
}

.btn-favorite .icon-filled {
  fill: var(--accent);
}

/* Message */
.action-message {
  padding: 12px 16px;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  margin: 8px 0;
}

.action-message.success {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.action-message.error {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

/* 你可能喜歡 */
.related-section {
  padding: 40px 0 24px;
}

.related-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 20px;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}

/* Lightbox */
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.lightbox-img {
  max-width: 90vw;
  max-height: 85vh;
  object-fit: contain;
  border-radius: var(--radius-md);
}

.lightbox-close {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255,255,255,0.15);
  border: none;
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.lightbox-close:hover { background: rgba(255,255,255,0.3); }

.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(255,255,255,0.15);
  border: none;
  color: #fff;
  font-size: 28px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.lightbox-nav:hover { background: rgba(255,255,255,0.3); }
.lightbox-prev { left: 20px; }
.lightbox-next { right: 20px; }

.lightbox-counter {
  position: absolute;
  bottom: 50px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.6);
  color: #fff;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 14px;
}

.lightbox-hint {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255,255,255,0.5);
  font-size: 12px;
}

@media (max-width: 640px) {
  .nav-btn {
    width: 32px;
    height: 32px;
    font-size: 18px;
  }

  .main-image img { max-height: 280px; }

  .product-title {
    font-size: 1.3rem;
  }

  .product-meta-row {
    font-size: 0.8rem;
    gap: 6px;
  }

  .meta-emoji { font-size: 1rem; }
  .meta-category { font-weight: 600; }

  .product-tags {
    gap: 6px;
  }

  .product-tag {
    padding: 4px 10px;
    font-size: 0.8rem;
  }

  .product-description {
    font-size: 0.88rem;
    padding: 12px 0;
  }

  .price-section { gap: 8px; }

  .price {
    font-size: 1.5rem;
  }

  .quantity-row {
    flex-direction: row;
    align-items: center;
    gap: 16px;
  }

  .qty-controls {
    gap: 16px;
  }

  .qty-btn {
    width: 44px;
    height: 44px;
    font-size: 20px;
  }

  .qty-input {
    width: 100px;
    height: 44px;
    font-size: var(--text-base);
  }

  .stock-count {
    font-size: var(--text-base);
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
  }

  .action-buttons { flex-direction: column; }

  .btn {
    width: 100%;
    padding: 14px 20px;
    font-size: 0.95rem;
  }

  .btn-favorite {
    width: 100%;
    padding: 12px 20px;
    font-size: 0.9rem;
  }

  .related-section {
    padding: 24px 0 16px;
  }

  .related-title {
    font-size: 1.1rem;
    margin-bottom: 14px;
  }

  .products-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .lightbox-nav {
    width: 40px;
    height: 40px;
    font-size: 22px;
  }

  .lightbox-prev { left: 10px; }
  .lightbox-next { right: 10px; }

  .lightbox-close {
    width: 36px;
    height: 36px;
    top: 12px;
    right: 12px;
  }

  .product-detail {
    max-width: 100% !important;
    width: 100% !important;
    overflow-x: hidden !important;
    box-sizing: border-box;
    padding-left: 0;
    padding-right: 0;
  }

  .container {
    max-width: 100% !important;
    margin: 0 !important;
    padding-left: 16px !important;
    padding-right: 16px !important;
    overflow: hidden !important;
    box-sizing: border-box;
    width: 100% !important;
  }

  .product-layout {
    padding-left: 0;
    padding-right: 0;
    width: 100% !important;
    box-sizing: border-box;
    overflow: hidden !important;
  }

  .product-images {
    width: 100% !important;
    max-width: 100% !important;
    overflow: hidden !important;
    box-sizing: border-box;
  }

  .main-image {
    width: 100% !important;
    max-width: 100% !important;
    overflow: hidden !important;
    box-sizing: border-box;
  }

  .main-image img {
    width: 100% !important;
    max-width: 100% !important;
    height: auto;
  }
}
</style>