<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useListingVisibility } from '@/composables/useListingVisibility'

// 全局「隱藏已售出／已過期預訂／已結束拍賣」開關 UI（導覽列 + marketplace 共用）
// toggle 樣式無文字；點擊後提示當前狀態 2 秒
const { locale } = useI18n()
const { hideEnded, setHideEnded } = useListingVisibility()

const showTip = ref(false)
let tipTimer: ReturnType<typeof setTimeout> | null = null

const tipText = () =>
  hideEnded.value
    ? (locale.value === 'zh' ? '隱藏已售出商品' : 'Hiding sold items')
    : (locale.value === 'zh' ? '顯示已售出商品' : 'Showing sold items')

const onToggle = (e: Event) => {
  const checked = (e.target as HTMLInputElement).checked
  setHideEnded(checked)
  showTip.value = true
  if (tipTimer) clearTimeout(tipTimer)
  tipTimer = setTimeout(() => { showTip.value = false }, 2000)
}
</script>

<template>
  <label class="hide-ended-toggle-ui" :title="locale === 'zh' ? '隱藏已售出／已過期預訂／已結束拍賣' : 'Hide sold / expired / ended listings'">
    <input
      type="checkbox"
      :checked="hideEnded"
      @change="onToggle"
    />
    <span class="toggle-track" :class="{ active: hideEnded }">
      <span class="toggle-thumb" />
    </span>
    <Transition name="tip-fade">
      <span v-if="showTip" class="toggle-tip">{{ tipText() }}</span>
    </Transition>
  </label>
</template>

<style scoped lang="scss">
.hide-ended-toggle-ui {
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  user-select: none;

  input[type='checkbox'] {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-track {
    position: relative;
    width: 36px;
    height: 20px;
    background: var(--border);
    border-radius: var(--radius-full);
    transition: background var(--transition-fast);
    flex-shrink: 0;

    &.active {
      background: var(--primary);
    }
  }

  .toggle-thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    background: white;
    border-radius: 50%;
    transition: transform var(--transition-fast);

    .active & {
      transform: translateX(16px);
    }
  }

  .toggle-tip {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    padding: 6px 12px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
    font-size: 12px;
    color: var(--text-primary);
    white-space: nowrap;
    z-index: 200;
    pointer-events: none;
  }
}

.tip-fade-enter-active,
.tip-fade-leave-active {
  transition: opacity 0.2s ease;
}

.tip-fade-enter-from,
.tip-fade-leave-to {
  opacity: 0;
}
</style>