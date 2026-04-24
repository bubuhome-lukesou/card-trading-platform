<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { productApi } from '@/api/products'
import { ordersApi } from '@/api/orders'
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

const handleBuyNow = async () => {
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }
  if (!product.value) return

  processing.value = true
  message.value = ''
  try {
    const orderData = {
      productId: product.value.id,
      type: 'direct_purchase' as const,
      quantity: 1,
      totalPrice: product.value.price,
    }
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

  processing.value = true
  message.value = ''
  try {
    // 直接創建 direct_purchase 訂單作爲購物車行爲
    const orderData = {
      productId: product.value.id,
      type: 'direct_purchase' as const,
      quantity: 1,
      totalPrice: product.value.price,
    }
    await ordersApi.createOrder(orderData)
    message.value = t('product.addToCartSuccess') || '已加入購物車！'
    messageType.value = 'success'
    setTimeout(() => {
      router.push('/user/orders')
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

          <div class="price-section">
            <span class="price-label">{{ t('product.details.price') }}</span>
            <span class="price">HK$ {{ Number(product.price).toLocaleString() }}</span>
          </div>

          <!-- Message -->
          <div v-if="message" class="action-message" :class="messageType">
            {{ message }}
          </div>

          <div class="action-buttons">
            <button
              class="btn btn-primary btn-lg"
              :disabled="processing"
              @click="handleBuyNow"
            >
              {{ processing ? (t('common.loading') || '處理中...') : (t('product.card.buyNow') || '立即購買') }}
            </button>
            <button
              class="btn btn-outline"
              :disabled="processing"
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

<style scoped lang="scss">
.product-detail {
  padding: var(--space-8) 0 var(--space-16);
}

.product-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-12);
}

.product-images {
  .main-image {
    border-radius: var(--radius-xl);
    overflow: hidden;
    background: var(--bg-dark);

    img {
      width: 100%;
      height: auto;
      max-height: 500px;
      object-fit: contain;
    }
  }

  .thumbnail-list {
    display: flex;
    gap: var(--space-3);
    margin-top: var(--space-4);
    overflow-x: auto;

    .thumbnail {
      width: 80px;
      height: 80px;
      border-radius: var(--radius-md);
      object-fit: cover;
      cursor: pointer;
      border: 2px solid transparent;
      transition: all 0.2s;

      &:hover {
        border-color: var(--primary);
      }

      &.active {
        border-color: var(--primary);
        box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.2);
      }
    }
  }
}

.product-info {
  .product-title {
    font-size: var(--text-3xl);
    font-weight: 700;
    margin-bottom: var(--space-2);
  }

  .product-subtitle {
    color: var(--text-muted);
    font-size: var(--text-lg);
    margin-bottom: var(--space-4);
  }

  .product-meta {
    display: flex;
    gap: var(--space-2);
    color: var(--text-secondary);
    font-size: var(--text-sm);
    margin-bottom: var(--space-6);

    .meta-sep {
      color: var(--text-muted);
    }
  }

  .price-section {
    margin-bottom: var(--space-6);
    padding: var(--space-4);
    background: var(--bg-dark);
    border-radius: var(--radius-lg);

    .price-label {
      display: block;
      font-size: var(--text-sm);
      color: var(--text-muted);
      margin-bottom: var(--space-1);
    }

    .price {
      font-size: var(--text-3xl);
      font-weight: 700;
      color: var(--primary);
    }
  }
}

.action-message {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-4);
  font-size: var(--text-sm);

  &.success {
    background: rgba(34, 197, 94, 0.1);
    color: #22c55e;
    border: 1px solid rgba(34, 197, 94, 0.3);
  }

  &.error {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }
}

.action-buttons {
  display: flex;
  gap: var(--space-4);

  .btn {
    flex: 1;
    padding: var(--space-4);
    font-size: var(--text-base);
    font-weight: 600;
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: all 0.2s;
    border: none;

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .btn-primary {
    background: var(--primary);
    color: white;

    &:hover:not(:disabled) {
      background: var(--primary-dark);
    }
  }

  .btn-outline {
    background: transparent;
    border: 2px solid var(--border);
    color: var(--text-primary);

    &:hover:not(:disabled) {
      border-color: var(--primary);
      color: var(--primary);
    }
  }
}

.loading-state,
.error-state {
  text-align: center;
  padding: var(--space-16);
  color: var(--text-muted);
}

@media (max-width: 768px) {
  .product-layout {
    grid-template-columns: 1fr;
  }
}
</style>
