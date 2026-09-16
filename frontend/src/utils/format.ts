/**
 * 統一格式化工具 — 全站共用
 * 9/16 重構：取代散落各 view 的 formatPrice/formatDate/formatCountdown 重複定義
 */

/** 價格：MOP $1,234（整數，四捨五入）— 卡片/列表/詳情頁標準格式 */
export const formatPrice = (price: number | string | null | undefined): string => {
  return `MOP $${Number(price || 0).toLocaleString('zh-MO', { maximumFractionDigits: 0 })}`
}

/** 價格：帶小數版本 — 錢包/收益等需要精確位數的場合 */
export const formatPriceExact = (price: number | string | null | undefined, decimals = 2): string => {
  return `MOP $${Number(price || 0).toLocaleString('zh-MO', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
}

/** 日期：2026/9/16（zh-MO 本地格式） */
export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '-'
  const d = new Date(date)
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('zh-MO')
}

/** 日期時間：2026/9/16 14:30 */
export const formatDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  return `${d.toLocaleDateString('zh-MO')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

/** 倒數：剩X天 X小時 / 剩X小時 X分鐘 / 已結束（同 ImageDeadlineBar 口徑） */
export const formatCountdown = (endTime: string | Date | null | undefined, locale = 'zh'): string => {
  if (!endTime) return ''
  const diff = new Date(endTime).getTime() - Date.now()
  if (diff <= 0) return locale === 'zh' ? '已結束' : 'Ended'
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  const days = Math.floor(hours / 24)
  if (locale === 'zh') {
    if (days > 0) return `剩${days}天 ${hours % 24}小時`
    return `剩${hours}小時 ${minutes}分鐘`
  }
  if (days > 0) return `${days}d ${hours % 24}h left`
  return `${hours}h ${minutes}m left`
}