// 詳情頁共用 product info helpers — 抽自 ProductDetailView/AuctionDetailView（兩頁完全重複）
// T7 組件抽離（2026-09-21，Luke 拍板）
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

export const useProductInfo = () => {
  const { locale } = useI18n()

  // Category info（emoji/label/color）
  const categoryInfo = computed(() => ({
    pokemon: { emoji: '🎯', zh: '寶可夢', en: 'Pokemon', color: '#e74c3c' },
    yugioh: { emoji: '🎯', zh: '遊戲王', en: 'Yu-Gi-Oh!', color: '#f39c12' },
    mtg: { emoji: '🧙', zh: '萬智牌', en: 'Magic: The Gathering', color: '#1abc9c' },
    ultraman: { emoji: '👾', zh: '奧特曼', en: 'Ultraman', color: '#3498db' },
    onepiece: { emoji: '🎯', zh: '海賊王', en: 'One Piece', color: '#e74c3c' },
    doraemon: { emoji: '🤖', zh: '哆啦A夢', en: 'Doraemon', color: '#2196f3' },
    sports: { emoji: '⚽', zh: '體育卡', en: 'Sports Cards', color: '#27ae60' },
    other: { emoji: '📦', zh: '其他', en: 'Other', color: '#9b59b6' },
  }))

  const getCategoryInfo = (category: string) => {
    return categoryInfo.value[category as keyof typeof categoryInfo.value] || { emoji: '📦', zh: category, en: category }
  }

  const getCategoryLabel = (category: string) => {
    const info = getCategoryInfo(category)
    return locale.value === 'zh' ? info.zh : info.en
  }

  const getTitle = (product: any) => {
    return locale.value === 'zh' ? (product?.titleZh || product?.titleEn) : (product?.titleEn || product?.titleZh)
  }

  const getDescription = (product: any) => {
    if (locale.value === 'zh') return product?.descriptionZh || product?.descriptionEn || ''
    return product?.descriptionEn || product?.descriptionZh || ''
  }

  // 商品編號複製（copy 後 icon 顯示 1.5s）
  const copied = ref(false)
  let copyTimer: ReturnType<typeof setTimeout> | null = null
  const copyProductNumber = async (num: number | string) => {
    try {
      await navigator.clipboard.writeText(String(num))
      copied.value = true
      if (copyTimer) clearTimeout(copyTimer)
      copyTimer = setTimeout(() => { copied.value = false }, 1500)
    } catch { /* clipboard 不可用時靜默 */ }
  }

  // 品相色制
  const conditionColorMap: Record<string, string> = {
    'S': '#22c55e',
    'A': '#84cc16',
    'B': '#eab308',
    'C': '#f97316',
    'D': '#ef4444',
  }
  const getConditionColor = (condition: string | null | undefined) =>
    conditionColorMap[condition as string] || '#6366f1'

  const productTypeLabels: Record<string, { zh: string; en: string }> = {
    graded_card: { zh: '評分卡', en: 'Graded Card' },
    original_box: { zh: '原箱', en: 'Original Box' },
    original_case: { zh: '原盒', en: 'Original Case' },
    original_bag: { zh: '原袋', en: 'Original Bag' },
    raw_card: { zh: '裸卡', en: 'Raw Card' },
    other: { zh: '其它', en: 'Other' },
  }
  const getProductTypeLabel = (type: string | null | undefined) => {
    if (!type) return '—'
    const labels = productTypeLabels[type]
    if (!labels) return type
    return labels[locale.value as 'zh' | 'en'] || labels.zh
  }

  const languageLabels: Record<string, { zh: string; en: string }> = {
    japanese: { zh: '日文', en: 'Japanese' },
    english: { zh: '英文', en: 'English' },
    traditional_chinese: { zh: '繁體中文', en: 'Traditional Chinese' },
    simplified_chinese: { zh: '簡體中文', en: 'Simplified Chinese' },
    korean: { zh: '韓文', en: 'Korean' },
    other: { zh: '其他', en: 'Other' },
  }
  const getLanguageLabel = (lang: string | null | undefined) => {
    if (!lang) return ''
    const labels = languageLabels[lang]
    if (!labels) return lang
    return locale.value === 'zh' ? labels.zh : labels.en
  }

  const getGeneralTags = (product: any) => {
    if (!product?.tags) return []
    return product.tags.filter((tag: any) => tag.type !== 'product_type' && tag.type !== 'PRODUCT_TYPE')
  }

  return {
    locale,
    getCategoryInfo,
    getCategoryLabel,
    getTitle,
    getDescription,
    copied,
    copyProductNumber,
    getConditionColor,
    getProductTypeLabel,
    getLanguageLabel,
    getGeneralTags,
  }
}