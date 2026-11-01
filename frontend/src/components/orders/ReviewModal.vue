<script setup lang="ts">
// 評價提交組件（2026-11-01）— 買賣兩端共用
// 5 星必選 + 文字（選填）+ 最多 9 張圖
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { reviewApi } from '@/api/order-extended'
import api from '@/api/index'

const props = defineProps<{
  orderId: string
  /** 評邊個（顯示名） */
  targetName: string
}>()

const emit = defineEmits<{ (e: 'submitted'): void; (e: 'cancel'): void }>()

const { t } = useI18n()
const rating = ref(0)
const hoverRating = ref(0)
const content = ref('')
const images = ref<string[]>([])
const uploading = ref(false)
const submitting = ref(false)
const errorMsg = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

const apiBaseUrl = import.meta.env.VITE_API_URL || ''
const resolveUrl = (url: string) => {
  if (!url) return ''
  if (url.startsWith('data:') || url.startsWith('http')) return url
  return apiBaseUrl + url
}

const STAR_LABELS = computed(() => [t('reviews.star1'), t('reviews.star2'), t('reviews.star3'), t('reviews.star4'), t('reviews.star5')])

const uploadImage = async (file: File) => {
  const formData = new FormData()
  formData.append('image', file)
  const res = await api.post('/upload/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data?.url || ''
}

const onFileSelect = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = ''
  for (const f of files) {
    if (images.value.length >= 9) {
      errorMsg.value = t('reviews.maxImages')
      break
    }
    if (!f.type.startsWith('image/')) continue
    try {
      uploading.value = true
      const url = await uploadImage(f)
      if (url) images.value.push(url)
    } catch {
      errorMsg.value = t('reviews.uploadFailed')
    } finally {
      uploading.value = false
    }
  }
}

const removeImage = (idx: number) => {
  images.value.splice(idx, 1)
}

const submit = async () => {
  if (!rating.value) {
    errorMsg.value = t('reviews.ratingRequired')
    return
  }
  submitting.value = true
  errorMsg.value = ''
  try {
    await reviewApi.create(props.orderId, rating.value, content.value, images.value)
    emit('submitted')
  } catch (e: any) {
    errorMsg.value = e?.response?.data?.message || t('reviews.submitFailed')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="rv-form">
    <div class="rv-target">{{ t('reviews.reviewing', { name: targetName }) }}</div>

    <!-- 5 星必選 -->
    <div class="rv-stars">
      <button
        v-for="i in 5"
        :key="i"
        type="button"
        class="rv-star"
        :class="{ active: i <= (hoverRating || rating) }"
        @click="rating = i"
        @mouseenter="hoverRating = i"
        @mouseleave="hoverRating = 0"
      >★</button>
      <span class="rv-star-label">{{ rating ? STAR_LABELS[rating - 1] : t('reviews.ratingRequiredHint') }}</span>
    </div>

    <!-- 文字（選填） -->
    <textarea
      v-model="content"
      class="rv-textarea"
      rows="3"
      :placeholder="t('reviews.contentPlaceholder')"
    />

    <!-- 圖片（最多 9） -->
    <div class="rv-images-row">
      <button v-if="images.length < 9" type="button" class="rv-add-img" :disabled="uploading" @click="fileInput?.click()">
        {{ uploading ? '⏳' : '+' }} {{ images.length }}/9
      </button>
      <input ref="fileInput" type="file" accept="image/*" multiple style="display: none" @change="onFileSelect" />
      <div v-for="(img, i) in images" :key="i" class="rv-img-item">
        <img :src="resolveUrl(img)" alt="評價圖片" />
        <button type="button" class="rv-img-remove" @click="removeImage(i)">✕</button>
      </div>
    </div>

    <div v-if="errorMsg" class="rv-err">{{ errorMsg }}</div>

    <div class="rv-actions">
      <button type="button" class="rv-btn cancel" @click="emit('cancel')">{{ t('reviews.cancel') }}</button>
      <button type="button" class="rv-btn submit" :disabled="submitting || !rating" @click="submit">
        {{ submitting ? t('reviews.submitting') : t('reviews.submit') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.rv-form { display: flex; flex-direction: column; gap: var(--space-3); }
.rv-target { font-size: var(--text-sm); color: var(--text-secondary); }

/* 5 星 */
.rv-stars { display: flex; align-items: center; gap: 4px; }
.rv-star {
  font-size: 32px; line-height: 1;
  background: none; border: none; cursor: pointer;
  color: var(--border); transition: color 0.15s, transform 0.1s;
  padding: 0 2px;
}
.rv-star.active { color: #f59e0b; }
.rv-star:hover { transform: scale(1.15); }
.rv-star-label { font-size: var(--text-xs); color: var(--text-secondary); margin-left: var(--space-2); }

.rv-textarea {
  width: 100%; box-sizing: border-box;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border); border-radius: var(--radius-lg);
  background: var(--bg-card); color: var(--text-primary);
  font-size: var(--text-sm); outline: none; resize: vertical;
  font-family: inherit;
}
.rv-textarea:focus { border-color: var(--primary); }

/* 圖片網格 */
.rv-images-row { display: flex; gap: var(--space-2); flex-wrap: wrap; }
.rv-add-img {
  width: 64px; height: 64px; border-radius: var(--radius-md);
  border: 1px dashed var(--border); background: var(--bg-elevated);
  color: var(--text-secondary); cursor: pointer; font-size: var(--text-lg);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  font-size: var(--text-xs);
}
.rv-add-img:disabled { opacity: 0.5; cursor: wait; }
.rv-img-item { position: relative; width: 64px; height: 64px; border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--border); }
.rv-img-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
.rv-img-remove {
  position: absolute; top: 2px; right: 2px;
  width: 18px; height: 18px; border-radius: 50%;
  background: rgba(0, 0, 0, 0.6); color: #fff;
  border: none; cursor: pointer; font-size: 11px; line-height: 18px; padding: 0;
}

.rv-err { font-size: var(--text-xs); color: #ef4444; }
.rv-actions { display: flex; gap: var(--space-3); }
.rv-btn { flex: 1; padding: var(--space-3); border-radius: var(--radius-lg); font-size: var(--text-sm); font-weight: 600; cursor: pointer; border: none; }
.rv-btn.cancel { background: var(--bg-elevated); color: var(--text-primary); }
.rv-btn.submit { background: var(--primary-gradient); color: #fff; }
.rv-btn.submit:disabled { opacity: 0.5; cursor: not-allowed; }
</style>