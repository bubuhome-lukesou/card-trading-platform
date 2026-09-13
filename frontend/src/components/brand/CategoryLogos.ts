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
        // ===== 海賊王：草帽海賊團旗（骷髏 + 草帽 + 交叉白骨）=====
        case 'onepiece':
          return h('svg', { width: size, height: size, viewBox: '0 0 48 48', fill: 'none' }, [
            // 黑底（旗）
            h('rect', { x: 0, y: 0, width: 48, height: 48, rx: 8, fill: '#0a0a0a', stroke: '#2f2f2f', 'stroke-width': 1 }),
            // 交叉白骨（兩根，±45°，兩端圓珠）
            h('g', { transform: 'rotate(45 24 24)' }, [
              h('rect', { x: 5, y: 21.75, width: 38, height: 4.5, rx: 2.25, fill: '#fff' }),
              h('circle', { cx: 7, cy: 20.9, r: 2.9, fill: '#fff' }),
              h('circle', { cx: 7, cy: 27.1, r: 2.9, fill: '#fff' }),
              h('circle', { cx: 41, cy: 20.9, r: 2.9, fill: '#fff' }),
              h('circle', { cx: 41, cy: 27.1, r: 2.9, fill: '#fff' }),
            ]),
            h('g', { transform: 'rotate(-45 24 24)' }, [
              h('rect', { x: 5, y: 21.75, width: 38, height: 4.5, rx: 2.25, fill: '#fff' }),
              h('circle', { cx: 7, cy: 20.9, r: 2.9, fill: '#fff' }),
              h('circle', { cx: 7, cy: 27.1, r: 2.9, fill: '#fff' }),
              h('circle', { cx: 41, cy: 20.9, r: 2.9, fill: '#fff' }),
              h('circle', { cx: 41, cy: 27.1, r: 2.9, fill: '#fff' }),
            ]),
            // 骷髏頭（白）
            h('circle', { cx: 24, cy: 27, r: 8, fill: '#fff' }),
            // 下顎 + 牙齒
            h('rect', { x: 19.5, y: 32, width: 9, height: 6.5, rx: 2.5, fill: '#fff' }),
            h('path', { d: 'M21.7 32.5 L21.7 38 M24 32.5 L24 38.3 M26.3 32.5 L26.3 38', stroke: '#0a0a0a', 'stroke-width': 0.8 }),
            // 眼窩 + 鼻
            h('circle', { cx: 20.7, cy: 26.5, r: 2.4, fill: '#0a0a0a' }),
            h('circle', { cx: 27.3, cy: 26.5, r: 2.4, fill: '#0a0a0a' }),
            h('circle', { cx: 24, cy: 30, r: 1.1, fill: '#0a0a0a' }),
            // 草帽：帽頂（黃）
            h('path', { d: 'M16 20 A8 7 0 0 1 32 20 Z', fill: '#f2c94c', stroke: '#1a1a1a', 'stroke-width': 1 }),
            // 紅帽帶
            h('path', { d: 'M15.7 17.2 Q24 15.4 32.3 17.2 L32.6 20.4 Q24 18.8 15.4 20.4 Z', fill: '#d93636' }),
            // 帽簷（黃，橢圓蓋過帽帶下緣）
            h('ellipse', { cx: 24, cy: 20.3, rx: 12.5, ry: 2.6, fill: '#f2c94c', stroke: '#1a1a1a', 'stroke-width': 1 }),
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
        // ===== 體育卡 / 其他：還原原本 emoji（⚽ / 🎴）=====
        case 'sports':
          return h('span', { style: { fontSize: `${size}px`, lineHeight: '1' } }, '⚽')
        case 'other':
          return h('span', { style: { fontSize: `${size}px`, lineHeight: '1' } }, '🎴')
        default:
          // fallback：通用卡牌 icon
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