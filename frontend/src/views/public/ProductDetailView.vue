<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { productApi } from '@/api/products'
import { cartApi } from '@/api/cart'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
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

// Touch/swipe state for mobile
const touchStartX = ref(0)
const touchEndX = ref(0)

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
      // Swipe left -> next image
      nextImage()
    } else {
      // Swipe right -> prev image
      prevImage()
    }
  }
}

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
            <img :src="product.images?.[currentImageIndex] || '/placeholder-card.png'" :alt="product.titleEn" />
            <button v-if="product.images?.length > 1" class="nav-btn nav-next" @click.stop="nextImage">›</button>
            <div v-if="product.images?.length > 1" class="image-counter">{{ currentImageIndex + 1 }} / {{ product.images.length }}</div>
          </div>
          <div v-if="product.images?.length > 1" class="thumbnail-list">
            <img
              v-for="(img, idx) in product.images"
              :key="idx"
              :src="img"
              :alt="`${product.titleEn} ${Number(idx) + 1}`"
              class="thumbnail"
              :class="{ active: idx === currentImageIndex }"
              @click="selectImage(Number(idx))"
            />
          </div>
        </div>

        <!-- Info -->
        <div class="product-info">
          <h1 class="product-title">{{ product.titleEn }}</h1>
          <p class="product-subtitle">{{ product.titleZh }}</p>

          <div class="product-meta">
            <span class="meta-item">{{ product.brand }}</span>
            <span class="meta-sep">•</span>
            <span class="meta-item">{{ product.series }}</span>
            <span class="meta-sep">•</span>
            <span class="meta-item">{{ t(`conditions.${product.condition}`, product.condition) }}</span>
          </div>

          <!-- Tags -->
          <div v-if="product.tags?.length" class="product-tags">
            <span
              v-for="tag in product.tags"
              :key="tag.id"
              class="product-tag"
              :style="tag.color ? { backgroundColor: tag.color + '18', color: tag.color, borderColor: tag.color + '50' } : {}"
              @click="router.push({ path: '/marketplace', query: { search: tag.name } })"
            >
              <span class="tag-dot" :style="{ backgroundColor: tag.color || '#6366f1' }"></span>
              {{ tag.name }}
            </span>
          </div>

          <div class="price-section">
            <span class="price-label">{{ t('product.details.price') }}</span>
            <span class="price">MOP ${{ Number(product.price).toLocaleString() }}</span>
            <div v-if="product.quantity !== undefined" class="stock-info">
              <span v-if="product.quantity === 0" class="out-of-stock-badge">Out of Stock</span>
              <span v-else class="stock-count">庫存: {{ product.quantity }}</span>
            </div>
          </div>

          <!-- Quantity Selector -->
          <div v-if="product.quantity > 0" class="quantity-selector">
            <span class="qty-label">購買數量:</span>
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
              {{ processing ? (t('common.loading') || '處理中...') : '立即購買' }}
            </button>
            <button
              class="btn btn-outline"
              :disabled="processing || isOutOfStock()"
              @click="handleAddToCart"
            >
              加到購物車
            </button>
          </div>
        </div>
      </div>
      <div v-else class="error-state">
        <p>{{ t('common.error') || '商品不存在' }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 4px 12px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
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
}

.quantity-selector {
  margin: 20px 0;
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

/* Remove spinner arrows from number input */
.qty-input::-webkit-outer-spin-button,
.qty-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.qty-input[type=number] {
  -moz-appearance: textfield;
}
</style>