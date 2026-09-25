<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { ArrowRight, Zap } from 'lucide-vue-next'
import { productApi } from '@/api/products'
import api from '@/api'
import { CategoryLogo, BRAND_CATEGORIES } from '@/components/brand/CategoryLogos'
import BannerCarousel from '@/components/home/BannerCarousel.vue'
import ListingsCarousel from '@/components/home/ListingsCarousel.vue'
import { useListingVisibility } from '@/composables/useListingVisibility'

const { t, locale } = useI18n()

// 全局「隱藏已售出／已過期預訂／已結束拍賣」開關（導覽列共用，三區塊 fetch 帶過濾參數）
const { hideEnded } = useListingVisibility()

const categories = BRAND_CATEGORIES

const hotAuctions = ref<any[]>([])
const newListings = ref<any[]>([])
const hotReservations = ref<any[]>([])
const loadingAuctions = ref(false)
const loadingProducts = ref(false)
const loadingReservations = ref(false)

// ===== 首頁 Hero + 統計條（管理員可編輯，GET /home-settings/public；null fallback 預設值）=====
interface StatItem { value: string; labelZh: string; labelEn: string }
const homeSettings = ref<any>(null)
const isZh = computed(() => locale.value === 'zh')

const heroTitle = computed(() => {
  const s = homeSettings.value
  const fallback = t('home.hero.title')
  if (!s) return fallback
  return (isZh.value ? (s.heroTitleZh || s.heroTitleEn) : (s.heroTitleEn || s.heroTitleZh)) || fallback
})
const heroSubtitle = computed(() => {
  const s = homeSettings.value
  const fallback = t('home.hero.subtitle')
  if (!s) return fallback
  return (isZh.value ? (s.heroSubtitleZh || s.heroSubtitleEn) : (s.heroSubtitleEn || s.heroSubtitleZh)) || fallback
})
const heroPrimaryBtn = computed(() => {
  const s = homeSettings.value
  const fallback = t('home.hero.bidNow')
  if (!s) return fallback
  return (isZh.value ? (s.heroPrimaryBtnZh || s.heroPrimaryBtnEn) : (s.heroPrimaryBtnEn || s.heroPrimaryBtnZh)) || fallback
})
const heroPrimaryLink = computed(() => homeSettings.value?.heroPrimaryLink || '/auctions')
const heroSecondaryBtn = computed(() => {
  const s = homeSettings.value
  const fallback = t('home.hero.browse')
  if (!s) return fallback
  return (isZh.value ? (s.heroSecondaryBtnZh || s.heroSecondaryBtnEn) : (s.heroSecondaryBtnEn || s.heroSecondaryBtnZh)) || fallback
})
const heroSecondaryLink = computed(() => homeSettings.value?.heroSecondaryLink || '/marketplace')

// 統計條：DB statsJson 優先，fallback i18n 預設
const stats = computed<StatItem[]>(() => {
  const raw = homeSettings.value?.statsJson
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((s: any) => ({
          value: String(s.value ?? ''),
          labelZh: String(s.labelZh ?? s.label ?? ''),
          labelEn: String(s.labelEn ?? s.label ?? ''),
        }))
      }
    } catch { /* JSON 壞 → fallback */ }
  }
  // 預設三項（label 對應 i18n key）
  return [
    { value: '10,000+', labelZh: '拍賣總數', labelEn: 'Total Auctions' },
    { value: '5,000+', labelZh: '用戶總數', labelEn: 'Total Users' },
    { value: '98%', labelZh: '滿意度', labelEn: 'Satisfaction' },
  ]
})

const fetchHomeSettings = async () => {
  try {
    const res = await api.get('/home-settings/public')
    homeSettings.value = res.data || null
  } catch {
    homeSettings.value = null // 靜默 fallback 預設
  }
}

// 兩個區塊統一呼叫 /api/products，只係篩選唔同：
// 熱門拍賣 = listingTypes[]=['auction'] + withAuction（附 auction 摘要：auctionId/價/出價數/結束時間）
// 最新上架 = sortBy='newest'
// ⚠️ 必須原樣傳 ProductCard 欄位（titleZh/titleEn/images 陣列/price/quantity/language），
// 不可 map 成自訂形（ProductCard 讀 titleZh/images[0]/price，map 錯名會令卡空白）
const fetchHotAuctions = async () => {
  loadingAuctions.value = true
  try {
    // 全局「隱藏已結束」開關：hideEndedAuction 濾走已結束拍賣（hideSold 對拍賣品 qty=1 無影響，照帶保持一致）
    const response = await productApi.getProducts({
      listingTypes: ['auction'],
      withAuction: true,
      limit: 10,
      hideSold: hideEnded.value,
      hideExpired: hideEnded.value,
      hideEndedAuction: hideEnded.value
    } as any)
    hotAuctions.value = (response.data.data || [])
      .filter((p: any) => p.auctionSummary) // 只顯示有進行中拍賣嘅商品
      .map((product: any) => ({ ...product })) // 原樣保留，auctionSummary 由 ProductCard 直接讀
  } catch (e) {
    console.error('Failed to fetch auctions:', e)
  } finally {
    loadingAuctions.value = false
  }
}

// 熱門預約 — 同一 API，filter 不同：listingTypes=['reservation']，只顯示截止時間未過的商品
const fetchHotReservations = async () => {
  loadingReservations.value = true
  try {
    // 全局開關：hideExpired 濾走 reservationDeadline 已過嘅商品（前端 filter 為雙保險）
    const response = await productApi.getProducts({
      listingTypes: ['reservation'],
      sortBy: 'newest',
      limit: 10,
      hideSold: hideEnded.value,
      hideExpired: hideEnded.value,
      hideEndedAuction: hideEnded.value
    } as any)
    const now = Date.now()
    hotReservations.value = (response.data.data || [])
      .filter((p: any) => !p.reservationDeadline || new Date(p.reservationDeadline).getTime() > now)
      .map((product: any) => ({ ...product })) // 原樣保留（含 reservationDeadline/reservationSpots 供卡顯示）
  } catch (e) {
    console.error('Failed to fetch reservations:', e)
  } finally {
    loadingReservations.value = false
  }
}

const fetchNewListings = async () => {
  loadingProducts.value = true
  try {
    // 全局「隱藏已結束」開關：三過濾參數與 marketplace 同步（hideSold/hideExpired/hideEndedAuction）
    const response = await productApi.getProducts({
      sortBy: 'newest',
      limit: 10,
      withAuction: true,
      hideSold: hideEnded.value,
      hideExpired: hideEnded.value,
      hideEndedAuction: hideEnded.value
    } as any)
    newListings.value = (response.data.data || []).map((product: any) => ({ ...product })) // 原樣保留（ProductCard 直接讀全部欄位）
  } catch (e) {
    console.error('Failed to fetch products:', e)
  } finally {
    loadingProducts.value = false
  }
}

// 全局開關改動（導覽列/marketplace toggle 觸發）→ 首頁三區塊重新 fetch
watch(hideEnded, () => {
  fetchHotAuctions()
  fetchNewListings()
  fetchHotReservations()
})

onMounted(() => {
  fetchHomeSettings()
  fetchHotAuctions()
  fetchNewListings()
  fetchHotReservations()
})
</script>

<template>
  <div class="home">
    <div class="home-top">
    <!-- Hero Banner（內容管理員可編輯）— 浮世繪背景：青海波+富士山+櫻花 -->
    <section class="hero-banner">
      <div class="hero-scrim" aria-hidden="true"></div>
      <div class="container">
        <div class="banner-content">
          <h1 class="banner-title">
            <span class="gradient-text">{{ heroTitle }}</span>
          </h1>
          <p class="banner-subtitle">{{ heroSubtitle }}</p>
          <div class="banner-actions">
            <RouterLink :to="heroPrimaryLink" class="btn btn-primary btn-lg">
              <Zap class="icon" />
              {{ heroPrimaryBtn }}
            </RouterLink>
            <RouterLink :to="heroSecondaryLink" class="btn btn-outline btn-lg">
              {{ heroSecondaryBtn }}
              <ArrowRight class="icon" />
            </RouterLink>
          </div>
        </div>
      </div>
    </section>

    <!-- Banner Ads（走馬燈） -->
    <section class="banner-section">
      <div class="container">
        <BannerCarousel />
      </div>
    </section>

    <!-- Stats（內容管理員可編輯） -->
    <section class="stats-bar">
      <div class="container">
        <div class="stats-grid">
          <div v-for="(stat, i) in stats" :key="i" class="stat-item">
            <span class="stat-value">{{ stat.value }}</span>
            <span class="stat-label">{{ isZh ? stat.labelZh : (stat.labelEn || stat.labelZh) }}</span>
          </div>
        </div>
      </div>
    </section>
    </div><!-- /.home-top -->

    <!-- Categories — 頂部場景（Hero→廣告→統計）之外，正常 body 背景 -->
    <section class="section categories-section">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">
            <span class="emoji">📂</span>
            {{ t('home.categories.title') }}
          </h2>
          <RouterLink to="/marketplace" class="see-all">
            {{ t('home.seeAll') }}
            <ArrowRight class="icon" />
          </RouterLink>
        </div>
        <div class="categories-grid">
          <RouterLink
            v-for="cat in categories"
            :key="cat.id"
            :to="`/marketplace?category=${cat.id}`"
            class="category-card"
          >
            <span class="category-emoji category-logo-wrap"><CategoryLogo :category="cat.id" :size="26" /></span>
            <span class="category-name">{{ t(cat.name) }}</span>
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- New Listings -->
    <section class="section listings-section">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">
            <span class="emoji new">✨</span>
            {{ t('home.newListings.title') }}
          </h2>
          <RouterLink to="/marketplace?sort=newest" class="see-all">
            {{ t('home.seeAll') }}
            <ArrowRight class="icon" />
          </RouterLink>
        </div>
        <ListingsCarousel
          :title-key="'home.newListings.title'"
          :emoji="'✨'"
          :see-all-to="'/marketplace?sort=newest'"
          :items="newListings"
        />
      </div>
    </section>

    <!-- Hot Auctions -->
    <section class="section auctions-section">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">
            <span class="emoji hot">🔥</span>
            {{ t('home.hotAuctions.title') }}
          </h2>
          <RouterLink to="/marketplace?listing=auction" class="see-all">
            {{ t('home.seeAll') }}
            <ArrowRight class="icon" />
          </RouterLink>
        </div>
        <ListingsCarousel
          :title-key="'home.hotAuctions.title'"
          :emoji="'🔥'"
          :see-all-to="'/marketplace?listing=auction'"
          :items="hotAuctions"
        />
      </div>
    </section>

    <!-- Hot Reservations -->
    <section class="section reservations-section">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">
            <span class="emoji resv">📅</span>
            {{ t('home.hotReservations.title') }}
          </h2>
          <RouterLink to="/marketplace?listing=reservation" class="see-all">
            {{ t('home.seeAll') }}
            <ArrowRight class="icon" />
          </RouterLink>
        </div>
        <ListingsCarousel
          :title-key="'home.hotReservations.title'"
          :emoji="'📅'"
          :see-all-to="'/marketplace?listing=reservation'"
          :items="hotReservations"
        />
      </div>
    </section>

    <!-- CTA -->
    <section class="section cta-section">
      <div class="container">
        <div class="cta-card">
          <div class="cta-content">
            <h2>{{ t('home.cta.title') }}</h2>
            <p>{{ t('home.cta.desc') }}</p>
            <RouterLink to="/seller/apply" class="btn btn-primary btn-lg">
              {{ t('home.cta.button') }}
            </RouterLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.home {
  background: transparent;
}

// 頂部一體化場景：Hero→廣告→統計 三區共用浮世繪背景（SVG 1600x1400：
// 上 500px 富士山場景 + 下方青海波海域延伸；快速分類區喺場景之外）
// background-color 兜底 + 任何高度都有海域延伸，唔會露 body 花紋
.home-top {
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: url('@/assets/home/hero-ukiyo.svg');
    background-size: 100% auto;
    background-position: top center;
    background-repeat: no-repeat;
    background-color: #12162f;
    pointer-events: none;
  }

  // 底部收口：漸融 body 底色（統計區之後過渡返 body 背景）
  &::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 140px;
    background: linear-gradient(180deg, rgba(13, 13, 26, 0) 0%, rgba(13, 13, 26, 0.95) 100%);
    pointer-events: none;
  }

  // 內容抬高到背景之上
  > * {
    position: relative;
    z-index: 1;
  }
}

// Hero Banner — 場景頂部（富士山+櫻花+朝燒），文字區
// ⚠️ 唔好加任何 ::after 底部壓暗/過渡條 — hero 同廣告區同處一體場景，
// 任何區界漸變都會喺 section 邊界形成可見硬邊（Luke 實測回饋「斷裂」）
.hero-banner {
  position: relative;
  min-height: 300px;
  display: flex;
  align-items: center;
}

// 文字可讀性紗幕：只向左加壓，上下唔收口（避免區界硬邊）
.hero-scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(10, 10, 24, 0.62) 0%, rgba(10, 10, 24, 0.38) 38%, rgba(10, 10, 24, 0.05) 72%);
  pointer-events: none;
}

.banner-content {
  position: relative;
  z-index: 2;
  max-width: 640px;
  padding: var(--space-8) 0 var(--space-10);
}

.banner-title {
  font-family: var(--font-display);
  font-size: clamp(1.9rem, 4.6vw, 3rem);
  font-weight: 900;
  margin-bottom: var(--space-3);
  letter-spacing: -0.02em;
}

.banner-subtitle {
  font-size: var(--text-base);
  color: var(--text-secondary);
  margin-bottom: var(--space-5);
}

.banner-actions {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;

  .icon {
    width: 18px;
    height: 18px;
  }

  :deep(.btn-lg) {
    padding: 0.625rem var(--space-6);
    font-size: var(--text-base);
  }
}

// 手機：文字置中（富士山喺右側會被裁走大半，左對齊佈局唔成立）
@media (max-width: 640px) {
  .banner-content {
    max-width: 100%;
    text-align: center;
    padding: var(--space-8) 0;
  }

  .banner-actions {
    justify-content: center;
  }
}

// Banner Ads（走馬燈）— 透明，浮世繪海域背景由 .home-top 統一供應
.banner-section {
  padding: var(--space-5) 0;
}

// Stats Bar — 透明，同上
.stats-bar {
  padding: var(--space-5) 0 var(--space-6);
}

.stats-grid {
  display: flex;
  justify-content: center;
  gap: var(--space-16);
  flex-wrap: wrap;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 700;
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-label {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

// Sections — 緊湊節奏
.section {
  padding: var(--space-8) 0 var(--space-6);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
}

.section-title {
  font-size: var(--text-xl);
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: var(--space-2);

  .emoji {
    font-size: 24px;
    &.hot { animation: pulse 1.5s infinite; }
    &.new { animation: sparkle 2s infinite; }
    &.resv { animation: pulse 2s infinite; }
  }
}

.see-all {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-sm);
  color: var(--primary);
  text-decoration: none;
  transition: gap var(--transition-fast);

  &:hover {
    gap: var(--space-2);
  }

  .icon {
    width: 16px;
    height: 16px;
  }
}

// Categories Grid — 場景之外，正常 body 背景
.categories-section {
  background: transparent;
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--space-3);

  @media (max-width: 1024px) {
    grid-template-columns: repeat(5, 1fr);
  }

  @media (max-width: 640px) {
    grid-template-columns: repeat(3, 1fr);
  }
}

.category-logo-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
}

.category-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-2);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  text-decoration: none;
  transition: all var(--transition-fast);

  &:hover {
    border-color: var(--primary);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
}

.category-emoji {
  font-size: 32px;
}

.category-name {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  text-align: center;
}

// Listings — 橫向滑動展示
.scroll-wrapper {
  position: relative;
}

.listings-scroll {
  display: flex;
  gap: var(--space-4);
  overflow-x: auto;
  padding-bottom: var(--space-2);
  scroll-snap-type: x proximity;
  -webkit-overflow-scrolling: touch;

  // 隱藏捲軸但保留滑動
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar {
    display: none;
  }

  .listing-card {
    flex: 0 0 auto;
    width: calc((100% - var(--space-4) * 4) / 5);
    min-width: 200px;
    scroll-snap-align: start;

    @media (max-width: 1024px) {
      width: calc((100% - var(--space-4) * 3) / 4);
    }

    @media (max-width: 640px) {
      width: calc((100% - var(--space-4)) / 2);
      min-width: 160px;
    }
  }
}

// 左右滑動箭頭（懸浮在容器兩側，垂直置中）
.scroll-arrow {
  position: absolute;
  top: 40%;
  transform: translateY(-50%);
  width: 38px;
  height: 38px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.9), rgba(118, 75, 162, 0.9));
  border: 1.5px solid rgba(255, 255, 255, 0.35);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 20;
  transition: all var(--transition-fast);
  opacity: 1;

  .arrow-icon {
    width: 20px;
    height: 20px;
  }

  &:hover {
    transform: translateY(-50%) scale(1.1);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.55);
  }

  &.hidden {
    opacity: 0;
    pointer-events: none;
  }

  &.scroll-arrow-left {
    left: -14px;
  }

  &.scroll-arrow-right {
    right: -14px;
  }

  // 手機保留箭頭但縮小、貼邊
  @media (max-width: 640px) {
    width: 30px;
    height: 30px;

    .arrow-icon {
      width: 16px;
      height: 16px;
    }

    &.scroll-arrow-left {
      left: -6px;
    }

    &.scroll-arrow-right {
      right: -6px;
    }
  }
}

.listing-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  text-decoration: none;
  transition: all var(--transition-fast);

  &:hover {
    border-color: var(--primary);
    transform: translateY(-2px);
  }
}

// Auction countdown inside listing-style cards
.auction-timer {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
  color: var(--accent);
  margin-top: var(--space-1);

  .icon {
    width: 14px;
    height: 14px;
  }

  // Reservation deadline timer — amber tone
  &.reservation-timer {
    color: #fbbf24;
  }
}

.listing-image {
  position: relative;
  aspect-ratio: 4/3;
  background: linear-gradient(135deg, var(--bg-dark) 0%, var(--bg-elevated) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

// Action buttons (favorite/cart) - left side, transparent
.listing-actions {
  position: absolute;
  top: var(--space-2);
  left: var(--space-2);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  z-index: 10;
}

.listing-action-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  border: none;
  border-radius: var(--radius-full);
  color: white;
  cursor: pointer;
  transition: all var(--transition-fast);
  padding: 0;

  .action-icon {
    width: 14px;
    height: 14px;
  }

  &:hover {
    background: var(--primary);
    transform: scale(1.1);
  }

  &.active {
    background: var(--accent);
    .icon-filled {
      fill: var(--accent);
    }
  }
}

.listing-badge {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  z-index: 10;

  .badge-icon {
    width: 10px;
    height: 10px;
  }

  // Luke 9/16 色制：銷售=綠、拍賣=粉紅、預訂=琥珀
  &.is-auction {
    background: linear-gradient(135deg, #ec4899, #db2777);
    color: white;
  }

  &.is-sale {
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
  }

  &.is-reservation {
    background: linear-gradient(135deg, #f59e0b, #d97706);
    color: white;
  }
}

.listing-condition {
  // 品相顯示在 listing-meta 文字區域（非絕對定位）
  color: var(--text-muted);
  font-size: 10px;
}

.listing-language {
  color: var(--text-muted);
  font-size: 10px;
}

.listing-tag {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  padding: 2px var(--space-2);
  background: var(--primary);
  color: white;
  border-radius: var(--radius-sm);
  font-size: 10px;
  font-weight: 600;
}

.listing-info {
  padding: var(--space-3);
}

.listing-title {
  font-size: var(--text-xs);
  color: var(--text-primary);
  margin-bottom: var(--space-1);
  // 最多兩行，超出省略
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: normal;
  min-height: 2.4em;
}

// 色框標籤（分類/種類/品相/語言）
.listing-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: var(--space-1);
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  font-size: 9px;
  font-weight: 600;
  line-height: 1.5;
  white-space: nowrap;

  &.tag-category {
    background: rgba(102, 126, 234, 0.18);
    color: #8fa3f5;
  }

  &.tag-type {
    background: rgba(16, 185, 129, 0.15);
    color: #34d399;
  }

  &.tag-condition {
    background: rgba(245, 158, 11, 0.15);
    color: #fbbf24;
  }

  &.tag-language {
    background: rgba(236, 72, 153, 0.15);
    color: #f472b6;
  }
}

.listing-price {
  font-family: var(--font-num);
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--primary);
}

// Hot Auctions — 排版跟隨最新上架（listing-card 樣式復用）
.auctions-grid-listing {
  grid-template-columns: repeat(5, 1fr);

  @media (max-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }

  @media (max-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.auction-bids-inline {
  position: absolute;
  bottom: var(--space-2);
  left: var(--space-2);
  padding: 2px 8px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  border-radius: var(--radius-full);
  font-size: 10px;
  font-weight: 600;
  color: white;
  z-index: 10;
}

// CTA Section
.cta-card {
  background: var(--primary-gradient);
  border-radius: var(--radius-2xl);
  padding: var(--space-8) var(--space-12);
  text-align: center;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    pointer-events: none;
  }

  h2 {
    font-size: var(--text-2xl);
    font-weight: 700;
    color: white;
    margin-bottom: var(--space-3);
    position: relative;
  }

  p {
    font-size: var(--text-base);
    color: rgba(255, 255, 255, 0.9);
    margin-bottom: var(--space-6);
    position: relative;
  }

  .btn-primary {
    background: white;
    color: var(--primary-dark);

    &:hover {
      opacity: 0.9;
    }
  }
}

// Animations
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

@keyframes sparkle {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

// Buttons
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-lg);
  font-size: var(--text-base);
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  border: none;

  &-primary {
    background: var(--primary-gradient);
    color: white;

    &:hover {
      opacity: 0.9;
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
    }
  }

  &-outline {
    background: transparent;
    border: 2px solid var(--border);
    color: var(--text-primary);

    &:hover {
      border-color: var(--primary);
      color: var(--primary);
    }
  }

  &-lg {
    padding: var(--space-4) var(--space-8);
    font-size: var(--text-lg);
  }

  .icon {
    width: 20px;
    height: 20px;
  }
}

// Container
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-6);
}
</style>
