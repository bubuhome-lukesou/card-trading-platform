<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Gavel, Clock, Trophy, Loader2 } from 'lucide-vue-next'
import { auctionApi } from '@/api/auctions'
import { productApi } from '@/api/products'
import ProductCard from '@/components/product/ProductCard.vue'

const { t } = useI18n()

const cards = ref<any[]>([]) // 統一 product-shape 卡片數據
const loading = ref(false)
const activeTab = ref<'live' | 'upcoming' | 'ended'>('live')
const hideEnded = ref(true)

const tabs = computed(() => [
  { key: 'live', label: t('auction.live'), icon: Gavel },
  { key: 'upcoming', label: t('auction.upcoming'), icon: Clock },
  { key: 'ended', label: t('auction.ended'), icon: Trophy }
])

// 把 auction 記錄映射成 product-shape（與 ProductCard 兼容）
const mapAuctionToCard = (a: any) => {
  const product = a.product || {}
  if (typeof product.images === 'string') {
    try { product.images = JSON.parse(product.images) } catch { product.images = [] }
  }
  return {
    id: a.productId || product.id,
    titleZh: product.titleZh,
    titleEn: product.titleEn,
    images: product.images || [],
    category: product.category,
    condition: product.condition,
    language: product.language,
    productType: product.productType,
    listingType: 'auction',
    quantity: product.quantity,
    // 拍賣即時資訊透過 auctionSummary 附帶
    price: a.currentPrice,
    auctionSummary: {
      auctionId: a.id,
      currentPrice: a.currentPrice,
      startingPrice: a.startingPrice,
      bidCount: a.bidCount || 0,
      endTime: a.endTime,
      status: a.status,
    },
  }
}

const fetchCards = async () => {
  loading.value = true
  try {
    if (activeTab.value === 'ended') {
      // 已結束拍賣：商品可能已售或恢復 active，products API 無法可靠查詢，用 auctions API
      const res = await auctionApi.getAuctions({ status: 'ended' } as any)
      cards.value = (res.data.data || []).map(mapAuctionToCard)
    } else {
      // 進行中/即將開始：統一 /api/products，按 auctionSummary.status 過濾
      const wanted = activeTab.value === 'live' ? 'active' : 'pending'
      const res = await productApi.getProducts({
        listingTypes: ['auction'],
        withAuction: true,
        sortBy: 'newest',
        limit: 50,
        hideSold: false,
      } as any)
      cards.value = (res.data.data || [])
        .filter((p: any) => p.auctionSummary?.status === wanted)
        .map((p: any) => ({
          ...p,
          price: p.auctionSummary.currentPrice || p.auctionSummary.startingPrice,
        }))
    }
  } catch (error) {
    console.error('Failed to fetch auctions:', error)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auctions-page">
    <div class="container">
      <h1 class="page-title">{{ t('auction.list') }}</h1>

      <!-- Tabs -->
      <div class="tabs-row">
        <div class="tabs">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="tab"
            :class="{ active: activeTab === tab.key }"
            @click="activeTab = tab.key as any; fetchCards()"
          >
            <component :is="tab.icon" class="tab-icon" />
            {{ tab.label }}
          </button>
        </div>

        <!-- Hide Ended Toggle -->
        <label class="hide-ended-toggle">
          <input
            type="checkbox"
            v-model="hideEnded"
          />
          <span class="toggle-track" :class="{ active: hideEnded }">
            <span class="toggle-thumb" />
          </span>
          <span class="toggle-label">{{ t('auction.hideEnded') || '隱藏已結束' }}</span>
        </label>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <Loader2 class="spinner" />
        <span>{{ t('common.loading') }}</span>
      </div>

      <!-- Empty -->
      <div v-else-if="cards.length === 0" class="empty-state">
        <Gavel class="empty-icon" />
        <p>{{ t('common.noResults') }}</p>
      </div>

      <!-- Grid — 統一 ProductCard -->
      <div v-else class="products-grid">
        <ProductCard
          v-for="card in cards"
          :key="card.id + '-' + card.auctionSummary?.auctionId"
          :product="card as any"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.auctions-page {
  padding: var(--space-8) 0 var(--space-16);
}

.page-title {
  font-size: var(--text-3xl);
  font-weight: 700;
  margin-bottom: var(--space-8);
}

.tabs-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-8);
  flex-wrap: wrap;
  gap: var(--space-4);
}

.tabs {
  display: flex;
  gap: var(--space-2);
  background: var(--bg-card);
  padding: var(--space-1);
  border-radius: var(--radius-lg);
  width: fit-content;
}

// Hide Ended Toggle
.hide-ended-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  user-select: none;

  input[type="checkbox"] {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-track {
    position: relative;
    width: 36px;
    height: 20px;
    background: var(--border);
    border-radius: var(--radius-full);
    transition: background var(--transition-fast);
    flex-shrink: 0;

    &.active {
      background: var(--primary);
    }
  }

  .toggle-thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    background: white;
    border-radius: 50%;
    transition: transform var(--transition-fast);

    .active & {
      transform: translateX(16px);
    }
  }

  .toggle-label {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    white-space: nowrap;
  }
}

.tab {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-6);
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  color: var(--text-muted);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    color: var(--text-secondary);
  }

  &.active {
    background: var(--primary-gradient);
    color: white;
  }

  .tab-icon {
    width: 18px;
    height: 18px;
  }
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-16);
  gap: var(--space-4);
  color: var(--text-muted);
}

.spinner {
  width: 32px;
  height: 32px;
  animation: spin 1s linear infinite;
}

.empty-icon {
  width: 64px;
  height: 64px;
  opacity: 0.5;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

// 與 Marketplace 一致嘅 grid
.products-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-5);

  @media (max-width: 1280px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>