<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { Heart, Loader2 } from 'lucide-vue-next'
import { productApi } from '@/api/products'
import { cartApi } from '@/api/cart'
import { favoritesApi } from '@/api/favorites'
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
const imageLoaded = ref(false)

// Watch route changes to refetch product when ID changes
watch(
  () => route.params.id as string,
  async (newId, oldId) => {
    if (newId && newId !== oldId) {
      loading.value = true
      product.value = null
      currentImageIndex.value = 0
      imageLoaded.value = false
      try {
        const [productRes, tagsRes] = await Promise.all([
          productApi.getProduct(newId),
          tagApi.getTags()
        ])
        product.value = productRes.data
        allTags.value = tagsRes.data || []
        await checkFavorite()
        await fetchRelatedProducts()
      } catch (error) {
        console.error('Failed to load product:', error)
      } finally {
        loading.value = false
      }
    }
  }
)

// Touch/swipe state for mobile
const touchStartX = ref(0)
const touchEndX = ref(0)

// Category emoji & labels
const categoryInfo = computed(() => ({
  pokemon: { emoji: '🎮', zh: '寶可夢', en: 'Pokemon' },
  yugioh: { emoji: '⚡', zh: '遊戲王', en: 'Yu-Gi-Oh!' },
  mtg: { emoji: '🧙', zh: '萬智牌', en: 'Magic: The Gathering' },
  ultraman: { emoji: '👾', zh: '奧特曼', en: 'Ultraman' },
  onepiece: { emoji: '🏴‍☠️', zh: '海賊王', en: 'One Piece' },
  doraemon: { emoji: '🤖', zh: '哆啦A夢', en: 'Doraemon' },
  sports: { emoji: '⚽', zh: '體育卡', en: 'Sports Cards' },
  other: { emoji: '📦', zh: '其他', en: 'Other' }
}))

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
    const res = await productApi.getProducts({
      category: product.value.category,
      limit: 20,
      sortBy: 'newest'
    })
    const matches = (res.data.data || [])
      .filter((p: any) => p.id !== product.value.id && p.quantity > 0)
      .map((p: any) => {
        let score = 0
        if (p.category === product.value.category) score += 1
        if ((p as any).productTypeTagId === (product.value as any).productTypeTagId) score += 3
        if (p.condition === product.value.condition) score += 1
        if (p.brand && product.value.brand && p.brand === product.value.brand) score += 1
        if (p.series && product.value.series && p.series === product.value.series) score += 1
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

onMounted(async () => {
  try {
    const [productRes, tagsRes] = await Promise.all([
      productApi.getProduct(route.params.id as string),
      tagApi.getTags()
    ])
    product.value = productRes.data
    allTags.value = tagsRes.data || []
    currentImageIndex.value = 0
    await checkFavorite()
    await fetchRelatedProducts()
  } catch (error) {
    console.error('Failed to load product:', error)
  } finally {
    loading.value = false
  }
})

const onImageLoad = () => {
  imageLoaded.value = true
}

const selectImage = (index: number) => {
  imageLoaded.value = false
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

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})

const isOutOfStock = () => {
  return product.value && (product.value.quantity === 0 || product.value.quantity === undefined)
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
</script>

<template>
  <div class="product-detail">
    <!-- Background animated orbs -->
    <div class="bg-orbs" aria-hidden="true">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
    </div>

    <div class="container">
      <div v-if="loading" class="loading-state">
        <div class="loading-card">
          <Loader2 class="spinner" />
          <p>{{ t('common.loading') || '加載中...' }}</p>
        </div>
      </div>
      <div v-else-if="product" class="product-layout">
        <!-- Images -->
        <div class="product-images">
          <!-- Main image with glow effect -->
          <div class="main-image-wrap" :class="{ loaded: imageLoaded }">
            <div class="image-glow" aria-hidden="true"></div>
            <div
              class="main-image"
              @touchstart="onTouchStart"
              @touchend="onTouchEnd"
            >
              <div class="image-shimmer" aria-hidden="true"></div>
              <img
                :src="product.images?.[currentImageIndex] || '/placeholder-card.png'"
                :alt="getTitle(product)"
                @click="openLightbox"
                @load="onImageLoad"
                class="main-img"
                :class="{ visible: imageLoaded }"
              />
              <div class="image-glow-overlay" aria-hidden="true"></div>
            </div>
            <button v-if="product.images?.length > 1" class="nav-btn nav-prev" @click.stop="prevImage">‹</button>
            <button v-if="product.images?.length > 1" class="nav-btn nav-next" @click.stop="nextImage">›</button>
            <div v-if="product.images?.length > 1" class="image-counter">{{ currentImageIndex + 1 }} / {{ product.images.length }}</div>
            <div class="zoom-hint">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
                <path d="M11 8v6M8 11h6"/>
              </svg>
              {{ locale === 'zh' ? '點擊放大' : 'Click to zoom' }}
            </div>
          </div>

          <!-- Thumbnails -->
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
          <!-- 商品名稱 - with glow entrance -->
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

          <!-- MOP 200 價格 - with animated glow -->
          <div class="price-section">
            <div class="price-glow" aria-hidden="true"></div>
            <span class="price">MOP ${{ Number(product.price).toLocaleString() }}</span>
          </div>

          <!-- -數量+  庫存:x -->
          <div v-if="product.quantity > 0" class="quantity-row">
            <div class="qty-controls">
              <button class="qty-btn" @click="decreaseQuantity" :disabled="selectedQuantity <= 1">
                <span class="qty-btn-inner">−</span>
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
                <span class="qty-btn-inner">+</span>
              </button>
            </div>
            <span v-if="product.quantity !== undefined" class="stock-count">
              <span class="stock-icon">📦</span>
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

          <!-- 立即購買 + 加到購物車 -->
          <div class="action-buttons">
            <button
              class="btn btn-buy"
              :class="{ processing }"
              :disabled="processing || isOutOfStock()"
              @click="handleBuyNow"
            >
              <span class="btn-shine" aria-hidden="true"></span>
              {{ processing ? (t('common.loading') || '處理中...') : (locale === 'zh' ? '⚡ 立即購買' : '⚡ Buy Now') }}
            </button>
            <button
              class="btn btn-cart"
              :disabled="processing || isOutOfStock()"
              @click="handleAddToCart"
            >
              {{ locale === 'zh' ? '🛒 加到購物車' : '🛒 Add to Cart' }}
            </button>
          </div>

          <!-- 加到我的最愛 -->
          <button
            class="btn btn-favorite"
            :class="{ active: isFavorited }"
            :disabled="favoriteLoading"
            @click="handleToggleFavorite"
          >
            <Heart class="favorite-icon" :class="{ 'icon-filled': isFavorited, 'pulse': isFavorited }" />
            {{ favoriteLoading ? (t('common.loading') || '...') : (isFavorited ? (locale === 'zh' ? '✨ 已加入我的最愛' : '✨ Saved') : (locale === 'zh' ? '♡ 加到我的最愛' : '♡ Add to Favorites')) }}
          </button>
        </div>
      </div>
      <div v-else class="error-state">
        <p>{{ t('common.error') || '商品不存在' }}</p>
      </div>

      <!-- 你可能喜歡 -->
      <div v-if="!loading && relatedProducts.length > 0" class="related-section">
        <div class="related-header">
          <div class="related-title-wrap">
            <span class="related-star" aria-hidden="true">✨</span>
            <h2 class="related-title">{{ locale === 'zh' ? '你可能喜歡' : 'You May Also Like' }}</h2>
            <span class="related-star" aria-hidden="true">✨</span>
          </div>
          <div class="related-title-line" aria-hidden="true"></div>
        </div>
        <div v-if="relatedLoading" class="loading-state">
          <Loader2 class="spinner" />
        </div>
        <div v-else class="products-grid">
          <ProductCard
            v-for="(p, idx) in relatedProducts"
            :key="p.id"
            :product="p"
            :style="{ animationDelay: `${idx * 80}ms` }"
            class="related-card"
          />
        </div>
      </div>
    </div>
  </div>

  <!-- Lightbox -->
  <div v-if="lightboxOpen" class="lightbox" @click.self="closeLightbox">
    <div class="lightbox-bg" aria-hidden="true"></div>
    <button class="lightbox-close" @click="closeLightbox">✕</button>
    <button v-if="product.images?.length > 1" class="lightbox-nav lightbox-prev" @click.stop="prevImage">‹</button>
    <div class="lightbox-image-wrap">
      <img :src="product.images?.[currentImageIndex]" :alt="getTitle(product)" class="lightbox-img" @click.stop />
    </div>
    <button v-if="product.images?.length > 1" class="lightbox-nav lightbox-next" @click.stop="nextImage">›</button>
    <div v-if="product.images?.length > 1" class="lightbox-counter">{{ currentImageIndex + 1 }} / {{ product.images.length }}</div>
    <div class="lightbox-hint">{{ locale === 'zh' ? '按 ESC 關閉 · 左右鍵切換' : 'Press ESC to close · Arrow keys to navigate' }}</div>
  </div>
</template>

<style scoped lang="scss">
// ===== Variables =====
$primary-glow: rgba(139, 92, 246, 0.6);
$accent-glow: rgba(236, 72, 153, 0.5);
$cyan-glow: rgba(34, 211, 238, 0.5);
$gold-glow: rgba(251, 191, 36, 0.5);

// ===== Spinner =====
.spinner {
  animation: spin 1s linear infinite;
  width: 28px;
  height: 28px;
  color: var(--primary);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

// ===== Background Orbs =====
.bg-orbs {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.15;
  animation: float-orb 12s ease-in-out infinite;
}

.orb-1 {
  width: 500px;
  height: 500px;
  background: #8b5cf6;
  top: -150px;
  right: -100px;
  animation-delay: 0s;
}

.orb-2 {
  width: 400px;
  height: 400px;
  background: #ec4899;
  bottom: -100px;
  left: -150px;
  animation-delay: -4s;
}

.orb-3 {
  width: 350px;
  height: 350px;
  background: #22d3ee;
  top: 40%;
  left: 30%;
  animation-delay: -8s;
}

@keyframes float-orb {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -30px) scale(1.05); }
  66% { transform: translate(-20px, 20px) scale(0.95); }
}

// ===== Loading State =====
.loading-state {
  display: flex;
  justify-content: center;
  padding: 80px 0;
}

.loading-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: var(--text-secondary);
  font-size: 1rem;
}

// ===== Product Layout =====
.product-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  padding: 24px 0 40px;
  width: 100%;
  box-sizing: border-box;
  position: relative;
  z-index: 1;
  animation: fadeSlideUp 0.5s ease-out;
}

@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 900px) {
  .product-layout {
    grid-template-columns: 1fr;
    gap: 24px;
  }
}

// ===== Product Images =====
.product-images {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.main-image-wrap {
  position: relative;
  opacity: 0;
  transition: opacity 0.4s ease;

  &.loaded {
    opacity: 1;
  }
}

.image-glow {
  position: absolute;
  inset: -20px;
  background: radial-gradient(ellipse at center, rgba(139, 92, 246, 0.2) 0%, transparent 70%);
  border-radius: 24px;
  z-index: -1;
  pointer-events: none;
}

.main-image {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-xl);
  background: var(--bg-dark);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  cursor: zoom-in;

  // Card back pattern
  background-image:
    repeating-linear-gradient(
      45deg,
      transparent,
      transparent 10px,
      rgba(139, 92, 246, 0.06) 10px,
      rgba(139, 92, 246, 0.06) 20px
    ),
    repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 10px,
      rgba(236, 72, 153, 0.04) 10px,
      rgba(236, 72, 153, 0.04) 20px
    );
  background-color: var(--bg-dark);
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow:
      0 20px 60px rgba(139, 92, 246, 0.3),
      0 0 40px rgba(139, 92, 246, 0.15);
  }

  &:hover .image-shimmer {
    opacity: 1;
  }
}

.image-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    110deg,
    transparent 25%,
    rgba(255, 255, 255, 0.05) 50%,
    transparent 75%
  );
  background-size: 200% 100%;
  animation: shimmer 3s infinite;
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
  z-index: 2;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.image-glow-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, transparent 50%, rgba(0, 0, 0, 0.3) 100%);
  pointer-events: none;
  z-index: 1;
}

.main-img {
  position: relative;
  z-index: 1;
  max-width: 100%;
  max-height: 480px;
  object-fit: contain;
  opacity: 0;
  transition: opacity 0.5s ease, transform 0.3s ease;

  &.visible {
    opacity: 1;
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
  backdrop-filter: blur(8px);
  color: rgba(255, 255, 255, 0.8);
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  z-index: 3;
  transition: opacity 0.2s;
}

.main-image:hover .zoom-hint {
  opacity: 0;
}

@media (max-width: 640px) {
  .zoom-hint { display: none; }
}

// ===== Nav Buttons =====
.nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  font-size: 24px;
  cursor: pointer;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: var(--primary);
    border-color: var(--primary);
    transform: translateY(-50%) scale(1.1);
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.5);
  }
}

.nav-prev { left: 12px; }
.nav-next { right: 12px; }

.image-counter {
  position: absolute;
  bottom: 48px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  color: white;
  padding: 4px 14px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  z-index: 3;
}

// ===== Thumbnails =====
.thumbnail-list {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 4px;
}

.thumbnail {
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: var(--radius-md);
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.25s ease;
  flex-shrink: 0;

  &:hover {
    border-color: rgba(139, 92, 246, 0.5);
    transform: scale(1.05);
    box-shadow: 0 4px 16px rgba(139, 92, 246, 0.3);
  }

  &.active {
    border-color: var(--primary);
    box-shadow: 0 0 16px rgba(139, 92, 246, 0.4);
  }
}

// ===== Product Info =====
.product-info {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

// ===== Product Title =====
.product-title {
  font-size: 2rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.3;
  text-shadow: 0 0 30px rgba(139, 92, 246, 0.3);
  animation: titleEntrance 0.6s ease-out;
}

@keyframes titleEntrance {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

// ===== Meta Row =====
.product-meta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: var(--text-secondary);
  animation: fadeSlideUp 0.5s ease-out 0.1s both;
}

.meta-emoji {
  font-size: 1.2rem;
  filter: drop-shadow(0 0 4px currentColor);
}

.meta-category {
  font-weight: 600;
  color: var(--text-primary);
}

.meta-sep {
  color: var(--text-secondary);
  opacity: 0.5;
}

.meta-product-type {
  font-weight: 600;
  color: var(--primary);
  background: rgba(139, 92, 246, 0.12);
  padding: 2px 10px;
  border-radius: var(--radius-full);
  border: 1px solid rgba(139, 92, 246, 0.3);
}

.meta-condition {
  color: var(--text-secondary);
}

// ===== Tags =====
.product-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  animation: fadeSlideUp 0.5s ease-out 0.15s both;
}

.product-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-full);
  font-size: 0.85rem;
  border: 1px solid;
  cursor: pointer;
  transition: all 0.2s;
  animation: tagPop 0.3s ease-out both;

  &:hover {
    transform: scale(1.08);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  }
}

@keyframes tagPop {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
}

.tag-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

// ===== Description =====
.product-description {
  padding: 16px 0;
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border);
  animation: fadeSlideUp 0.5s ease-out 0.2s both;
}

.product-description p {
  margin: 0;
  white-space: pre-wrap;
}

// ===== Price Section =====
.price-section {
  position: relative;
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
  animation: fadeSlideUp 0.5s ease-out 0.25s both;
}

.price-glow {
  position: absolute;
  inset: -10px -20px;
  background: radial-gradient(ellipse at left, rgba(251, 191, 36, 0.15) 0%, transparent 60%);
  pointer-events: none;
  border-radius: var(--radius-lg);
}

.price {
  font-size: 2.25rem;
  font-weight: 800;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 50%, #fbbf24 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 0 12px rgba(251, 191, 36, 0.4));
  animation: priceGlow 3s ease-in-out infinite;
  font-family: var(--font-num);
}

@keyframes priceGlow {
  0%, 100% { filter: drop-shadow(0 0 12px rgba(251, 191, 36, 0.4)); }
  50% { filter: drop-shadow(0 0 24px rgba(251, 191, 36, 0.7)); }
}

// ===== Quantity Row =====
.quantity-row {
  display: flex;
  align-items: center;
  gap: 20px;
  animation: fadeSlideUp 0.5s ease-out 0.3s both;
}

.qty-controls {
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
}

.qty-btn {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  border: 2px solid var(--border);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;

  &:hover:not(:disabled) {
    border-color: var(--primary);
    background: rgba(139, 92, 246, 0.1);
    transform: scale(1.05);
    box-shadow: 0 0 16px rgba(139, 92, 246, 0.3);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .qty-btn-inner {
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1;
  }
}

.qty-input {
  width: 80px;
  height: 48px;
  padding: 0 8px;
  background: var(--bg-elevated);
  border: 2px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 1.1rem;
  text-align: center;
  font-family: var(--font-num);
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 16px rgba(139, 92, 246, 0.2);
  }
}

.stock-count {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
  font-size: var(--text-base);
  font-weight: 500;

  .stock-icon {
    font-size: 1rem;
  }
}

.out-of-stock-text {
  color: var(--danger);
  font-weight: 700;
  font-size: 1rem;
}

// ===== Message =====
.action-message {
  padding: 12px 16px;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  margin: 4px 0;
  animation: popIn 0.3s ease-out;
}

@keyframes popIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

.action-message.success {
  background: rgba(34, 197, 94, 0.12);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.action-message.error {
  background: rgba(239, 68, 68, 0.12);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

// ===== Action Buttons =====
.action-buttons {
  display: flex;
  gap: 12px;
  margin-top: 4px;
  animation: fadeSlideUp 0.5s ease-out 0.35s both;
}

.btn {
  flex: 1;
  padding: 16px 24px;
  font-size: 1rem;
  font-weight: 700;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all 0.25s ease;
  border: none;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-buy {
  background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
  color: white;
  box-shadow:
    0 4px 16px rgba(139, 92, 246, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow:
      0 8px 30px rgba(139, 92, 246, 0.6),
      0 0 40px rgba(139, 92, 246, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.processing {
    background: linear-gradient(135deg, #6b7280 0%, #9ca3af 100%);
    box-shadow: none;
  }
}

.btn-shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.2),
    transparent
  );
  animation: btnShine 3s infinite;

  .btn-buy:hover & {
    animation-duration: 1.5s;
  }
}

@keyframes btnShine {
  0% { left: -100%; }
  50%, 100% { left: 100%; }
}

.btn-cart {
  background: transparent;
  color: var(--primary);
  border: 2px solid var(--primary);
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.15);

  &:hover:not(:disabled) {
    background: rgba(139, 92, 246, 0.08);
    transform: translateY(-2px);
    box-shadow:
      0 6px 20px rgba(139, 92, 246, 0.25),
      inset 0 0 20px rgba(139, 92, 246, 0.05);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

// ===== Favorite Button =====
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
  transition: all 0.25s ease;
  background: transparent;
  color: var(--text-secondary);
  border: 2px solid var(--border);
  animation: fadeSlideUp 0.5s ease-out 0.4s both;

  &:hover:not(:disabled) {
    border-color: #ec4899;
    color: #ec4899;
    background: rgba(236, 72, 153, 0.06);
    transform: translateY(-2px);
  }

  &.active {
    border-color: #ec4899;
    color: #ec4899;
    background: rgba(236, 72, 153, 0.08);
    box-shadow: 0 4px 20px rgba(236, 72, 153, 0.2);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .favorite-icon {
    width: 18px;
    height: 18px;
    transition: all 0.3s ease;
  }

  .icon-filled {
    fill: #ec4899;
    filter: drop-shadow(0 0 6px rgba(236, 72, 153, 0.6));
  }

  .pulse {
    animation: heartPulse 1.5s ease-in-out infinite;
  }
}

@keyframes heartPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

// ===== Related Section =====
.related-section {
  padding: 40px 0 24px;
  position: relative;
  z-index: 1;
}

.related-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.related-title-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.related-star {
  font-size: 1.5rem;
  animation: starSparkle 2s ease-in-out infinite;
  filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.6));

  &:nth-child(3) {
    animation-delay: -1s;
  }
}

@keyframes starSparkle {
  0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
  50% { transform: scale(1.2) rotate(10deg); opacity: 0.8; }
}

.related-title {
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--text-primary);
  text-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
}

.related-title-line {
  flex: 1;
  height: 2px;
  background: linear-gradient(
    90deg,
    rgba(139, 92, 246, 0.4) 0%,
    transparent 100%
  );
  border-radius: 1px;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}

.related-card {
  animation: cardEntrance 0.5s ease-out both;
}

@keyframes cardEntrance {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

// ===== Lightbox =====
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.25s ease;
}

.lightbox-bg {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(4px);
}

.lightbox-image-wrap {
  position: relative;
  z-index: 1;
  max-width: 85vw;
  max-height: 85vh;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: zoomIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes zoomIn {
  from { transform: scale(0.85); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.lightbox-img {
  max-width: 85vw;
  max-height: 85vh;
  object-fit: contain;
  border-radius: var(--radius-lg);
  box-shadow:
    0 0 60px rgba(139, 92, 246, 0.3),
    0 0 120px rgba(139, 92, 246, 0.15);
}

.lightbox-close {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 10;

  &:hover {
    background: rgba(255, 255, 255, 0.25);
    transform: scale(1.1) rotate(90deg);
  }
}

.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 28px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 10;

  &:hover {
    background: var(--primary);
    border-color: var(--primary);
    transform: translateY(-50%) scale(1.1);
    box-shadow: 0 0 30px rgba(139, 92, 246, 0.5);
  }
}

.lightbox-prev { left: 20px; }
.lightbox-next { right: 20px; }

.lightbox-counter {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  color: #fff;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 14px;
  z-index: 10;
}

.lightbox-hint {
  position: absolute;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
  z-index: 10;
}

// ===== Mobile Responsive =====
@media (max-width: 640px) {
  .product-layout {
    animation: none;
    padding: 16px 0 24px;
  }

  .product-title {
    font-size: 1.4rem;
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

  .price {
    font-size: 1.6rem;
  }

  .quantity-row {
    flex-direction: row;
    align-items: center;
    gap: 16px;
  }

  .qty-controls {
    gap: 10px;
  }

  .qty-btn {
    width: 44px;
    height: 44px;
  }

  .qty-input {
    width: 70px;
    height: 44px;
    font-size: 1rem;
  }

  .stock-count {
    font-size: 0.9rem;
  }

  .action-buttons {
    flex-direction: column;
  }

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