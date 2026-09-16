<script setup lang="ts">
/**
 * 圖片底部時間條（參考魂SHOP 風格）
 * - 全幅覆蓋圖片底邊，顏色跟隨右上角銷售模式 badge
 *   - 拍賣 auction：綠（同 BID badge）
 *   - 預約 reservation：琥珀（同 RESERVE badge）
 * - 兩行佈局：第一行「截止/截單: YYYY-MM-DD」、第二行「剩X天 X小時」
 *   手機窄卡都顯示得完整
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

// 第二行：剩X天 X小時 / 剩X小時 X分鐘
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
    <div class="bar-lines">
      <span class="bar-date">{{ label }}: {{ dateText }}</span>
      <span class="bar-countdown">{{ countdownText }}</span>
    </div>
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
  gap: 7px;
  padding: 5px 10px;
  color: #fff;
  z-index: 5;

  // 顏色跟隨右上角銷售模式 badge（ProductCard/HomeView listing-badge 同款）
  &.auction {
    background: linear-gradient(135deg, #10b981, #059669);
  }

  &.reservation {
    background: linear-gradient(135deg, #f59e0b, #d97706);
  }

  .bar-icon {
    width: 13px;
    height: 13px;
    flex-shrink: 0;
  }

  .bar-lines {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }

  .bar-date {
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .bar-countdown {
    font-size: 0.66rem;
    font-weight: 600;
    opacity: 0.92;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>