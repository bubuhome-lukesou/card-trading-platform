<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { ArrowRight, Shield, Zap, Globe, Headphones } from 'lucide-vue-next'

const { t } = useI18n()

const categories = [
  { id: 'pokemon', emoji: '🎮', name: 'pokemon' },
  { id: 'yugioh', emoji: '🐉', name: 'yugioh' },
  { id: 'mtg', emoji: '🧙', name: 'mtg' },
  { id: 'ultraman', emoji: '👾', name: 'ultraman' },
  { id: 'onepiece', emoji: '⚔️', name: 'onepiece' },
  { id: 'other', emoji: '🎴', name: 'other' }
]

const features = [
  { icon: Shield, titleKey: 'home.whyUs.security', desc: 'Secure payment protection' },
  { icon: Zap, titleKey: 'home.whyUs.fast', desc: 'Instant transaction settlement' },
  { icon: Globe, titleKey: 'home.whyUs.global', desc: 'Worldwide shipping available' },
  { icon: Headphones, titleKey: 'home.whyUs.support', desc: '24/7 customer support' }
]
</script>

<template>
  <div class="home">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-bg">
        <div class="hero-gradient" />
        <div class="floating-cards">
          <div class="floating-card" style="--delay: 0s" />
          <div class="floating-card" style="--delay: 1s" />
          <div class="floating-card" style="--delay: 2s" />
          <div class="floating-card" style="--delay: 3s" />
        </div>
      </div>

      <div class="container hero-content">
        <h1 class="hero-title">
          <span class="gradient-text">{{ t('home.hero.title') }}</span>
        </h1>
        <p class="hero-subtitle">{{ t('home.hero.subtitle') }}</p>
        <div class="hero-actions">
          <RouterLink to="/auctions" class="btn btn-primary btn-lg">
            {{ t('home.hero.bidNow') }}
            <Gavel class="icon" />
          </RouterLink>
          <RouterLink to="/marketplace" class="btn btn-outline btn-lg">
            {{ t('home.hero.browse') }}
            <ArrowRight class="icon" />
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- Categories -->
    <section class="categories">
      <div class="container">
        <h2 class="section-title">{{ t('home.categories.title') }}</h2>
        <div class="categories-grid">
          <RouterLink
            v-for="cat in categories"
            :key="cat.id"
            :to="`/marketplace?category=${cat.id}`"
            class="category-card"
          >
            <span class="category-emoji">{{ cat.emoji }}</span>
            <span class="category-name">{{ t(`home.categories.${cat.name}`) }}</span>
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="features">
      <div class="container">
        <h2 class="section-title">{{ t('home.whyUs.title') }}</h2>
        <div class="features-grid">
          <div v-for="feat in features" :key="feat.titleKey" class="feature-card">
            <div class="feature-icon">
              <component :is="feat.icon" />
            </div>
            <h3>{{ t(feat.titleKey) }}</h3>
            <p>{{ feat.desc }}</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.home {
  overflow-x: hidden;
}

// Hero
.hero {
  position: relative;
  min-height: calc(100vh - 64px);
  display: flex;
  align-items: center;
  padding: var(--space-20) 0;

  &-bg {
    position: absolute;
    inset: 0;
    overflow: hidden;
  }

  &-gradient {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 30% 50%, rgba(102, 126, 234, 0.15) 0%, transparent 50%),
                radial-gradient(circle at 70% 80%, rgba(118, 75, 162, 0.1) 0%, transparent 40%);
  }

  &-content {
    position: relative;
    text-align: center;
    max-width: 800px;
    margin: 0 auto;
  }
}

.hero-title {
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 8vw, 4.5rem);
  font-weight: 900;
  line-height: 1.1;
  margin-bottom: var(--space-6);
  letter-spacing: -0.02em;
}

.hero-subtitle {
  font-size: var(--text-xl);
  color: var(--text-secondary);
  max-width: 600px;
  margin: 0 auto var(--space-8);
}

.hero-actions {
  display: flex;
  gap: var(--space-4);
  justify-content: center;
  flex-wrap: wrap;

  .icon {
    width: 20px;
    height: 20px;
  }
}

.floating-cards {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.floating-card {
  position: absolute;
  width: 80px;
  height: 112px;
  background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 100%);
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.1);
  animation: float 6s ease-in-out infinite;
  animation-delay: var(--delay);

  &:nth-child(1) { top: 10%; left: 5%; }
  &:nth-child(2) { top: 60%; left: 8%; transform: rotate(-15deg); }
  &:nth-child(3) { top: 20%; right: 5%; transform: rotate(10deg); }
  &:nth-child(4) { top: 70%; right: 10%; transform: rotate(-5deg); }

  @media (max-width: 768px) {
    display: none;
  }
}

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(5deg); }
}

// Sections
.section-title {
  text-align: center;
  font-size: var(--text-3xl);
  font-weight: 700;
  margin-bottom: var(--space-12);
}

// Categories
.categories {
  padding: var(--space-20) 0;
  background: var(--bg-card);
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: var(--space-4);

  @media (max-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.category-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-6);
  background: var(--bg-dark);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  text-decoration: none;
  transition: all var(--transition-base);

  &:hover {
    border-color: var(--primary);
    transform: translateY(-4px);
    box-shadow: var(--shadow-glow);

    .category-emoji {
      transform: scale(1.1);
    }
  }
}

.category-emoji {
  font-size: 3rem;
  transition: transform var(--transition-base);
}

.category-name {
  font-weight: 600;
  color: var(--text-primary);
  font-size: var(--text-sm);
}

// Features
.features {
  padding: var(--space-20) 0;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-6);

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
}

.feature-card {
  text-align: center;
  padding: var(--space-8);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  transition: all var(--transition-base);

  &:hover {
    border-color: var(--primary);
    transform: translateY(-4px);
  }

  h3 {
    font-size: var(--text-lg);
    margin: var(--space-4) 0 var(--space-2);
  }

  p {
    font-size: var(--text-sm);
    color: var(--text-muted);
  }
}

.feature-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto;
  background: var(--primary-gradient);
  border-radius: var(--radius-xl);
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 32px;
    height: 32px;
    color: white;
  }
}
</style>
