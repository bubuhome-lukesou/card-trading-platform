<script setup lang="ts">
/**
 * 橫向滑動商品列表（最新上架/熱門拍賣/熱門預訂共用）
 * 9/16 重構：取代 HomeView 三個 inline 重複區塊（~400 行）→ 單一組件
 * - 內部用 ProductCard，卡片改動自動同步 Home / Marketplace
 * - scroll-snap + 左右箭頭（到邊隱藏）+ 手機也顯示（30px 貼邊）
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-vue-next'
import ProductCard from '@/components/product/ProductCard.vue'

const props = defineProps<{
  /** i18n 標題 key，如 home.newListings.title */
  titleKey: string
  /** 區塊 emoji */
  emoji: string
  /** 查看全部跳轉 */
  seeAllTo: string
  items: any[]
  loading?: boolean
}>()

const scrollElRef = ref<HTMLElement | null>(null)
const scrollState = ref<{ canLeft: boolean; canRight: boolean }>({ canLeft: false, canRight: false })

const { t } = useI18n()

const computeState = (el: HTMLElement | null) => {
  if (!el) return { canLeft: false, canRight: false }
  const overflow = el.scrollWidth > el.clientWidth + 4
  if (!overflow) return { canLeft: false, canRight: false }
  return {
    canLeft: el.scrollLeft > 4,
    canRight: el.scrollLeft < el.scrollWidth - el.clientWidth - 4,
  }
}

const updateState = () => {
  scrollState.value = computeState(scrollElRef.value)
}

const scrollBy = (dir: 1 | -1) => {
  const el = scrollElRef.value
  if (!el) return
  const card = el.querySelector('.listing-card') as HTMLElement | null
  const step = card ? card.offsetWidth + 16 : 260
  el.scrollBy({ left: dir * step * 2, behavior: 'smooth' })
}

onMounted(() => {
  updateState()
  scrollElRef.value?.addEventListener('scroll', updateState, { passive: true })
  window.addEventListener('resize', updateState)
  // 首屏圖片/字體載入後佈局可能變化 → 再重算
  setTimeout(updateState, 800)
})
</script>

<template>
  <div class="listings-carousel">
    <div class="scroll-wrapper">
      <div class="listings-scroll" ref="scrollElRef">
        <ProductCard
          v-for="item in items"
          :key="item.id"
          :product="item"
        />
        <slot v-if="!loading && items.length === 0" />
      </div>
      <button class="scroll-arrow scroll-arrow-left" :class="{ hidden: !scrollState.canLeft }" @click="scrollBy(-1)" aria-label="scroll left">
        <ChevronLeft class="arrow-icon" />
      </button>
      <button class="scroll-arrow scroll-arrow-right" :class="{ hidden: !scrollState.canRight }" @click="scrollBy(1)" aria-label="scroll right">
        <ChevronRight class="arrow-icon" />
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.listings-carousel {
  width: 100%;
}

.listings-scroll {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-x;
  padding: 4px 2px 12px;
  scrollbar-width: none;

  &::-webkit-scrollbar { display: none; }

  :deep(.listing-card) {
    flex: 0 0 auto;
    scroll-snap-align: start;
    width: 218px;
  }
}

.scroll-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(10, 10, 15, 0.75);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid var(--border);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 20;
  transition: all 0.2s ease;

  &.hidden { opacity: 0; pointer-events: none; }
  &:hover { background: rgba(99, 102, 241, 0.35); }
}

.scroll-arrow-left { left: -16px; }
.scroll-arrow-right { right: -16px; }

@media (max-width: 768px) {
  .scroll-arrow-left { left: 6px; }
  .scroll-arrow-right { right: 6px; }
}
</style>