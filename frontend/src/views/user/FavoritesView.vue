<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { favoritesApi, type FavoriteItem } from '@/api/favorites'
import { useFavoritesStore } from '@/stores/favorites'
import { cartApi } from '@/api/cart'

const { t } = useI18n()
const router = useRouter()
const favoritesStore = useFavoritesStore()

const favorites = ref<any[]>([])
const loading = ref(true)
const processing = ref<string | null>(null)

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('zh-MO', {
    style: 'currency',
    currency: 'MOP',
    minimumFractionDigits: 0,
  }).format(price)
}

const loadFavorites = async () => {
  loading.value = true
  try {
    const res = await favoritesApi.getFavorites(1, 50)
    favorites.value = res.data.data
  } catch (error) {
    console.error('Failed to load favorites:', error)
  } finally {
    loading.value = false
  }
}

const handleRemove = async (productId: string) => {
  await favoritesStore.toggleFavorite(productId)
  favorites.value = favorites.value.filter(f => f.productId !== productId)
}

const handleBuyNow = async (item: any) => {
  processing.value = item.productId
  try {
    await cartApi.addItem(item.productId, 1)
    router.push('/user/cart')
  } catch (error) {
    console.error('Buy now failed:', error)
  } finally {
    processing.value = null
  }
}

const handleAddToCart = async (item: any) => {
  processing.value = item.productId
  try {
    await cartApi.addItem(item.productId, 1)
    router.push('/user/cart')
  } catch (error) {
    console.error('Add to cart failed:', error)
  } finally {
    processing.value = null
  }
}

onMounted(() => {
  loadFavorites()
})
</script>

<template>
  <div class="favorites-page">
    <h1 class="page-title">我的收藏</h1>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <div v-else-if="favorites.length === 0" class="empty-state">
      <div class="empty-icon">❤️</div>
      <h3>暫無收藏</h3>
      <p>快去收藏您喜歡的卡牌吧！</p>
      <router-link to="/marketplace" class="btn-primary">瀏覽商品</router-link>
    </div>

    <div v-else class="favorites-grid">
      <div v-for="item in favorites" :key="item.id" class="favorite-card">
        <div class="card-image" @click="router.push(`/product/${item.productId}`)">
          <img
            v-if="item.product?.images?.[0]"
            :src="item.product.images[0]"
            :alt="item.product?.titleZh || item.product?.titleEn"
          />
          <span v-else class="category-emoji">🎴</span>
          <button class="remove-btn" @click.stop="handleRemove(item.productId)">✕</button>
        </div>
        <div class="card-info">
          <h3 class="card-title">{{ item.product?.titleZh || item.product?.titleEn }}</h3>
          <div class="card-meta">{{ item.product?.brand }}</div>
          <div class="card-price">
            <span class="price-value">{{ formatPrice(item.product?.price || 0) }}</span>
          </div>
        </div>
        <div class="card-actions">
          <button
            class="btn-buy"
            :disabled="processing === item.productId"
            @click="handleBuyNow(item)"
          >
            {{ processing === item.productId ? '處理中...' : '立即購買' }}
          </button>
          <button
            class="btn-cart"
            :disabled="processing === item.productId"
            @click="handleAddToCart(item)"
          >
            加入購物車
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.favorites-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.page-title {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--text-primary);
}

.loading-state {
  text-align: center;
  padding: var(--space-16);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: var(--space-16);
  background: var(--bg-card);
  border: 1px dashed var(--border);
  border-radius: var(--radius-xl);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: var(--space-4);
}

.empty-state h3 {
  font-size: var(--text-lg);
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}

.empty-state p {
  color: var(--text-secondary);
  margin-bottom: var(--space-6);
}

.btn-primary {
  padding: var(--space-3) var(--space-6);
  background: var(--primary-gradient);
  border-radius: var(--radius-lg);
  color: white;
  font-weight: 600;
  text-decoration: none;
  display: inline-block;
}

.favorites-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
}

.favorite-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  overflow: hidden;
  transition: all var(--transition-fast);
}

.favorite-card:hover {
  border-color: var(--primary);
  transform: translateY(-4px);
  box-shadow: 0 8px 24px #0006;
}

.card-image {
  height: 140px;
  background: linear-gradient(135deg, var(--bg-dark) 0%, var(--bg-elevated) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  cursor: pointer;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.category-emoji {
  font-size: 48px;
}

.remove-btn {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #000000b3;
  color: white;
  border: none;
  cursor: pointer;
  font-size: 12px;
  transition: background var(--transition-fast);
}

.remove-btn:hover {
  background: var(--danger);
}

.card-info {
  padding: var(--space-4);
}

.card-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-meta {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}

.card-price {
  display: flex;
  align-items: baseline;
}

.price-value {
  font-family: var(--font-num);
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--primary);
}

.card-actions {
  padding: var(--space-3);
  border-top: 1px solid var(--border);
}

.btn-buy {
  flex: 1;
  padding: var(--space-2);
  background: var(--primary-gradient);
  border: none;
  border-radius: var(--radius-md);
  color: white;
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  &:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btn-cart {
  flex: 1;
  padding: var(--space-2);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  &:hover:not(:disabled) {
    background: var(--success);
    border-color: var(--success);
    color: white;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

@media (max-width: 1024px) {
  .favorites-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .favorites-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .favorites-grid {
    grid-template-columns: 1fr;
  }
}
</style>
