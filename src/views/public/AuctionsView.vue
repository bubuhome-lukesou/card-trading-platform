<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { Gavel, Clock, Trophy, Loader2 } from 'lucide-vue-next'
import type { Auction } from '@/types'
import { auctionApi } from '@/api/auctions'

const { t } = useI18n()

const auctions = ref<Auction[]>([])
const loading = ref(false)
const activeTab = ref<'live' | 'upcoming' | 'ended'>('live')

const tabs = computed(() => [
  { key: 'live', label: t('auction.live'), icon: Gavel },
  { key: 'upcoming', label: t('auction.upcoming'), icon: Clock },
  { key: 'ended', label: t('auction.ended'), icon: Trophy }
])

const fetchAuctions = async () => {
  loading.value = true
  try {
    const status = activeTab.value === 'live' ? 'active' : activeTab.value
    const response = await auctionApi.getAuctions({ status } as any)
    auctions.value = response.data.data
  } catch (error) {
    console.error('Failed to fetch auctions:', error)
  } finally {
    loading.value = false
  }
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-HK', {
    style: 'currency',
    currency: 'HKD',
    minimumFractionDigits: 0
  }).format(price)
}

const formatTime = (date: string) => {
  const now = new Date()
  const end = new Date(date)
  const diff = end.getTime() - now.getTime()

  if (diff <= 0) return 'Ended'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

const getTimeClass = (date: string) => {
  const now = new Date()
  const end = new Date(date)
  const diff = end.getTime() - now.getTime()
  const hours = diff / (1000 * 60 * 60)
  if (hours < 1) return 'ending-soon'
  if (hours < 24) return 'ending-soon'
  return ''
}

// Lifecycle
fetchAuctions()
</script>

<template>
  <div class="auctions-page">
    <div class="container">
      <h1 class="page-title">{{ t('auction.list') }}</h1>

      <!-- Tabs -->
      <div class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="tab"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key as any; fetchAuctions()"
        >
          <component :is="tab.icon" class="tab-icon" />
          {{ tab.label }}
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <Loader2 class="spinner" />
        <span>{{ t('common.loading') }}</span>
      </div>

      <!-- Empty -->
      <div v-else-if="auctions.length === 0" class="empty-state">
        <Gavel class="empty-icon" />
        <p>{{ t('common.noResults') }}</p>
      </div>

      <!-- Grid -->
      <div v-else class="auctions-grid">
        <RouterLink
          v-for="auction in auctions"
          :key="auction.id"
          :to="`/auction/${auction.id}`"
          class="auction-card"
        >
          <div class="card-image">
            <img
              :src="auction.product?.images[0] || '/placeholder-card.png'"
              :alt="auction.product?.titleEn"
            />
            <span class="status-badge" :class="getTimeClass(auction.endTime)">
              <Clock class="badge-icon" />
              {{ formatTime(auction.endTime) }}
            </span>
          </div>

          <div class="card-info">
            <h3>{{ auction.product?.titleEn || auction.product?.titleZh }}</h3>
            <div class="auction-meta">
              <span class="current-price">{{ formatPrice(auction.currentPrice) }}</span>
              <span class="bid-count">{{ auction.bidCount }} {{ t('product.details.bids') }}</span>
            </div>
          </div>
        </RouterLink>
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

.tabs {
  display: flex;
  gap: var(--space-2);
  background: var(--bg-card);
  padding: var(--space-1);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-8);
  width: fit-content;
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

.auctions-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-6);

  @media (max-width: 1280px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.auction-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  overflow: hidden;
  text-decoration: none;
  transition: all var(--transition-base);

  &:hover {
    border-color: var(--primary);
    transform: translateY(-4px);
    box-shadow: var(--shadow-xl);
  }
}

.card-image {
  position: relative;
  aspect-ratio: 3/4;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.status-badge {
  position: absolute;
  bottom: var(--space-3);
  right: var(--space-3);
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--success);

  .badge-icon {
    width: 14px;
    height: 14px;
  }

  &.ending-soon {
    background: var(--danger-gradient);
    color: white;
    animation: pulse 1s ease-in-out infinite;
  }
}

.card-info {
  padding: var(--space-4);

  h3 {
    font-size: var(--text-base);
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--space-2);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.auction-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.current-price {
  font-family: var(--font-num);
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--success);
}

.bid-count {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
</style>
