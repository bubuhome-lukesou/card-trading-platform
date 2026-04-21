<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

const { t } = useI18n()
const route = useRoute()

const product = ref({
  id: route.params.id,
  titleEn: 'Loading...',
  titleZh: '加载中...',
  price: 0,
  images: [],
  category: '',
  brand: '',
  series: '',
  rarity: 'SSR',
  condition: 'near_mint',
  descriptionEn: '',
  descriptionZh: '',
  seller: { nickname: '', rating: 0 }
})
</script>

<template>
  <div class="product-detail">
    <div class="container">
      <div class="product-layout">
        <!-- Images -->
        <div class="product-images">
          <div class="main-image">
            <img :src="product.images[0] || '/placeholder-card.png'" :alt="product.titleEn" />
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
            <span class="meta-item">{{ t(`conditions.${product.condition}`) }}</span>
          </div>

          <div class="price-section">
            <span class="price-label">{{ t('product.details.price') }}</span>
            <span class="price">HK$ {{ product.price.toLocaleString() }}</span>
          </div>

          <div class="action-buttons">
            <button class="btn btn-primary btn-lg">{{ t('product.card.buyNow') }}</button>
            <button class="btn btn-outline">{{ t('product.card.addToCart') }}</button>
          </div>
        </div>
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

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
}

.product-images {
  position: sticky;
  top: 80px;
}

.main-image {
  aspect-ratio: 3/4;
  border-radius: var(--radius-xl);
  overflow: hidden;
  background: var(--bg-card);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.product-info {
  padding: var(--space-4) 0;
}

.product-title {
  font-size: var(--text-3xl);
  font-weight: 700;
  margin-bottom: var(--space-2);
}

.product-subtitle {
  font-size: var(--text-lg);
  color: var(--text-muted);
  margin-bottom: var(--space-4);
}

.product-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-muted);
  margin-bottom: var(--space-8);
}

.price-section {
  margin-bottom: var(--space-8);
}

.price-label {
  display: block;
  font-size: var(--text-sm);
  color: var(--text-muted);
  margin-bottom: var(--space-2);
}

.price {
  font-family: var(--font-num);
  font-size: var(--text-4xl);
  font-weight: 700;
  color: var(--primary);
}

.action-buttons {
  display: flex;
  gap: var(--space-4);

  .btn {
    flex: 1;
  }
}
</style>
