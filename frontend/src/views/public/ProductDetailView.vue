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
import ProductCard from '@/components/product/ProductCard.vue'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const favoritesStore = useFavoritesStore()

const loading = ref(true)
const product = ref<any>(null)
const currentImageIndex = ref(0)
const processing = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')
const selectedQuantity = ref(1)
const lightboxOpen = ref(false)
// P2: Use favoritesStore for sync across pages
const isFavorited = computed(() => favoritesStore.isFavorited(product.value?.id || ''))
const favoriteLoading = ref(false)

// Load favorites on mount
const loadFavorites = async () => {
  if (authStore.isAuthenticated) {
    await favoritesStore.loadFavorites()
  }
}

// Toggle favorite via store
const handleToggleFavorite = async () => {
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }
  if (favoriteLoading.value) return
  favoriteLoading.value = true
  await favoritesStore.toggleFavorite(product.value.id)
  favoriteLoading.value = false
}
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

// Language display mapping
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
    currentImageIndex.value = 0
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
  window.addEventListener('keydown', handleKeydown)
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
  touchStartX.value = e.changedTouches[0].screenX
}

const onTouchEnd = (e: TouchEvent) => {
  touchEndX.value = e.changedTouches[0].screenX
  const diff = touchStartX.value - touchEndX.value
  if (Math.abs(diff) > 50) {
    // Swipe — switch images, prevent click
    e.preventDefault()
    handleSwipe()
  } else {
    // Tap — open lightbox (let click handler work, don't preventDefault)
    openLightbox()
  }
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
  if (!product.value || product.value.listingType !== 'reservation_only') return false
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
        <div class="gallery-wrap">
          <div
            class="main-image"
            :style="{ '--cat-color': categoryColor }"
            @touchstart="onTouchStart"
            @touchend="onTouchEnd"
          >
            <!-- Category pill -->
            <div class="cat-pill">
              <span class="cat-emoji">{{ getCategoryInfo(product.category).emoji }}</span>
              <span class="cat-text">{{ getCategoryLabel(product.category) }}</span>
            </div>

            <!-- Nav arrows -->
            <button v-if="product.images?.length > 1" class="nav-btn nav-prev" @click.stop="prevImage">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>

            <img
              :src="product.images?.[currentImageIndex] || '/placeholder-card.png'"
              :alt="getTitle(product)"
              @click="openLightbox"
              class="hero-img"
            />

            <button v-if="product.images?.length > 1" class="nav-btn nav-next" @click.stop="nextImage">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>

            <!-- Zoom hint -->
            <div class="zoom-hint">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
                <path d="M11 8v6M8 11h6"/>
              </svg>
              <span>{{ locale === 'zh' ? '點擊放大' : 'Click to zoom' }}</span>
            </div>

            <!-- Counter -->
            <div v-if="product.images?.length > 1" class="img-counter">
              {{ currentImageIndex + 1 }} / {{ product.images.length }}
            </div>
          </div>

          <!-- Thumbnails -->
          <div v-if="product.images?.length > 1" class="thumb-strip">
            <img
              v-for="(img, idx) in product.images"
              :key="idx"
              :src="img"
              :alt="`${getTitle(product)} ${Number(idx) + 1}`"
              class="thumb"
              :class="{ active: idx === currentImageIndex }"
              @click="selectImage(Number(idx))"
            />
          </div>
        </div>

        <!-- ════════════════ RIGHT: Info (Glass Card) ════════════════ -->
        <div class="info-wrap">
          <div class="glass-card">
            <!-- Title -->
            <h1 class="product-title">
              {{ getTitle(product) }}
              <span v-if="isProductSuspended" class="suspended-badge">{{ locale === 'zh' ? '已下架' : 'Suspended' }}</span>
            </h1>

            <!-- 賣家名稱 -->
            <div v-if="product.seller" class="seller-info-row">
              <span class="seller-label">{{ locale === 'zh' ? '商鋪' : 'Seller' }}</span>
              <div class="seller-avatar-sm">{{ (product.seller.nickname || '?').charAt(0) }}</div>
              <span class="seller-name-text">{{ product.seller.nickname || (locale === 'zh' ? '未知商家' : 'Unknown Seller') }}</span>
            </div>

            <!-- Spec table -->
            <div class="spec-table">
              <div class="spec-row">
                <div class="spec-cell">
                  <span class="spec-label">{{ locale === 'zh' ? '品牌' : 'Brand' }}</span>
                  <span class="spec-value">{{ getCategoryInfo(product.category).emoji }} {{ getCategoryLabel(product.category) }}</span>
                </div>
                <div class="spec-cell">
                  <span class="spec-label">{{ locale === 'zh' ? '語言' : 'Language' }}</span>
                  <span class="spec-value">{{ getLanguageLabel(product.language) || '—' }}</span>
                </div>
              </div>
              <div class="spec-row">
                <div class="spec-cell">
                  <span class="spec-label">{{ locale === 'zh' ? '品相' : 'Condition' }}</span>
                  <span class="spec-value">
                    <span class="condition-dot" :style="{ backgroundColor: conditionColor }"></span>
                    {{ product.condition }}{{ locale === 'zh' ? '品, ' + ({ S: '完美品相', A: '輕微瑕疵', B: '正常使用痕跡', C: '較明顯磨損', D: '嚴重磨損' } as Record<string, string>)[product.condition] || '' : '' }}
                  </span>
                </div>
                <div class="spec-cell">
                  <span class="spec-label">{{ locale === 'zh' ? '商品種類' : 'Type' }}</span>
                  <span class="spec-value">{{ getProductTypeTag(product) ? getProductTypeTag(product).name : '—' }}</span>
                </div>
              </div>
              <div class="spec-row" v-if="getGeneralTags(product).length > 0">
                <div class="spec-cell spec-cell-full">
                  <span class="spec-label">{{ locale === 'zh' ? '其它標籤' : 'Tags' }}</span>
                  <span class="spec-value spec-tags">
                    <span
                      v-for="tag in getGeneralTags(product)"
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
            <template v-if="product && product.listingType === 'reservation_only'">
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
                    <span class="res-value">{{ formatDate(product.reservationDeadline, true) }}</span>
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
                  {{ processing ? (t('common.loading') || '處理中...') : (locale === 'zh' ? '立即預約' : 'Reserve Now') }}
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
                  {{ processing ? (t('common.loading') || '處理中...') : (locale === 'zh' ? '立即購買' : 'Buy Now') }}
                </button>
                <button
                  class="btn btn-secondary"
                  :disabled="processing || isOutOfStock() || isProductSuspended"
                  @click="handleAddToCart"
                >
                  {{ locale === 'zh' ? '加到購物車' : 'Add to Cart' }}
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
            </template>
          </div>
        </div>
      </div>

      <!-- Error -->
      <div v-else class="error-state">
        <p>{{ t('common.error') || '商品不存在' }}</p>
      </div>

      <!-- ════════════════ You May Also Like ════════════════ -->
      <section v-if="!loading && relatedProducts.length > 0" class="related-section">
        <h2 class="related-title">{{ locale === 'zh' ? '你可能喜歡' : 'You May Also Like' }}</h2>
        <div v-if="relatedLoading" class="loading-state">
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
  </div>

  <!-- ════════════════ Lightbox ════════════════ -->
  <transition name="lightbox-fade">
    <div v-if="lightboxOpen" class="lightbox" @click.self="closeLightbox">
      <button class="lb-close" @click="closeLightbox">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <button v-if="product.images?.length > 1" class="lb-nav lb-prev" @click.stop="prevImage">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <img :src="product.images?.[currentImageIndex]" :alt="getTitle(product)" class="lb-img" @click.stop />
      <button v-if="product.images?.length > 1" class="lb-nav lb-next" @click.stop="nextImage">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <div v-if="product.images?.length > 1" class="lb-counter">{{ currentImageIndex + 1 }} / {{ product.images.length }}</div>
      <div class="lb-hint">{{ locale === 'zh' ? '按 ESC 關閉 · 左右鍵切換' : 'ESC to close · Arrow keys to navigate' }}</div>
    </div>
  </transition>
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
  align-items: start;
  animation: fadeUp 0.5s ease;
  min-width: 0;
  max-width: 100%;
}

@media (max-width: 960px) {
  .product-layout {
    grid-template-columns: 1fr;
    gap: 24px;
  }
}

// ════════════════════════════════════════════
// Gallery (Left)
// ════════════════════════════════════════════
.gallery-wrap {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  top: 24px;
}

@media (max-width: 960px) {
  .gallery-wrap {
    position: static;
  }
}

.main-image {
  position: relative;
  background: linear-gradient(145deg, #131318 0%, #0e0e14 100%);
  border-radius: $radius;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 440px;
  border: 1px solid $border-glass;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  transition: box-shadow 0.3s ease;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at 50% 30%, rgba(99, 102, 241, 0.06) 0%, transparent 60%);
    pointer-events: none;
    z-index: 0;
  }

  &:hover {
    box-shadow: 0 12px 40px rgba(99, 102, 241, 0.15);
  }
}

.hero-img {
  max-width: 100%;
  max-height: 520px;
  object-fit: contain;
  display: block;
  cursor: zoom-in;
  transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  position: relative;
  z-index: 1;

  &:hover {
    transform: scale(1.03);
  }
}

// Category pill (floating top-left)
.cat-pill {
  position: absolute;
  top: 16px;
  left: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(10, 10, 15, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid $border-glass;
  border-radius: 100px;
  padding: 6px 14px 6px 10px;
  z-index: 5;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);

  .cat-emoji {
    font-size: 1.1rem;
    line-height: 1;
  }

  .cat-text {
    font-size: 0.75rem;
    font-weight: 600;
    color: $text-hi;
    letter-spacing: 0.03em;
  }
}

// Nav buttons
.nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(10, 10, 15, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid $border-glass;
  color: $text-hi;
  cursor: pointer;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;
  opacity: 0;
}

.main-image:hover .nav-btn {
  opacity: 1;
}

.nav-btn:hover {
  background: rgba(99, 102, 241, 0.3);
  border-color: rgba(129, 140, 248, 0.5);
}

.nav-prev { left: 16px; }
.nav-next { right: 16px; }

// Zoom hint
.zoom-hint {
  position: absolute;
  bottom: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(10, 10, 15, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: $text-mid;
  padding: 6px 12px;
  border-radius: 100px;
  font-size: 0.72rem;
  border: 1px solid $border-glass;
  z-index: 5;
  opacity: 0;
  transition: opacity 0.25s ease;
}

.main-image:hover .zoom-hint {
  opacity: 1;
}

// Image counter
.img-counter {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(10, 10, 15, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: $text-hi;
  padding: 4px 14px;
  border-radius: 100px;
  font-size: 0.72rem;
  border: 1px solid $border-glass;
  z-index: 5;
}

// Thumbnails
.thumb-strip {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 4px 0;
  scrollbar-width: thin;
  scrollbar-color: rgba(129, 140, 248, 0.3) transparent;

  &::-webkit-scrollbar {
    height: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(129, 140, 248, 0.3);
    border-radius: 2px;
  }
}

.thumb {
  width: 76px;
  height: 76px;
  object-fit: cover;
  border-radius: 10px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.25s ease;
  flex-shrink: 0;
  opacity: 0.5;
  background: #131318;

  &:hover {
    opacity: 0.85;
    transform: translateY(-2px);
  }

  &.active {
    opacity: 1;
    border-color: $grad-end;
    box-shadow: 0 0 0 1px $grad-end, 0 4px 16px rgba(99, 102, 241, 0.25);
  }
}

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

/* 賣家名稱行 */
.seller-info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: var(--space-4);
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
  background: var(--primary-gradient);
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

// Spec table
.spec-table {
  display: flex;
  flex-direction: column;
  border: 1px solid $border-glass;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.02);
  min-width: 0;
  max-width: 100%;
}

.spec-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-width: 0;

  & + .spec-row {
    border-top: 1px solid $border-glass;
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
    border-left: 1px solid $border-glass;
  }
}

.spec-cell-full {
  grid-column: 1 / -1;
  border-left: none;
}

.spec-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: $text-lo;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.spec-value {
  font-size: 0.92rem;
  font-weight: 600;
  color: $text-hi;
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

// Tag chips (inside spec table)
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
// Related Products
// ════════════════════════════════════════════
.related-section {
  margin-top: 64px;
  padding-top: 8px;
}

.related-title {
  font-size: 1.35rem;
  font-weight: 800;
  color: $text-hi;
  margin-bottom: 24px;
  letter-spacing: -0.01em;
  position: relative;
  padding-left: 16px;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 4px;
    height: 24px;
    border-radius: 2px;
    background: linear-gradient(180deg, $grad-start, $grad-end);
  }
}

.related-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

// ════════════════════════════════════════════
// Lightbox
// ════════════════════════════════════════════
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(5, 5, 10, 0.96);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.lightbox-fade-enter-active, .lightbox-fade-leave-active {
  transition: opacity 0.25s ease;
}
.lightbox-fade-enter-from, .lightbox-fade-leave-to {
  opacity: 0;
}

.lb-img {
  max-width: 90vw;
  max-height: 85vh;
  object-fit: contain;
  border-radius: 12px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
  animation: fadeUp 0.3s ease;
}

.lb-close {
  position: absolute;
  top: 24px;
  right: 24px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: $text-hi;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.4);
    transform: rotate(90deg);
  }
}

.lb-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: $text-hi;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.25);
    border-color: rgba(129, 140, 248, 0.5);
  }
}

.lb-prev { left: 24px; }
.lb-next { right: 24px; }

.lb-counter {
  position: absolute;
  bottom: 56px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: $text-hi;
  padding: 6px 18px;
  border-radius: 100px;
  font-size: 0.85rem;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.lb-hint {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.75rem;
  letter-spacing: 0.03em;
}

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