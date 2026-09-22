<script setup lang="ts">
// 詳情頁共用圖片庫 — 抽自 ProductDetailView/AuctionDetailView（T7 組件抽離 2026-09-21）
// 含：main-image（cat-pill/nav arrows/zoom hint/counter）+ thumb strip + lightbox
// ⚠️ 樣式自帶完整 scoped CSS（host scoped CSS 命中唔到子組件內部元素 — Vue scoped 原理）
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { CategoryLogo } from '@/components/brand/CategoryLogos'
import { useProductInfo } from '@/composables/useProductInfo'

const props = withDefaults(defineProps<{
  images: string[]
  title: string
  category: string
  catColor?: string // 分類主色（--cat-color 變數，拍賣頁可唔傳）
}>(), {
  catColor: '',
})

const { locale } = useI18n()
const { getTitle, getCategoryLabel } = useProductInfo()

const currentImageIndex = ref(0)
const lightboxOpen = ref(false)

const openLightbox = () => {
  if (props.images.length > 0) {
    lightboxOpen.value = true
    document.body.style.overflow = 'hidden'
  }
}
const closeLightbox = () => {
  lightboxOpen.value = false
  document.body.style.overflow = ''
}
const selectImage = (idx: number) => { currentImageIndex.value = idx }

const prevImage = () => {
  if (props.images.length < 2) return
  currentImageIndex.value = (currentImageIndex.value - 1 + props.images.length) % props.images.length
}
const nextImage = () => {
  if (props.images.length < 2) return
  currentImageIndex.value = (currentImageIndex.value + 1) % props.images.length
}

// Touch swipe（tap 開 lightbox，swipe 換圖）
const touchStartX = ref(0)
const onTouchStart = (e: TouchEvent) => { touchStartX.value = e.changedTouches[0]?.screenX ?? 0 }
const onTouchEnd = (e: TouchEvent) => {
  const diff = touchStartX.value - (e.changedTouches[0]?.screenX ?? 0)
  if (Math.abs(diff) > 50) {
    diff > 0 ? nextImage() : prevImage()
  } else if (props.images.length > 0) {
    openLightbox()
  }
}

// Lightbox keyboard nav
const handleKeydown = (e: KeyboardEvent) => {
  if (!lightboxOpen.value) return
  if (e.key === 'ArrowLeft') prevImage()
  if (e.key === 'ArrowRight') nextImage()
  if (e.key === 'Escape') closeLightbox()
}
onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})

// 圖片來源變化時重置 index，避免越界
watch(() => props.images, () => { currentImageIndex.value = 0 })
</script>

<template>
  <div class="d-gallery">
    <div
      class="main-image"
      :style="catColor ? { '--cat-color': catColor } : {}"
      @touchstart="onTouchStart"
      @touchend="onTouchEnd"
    >
      <div class="cat-pill">
        <span class="cat-emoji"><CategoryLogo :category="category" :size="15" /></span>
        <span class="cat-text">{{ getCategoryLabel(category) }}</span>
      </div>

      <button v-if="images.length > 1" class="nav-btn nav-prev" @click.stop="prevImage">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>

      <img
        v-if="images.length > 0"
        :src="images[currentImageIndex] || '/placeholder-card.png'"
        :alt="title"
        class="hero-img"
        @click="openLightbox"
      />
      <div v-else class="image-placeholder">🃏</div>

      <button v-if="images.length > 1" class="nav-btn nav-next" @click.stop="nextImage">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>

      <div v-if="images.length > 0" class="zoom-hint">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
          <path d="M11 8v6M8 11h6"/>
        </svg>
        <span>{{ locale === 'zh' ? '點擊放大' : 'Click to zoom' }}</span>
      </div>

      <div v-if="images.length > 1" class="img-counter">
        {{ currentImageIndex + 1 }} / {{ images.length }}
      </div>
    </div>

    <div v-if="images.length > 1" class="thumb-strip">
      <img
        v-for="(img, idx) in images"
        :key="idx"
        :src="img"
        :alt="`${title} ${Number(idx) + 1}`"
        class="thumb"
        :class="{ active: idx === currentImageIndex }"
        @click="selectImage(Number(idx))"
      />
    </div>
  </div>

  <!-- Lightbox -->
  <transition name="lightbox-fade">
    <div v-if="lightboxOpen" class="lightbox" @click.self="closeLightbox">
      <button class="lb-close" @click="closeLightbox">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <button v-if="images.length > 1" class="lb-nav lb-prev" @click.stop="prevImage">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <img :src="images[currentImageIndex]" :alt="title" class="lb-img" @click.stop />
      <button v-if="images.length > 1" class="lb-nav lb-next" @click.stop="nextImage">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <div v-if="images.length > 1" class="lb-counter">{{ currentImageIndex + 1 }} / {{ images.length }}</div>
      <div class="lb-hint">{{ locale === 'zh' ? '點擊背景關閉 · 左右鍵切換' : 'Click background to close · Arrow keys to navigate' }}</div>
    </div>
  </transition>
</template>

<style scoped>
/* ===== Gallery（源：ProductDetailView L625-840，改 $var → CSS var/literal） ===== */
/* Luke 9/22 定案：完全靜態 — 移除 sticky，所有框跟頁面一齊捲動，無中途停低 */
.d-gallery {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
@media (max-width: 960px) {
  .d-gallery {
    max-width: 100%;
    overflow: visible;
  }
}

.main-image {
  position: relative;
  background: linear-gradient(145deg, #131318 0%, #0e0e14 100%);
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 440px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  transition: box-shadow 0.3s ease;
}
.main-image::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 30%, rgba(99, 102, 241, 0.06) 0%, transparent 60%);
  pointer-events: none;
  z-index: 0;
}
.main-image:hover {
  box-shadow: 0 12px 40px rgba(99, 102, 241, 0.15);
}

.hero-img {
  max-width: 100%;
  max-height: 520px;
  object-fit: contain;
  display: block;
  cursor: zoom-in;
  transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  position: relative;
  z-index: 1;
}
.hero-img:hover {
  transform: scale(1.03);
}

.image-placeholder {
  font-size: 5rem;
  padding: 80px 0;
  z-index: 1;
}

/* Category pill */
.cat-pill {
  position: absolute;
  top: 16px;
  left: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(10, 10, 15, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 100px;
  padding: 6px 14px 6px 10px;
  z-index: 5;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}
.cat-pill .cat-emoji {
  display: inline-flex;
  align-items: center;
  font-size: 1.1rem;
  line-height: 1;
}
.cat-pill .cat-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: #f0f0f5;
  letter-spacing: 0.03em;
}

/* Nav buttons */
.nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(10, 10, 15, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #f0f0f5;
  cursor: pointer;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;
  opacity: 0;
}
.main-image:hover .nav-btn {
  opacity: 1;
}
.nav-btn:hover {
  background: rgba(99, 102, 241, 0.3);
  border-color: rgba(129, 140, 248, 0.5);
}
.nav-prev { left: 16px; }
.nav-next { right: 16px; }

/* Zoom hint */
.zoom-hint {
  position: absolute;
  bottom: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(10, 10, 15, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: rgba(240, 240, 245, 0.6);
  padding: 6px 12px;
  border-radius: 100px;
  font-size: 0.72rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  z-index: 5;
  opacity: 0;
  transition: opacity 0.25s ease;
}
.main-image:hover .zoom-hint {
  opacity: 1;
}

/* Counter */
.img-counter {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(10, 10, 15, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: #f0f0f5;
  padding: 4px 14px;
  border-radius: 100px;
  font-size: 0.72rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  z-index: 5;
}

/* Thumbnails */
.thumb-strip {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-x;
  padding: 4px 0 8px;
  scrollbar-width: thin;
  scrollbar-color: rgba(129, 140, 248, 0.3) transparent;
  scroll-behavior: smooth;
}
.thumb-strip::-webkit-scrollbar {
  height: 4px;
}
.thumb-strip::-webkit-scrollbar-thumb {
  background: rgba(129, 140, 248, 0.3);
  border-radius: 2px;
}
@media (max-width: 960px) {
  .thumb-strip::-webkit-scrollbar {
    display: none;
  }
  .thumb-strip {
    scrollbar-width: none;
  }
}
.thumb {
  width: 76px;
  height: 76px;
  object-fit: cover;
  border-radius: 10px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.25s ease;
  flex-shrink: 0;
  opacity: 0.5;
  background: #131318;
}
.thumb:hover {
  opacity: 0.85;
  transform: translateY(-2px);
}
.thumb.active {
  opacity: 1;
  border-color: #6366f1;
  box-shadow: 0 0 0 1px #6366f1, 0 4px 16px rgba(99, 102, 241, 0.25);
}

/* ===== Lightbox ===== */
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(5, 5, 10, 0.96);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
}
.lightbox-fade-enter-active, .lightbox-fade-leave-active {
  transition: opacity 0.25s ease;
}
.lightbox-fade-enter-from, .lightbox-fade-leave-to {
  opacity: 0;
}
.lb-img {
  max-width: 90vw;
  max-height: 85vh;
  object-fit: contain;
  border-radius: 12px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
}
.lb-close {
  position: absolute;
  top: 24px;
  right: 24px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #f0f0f5;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}
.lb-close:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.4);
  transform: rotate(90deg);
}
.lb-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #f0f0f5;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}
.lb-nav:hover {
  background: rgba(99, 102, 241, 0.25);
  border-color: rgba(129, 140, 248, 0.5);
}
.lb-prev { left: 24px; }
.lb-next { right: 24px; }
.lb-counter {
  position: absolute;
  bottom: 56px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: #f0f0f5;
  padding: 6px 18px;
  border-radius: 100px;
  font-size: 0.85rem;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.12);
}
.lb-hint {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.75rem;
  letter-spacing: 0.03em;
}
</style>