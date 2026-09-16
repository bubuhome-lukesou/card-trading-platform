<script setup lang="ts">
/**
 * 共用狀態組件 — Loading / Error / Empty 三合一
 * 9/16 重構：取代 10+ 個 view 各自重複的 loading-container/error-container/empty-state
 *
 * 用法：
 *   <StateView state="loading" />
 *   <StateView state="error" message="加載失敗" retry @retry="load" />
 *   <StateView state="empty" icon="📦" title="暫無訂單" hint="快去參與競拍或購買吧！" />
 */
import { useI18n } from 'vue-i18n'
import { Loader2 } from 'lucide-vue-next'

const props = defineProps<{
  state: 'loading' | 'error' | 'empty'
  /** empty 圖標（emoji） */
  icon?: string
  /** error/empty 標題；loading 文案 */
  title?: string
  /** error/empty 副文案 */
  message?: string
  /** 傳入即顯示重試按鈕（僅 error） */
  retry?: boolean
}>()

const emit = defineEmits<{ retry: [] }>()

const { t, locale } = useI18n()

const loadingText = () => {
  const v = t('common.loading')
  return v === 'common.loading' ? (locale.value === 'zh' ? '加載中...' : 'Loading...') : v
}

const errorText = () => {
  const v = t('common.error')
  return v === 'common.error' ? (locale.value === 'zh' ? '出現錯誤' : 'Something went wrong') : v
}
</script>

<template>
  <!-- Loading -->
  <div v-if="state === 'loading'" class="state-view">
    <Loader2 class="state-spinner" />
    <p class="state-title">{{ title || loadingText() }}</p>
  </div>

  <!-- Error -->
  <div v-else-if="state === 'error'" class="state-view">
    <div class="state-icon">⚠️</div>
    <h2 class="state-title">{{ title || errorText() }}</h2>
    <p v-if="message" class="state-message">{{ message }}</p>
    <button v-if="retry" class="state-btn" @click="emit('retry')">
      {{ locale === 'zh' ? '重試' : 'Retry' }}
    </button>
  </div>

  <!-- Empty -->
  <div v-else class="state-view">
    <div class="state-icon">{{ icon || '📭' }}</div>
    <h3 v-if="title" class="state-title">{{ title }}</h3>
    <p v-if="message" class="state-message">{{ message }}</p>
    <slot />
  </div>
</template>

<style scoped>
.state-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 56px 16px;
  min-height: 180px;
  text-align: center;
}

.state-spinner {
  width: 34px;
  height: 34px;
  color: var(--primary);
  animation: state-spin 1s linear infinite;
}

@keyframes state-spin {
  to { transform: rotate(360deg); }
}

.state-icon {
  font-size: 44px;
  line-height: 1;
}

.state-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.state-message {
  font-size: 0.86rem;
  color: var(--text-secondary);
  margin: 0;
}

.state-btn {
  padding: 10px 24px;
  background: var(--primary);
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 4px;
}

.state-btn:hover { opacity: 0.9; }
</style>