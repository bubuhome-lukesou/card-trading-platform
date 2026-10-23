<script setup lang="ts">
// 公開商家介紹頁 /seller/:id — 名稱/logo/簡介/營業時間/WeChat QR + 商品區
// 商品區：直傳 API 物件入 ProductCard（map-shape pitfall — 勿 map 成自訂形）
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Clock, MapPin, ShieldCheck, MessageCircle, X } from 'lucide-vue-next'
import { sellerProfilesApi, type SellerProfileData } from '@/api/seller-profiles'
import { productApi } from '@/api/products'
import ProductCard from '@/components/product/ProductCard.vue'
import StateView from '@/components/common/StateView.vue'
import { useListingVisibility } from '@/composables/useListingVisibility'

const route = useRoute()
const { locale } = useI18n()
const { hideEnded } = useListingVisibility()

const sellerId = computed(() => route.params.id as string)
const data = ref<SellerProfileData | null>(null)
const loading = ref(true)
const error = ref(false)

// 商品區
const products = ref<any[]>([])
const productsLoading = ref(true)
const activeTab = ref<'all' | 'auction' | 'reservation' | 'sale'>('all')
const PAGE_SIZE = 12
const page = ref(1)
const hasMore = ref(false)
const totalInTab = ref(0)

const loadProfile = async () => {
  loading.value = true
  error.value = false
  try {
    // stats 口徑與商品 fetch 的三個 hide 參數一致（全局「隱藏已結束」開關）
    data.value = await sellerProfilesApi.getPublicProfile(sellerId.value, {
      hideSold: hideEnded.value,
      hideExpired: hideEnded.value,
      hideEndedAuction: hideEnded.value
    })
  } catch (e) {
    console.error('Failed to load seller profile:', e)
    error.value = true
  } finally {
    loading.value = false
  }
}

const fetchProducts = async (append = false) => {
  if (!sellerId.value) return
  productsLoading.value = true
  try {
    const listingTypes = activeTab.value === 'all' ? undefined : [activeTab.value]
    const res = await productApi.getProducts({
      ...({
        sellerIds: [sellerId.value],
        listingTypes,
        page: page.value,
        limit: PAGE_SIZE
      } as any),
      hideSold: hideEnded.value,
      hideExpired: hideEnded.value,
      hideEndedAuction: hideEnded.value,
      withAuction: true
    } as any)
    // API 形狀兼容式（products = {data, meta} 包裝）
    const payload: any = res.data?.data ? res.data : { data: [], meta: null }
    const rows = payload.data || []
    products.value = append ? [...products.value, ...rows] : rows
    const meta = payload.meta
    totalInTab.value = meta?.total ?? (append ? totalInTab.value : rows.length)
    hasMore.value = meta ? page.value < meta.totalPages : rows.length >= PAGE_SIZE
  } catch (e) {
    console.error('Failed to fetch seller products:', e)
    if (!append) products.value = []
  } finally {
    productsLoading.value = false
  }
}

watch(activeTab, () => {
  page.value = 1
  fetchProducts()
})
watch(hideEnded, () => {
  page.value = 1
  fetchProducts()
})
watch(sellerId, () => {
  page.value = 1
  loadProfile()
  fetchProducts()
})

onMounted(() => {
  loadProfile()
  fetchProducts()
})

// ===== 顯示 helpers =====
const displayName = computed(() => data.value?.user?.nickname || '')
const logoSrc = computed(() => data.value?.profile?.logo || data.value?.user?.avatar || '')
const bannerSrc = computed(() => data.value?.profile?.banner || '')
const description = computed(() => {
  const p = data.value?.profile
  if (!p) return ''
  const zh = p.descriptionZh || ''
  const en = p.descriptionEn || ''
  return (locale.value === 'zh' ? (zh || en) : (en || zh)).trim()
})
const joinedYear = computed(() => {
  const c = data.value?.user?.createdAt
  return c ? new Date(c).getFullYear() : ''
})

const avatarChar = computed(() => (displayName.value || '?').charAt(0))

const resolveImageUrl = (url: string | null | undefined) => {
  if (!url) return ''
  if (url.startsWith('data:') || url.startsWith('http')) return url
  const apiBase = import.meta.env.VITE_API_URL || ''
  return apiBase + url
}

// WeChat QR 燈箱（點擊放大 → 長按識別 — 微信內置瀏覽器主流量）
const qrLightboxOpen = ref(false)
const openQrLightbox = () => { qrLightboxOpen.value = true }
const closeQrLightbox = () => { qrLightboxOpen.value = false }

const tabs = computed(() => [
  { key: 'all', label: locale.value === 'zh' ? `全部 (${data.value?.stats?.total ?? 0})` : `All (${data.value?.stats?.total ?? 0})` },
  { key: 'auction', label: locale.value === 'zh' ? `拍賣 (${data.value?.stats?.auction ?? 0})` : `Auction (${data.value?.stats?.auction ?? 0})` },
  { key: 'reservation', label: locale.value === 'zh' ? `預訂 (${data.value?.stats?.reservation ?? 0})` : `Reservation (${data.value?.stats?.reservation ?? 0})` },
  { key: 'sale', label: locale.value === 'zh' ? `銷售 (${data.value?.stats?.sale ?? 0})` : `Sale (${data.value?.stats?.sale ?? 0})` }
])

const goMarketplace = () => {
  const q: any = { sellers: sellerId.value }
  if (activeTab.value !== 'all') q.listing = activeTab.value
  window.location.href = '/marketplace?' + new URLSearchParams(q).toString()
}
</script>

<template>
  <div class="seller-page" v-if="!loading && !error && data">
    <!-- Banner -->
    <div class="sp-banner" :style="bannerSrc ? { backgroundImage: `url(${resolveImageUrl(bannerSrc)})` } : {}">
      <div class="sp-banner-fallback" v-if="!bannerSrc"></div>
    </div>

    <!-- Header card -->
    <div class="sp-header">
      <div class="sp-logo-wrap">
        <img v-if="logoSrc" :src="resolveImageUrl(logoSrc)" :alt="displayName" class="sp-logo-img" />
        <div v-else class="sp-logo-fallback">{{ avatarChar }}</div>
      </div>
      <div class="sp-header-main">
        <div class="sp-name-row">
          <h1 class="sp-name">{{ displayName }}</h1>
          <span v-if="data.profile?.verified" class="sp-verified" :title="locale === 'zh' ? '認證商家' : 'Verified seller'">
            <ShieldCheck :size="16" /> {{ locale === 'zh' ? '認證商家' : 'Verified' }}
          </span>
        </div>
        <p class="sp-desc" v-if="description">{{ description }}</p>
        <p class="sp-desc sp-desc-empty" v-else>{{ locale === 'zh' ? '此商家暫未填寫簡介' : 'This seller has not added a description yet.' }}</p>

        <div class="sp-meta-row">
          <span v-if="data.profile?.businessHours" class="sp-meta-item">
            <Clock :size="14" /> {{ data.profile.businessHours }}
          </span>
          <span v-if="data.profile?.location" class="sp-meta-item">
            <MapPin :size="14" /> {{ data.profile.location }}
          </span>
          <span v-if="joinedYear" class="sp-meta-item sp-meta-muted">
            {{ locale === 'zh' ? `${joinedYear} 年加入` : `Joined ${joinedYear}` }}
          </span>
        </div>
      </div>

      <!-- WeChat QR 卡 -->
      <div class="sp-wechat" v-if="data.profile?.wechatQrCode || data.profile?.wechatId">
        <div class="sp-wechat-qr" @click="openQrLightbox" :title="locale === 'zh' ? '點擊放大二維碼' : 'Tap to enlarge QR code'">
          <img :src="resolveImageUrl(data.profile.wechatQrCode)" alt="WeChat QR" v-if="data.profile?.wechatQrCode" />
          <span class="sp-wechat-hint">{{ locale === 'zh' ? '點擊放大' : 'Enlarge' }}</span>
        </div>
        <div class="sp-wechat-id" v-if="data.profile?.wechatId">
          <MessageCircle :size="13" />
          <span>WeChat: {{ data.profile.wechatId }}</span>
        </div>
      </div>
    </div>

    <!-- Products -->
    <div class="sp-products">
      <div class="sp-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="sp-tab"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key as any"
        >{{ tab.label }}</button>
      </div>

      <div v-if="productsLoading && products.length === 0" class="sp-state">載入中…</div>
      <div v-else-if="!productsLoading && products.length === 0" class="sp-state sp-state-empty">
        {{ locale === 'zh' ? '此分類暫無在售商品' : 'No listings in this category.' }}
      </div>
      <template v-else>
        <div class="sp-grid">
          <ProductCard v-for="p in products" :key="p.id" :product="{ ...p }" />
        </div>
        <div class="sp-more" v-if="hasMore">
          <button class="sp-more-btn" @click="page++; fetchProducts(true)" :disabled="productsLoading">
            {{ productsLoading ? (locale === 'zh' ? '載入中…' : 'Loading…') : (locale === 'zh' ? '載入更多' : 'Load more') }}
          </button>
        </div>
        <div class="sp-more" v-if="!hasMore && totalInTab > products.length">
          <button class="sp-more-btn sp-more-link" @click="goMarketplace">
            {{ locale === 'zh' ? `在 Marketplace 查看全部 ${totalInTab} 件商品 →` : `View all ${totalInTab} listings in Marketplace →` }}
          </button>
        </div>
      </template>
    </div>

    <!-- QR 燈箱 -->
    <div class="sp-lightbox" v-if="qrLightboxOpen" @click.self="closeQrLightbox">
      <button class="sp-lightbox-close" @click="closeQrLightbox"><X :size="22" /></button>
      <div class="sp-lightbox-body">
        <img :src="resolveImageUrl(data.profile?.wechatQrCode)" alt="WeChat QR" />
        <p class="sp-lightbox-hint">
          {{ locale === 'zh'
            ? '長按識別二維碼添加微信' + (data.profile?.wechatId ? `（WeChat: ${data.profile.wechatId}）` : '')
            : 'Long-press to scan the QR code' + (data.profile?.wechatId ? ` (WeChat: ${data.profile.wechatId})` : '') }}
        </p>
      </div>
    </div>
  </div>

  <!-- Loading / Error 全頁狀態 -->
  <div v-else-if="loading" class="sp-page-state">載入中…</div>
  <div v-else-if="error" class="sp-page-state sp-page-error">
    <p>{{ locale === 'zh' ? '找不到此商家' : 'Seller not found' }}</p>
    <button class="sp-more-btn" @click="loadProfile">{{ locale === 'zh' ? '重試' : 'Retry' }}</button>
  </div>
</template>

<style scoped>
/* ===== 商家介紹頁 — 深色玻璃風格（同詳情頁一致） ===== */
.seller-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px 48px;
  min-height: 100vh;
}
.sp-page-state {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(200, 200, 214, 0.7);
  font-size: 0.95rem;
}
.sp-page-error {
  flex-direction: column;
  gap: 16px;
}

/* Banner */
.sp-banner {
  margin: 0 -16px;
  height: 200px;
  background-color: #14142a;
  background-size: cover;
  background-position: center;
  position: relative;
}
.sp-banner-fallback {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #667eea33 0%, #764ba233 60%, #12162f 100%);
}

/* Header card */
.sp-header {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  margin: -56px 0 0;
  padding: 20px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  backdrop-filter: blur(12px);
  position: relative;
  z-index: 1;
}
.sp-logo-wrap {
  width: 96px;
  height: 96px;
  border-radius: 16px;
  background: #1a1a30;
  border: 2px solid rgba(255, 255, 255, 0.12);
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sp-logo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.sp-logo-fallback {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  font-weight: 700;
}
.sp-header-main {
  flex: 1;
  min-width: 0;
}
.sp-name-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.sp-name {
  font-size: 1.5rem;
  font-weight: 700;
  color: #f0f0f5;
  margin: 0;
  line-height: 1.2;
}
.sp-verified {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #10b981;
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.3);
}
.sp-desc {
  margin: 10px 0 0;
  font-size: 0.9rem;
  line-height: 1.6;
  color: rgba(200, 200, 214, 0.85);
  white-space: pre-line;
}
.sp-desc-empty {
  color: rgba(160, 160, 176, 0.55);
  font-style: italic;
}
.sp-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  margin-top: 12px;
}
.sp-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.8rem;
  color: rgba(200, 200, 214, 0.75);
}
.sp-meta-muted {
  color: rgba(160, 160, 176, 0.5);
}

/* WeChat QR 卡 */
.sp-wechat {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}
.sp-wechat-qr {
  width: 110px;
  height: 110px;
  border-radius: 8px;
  overflow: hidden;
  cursor: zoom-in;
  position: relative;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sp-wechat-qr img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.sp-wechat-hint {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  font-size: 0.65rem;
  text-align: center;
  color: #fff;
  background: rgba(0, 0, 0, 0.55);
  padding: 3px 0;
}
.sp-wechat-id {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.75rem;
  color: rgba(200, 200, 214, 0.8);
  max-width: 130px;
}
.sp-wechat-id span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Products */
.sp-products {
  margin-top: 28px;
}
.sp-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.sp-tab {
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: transparent;
  color: rgba(200, 200, 214, 0.8);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}
.sp-tab:hover {
  border-color: rgba(102, 126, 234, 0.5);
  color: #f0f0f5;
}
.sp-tab.active {
  background: rgba(102, 126, 234, 0.18);
  border-color: rgba(102, 126, 234, 0.6);
  color: #a5b4fc;
  font-weight: 600;
}
.sp-state {
  padding: 48px 0;
  text-align: center;
  color: rgba(200, 200, 214, 0.6);
  font-size: 0.9rem;
}
.sp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(218px, 1fr));
  gap: 16px;
}
.sp-more {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
.sp-more-btn {
  padding: 10px 28px;
  border-radius: 999px;
  border: 1px solid rgba(102, 126, 234, 0.4);
  background: rgba(102, 126, 234, 0.1);
  color: #a5b4fc;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}
.sp-more-btn:hover {
  background: rgba(102, 126, 234, 0.2);
}
.sp-more-link {
  border-style: dashed;
}

/* QR 燈箱 */
.sp-lightbox {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.sp-lightbox-close {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.sp-lightbox-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  max-width: 420px;
  width: 100%;
}
.sp-lightbox-body img {
  width: 100%;
  max-width: 400px;
  background: #fff;
  border-radius: 12px;
  padding: 10px;
}
.sp-lightbox-hint {
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.9rem;
  text-align: center;
  margin: 0;
}

/* 手機 */
@media (max-width: 640px) {
  .sp-banner {
    height: 140px;
  }
  .sp-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 16px;
  }
  .sp-header-main {
    width: 100%;
  }
  .sp-name-row {
    justify-content: center;
  }
  .sp-meta-row {
    justify-content: center;
  }
  .sp-wechat {
    flex-direction: row;
  }
  .sp-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
}
</style>