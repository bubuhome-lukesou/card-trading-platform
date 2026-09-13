<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import api from '@/api'
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-vue-next'

interface Banner {
  id: number
  title: string | null
  imageUrl: string
  linkUrl: string | null
  sortOrder: number
  isActive: boolean
}

const banners = ref<Banner[]>([])
const current = ref(0)
const loading = ref(true)
let timer: ReturnType<typeof setInterval> | null = null

const resolveImage = (url: string) => {
  if (!url) return ''
  if (url.startsWith('data:') || url.startsWith('http')) return url
  return (import.meta.env.VITE_API_URL || '') + url
}

const count = computed(() => banners.value.length)
const currentBanner = computed(() => banners.value[current.value] || null)

const go = (i: number) => {
  if (count.value === 0) return
  current.value = (i + count.value) % count.value
  restartTimer()
}
const next = () => go(current.value + 1)
const prev = () => go(current.value - 1)

const startTimer = () => {
  stopTimer()
  // 多於 1 張先自動輪播；5 秒一張
  if (count.value > 1) timer = setInterval(next, 5000)
}
const stopTimer = () => {
  if (timer) { clearInterval(timer); timer = null }
}
const restartTimer = () => { startTimer() }

const onClick = (banner: Banner) => {
  if (banner.linkUrl) window.open(banner.linkUrl, '_blank', 'noopener')
}

const load = async () => {
  try {
    const res = await api.get('/banners/active')
    banners.value = res.data || []
  } catch {
    banners.value = []
  }
}

onMounted(async () => {
  await load()
  startTimer()
})
onUnmounted(() => stopTimer())
</script>

<template>
  <!-- 走馬燈：有廣告先顯示 -->
  <section v-if="count > 0" class="banner-carousel" aria-label="推廣廣告">
    <div class="banner-track" :style="{ transform: `translateX(-${current * 100}%)` }">
      <div
        v-for="banner in banners"
        :key="banner.id"
        class="banner-slide"
        :class="{ clickable: !!banner.linkUrl }"
        @click="onClick(banner)"
      >
        <img :src="resolveImage(banner.imageUrl)" :alt="banner.title || '廣告'" loading="lazy" />
      </div>
    </div>

    <!-- 左右箭頭（多於 1 張先顯示） -->
    <template v-if="count > 1">
      <button class="banner-arrow left" @click.stop="prev" aria-label="上一張">
        <ChevronLeft :size="18" />
      </button>
      <button class="banner-arrow right" @click.stop="next" aria-label="下一張">
        <ChevronRight :size="18" />
      </button>

      <!-- 圓點指示器 -->
      <div class="banner-dots">
        <button
          v-for="(b, i) in banners"
          :key="b.id"
          class="dot"
          :class="{ active: i === current }"
          @click.stop="go(i)"
          :aria-label="`第 ${i + 1} 張`"
        />
      </div>
    </template>

    <!-- 外連標記 -->
    <span v-if="currentBanner?.linkUrl" class="banner-link-hint">
      <ExternalLink :size="12" />
    </span>
  </section>
</template>

<style scoped>
.banner-carousel {
  position: relative;
  border-radius: var(--radius-xl);
  overflow: hidden;
  background: var(--bg-card);
  border: 1px solid var(--border);
  aspect-ratio: 1200 / 300; /* 廣告橫幅比例 */
  max-height: 320px;
  width: 100%;
}

.banner-track {
  display: flex;
  height: 100%;
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.banner-slide {
  flex: 0 0 100%;
  height: 100%;
  cursor: default;
}

.banner-slide.clickable {
  cursor: pointer;
}

.banner-slide img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.banner-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s, background 0.2s;
  backdrop-filter: blur(4px);
}

.banner-carousel:hover .banner-arrow {
  opacity: 1;
}

.banner-arrow.left { left: 12px; }
.banner-arrow.right { right: 12px; }

.banner-arrow:hover {
  background: rgba(0, 0, 0, 0.6);
}

.banner-dots {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.45);
  cursor: pointer;
  transition: all 0.2s;
  padding: 0;
}

.dot.active {
  background: #fff;
  width: 20px;
  border-radius: 4px;
}

.banner-link-hint {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

@media (max-width: 640px) {
  .banner-carousel {
    aspect-ratio: 1200 / 500;
  }
  .banner-arrow {
    width: 28px;
    height: 28px;
  }
}
</style>