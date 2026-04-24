<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { productApi } from '@/api/products'

const { t } = useI18n()
const route = useRoute()

const loading = ref(true)
const product = ref<any>(null)
const currentImageIndex = ref(0)

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
</script>

<template>
  <div class="product-detail">
    <div class="container">
      <div v-if="loading" class="loading-state">
        <p>{{ t('common.loading') || '加载中...' }}</p>
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

          <div class="action-buttons">
            <button class="btn btn-primary btn-lg">{{ t('product.card.buyNow') }}</button>
            <button class="btn btn-outline">{{ t('product.card.addToCart') }}</button>
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

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
}

.product-images {
  /* position: sticky; top: 80px; — removed: was covering text on scroll */
}

.main-image {
  aspect-ratio: 3/4;
  border-radius: var(--radius-xl);
  overflow: hidden;
  background: var(--bg-card);

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.thumbnail-list {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-3);
  overflow-x: auto;
}

.thumbnail {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: var(--radius-md);
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s, border-color 0.2s;
  border: 2px solid transparent;

  &:hover {
    opacity: 1;
  }

  &.active {
    opacity: 1;
    border-color: var(--primary);
  }
}

.loading-state,
.error-state {
  text-align: center;
  padding: var(--space-16);
  color: var(--text-muted);
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
