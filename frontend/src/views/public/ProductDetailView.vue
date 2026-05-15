<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { productApi } from '@/api/products'
import { cartApi } from '@/api/cart'
import { useAuthStore } from '@/stores/auth'

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

// Touch/swipe state for mobile
const touchStartX = ref(0)
const touchEndX = ref(0)

// Category labels
const categoryLabels = computed(() => ({
  pokemon: { zh: '寶可夢', en: 'Pokemon' },
  yugioh: { zh: '遊戲王', en: 'Yugioh' },
  mtg: { zh: '萬智牌', en: 'MTG' },
  ultraman: { zh: '奧特曼', en: 'Ultraman' },
  onepiece: { zh: '海賊王', en: 'OnePiece' },
  doraemon: { zh: '哆啦A夢', en: 'Doraemon' },
  sports: { zh: '體育卡', en: 'Sports Cards' },
  other: { zh: '其他', en: 'Other' }
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

// Get category label
const getCategoryLabel = (category: string) => {
  const labels = categoryLabels.value[category as keyof typeof categoryLabels.value]
  return labels ? labels[locale.value as 'zh' | 'en'] : category
}

// Get product type tag (filter only type=product_type tags)
const getProductTypeTags = (product: any) => {
  if (!product.tags) return []
  return product.tags.filter((tag: any) => tag.type === 'product_type' || tag.type === 'PRODUCT_TYPE')
}

// Get general tags
const getGeneralTags = (product: any) => {
  if (!product.tags) return []
  return product.tags.filter((tag: any) => tag.type !== 'product_type' && tag.type !== 'PRODUCT_TYPE')
}

onMounted(async () => {
  try {
    const response = await productApi.getProduct(route.params.id as string)
    product.value = response.data
    currentImageIndex.value = 0
  } catch (error) {
    console.error('Failed to load product:', error)
  } finally {
    loading.value = false
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
    <div class="container">
      <div v-if="loading" class="loading-state">
        <p>{{ t('common.loading') || '加載中...' }}</p>
      </div>
      <div v-else-if="product" class="product-layout">
        <!-- Images -->
        <div class="product-images">
          <div
            class="main-image"
            @touchstart="onTouchStart"
            @touchend="onTouchEnd"
          >
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
          <h1 class="product-title">{{ getTitle(product) }}</h1>
          
          <!-- Category & Product Type -->
          <div class="product-meta">
            <span class="meta-item category-badge">
              {{ getCategoryLabel(product.category) }}
            </span>
            <template v-if="getProductTypeTags(product).length > 0">
              <span class="meta-sep">•</span>
              <span 
                v-for="tag in getProductTypeTags(product)" 
                :key="tag.id"
                class="meta-item product-type-tag"
                :style="{ color: tag.color || '#6366f1' }"
              >
                {{ tag.name }}
              </span>
            </template>
            <span class="meta-sep">•</span>
            <span class="meta-item">{{ t(`conditions.${product.condition}`, product.condition) }}</span>
          </div>

          <!-- General Tags -->
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

          <!-- Brand & Series -->
          <div v-if="product.brand || product.series" class="product-attr">
            <span v-if="product.brand" class="attr-item">
              <span class="attr-label">{{ locale === 'zh' ? '品牌' : 'Brand' }}:</span>
              <span class="attr-value">{{ product.brand }}</span>
            </span>
            <span v-if="product.series" class="attr-item">
              <span class="attr-label">{{ locale === 'zh' ? '系列' : 'Series' }}:</span>
              <span class="attr-value">{{ product.series }}</span>
            </span>
          </div>

          <!-- Description -->
          <div v-if="getDescription(product)" class="product-description">
            <p>{{ getDescription(product) }}</p>
          </div>

          <div class="price-section">
            <span class="price-label">{{ t('product.details.price') }}</span>
            <span class="price">MOP ${{ Number(product.price).toLocaleString() }}</span>
            <div v-if="product.quantity !== undefined" class="stock-info">
              <span v-if="product.quantity === 0" class="out-of-stock-badge">{{ locale === 'zh' ? '已售罄' : 'Out of Stock' }}</span>
              <span v-else class="stock-count">{{ locale === 'zh' ? '庫存' : 'Stock' }}: {{ product.quantity }}</span>
            </div>
          </div>

          <!-- Quantity Selector -->
          <div v-if="product.quantity > 0" class="quantity-selector">
            <span class="qty-label">{{ locale === 'zh' ? '購買數量' : 'Quantity' }}:</span>
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
          </div>

          <!-- Message -->
          <div v-if="message" class="action-message" :class="messageType">
            {{ message }}
          </div>

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
        </div>
      </div>
      <div v-else class="error-state">
        <p>{{ t('common.error') || '商品不存在' }}</p>
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

<style scoped>
.product-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  padding: 24px 0;
}

@media (max-width: 900px) {
  .product-layout {
    grid-template-columns: 1fr;
    gap: 24px;
  }
}

.product-images {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.main-image {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-dark);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.main-image img {
  max-width: 100%;
  max-height: 500px;
  object-fit: contain;
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
  .zoom-hint {
    display: none;
  }
}

.nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  font-size: 24px;
  cursor: pointer;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.nav-btn:hover {
  background: rgba(0, 0, 0, 0.8);
}

.nav-prev {
  left: 12px;
}

.nav-next {
  right: 12px;
}

.image-counter {
  position: absolute;
  bottom: 48px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 4px 12px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
}

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
  transition: border-color 0.2s, opacity 0.2s;
  flex-shrink: 0;
}

.thumbnail:hover {
  opacity: 0.8;
}

.thumbnail.active {
  border-color: var(--primary);
}

.product-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.product-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.3;
}

.product-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.meta-item {
  display: inline-flex;
  align-items: center;
}

.meta-sep {
  color: var(--text-secondary);
  opacity: 0.5;
}

.category-badge {
  background: var(--bg-elevated);
  padding: 4px 12px;
  border-radius: var(--radius-full);
  font-size: 0.85rem;
  font-weight: 500;
}

.product-type-tag {
  font-weight: 600;
  font-size: 0.9rem;
}

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
  font-size: 0.85rem;
  border: 1px solid;
  cursor: pointer;
  transition: opacity 0.2s;
}

.product-tag:hover {
  opacity: 0.8;
}

.tag-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.product-attr {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 12px 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

.attr-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
}

.attr-label {
  color: var(--text-secondary);
}

.attr-value {
  color: var(--text-primary);
  font-weight: 500;
}

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

.price-section {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
}

.price-label {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.price {
  font-size: 2rem;
  font-weight: 700;
  color: var(--primary);
  font-family: var(--font-num);
}

.stock-info {
  margin-left: auto;
}

.out-of-stock-badge {
  background: #ef4444;
  color: white;
  padding: 4px 12px;
  border-radius: var(--radius-full);
  font-size: 0.85rem;
  font-weight: 500;
}

.stock-count {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.quantity-selector {
  margin: 8px 0;
}

.qty-label {
  display: block;
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 12px;
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

.btn-primary:hover:not(:disabled) {
  background: var(--primary-dark);
}

.btn-outline {
  background: transparent;
  color: var(--primary);
  border: 2px solid var(--primary);
}

.btn-outline:hover:not(:disabled) {
  background: var(--primary-light);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

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

  .main-image img {
    max-height: 350px;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
  }
}
</style>