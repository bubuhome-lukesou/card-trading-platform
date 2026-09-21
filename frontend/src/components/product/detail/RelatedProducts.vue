<script setup lang="ts">
// 詳情頁共用「你可能喜歡」區塊 — 抽自 ProductDetailView/AuctionDetailView（T7 組件抽離 2026-09-21）
// 內吃 ProductCard；資料由 host 負責 fetch（兩頁 scoring 邏輯相同，暫留 host）
// ⚠️ 樣式自帶完整 scoped CSS（host scoped CSS 命中唔到子組件內部元素 — Vue scoped 原理）
import { useI18n } from 'vue-i18n'
import { Loader2 } from 'lucide-vue-next'
import ProductCard from '@/components/product/ProductCard.vue'

defineProps<{
  products: any[]
  loading: boolean
}>()

const { locale } = useI18n()
</script>

<template>
  <section v-if="products.length > 0" class="d-related">
    <h2 class="related-title">{{ locale === 'zh' ? '你可能喜歡' : 'You May Also Like' }}</h2>
    <div v-if="loading" class="related-loading">
      <Loader2 class="spinner" />
    </div>
    <div v-else class="related-grid">
      <ProductCard
        v-for="p in products"
        :key="p.id"
        :product="p"
      />
    </div>
  </section>
</template>

<style scoped>
/* ===== Related（源：ProductDetailView L1406-1437 + 統一裝飾條） ===== */
.d-related {
  margin-top: 56px;
  padding-top: 8px;
}
.related-title {
  font-size: 1.35rem;
  font-weight: 800;
  color: #f4f4f8;
  margin-bottom: 20px;
  letter-spacing: -0.01em;
  position: relative;
  padding-left: 16px;
}
.related-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 24px;
  border-radius: 2px;
  background: linear-gradient(180deg, #6366f1, #818cf8);
}
.related-loading {
  display: flex;
  justify-content: center;
  padding: 40px;
}
.related-loading .spinner {
  width: 28px;
  height: 28px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: d-related-spin 0.8s linear infinite;
}
@keyframes d-related-spin {
  to { transform: rotate(360deg); }
}
.related-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}
@media (max-width: 768px) {
  .related-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>