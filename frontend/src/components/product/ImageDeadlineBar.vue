<script setup lang="ts">
/**
 * 圖片底部時間條（參考魂SHOP 風格）
 * - 全幅覆蓋圖片底邊，粉色漸變底 + 白字
 * - 拍賣：⏰ 截止: 2026-09-21 (剩5天 10小時)
 * - 預約：⏰ 截單: 2026-09-21 (剩5天 10小時)
 */
import { computed } from 'vue'
import { Clock } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  endTime: string
  variant: 'auction' | 'reservation'
}>()

const { locale } = useI18n()

// 日期部分：YYYY-MM-DD
const dateText = computed(() => {
  const d = new Date(props.endTime)
  if (isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
})

// 括號內倒數：剩X天 X小時 / 剩X小時 X分鐘
const countdownText = computed(() => {
  const end = new Date(props.endTime).getTime()
  const diff = end - Date.now()
  if (diff <= 0) return locale.value === 'zh' ? '已結束' : 'Ended'
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  const d = Math.floor(hours / 24)
  if (locale.value === 'zh') {
    if (d > 0) return `剩${d}天 ${hours % 24}小時`
    return `剩${hours}小時 ${minutes}分鐘`
  }
  if (d > 0) return `${d}d ${hours % 24}h left`
  return `${hours}h ${minutes}m left`
})

const label = computed(() =>
  props.variant === 'auction'
    ? (locale.value === 'zh' ? '截止' : 'Ends')
    : (locale.value === 'zh' ? '截單' : 'By')
)
</script>

<template>
  <div class="img-deadline-bar" :class="variant">
    <Clock class="bar-icon" />
    <span class="bar-text">{{ label }}: {{ dateText }} ({{ countdownText }})</span>
  </div>
</template>

<style scoped lang="scss">
.img-deadline-bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  background: linear-gradient(90deg, #f43f5e, #ec4899);
  color: #fff;
  z-index: 5;

  &.reservation {
    background: linear-gradient(90deg, #f59e0b, #f97316);
  }

  .bar-icon {
    width: 15px;
    height: 15px;
    flex-shrink: 0;
  }

  .bar-text {
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>