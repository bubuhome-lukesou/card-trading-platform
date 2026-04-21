<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

interface Favorite {
  id: string
  productId: string
  title: string
  category: string
  price: number
  image?: string
  sellerNickname: string
  addedAt: string
}

const favorites = ref<Favorite[]>([])
const loading = ref(true)

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('zh-HK', {
    style: 'currency',
    currency: 'HKD',
    minimumFractionDigits: 0,
  }).format(price)
}

const getCategoryEmoji = (category: string) => {
  const map: Record<string, string> = {
    pokemon: '🎮',
    yugioh: '🐉',
    mtg: '🧙',
    ultraman: '👾',
    onepiece: '⚔️',
    doraemon: '🤖',
    sports: '⚽',
    other: '🎴',
  }
  return map[category] || '🎴'
}

const loadFavorites = async () => {
  loading.value = true
  try {
    favorites.value = [
      { id: '1', productId: '1', title: 'Pokemon 1st Edition Base Set', category: 'pokemon', price: 12800, sellerNickname: 'CardMaster', addedAt: '2026-04-20' },
      { id: '2', productId: '2', title: 'Yu-Gi-Oh Blue-Eyes White Dragon', category: 'yugioh', price: 6800, sellerNickname: 'DragonSeller', addedAt: '2026-04-19' },
      { id: '3', productId: '3', title: 'MTG Black Lotus', category: 'mtg', price: 25000, sellerNickname: 'MagicCards', addedAt: '2026-04-18' },
      { id: '4', productId: '4', title: 'Doraemon Figure Collection', category: 'doraemon', price: 1800, sellerNickname: 'AnimeSeller', addedAt: '2026-04-17' },
    ]
  } catch (error) {
    console.error('Failed to load favorites:', error)
  } finally {
    loading.value = false
  }
}

const handleRemove = (id: string) => {
  favorites.value = favorites.value.filter(f => f.id !== id)
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
      <h3>暂无收藏</h3>
      <p>快去收藏您喜欢的卡牌吧！</p>
      <router-link to="/marketplace" class="btn-primary">浏览商品</router-link>
    </div>

    <div v-else class="favorites-grid">
      <div v-for="item in favorites" :key="item.id" class="favorite-card">
        <div class="card-image">
          <span class="category-emoji">{{ getCategoryEmoji(item.category) }}</span>
          <button class="remove-btn" @click="handleRemove(item.id)">✕</button>
        </div>
        <div class="card-info">
          <h3 class="card-title">{{ item.title }}</h3>
          <div class="card-meta">卖家: {{ item.sellerNickname }}</div>
          <div class="card-price">
            <span class="price-value">{{ formatPrice(item.price) }}</span>
          </div>
        </div>
        <div class="card-actions">
          <router-link :to="`/product/${item.productId}`" class="btn-view">
            查看详情
          </router-link>
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

.btn-view {
  display: block;
  text-align: center;
  padding: var(--space-2);
  background: var(--bg-elevated);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: var(--text-sm);
  font-weight: 500;
  text-decoration: none;
  transition: all var(--transition-fast);
}

.btn-view:hover {
  background: var(--primary-gradient);
  color: white;
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
