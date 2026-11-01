<script setup lang="ts">
// 評價展示組件（2026-11-01）— 公開展示某人收到嘅評價
// 用喺商家介紹頁 / 之後其他對象
import { ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { reviewApi, type ReviewDto } from '@/api/order-extended'

const props = defineProps<{
  targetUserId: string
  role: 'seller_review' | 'buyer_review'
  /** 顯示頭幾條（0=全部） */
  limit?: number
}>()

const { t } = useI18n()
const reviews = ref<ReviewDto[]>([])
const loading = ref(true)
const expanded = ref(false)

const apiBaseUrl = import.meta.env.VITE_API_URL || ''
const resolveUrl = (url: string) => {
  if (!url) return ''
  if (url.startsWith('data:') || url.startsWith('http')) return url
  return apiBaseUrl + url
}

const load = async () => {
  loading.value = true
  try {
    const res = await reviewApi.findForTarget(props.targetUserId, props.role)
    reviews.value = Array.isArray(res.data) ? res.data : []
  } catch {
    reviews.value = []
  } finally {
    loading.value = false
  }
}

const parseImages = (r: ReviewDto): string[] => {
  try {
    return r.images ? JSON.parse(r.images) : []
  } catch {
    return []
  }
}

const fmtDate = (iso: string) => {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const shown = () => (props.limit && !expanded.value ? reviews.value.slice(0, props.limit) : reviews.value)

const toggle = () => { expanded.value = !expanded.value }

watch(() => props.targetUserId, load)
onMounted(load)
defineExpose({ reload: load })
</script>

<template>
  <div class="rvl">
    <div v-if="loading" class="rvl-loading">{{ t('common.loading') }}</div>
    <template v-else>
      <div v-if="!reviews.length" class="rvl-empty">{{ t('reviews.emptyList') }}</div>
      <div v-for="r in shown()" :key="r.id" class="rvl-item">
        <div class="rvl-head">
          <div class="rvl-user">
            <span class="rvl-avatar">{{ (r.reviewer?.nickname || '?').slice(0, 1) }}</span>
            <span class="rvl-nickname">{{ r.reviewer?.nickname || t('reviews.anonymous') }}</span>
          </div>
          <div class="rvl-right">
            <span class="rvl-stars">{{ '★'.repeat(r.rating) }}{{ '☆'.repeat(5 - r.rating) }}</span>
            <span class="rvl-date">{{ fmtDate(r.createdAt) }}</span>
          </div>
        </div>
        <div v-if="r.content" class="rvl-content">{{ r.content }}</div>
        <div v-if="parseImages(r).length" class="rvl-images">
          <img v-for="(img, i) in parseImages(r)" :key="i" :src="resolveUrl(img)" class="rvl-img" alt="評價圖片" />
        </div>
        <div v-if="r.reply" class="rvl-reply">
          <span class="rvl-reply-label">{{ t('reviews.sellerReply') }}</span>
          <span class="rvl-reply-text">{{ r.reply }}</span>
        </div>
      </div>
      <button v-if="limit && reviews.length > limit" class="rvl-toggle" @click="toggle">
        {{ expanded ? t('reviews.collapse') : t('reviews.expand', { count: reviews.length }) }}
      </button>
    </template>
  </div>
</template>

<style scoped>
.rvl { display: flex; flex-direction: column; gap: var(--space-3); }
.rvl-loading { text-align: center; color: var(--text-secondary); padding: var(--space-4); font-size: var(--text-sm); }
.rvl-empty { text-align: center; color: var(--text-muted); padding: var(--space-4); font-size: var(--text-sm); }

.rvl-item {
  background: var(--bg-elevated, rgba(255,255,255,0.04));
  border-radius: var(--radius-lg);
  padding: var(--space-3);
  display: flex; flex-direction: column; gap: var(--space-2);
}
.rvl-head { display: flex; justify-content: space-between; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
.rvl-user { display: flex; align-items: center; gap: var(--space-2); min-width: 0; }
.rvl-avatar {
  width: 28px; height: 28px; border-radius: 50%;
  background: var(--bg-card); display: flex; align-items: center; justify-content: center;
  font-size: var(--text-xs); color: var(--text-secondary); flex-shrink: 0;
}
.rvl-nickname { font-size: var(--text-sm); font-weight: 600; }
.rvl-right { display: flex; align-items: center; gap: var(--space-2); }
.rvl-stars { color: #f59e0b; font-size: var(--text-sm); letter-spacing: 1px; }
.rvl-date { font-size: var(--text-xs); color: var(--text-muted); font-family: var(--font-num); }
.rvl-content { font-size: var(--text-sm); color: var(--text-primary); white-space: pre-wrap; word-break: break-word; }
.rvl-images { display: flex; gap: var(--space-2); flex-wrap: wrap; }
.rvl-img { width: 72px; height: 72px; object-fit: cover; border-radius: var(--radius-md); border: 1px solid var(--border); }
.rvl-reply {
  background: var(--bg-card); border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
  display: flex; gap: var(--space-2); align-items: baseline;
}
.rvl-reply-label { font-size: var(--text-xs); color: var(--primary); font-weight: 600; flex-shrink: 0; }
.rvl-reply-text { font-size: var(--text-xs); color: var(--text-secondary); }
.rvl-toggle {
  align-self: center;
  background: none; border: 1px solid var(--border); border-radius: var(--radius-full);
  color: var(--text-secondary); padding: var(--space-1) var(--space-4); cursor: pointer;
  font-size: var(--text-xs);
}
.rvl-toggle:hover { color: var(--text-primary); border-color: var(--primary); }
</style>