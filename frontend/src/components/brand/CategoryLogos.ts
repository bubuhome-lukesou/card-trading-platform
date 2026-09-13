// 品牌分類 logo SVG（Vue functional components, render with h()）
// pokemon: 紅白精靈球 | onepiece: 草帽海賊旗 | yugioh: 千世積木 (Millennium Puzzle)
// mtg / ultraman / doraemon: 已刪除（2026-09-13 Luke 指示）
import { h, defineComponent, type PropType } from 'vue'

export const CategoryLogo = defineComponent({
  name: 'CategoryLogo',
  props: {
    category: { type: String as PropType<string>, required: true },
    size: { type: Number as PropType<number>, default: 20 },
  },
  setup(props) {
    return () => {
      const size = props.size
      const svg = (children: any[]) =>
        h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none' }, children)

      switch (props.category) {
        // ===== 寶可夢：紅白精靈球 =====
        case 'pokemon':
          return svg([
            h('circle', { cx: 12, cy: 12, r: 10, fill: '#fff', stroke: '#2a2a2a', 'stroke-width': 1.6 }),
            h('path', { d: 'M2 12 A10 10 0 0 1 22 12 L13.8 12 A3.8 3.8 0 0 0 10.2 12 Z', fill: '#e3350d' }),
            h('circle', { cx: 12, cy: 12, r: 3.4, fill: '#fff', stroke: '#2a2a2a', 'stroke-width': 1.6 }),
            h('circle', { cx: 12, cy: 12, r: 1.5, fill: '#2a2a2a' }),
          ])
        // ===== 海賊王：草帽海賊旗 =====
        case 'onepiece':
          return svg([
            h('path', { d: 'M4 3 L20 3 L18.5 21 L5.5 21 Z', fill: '#f5f0e6', stroke: '#2a2a2a', 'stroke-width': 1.4 }),
            h('path', { d: 'M7.5 8 A4.5 4.8 0 0 1 16.5 8 L16.5 10 A4.2 2.2 0 0 1 7.5 10 Z', fill: '#e8b64c', stroke: '#2a2a2a', 'stroke-width': 1.2 }),
            h('path', { d: 'M6.5 9.4 Q12 7.4 17.5 9.4', stroke: '#8a5a2b', 'stroke-width': 1.6, fill: 'none' }),
            h('path', { d: 'M9 14.5 L9.8 13.6 L10.6 14.5 L11.4 13.6 L12.2 14.5 L13 13.6 L13.8 14.5 L14.6 13.6 L15 14.4', stroke: '#2a2a2a', 'stroke-width': 1.1, fill: 'none', 'stroke-linecap': 'round' }),
            h('circle', { cx: 10.2, cy: 12.2, r: 0.55, fill: '#2a2a2a' }),
            h('circle', { cx: 13.8, cy: 12.2, r: 0.55, fill: '#2a2a2a' }),
          ])
        // ===== 遊戲王：千世積木（Millennium Puzzle 金字塔形）=====
        case 'yugioh':
          return svg([
            h('path', { d: 'M12 2 L21 18 L3 18 Z', fill: '#d4af37', stroke: '#8a6d1d', 'stroke-width': 1.3 }),
            h('path', { d: 'M12 2 L12 18', stroke: '#8a6d1d', 'stroke-width': 0.9 }),
            h('path', { d: 'M7.5 10 L16.5 10', stroke: '#8a6d1d', 'stroke-width': 0.9 }),
            h('path', { d: 'M5.2 14 L18.8 14', stroke: '#8a6d1d', 'stroke-width': 0.9 }),
            h('circle', { cx: 12, cy: 15.2, r: 1.3, fill: '#fff8dd', stroke: '#8a6d1d', 'stroke-width': 0.8 }),
            h('path', { d: 'M12 13.9 L12 16.5 M10.7 15.2 L13.3 15.2', stroke: '#8a6d1d', 'stroke-width': 0.7 }),
          ])
        default:
          // 其他/體育卡 fallback：通用卡牌 icon
          return svg([
            h('rect', { x: 3, y: 3, width: 18, height: 18, rx: 4, fill: '#6b728020', stroke: '#6b7280', 'stroke-width': 1.4 }),
            h('path', { d: 'M8 14 L11 10 L14 13 L16.5 9.5', stroke: '#6b7280', 'stroke-width': 1.6, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
            h('circle', { cx: 9.5, cy: 9.5, r: 1.2, fill: '#6b7280' }),
          ])
      }
    }
  },
})

// 分類清單（刪除 mtg/ultraman/doraemon — 2026-09-13 Luke 指示）
export const BRAND_CATEGORIES = [
  { id: 'pokemon', name: 'home.categories.pokemon' },
  { id: 'yugioh', name: 'home.categories.yugioh' },
  { id: 'onepiece', name: 'home.categories.onepiece' },
  { id: 'sports', name: 'home.categories.sports' },
  { id: 'other', name: 'home.categories.other' },
]

// 表單/篩選用格式（value/label）
export const CATEGORY_OPTIONS = [
  { value: 'pokemon', label: '寶可夢', labelEn: 'Pokemon' },
  { value: 'yugioh', label: '遊戲王', labelEn: 'Yu-Gi-Oh!' },
  { value: 'onepiece', label: '海賊王', labelEn: 'One Piece' },
  { value: 'sports', label: '體育卡', labelEn: 'Sports Cards' },
  { value: 'other', label: '其他', labelEn: 'Other' },
]