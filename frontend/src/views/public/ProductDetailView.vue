<script setup lang="ts">
import { ref, onMounted } from 'vue'
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
    message.value = `库存不足！最多只能购买 ${getMaxQuantity()} 件`
    messageType.value = 'error'
    return
  }

  processing.value = true
  message.value = ''
  try {
    // For direct purchase, create order directly
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
      message.value = `库存不足！最多只能购买 ${getMaxQuantity()} 件`
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
          <div class="main-image">
            <img :src="product.images?.[currentImageIndex] || '/placeholder-card.png'" :alt="product.titleEn" />
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
            <span class="price">HK$ {{ Number(product.price).toLocaleString() }}</span>
            <div v-if="product.quantity !== undefined" class="stock-info">
              <span v-if="product.quantity === 0" class="out-of-stock-badge">Out of Stock</span>
              <span v-else class="stock-count">库存: {{ product.quantity }}</span>
            </div>
          </div>

          <!-- Quantity Selector -->
          <div v-if="product.quantity > 0" class="quantity-selector">
            <span class="qty-label">购买数量:</span>
            <div class="qty-controls">
              <button class="qty-btn" @click="decreaseQuantity" :disabled="selectedQuantity <= 1">−</button>
              <span class="qty-value">{{ selectedQuantity }}</span>
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
              {{ processing ? (t('common.loading') || '處理中...') : (t('product.card.buyNow') || '立即購買') }}
            </button>
            <button
              class="btn btn-outline"
              :disabled="processing || isOutOfStock()"
              @click="handleAddToCart"
            >
              {{ t('product.card.addToCart') || '加入購物車' }}
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



