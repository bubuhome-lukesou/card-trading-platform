<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Heart, ShoppingCart, Gavel } from 'lucide-vue-next'
import type { Product } from '@/types'
import { useFavoritesStore } from '@/stores/favorites'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  product: Product
}>()

const { t, locale } = useI18n()
const favoritesStore = useFavoritesStore()
const authStore = useAuthStore()

const title = computed(() => locale.value === 'zh' ? props.product.titleZh : props.product.titleEn)

const rarityClass = computed(() => `rarity-${props.product.rarity.toLowerCase()}`)

const price = computed(() => {
  return new Intl.NumberFormat('en-HK', {
    style: 'currency',
    currency: 'HKD',
    minimumFractionDigits: 0
  }).format(props.product.price)
})

const isFavorited = computed(() => favoritesStore.isFavorited(props.product.id))

const handleToggleFavorite = (e: Event) => {
  e.preventDefault()
  e.stopPropagation()
  favoritesStore.toggleFavorite(props.product.id)
}
</script>

<template>
  <RouterLink :to="`/product/${product.id}`" class="product-card">
    <!-- Image -->
    <div class="card-image">
      <img
        :src="product.images?.[0] || '/placeholder-card.png'"
        :alt="title"
        loading="lazy"
      />

      <!-- Out of Stock Overlay -->
      <div v-if="product.quantity === 0" class="out-of-stock-overlay">
        <span class="out-of-stock-text">Out of Stock</span>
      </div>

      <!-- Listing Type Badge -->
      <span class="listing-badge" :class="product.hasAuction ? 'is-auction' : 'is-sale'">
        <Gavel v-if="product.hasAuction" class="badge-icon" />
        <ShoppingCart v-else class="badge-icon" />
        {{ product.hasAuction ? 'Auction' : 'Sale' }}
      </span>

      <!-- Rarity Badge -->
      <span class="rarity-badge" :class="rarityClass">
        ⭐ {{ product.rarity }}
      </span>
    </div>

    <!-- Info -->
    <div class="card-info">
      <h3 class="card-title">{{ title }}</h3>

      <div class="card-meta">
        <span class="meta-item">{{ product.brand }}</span>
        <span class="meta-sep">•</span>
        <span class="meta-item">{{ t(`conditions.${product.condition}`) }}</span>
      </div>

      <!-- Tags -->
      <div v-if="product.tags?.length" class="card-tags">
        <span
          v-for="tag in product.tags.slice(0, 3)"
          :key="tag.id"
          class="tag-badge"
          :style="tag.color ? { backgroundColor: tag.color + '18', color: tag.color, borderColor: tag.color + '40' } : {}"
        >
          <span class="tag-dot" :style="{ backgroundColor: tag.color || '#6366f1' }"></span>
          {{ tag.name }}
        </span>
        <span v-if="product.tags.length > 3" class="tag-badge tag-more">
          +{{ product.tags.length - 3 }}
        </span>
      </div>

      <div class="card-price">
        <span class="price">{{ price }}</span>
      </div>
    </div>

    <!-- Actions -->
    <div class="card-actions">
      <button class="action-btn favorite" :class="{ active: isFavorited }" @click="handleToggleFavorite">
        <Heart class="icon" :class="{ 'icon-filled': isFavorited }" />
      </button>
      <button class="action-btn cart" @click.prevent>
        <ShoppingCart class="icon" />
      </button>
    </div>
  </RouterLink>
</template>

<style scoped lang="scss">
.product-card {
  position: relative;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  overflow: hidden;
  transition: all var(--transition-base);
  text-decoration: none;

  &:hover {
    border-color: var(--primary);
    transform: translateY(-4px);
    box-shadow: var(--shadow-xl), 0 0 30px rgba(102, 126, 234, 0.15);

    .card-image img {
      transform: scale(1.05);
    }

    .card-actions {
      opacity: 1;
    }
  }
}

.card-image {
  position: relative;
  aspect-ratio: 3/4;
  overflow: hidden;
  background: var(--bg-elevated);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform var(--transition-slow);
  }
}

.out-of-stock-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
}

.out-of-stock-text {
  background: var(--danger);
  color: white;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 700;
  text-transform: uppercase;
}

.listing-badge {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;

  .badge-icon {
    width: 12px;
    height: 12px;
  }

  &.is-auction {
    background: var(--success-gradient);
    color: white;
  }

  &.is-sale {
    background: var(--accent-gradient);
    color: white;
  }
}

.rarity-badge {
  position: absolute;
  bottom: var(--space-3);
  left: var(--space-3);
  padding: var(--space-1) var(--space-2);
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  font-weight: 600;

  &.rarity-ssr { color: var(--rarity-ssr); }
  &.rarity-sr { color: var(--rarity-sr); }
  &.rarity-r { color: var(--rarity-r); }
  &.rarity-n { color: var(--rarity-n); }
}

.card-info {
  padding: var(--space-4);
}

.card-title {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-2);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
  min-height: 2.8em;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-xs);
  color: var(--text-muted);
  margin-bottom: var(--space-3);
}

.meta-sep {
  opacity: 0.5;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin-bottom: var(--space-2);
}

.tag-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: 500;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  color: var(--text-muted);
  transition: all 0.2s;

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }
}

.tag-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tag-more {
  background: var(--bg-elevated);
  color: var(--text-muted);
  font-weight: 600;
}

.card-price {
  display: flex;
  align-items: baseline;
  gap: var(--space-1);
}

.price {
  font-family: var(--font-num);
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--primary);
}

.card-actions {
  position: absolute;
  top: var(--space-3);
  left: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  opacity: 0;
  transition: opacity var(--transition-base);

  @media (max-width: 768px) {
    opacity: 1;
  }
}

.action-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  border: none;
  border-radius: var(--radius-full);
  color: white;
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    background: var(--primary);
    transform: scale(1.1);
  }

  .icon {
    width: 18px;
    height: 18px;
  }
}

.favorite:hover {
  background: var(--accent);
}

.favorite.active {
  background: var(--accent);
}

.icon-filled {
  fill: var(--accent);
}

.cart:hover {
  background: var(--success);
}
</style>
