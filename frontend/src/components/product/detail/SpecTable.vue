<script setup lang="ts">
// 詳情頁共用規格表 — 抽自 ProductDetailView/AuctionDetailView（T7 組件抽離 2026-09-21）
// 兩行式 spec table：品牌/語言、品相/種類、標籤（可選）、商品編號（可選，點擊複製）
// ⚠️ 樣式自帶完整 scoped CSS（host scoped CSS 命中唔到子組件內部元素 — Vue scoped 原理）
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Copy } from 'lucide-vue-next'
import { CategoryLogo } from '@/components/brand/CategoryLogos'
import { useProductInfo } from '@/composables/useProductInfo'

defineProps<{
  product: any
  conditionColor?: string
}>()

const router = useRouter()
const { locale } = useI18n()
const {
  getCategoryLabel,
  getLanguageLabel,
  getProductTypeLabel,
  getGeneralTags,
  copied,
  copyProductNumber,
} = useProductInfo()

const conditionText = (c: string) =>
  locale.value === 'zh'
    ? '品, ' + (({ S: '完美品相', A: '輕微瑕疵', B: '正常使用痕跡', C: '較明顯磨損', D: '嚴重磨損' } as Record<string, string>)[c] || '')
    : ''

const goTagMarketplace = (tagName: string) => {
  router.push({ path: '/marketplace', query: { search: tagName } })
}
</script>

<template>
  <div class="d-spec">
    <div class="spec-row">
      <div class="spec-cell">
        <span class="spec-label">{{ locale === 'zh' ? '品牌' : 'Brand' }}</span>
        <span class="spec-value"><span class="spec-logo"><CategoryLogo :category="product?.category || 'other'" :size="16" /></span> {{ getCategoryLabel(product?.category || 'other') }}</span>
      </div>
      <div class="spec-cell">
        <span class="spec-label">{{ locale === 'zh' ? '語言' : 'Language' }}</span>
        <span class="spec-value">{{ getLanguageLabel(product?.language) || '—' }}</span>
      </div>
    </div>
    <div class="spec-row">
      <div class="spec-cell">
        <span class="spec-label">{{ locale === 'zh' ? '品相' : 'Condition' }}</span>
        <span class="spec-value">
          <template v-if="product?.condition">
            <span class="condition-dot" :style="{ backgroundColor: conditionColor || '#6366f1' }"></span>
            {{ product.condition }}{{ conditionText(product.condition) }}
          </template>
          <template v-else>—</template>
        </span>
      </div>
      <div class="spec-cell">
        <span class="spec-label">{{ locale === 'zh' ? '商品種類' : 'Type' }}</span>
        <span class="spec-value">{{ getProductTypeLabel(product?.productType) }}</span>
      </div>
    </div>
    <div class="spec-row" v-if="getGeneralTags(product).length > 0">
      <div class="spec-cell spec-cell-full">
        <span class="spec-label">{{ locale === 'zh' ? '其它標籤' : 'Tags' }}</span>
        <span class="spec-value spec-tags">
          <span
            v-for="tag in getGeneralTags(product)"
            :key="tag.id"
            class="tag-chip"
            :style="tag.color ? { '--tag-color': tag.color } : {}"
            @click="goTagMarketplace(tag.name)"
          >
            <span class="tag-dot" :style="{ backgroundColor: tag.color || '#818cf8' }"></span>
            {{ tag.name }}
          </span>
        </span>
      </div>
    </div>
    <div class="spec-row" v-if="product?.productNumber">
      <div class="spec-cell spec-cell-full">
        <span class="spec-label">{{ locale === 'zh' ? '商品編號' : 'Item No.' }}</span>
        <span class="spec-value product-number" @click="copyProductNumber(product.productNumber)" :title="locale === 'zh' ? '點擊複製' : 'Click to copy'">
          {{ product.productNumber }}
          <Copy v-if="copied" :size="12" class="copied-icon" />
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ===== Spec table（源：ProductDetailView L969-1087，$var → literal） ===== */
.d-spec {
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.02);
  min-width: 0;
  max-width: 100%;
}
.spec-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-width: 0;
}
.spec-row + .spec-row {
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}
.spec-cell {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  overflow-wrap: break-word;
  word-break: break-word;
}
.spec-cell + .spec-cell {
  border-left: 1px solid rgba(255, 255, 255, 0.12);
}
.spec-cell-full {
  grid-column: 1 / -1;
  border-left: none;
}
.spec-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: #6b6b7b;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.spec-value {
  font-size: 0.92rem;
  font-weight: 600;
  color: #f4f4f8;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.condition-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 8px currentColor;
}
.spec-tags {
  gap: 8px;
}
.product-number {
  cursor: pointer;
  font-family: var(--font-num, monospace);
  letter-spacing: 0.04em;
  user-select: all;
  transition: color 0.15s;
}
.product-number:hover {
  color: #6366f1;
}
.copied-icon {
  color: #6366f1;
}
.spec-logo {
  display: inline-flex;
  align-items: center;
}
/* Tag chips */
.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 100px;
  font-size: 0.75rem;
  font-weight: 500;
  background: color-mix(in srgb, var(--tag-color, #818cf8) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--tag-color, #818cf8) 30%, transparent);
  color: var(--tag-color, #818cf8);
  cursor: pointer;
  transition: all 0.2s ease;
}
.tag-chip:hover {
  transform: translateY(-1px);
  background: color-mix(in srgb, var(--tag-color, #818cf8) 18%, transparent);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--tag-color, #818cf8) 20%, transparent);
}
.tag-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>