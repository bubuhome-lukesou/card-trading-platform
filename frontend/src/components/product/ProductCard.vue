<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { Heart, ShoppingCart, Gavel, Calendar, Clock } from 'lucide-vue-next'
import type { Product, Tag } from '@/types'
import { useFavoritesStore } from '@/stores/favorites'
import { tagApi } from '@/api/tags'
import { auctionApi } from '@/api/auctions'
import { useI18n } from 'vue-i18n'
import ImageDeadlineBar from '@/components/product/ImageDeadlineBar.vue'

const props = defineProps<{
  product: Product
}>()

const { locale } = useI18n()
const favoritesStore = useFavoritesStore()
const productTypeTags = ref<Tag[]>([])

// Fetch product type tags once
tagApi.getTags().then(res => {
  productTypeTags.value = (res.data || []).filter((t: any) => t.type === 'product_type')
}).catch(() => {})

const router = useRouter()

const handleCardClick = async (e: Event) => {
  // For auction products, navigate to auction detail page
  if (props.product.listingType === 'auction') {
    e.preventDefault()
    try {
      const res = await auctionApi.getAuctionByProductId(props.product.id)
      router.push(`/auction/${res.data.id}`)
    } catch {
      // Fallback to product detail if no auction found
      router.push(`/product/${props.product.id}`)
    }
  }
}

const title = computed(() => locale.value === 'zh' ? (props.product.titleZh || props.product.titleEn) : (props.product.titleEn || props.product.titleZh))

// Product type labels (enum value → display label)
const productTypeLabels: Record<string, { zh: string; en: string }> = {
  graded_card: { zh: '評分卡', en: 'Graded Card' },
  original_box: { zh: '原箱', en: 'Original Box' },
  original_case: { zh: '原盒', en: 'Original Case' },
  original_bag: { zh: '原袋', en: 'Original Bag' },
  raw_card: { zh: '裸卡', en: 'Raw Card' },
  other: { zh: '其它', en: 'Other' },
}

const productTypeTagName = computed(() => {
  const pt = (props.product as any).productType
  if (!pt) return ''
  const labels = productTypeLabels[pt]
  if (!labels) return pt
  return locale.value === 'zh' ? labels.zh : labels.en
})

// Category translation map
const categoryNames: Record<string, { zh: string, en: string }> = {
  pokemon: { zh: '寶可夢', en: 'Pokemon' },
  yugioh: { zh: '遊戲王', en: 'Yu-Gi-Oh!' },
  mtg: { zh: '萬智牌', en: 'Magic: The Gathering' },
  ultraman: { zh: '超人迪卡', en: 'Ultraman' },
  onepiece: { zh: '海賊王', en: 'One Piece' },
  doraemon: { zh: '多啦A夢', en: 'Doraemon' },
  sports: { zh: '運動', en: 'Sports' },
  other: { zh: '其他', en: 'Other' }
}

const categoryName = computed(() => {
  const cat = categoryNames[props.product.category]
  return locale.value === 'zh' ? (cat?.zh || props.product.category) : (cat?.en || props.product.category)
})

const isFavorited = computed(() => favoritesStore.isFavorited(props.product.id))

const handleToggleFavorite = (e: Event) => {
  e.preventDefault()
  e.stopPropagation()
  favoritesStore.toggleFavorite(props.product.id)
}

// Shared listing badge computed (reused across ProductCard, HomeView, etc.)
const listingBadgeClass = computed(() => {
  if (props.product.listingType === 'auction') return 'is-auction'
  if (props.product.listingType === 'reservation') return 'is-reservation'
  return 'is-sale'
})

const listingBadgeText = computed(() => {
  if (props.product.listingType === 'auction') return 'Bid'
  if (props.product.listingType === 'reservation') return 'Reserve'
  return 'Sale'
})

// Language display mapping
const languageLabels: Record<string, { zh: string, en: string }> = {
  japanese: { zh: '日文', en: 'Japanese' },
  english: { zh: '英文', en: 'English' },
  traditional_chinese: { zh: '繁體中文', en: 'Traditional Chinese' },
  simplified_chinese: { zh: '簡體中文', en: 'Simplified Chinese' },
  korean: { zh: '韓文', en: 'Korean' },
  other: { zh: '其他', en: 'Other' }
}

const languageLabel = computed(() => {
  const lang = (props.product as any).language
  if (!lang) return ''
  const labels = languageLabels[lang]
  return locale.value === 'zh' ? labels?.zh || lang : labels?.en || lang
})

// Auction summary attached by products API (withAuction=true)
const auctionSummary = computed(() => (props.product as any).auctionSummary || null)
</script>

<template>
  <RouterLink :to="`/product/${product.id}`" class="listing-card" @click="handleCardClick">
    <!-- Image -->
    <div class="listing-image">
      <img
        v-if="product.images?.[0]"
        :src="product.images[0]"
        :alt="title"
        loading="lazy"
      />
      <div v-else class="placeholder-card">🃏</div>

      <!-- 圖片底部時間條：拍賣截止 / 預約截單（魂SHOP 風格） -->
      <ImageDeadlineBar
        v-if="product.listingType === 'auction' && auctionSummary?.endTime"
        :end-time="auctionSummary.endTime"
        variant="auction"
      />
      <ImageDeadlineBar
        v-else-if="product.listingType === 'reservation' && (product as any).reservationDeadline"
        :end-time="(product as any).reservationDeadline"
        variant="reservation"
      />

      <!-- Out of Stock Overlay -->
      <div v-if="product.quantity === 0" class="out-of-stock-overlay">
        <span class="out-of-stock-text">Out of Stock</span>
      </div>

      <!-- Favorite & Cart buttons (left side, transparent) -->
      <div class="listing-actions">
        <button class="listing-action-btn" :class="{ active: isFavorited }" @click="handleToggleFavorite">
          <Heart class="action-icon" :class="{ 'icon-filled': isFavorited }" />
        </button>
        <button class="listing-action-btn" @click.prevent>
          <ShoppingCart class="action-icon" />
        </button>
      </div>

      <!-- Sale/Bid/Reservation badge (top right) -->
      <span class="listing-badge" :class="listingBadgeClass">
        <Gavel v-if="product.listingType === 'auction'" class="badge-icon" />
        <Calendar v-else-if="product.listingType === 'reservation'" class="badge-icon" />
        <ShoppingCart v-else class="badge-icon" />
        {{ listingBadgeText }}
      </span>
    </div>

    <!-- Info -->
    <div class="listing-info">
      <h3 class="listing-title">{{ title }}</h3>
      <div class="listing-tags">
        <span class="tag-chip tag-category">{{ categoryName }}</span>
        <span v-if="languageLabel" class="tag-chip tag-language">{{ languageLabel }}</span>
        <span v-if="productTypeTagName" class="tag-chip tag-type">{{ productTypeTagName }}</span>
        <span v-if="product.condition" class="tag-chip tag-condition">{{ product.condition }}</span>
      </div>
      <!-- Auction: current price（時間條已在圖片底部，不重複展示） -->
      <template v-if="product.listingType === 'auction' && auctionSummary">
        <div class="listing-price">MOP ${{ Number(auctionSummary.currentPrice || auctionSummary.startingPrice).toLocaleString() }}</div>
      </template>
      <!-- Reservation: price（截單條已在圖片底部，不重複展示） -->
      <template v-else-if="product.listingType === 'reservation'">
        <div class="listing-price">MOP ${{ Number(product.price).toLocaleString() }}</div>
      </template>
      <!-- Sale: plain price -->
      <div v-else class="listing-price">MOP ${{ Number(product.price).toLocaleString() }}</div>
    </div>
  </RouterLink>
</template>

<style scoped lang="scss">
.listing-card {
  position: relative;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: all var(--transition-fast);
  text-decoration: none;

  &:hover {
    border-color: var(--primary);
    transform: translateY(-2px);

    .listing-image img {
      transform: scale(1.05);
    }

    .listing-actions {
      opacity: 1;
    }
  }
}

.listing-image {
  position: relative;
  aspect-ratio: 4/3;
  overflow: hidden;
  background: linear-gradient(135deg, var(--bg-dark) 0%, var(--bg-elevated) 100%);
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform var(--transition-slow);
  }
}

.placeholder-card {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 64px;
  opacity: 0.5;
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

.listing-actions {
  position: absolute;
  top: var(--space-2);
  left: var(--space-2);
  gap: var(--space-1);
  z-index: 10;
  flex-direction: column;
  display: flex;
  opacity: 0;
  transition: opacity var(--transition-base);

  @media (max-width: 768px) {
    opacity: 1;
  }
}

.listing-action-btn {
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  border-radius: var(--radius-full);
  color: #fff;
  cursor: pointer;
  width: 28px;
  height: 28px;
  transition: all var(--transition-fast);
  background: #00000080;
  border: none;
  justify-content: center;
  align-items: center;
  padding: 0;
  display: flex;

  .action-icon {
    width: 14px;
    height: 14px;
  }

  &:hover {
    background: var(--primary);
    transform: scale(1.1);
  }

  &.active {
    background: var(--accent);
  }

  &.active .icon-filled {
    fill: var(--accent);
  }
}

.listing-badge {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  border-radius: var(--radius-sm);
  text-transform: uppercase;
  z-index: 10;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 600;
  display: flex;

  .badge-icon {
    width: 10px;
    height: 10px;
  }

  // Luke 9/16 色制：銷售=綠、拍賣=粉紅、預訂=琥珀
  &.is-auction {
    background: linear-gradient(135deg, #ec4899, #db2777);
    color: #fff;
  }

  &.is-sale {
    background: linear-gradient(135deg, #10b981, #059669);
    color: #fff;
  }

  &.is-reservation {
    background: linear-gradient(135deg, #f59e0b, #d97706);
    color: #fff;
  }
}

.listing-info {
  padding: var(--space-3);
}

.listing-title {
  font-size: var(--text-xs);
  color: var(--text-primary);
  margin-bottom: var(--space-1);
  font-weight: 600;
  // 最多兩行，超出省略
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: normal;
  min-height: 2.4em;
}

// 色框標籤（分類/語言/種類/品相）— 與首頁卡片統一
.listing-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: var(--space-1);
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  font-size: 9px;
  font-weight: 600;
  line-height: 1.5;
  white-space: nowrap;

  &.tag-category {
    background: rgba(102, 126, 234, 0.18);
    color: #8fa3f5;
  }

  &.tag-language {
    background: rgba(236, 72, 153, 0.15);
    color: #f472b6;
  }

  &.tag-type {
    background: rgba(16, 185, 129, 0.15);
    color: #34d399;
  }

  &.tag-condition {
    background: rgba(245, 158, 11, 0.15);
    color: #fbbf24;
  }
}

// Auction/reservation countdown moved to ImageDeadlineBar（圖片底部時間條）
.listing-price {
  font-family: var(--font-num);
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--primary);
}
</style>