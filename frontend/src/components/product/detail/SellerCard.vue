<script setup lang="ts">
// 詳情頁共用賣家卡 — 抽自 ProductDetailView/AuctionDetailView（T7 組件抽離 2026-09-21）
// 可點擊 → 跳轉該商家 marketplace 篩選頁
// ⚠️ 樣式自帶完整 scoped CSS（host scoped CSS 命中唔到子組件內部元素 — Vue scoped 原理）
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const props = defineProps<{
  seller: any
}>()

const { locale } = useI18n()
const router = useRouter()

const goToSellerMarketplace = () => {
  const sellerId = props.seller?.id
  if (sellerId) router.push({ path: '/marketplace', query: { sellers: sellerId } })
}
</script>

<template>
  <div v-if="seller" class="d-seller" @click="goToSellerMarketplace" :title="locale === 'zh' ? '查看此商家全部商品' : 'View all products from this seller'">
    <span class="seller-label">{{ locale === 'zh' ? '商鋪' : 'Seller' }}</span>
    <div class="seller-avatar-sm">{{ (seller.nickname || '?').charAt(0) }}</div>
    <span class="seller-name-text">{{ seller.nickname || (locale === 'zh' ? '未知商家' : 'Unknown Seller') }}</span>
    <span class="seller-arrow">→</span>
  </div>
</template>

<style scoped>
/* ===== Seller row（源：ProductDetailView L893-948） ===== */
.d-seller {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: var(--bg-elevated, rgba(255, 255, 255, 0.04));
  border-radius: 10px;
  width: fit-content;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}
.d-seller:hover {
  background: rgba(102, 126, 234, 0.15);
  border-color: rgba(102, 126, 234, 0.4);
}
.d-seller .seller-arrow {
  font-size: 14px;
  color: #8fa3f5;
  opacity: 0.5;
  transition: all 0.2s ease;
}
.d-seller:hover .seller-arrow {
  transform: translateX(3px);
  opacity: 1;
}
.seller-label {
  font-size: 0.75rem;
  color: rgba(160, 160, 176, 0.8);
  font-weight: 400;
}
.seller-avatar-sm {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}
.seller-name-text {
  font-size: 0.9rem;
  font-weight: 500;
  color: rgba(200, 200, 214, 0.9);
}
</style>