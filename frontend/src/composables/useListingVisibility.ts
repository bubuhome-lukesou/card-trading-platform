import { ref, watch } from 'vue'

// 全局「隱藏已售出／已過期預訂／已結束拍賣」開關（module-level 共享，同 useTheme 模式）
// localStorage 持久化；未設定過 → 預設開啟（隱藏）
const STORAGE_KEY = 'hideEndedListings'

const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
const hideEnded = ref<boolean>(stored === null ? true : stored === '1')

watch(hideEnded, (v) => {
  try {
    localStorage.setItem(STORAGE_KEY, v ? '1' : '0')
  } catch {
    // localStorage 不可用（隱私模式等）— 靜默忽略，僅本次 session 生效
  }
})

export function useListingVisibility() {
  const setHideEnded = (v: boolean) => {
    hideEnded.value = v
  }
  return { hideEnded, setHideEnded }
}