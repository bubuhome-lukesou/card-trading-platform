<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { ArrowRight, Zap, Clock, Star } from 'lucide-vue-next'

const { t } = useI18n()

const categories = [
  { id: 'pokemon', emoji: '🎮', name: 'home.categories.pokemon' },
  { id: 'yugioh', emoji: '🐉', name: 'home.categories.yugioh' },
  { id: 'mtg', emoji: '🧙', name: 'home.categories.mtg' },
  { id: 'ultraman', emoji: '👾', name: 'home.categories.ultraman' },
  { id: 'onepiece', emoji: '⚔️', name: 'home.categories.onepiece' },
  { id: 'doraemon', emoji: '🤖', name: 'home.categories.doraemon' },
  { id: 'sports', emoji: '⚽', name: 'home.categories.sports' },
  { id: 'other', emoji: '🎴', name: 'home.categories.other' }
]

const hotAuctions = ref([
  { id: 1, title: 'Pokemon 1st Edition Base Set', price: 12800, bids: 23, ends: '2h 30m', image: '' },
  { id: 2, title: 'Yu-Gi-Oh Blue-Eyes White Dragon', price: 6800, bids: 15, ends: '5h 15m', image: '' },
  { id: 3, title: 'MTG Black Lotus', price: 25000, bids: 8, ends: '12h', image: '' }
])

const newListings = ref([
  { id: 4, title: 'One Piece NARUTO', price: 3200, condition: 'Near Mint', image: '' },
  { id: 5, title: 'Doraemon Figure Collection', price: 1800, condition: 'Mint', image: '' },
  { id: 6, title: 'Ultraman Ultra Medal Set', price: 950, condition: 'Excellent', image: '' },
  { id: 7, title: 'Sports Card Bundle', price: 2600, condition: 'Good', image: '' },
  { id: 8, title: 'Vintage Card Assortment', price: 4200, condition: 'Fair', image: '' }
])

const stats = ref([
  { value: '10,000+', label: 'auctions' },
  { value: '5,000+', label: 'users' },
  { value: '98%', label: 'satisfaction' }
])
</script>

<template>
  <div class="home">
    <!-- Hero Banner -->
    <section class="hero-banner">
      <div class="banner-content">
        <h1 class="banner-title">
          <span class="gradient-text">{{ t('home.hero.title') }}</span>
        </h1>
        <p class="banner-subtitle">{{ t('home.hero.subtitle') }}</p>
        <div class="banner-actions">
          <RouterLink to="/auctions" class="btn btn-primary btn-lg">
            <Zap class="icon" />
            {{ t('home.hero.bidNow') }}
          </RouterLink>
          <RouterLink to="/marketplace" class="btn btn-outline btn-lg">
            {{ t('home.hero.browse') }}
            <ArrowRight class="icon" />
          </RouterLink>
        </div>
      </div>
      <div class="banner-bg">
        <div class="gradient-orb orb-1"></div>
        <div class="gradient-orb orb-2"></div>
      </div>
    </section>

    <!-- Stats -->
    <section class="stats-bar">
      <div class="container">
        <div class="stats-grid">
          <div v-for="stat in stats" :key="stat.label" class="stat-item">
            <span class="stat-value">{{ stat.value }}</span>
            <span class="stat-label">{{ t(`home.stats.${stat.label}`) }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Categories -->
    <section class="section categories-section">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">
            <span class="emoji">📂</span>
            {{ t('home.categories.title') }}
          </h2>
          <RouterLink to="/marketplace" class="see-all">
            {{ t('home.seeAll') }}
            <ArrowRight class="icon" />
          </RouterLink>
        </div>
        <div class="categories-grid">
          <RouterLink
            v-for="cat in categories"
            :key="cat.id"
            :to="`/marketplace?category=${cat.id}`"
            class="category-card"
          >
            <span class="category-emoji">{{ cat.emoji }}</span>
            <span class="category-name">{{ t(cat.name) }}</span>
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- Hot Auctions -->
    <section class="section auctions-section">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">
            <span class="emoji hot">🔥</span>
            {{ t('home.hotAuctions.title') }}
          </h2>
          <RouterLink to="/auctions?status=active" class="see-all">
            {{ t('home.seeAll') }}
            <ArrowRight class="icon" />
          </RouterLink>
        </div>
        <div class="auctions-grid">
          <RouterLink
            v-for="auction in hotAuctions"
            :key="auction.id"
            :to="`/auction/${auction.id}`"
            class="auction-card"
          >
            <div class="auction-image">
              <div class="placeholder-card">🃏</div>
              <div class="auction-badge hot">🔥 {{ t('home.auctionStatus.live') }}</div>
            </div>
            <div class="auction-info">
              <h3 class="auction-title">{{ auction.title }}</h3>
              <div class="auction-meta">
                <span class="auction-price">HK$ {{ auction.price.toLocaleString() }}</span>
                <span class="auction-bids">{{ auction.bids }} {{ t('home.auctionStatus.bids') }}</span>
              </div>
              <div class="auction-timer">
                <Clock class="icon" />
                <span>{{ auction.ends }}</span>
              </div>
            </div>
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- New Listings -->
    <section class="section listings-section">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">
            <span class="emoji new">✨</span>
            {{ t('home.newListings.title') }}
          </h2>
          <RouterLink to="/marketplace?sort=newest" class="see-all">
            {{ t('home.seeAll') }}
            <ArrowRight class="icon" />
          </RouterLink>
        </div>
        <div class="listings-grid">
          <RouterLink
            v-for="item in newListings"
            :key="item.id"
            :to="`/product/${item.id}`"
            class="listing-card"
          >
            <div class="listing-image">
              <div class="placeholder-card">🃏</div>
              <div class="listing-condition">{{ item.condition }}</div>
            </div>
            <div class="listing-info">
              <h3 class="listing-title">{{ item.title }}</h3>
              <div class="listing-price">HK$ {{ item.price.toLocaleString() }}</div>
            </div>
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="section cta-section">
      <div class="container">
        <div class="cta-card">
          <div class="cta-content">
            <h2>{{ t('home.cta.title') }}</h2>
            <p>{{ t('home.cta.desc') }}</p>
            <RouterLink to="/seller" class="btn btn-primary btn-lg">
              {{ t('home.cta.button') }}
            </RouterLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.home {
  background: var(--bg-dark);
}

// Hero Banner
.hero-banner {
  position: relative;
  padding: var(--space-16) var(--space-6);
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: linear-gradient(180deg, var(--bg-card) 0%, var(--bg-dark) 100%);
}

.banner-content {
  position: relative;
  z-index: 2;
  text-align: center;
  max-width: 700px;
}

.banner-title {
  font-family: var(--font-display);
  font-size: clamp(2rem, 6vw, 3.5rem);
  font-weight: 900;
  margin-bottom: var(--space-4);
  letter-spacing: -0.02em;
}

.banner-subtitle {
  font-size: var(--text-lg);
  color: var(--text-secondary);
  margin-bottom: var(--space-8);
}

.banner-actions {
  display: flex;
  gap: var(--space-4);
  justify-content: center;
  flex-wrap: wrap;

  .icon {
    width: 20px;
    height: 20px;
  }
}

.banner-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.3;

  &.orb-1 {
    width: 400px;
    height: 400px;
    background: var(--primary);
    top: -100px;
    left: -100px;
  }

  &.orb-2 {
    width: 300px;
    height: 300px;
    background: var(--accent);
    bottom: -50px;
    right: -50px;
  }
}

// Stats Bar
.stats-bar {
  background: var(--bg-card);
  padding: var(--space-6) 0;
  border-bottom: 1px solid var(--border);
}

.stats-grid {
  display: flex;
  justify-content: center;
  gap: var(--space-16);
  flex-wrap: wrap;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 700;
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-label {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

// Sections
.section {
  padding: var(--space-12) 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-6);
}

.section-title {
  font-size: var(--text-xl);
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: var(--space-2);

  .emoji {
    font-size: 24px;
    &.hot { animation: pulse 1.5s infinite; }
    &.new { animation: sparkle 2s infinite; }
  }
}

.see-all {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-sm);
  color: var(--primary);
  text-decoration: none;
  transition: gap var(--transition-fast);

  &:hover {
    gap: var(--space-2);
  }

  .icon {
    width: 16px;
    height: 16px;
  }
}

// Categories Grid
.categories-section {
  background: var(--bg-dark);
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: var(--space-3);

  @media (max-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }

  @media (max-width: 640px) {
    grid-template-columns: repeat(4, 1fr);
  }
}

.category-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-2);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  text-decoration: none;
  transition: all var(--transition-fast);

  &:hover {
    border-color: var(--primary);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
}

.category-emoji {
  font-size: 32px;
}

.category-name {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  text-align: center;
}

// Auctions Grid
.auctions-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-6);

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
}

.auction-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  overflow: hidden;
  text-decoration: none;
  transition: all var(--transition-fast);

  &:hover {
    border-color: var(--primary);
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }
}

.auction-image {
  position: relative;
  aspect-ratio: 4/3;
  background: linear-gradient(135deg, var(--bg-dark) 0%, var(--bg-elevated) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-card {
  font-size: 64px;
  opacity: 0.5;
}

.auction-badge {
  position: absolute;
  top: var(--space-3);
  left: var(--space-3);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 600;
  background: rgba(0, 0, 0, 0.7);

  &.hot {
    background: var(--danger-gradient);
  }
}

.auction-info {
  padding: var(--space-4);
}

.auction-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.auction-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}

.auction-price {
  font-family: var(--font-num);
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--primary);
}

.auction-bids {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.auction-timer {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
  color: var(--accent);

  .icon {
    width: 14px;
    height: 14px;
  }
}

// Listings Grid
.listings-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--space-4);

  @media (max-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }

  @media (max-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.listing-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  text-decoration: none;
  transition: all var(--transition-fast);

  &:hover {
    border-color: var(--primary);
    transform: translateY(-2px);
  }
}

.listing-image {
  position: relative;
  aspect-ratio: 1;
  background: linear-gradient(135deg, var(--bg-dark) 0%, var(--bg-elevated) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.listing-condition {
  position: absolute;
  bottom: var(--space-2);
  left: var(--space-2);
  padding: 2px var(--space-2);
  background: rgba(0, 0, 0, 0.7);
  border-radius: var(--radius-sm);
  font-size: 10px;
  color: var(--text-muted);
}

.listing-info {
  padding: var(--space-3);
}

.listing-title {
  font-size: var(--text-xs);
  color: var(--text-primary);
  margin-bottom: var(--space-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.listing-price {
  font-family: var(--font-num);
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--primary);
}

// CTA Section
.cta-card {
  background: var(--primary-gradient);
  border-radius: var(--radius-2xl);
  padding: var(--space-12);
  text-align: center;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  }

  h2 {
    font-size: var(--text-2xl);
    font-weight: 700;
    color: white;
    margin-bottom: var(--space-3);
    position: relative;
  }

  p {
    font-size: var(--text-base);
    color: rgba(255, 255, 255, 0.9);
    margin-bottom: var(--space-6);
    position: relative;
  }

  .btn-primary {
    background: white;
    color: var(--primary-dark);

    &:hover {
      opacity: 0.9;
    }
  }
}

// Animations
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

@keyframes sparkle {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

// Buttons
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-lg);
  font-size: var(--text-base);
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  border: none;

  &-primary {
    background: var(--primary-gradient);
    color: white;

    &:hover {
      opacity: 0.9;
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
    }
  }

  &-outline {
    background: transparent;
    border: 2px solid var(--border);
    color: var(--text-primary);

    &:hover {
      border-color: var(--primary);
      color: var(--primary);
    }
  }

  &-lg {
    padding: var(--space-4) var(--space-8);
    font-size: var(--text-lg);
  }

  .icon {
    width: 20px;
    height: 20px;
  }
}

// Container
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-6);
}
</style>
