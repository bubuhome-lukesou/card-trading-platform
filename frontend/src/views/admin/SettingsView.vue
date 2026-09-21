<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { adminApi } from '@/api/admin'
import { tagApi } from '@/api/tags'
import { pagesApi } from '@/api/pages'
import api from '@/api'
import { uploadApi } from '@/api/upload'
import type { Tag } from '@/types'

const activeTab = ref('general')
const bannerFileInput = ref<HTMLInputElement | null>(null)

// ===== 頁面管理（原 PagesEditorView 整合） =====
interface PageItem {
  type: string
  titleZh: string
  titleEn: string
  contentZh: string
  contentEn: string
}

const pages = ref<PageItem[]>([])
const activePage = ref<string>('help')
const pagesLoading = ref(false)
const pagesSaving = ref(false)
const pageFormData = ref({
  titleZh: '',
  titleEn: '',
  contentZh: '',
  contentEn: '',
})

const pageLabels: Record<string, string> = {
  help: '幫助中心',
  contact: '聯絡我們',
  faq: '常見問題',
}

const loadPages = async () => {
  pagesLoading.value = true
  try {
    const response = await pagesApi.getAllPages()
    pages.value = response.data
    if (pages.value.length > 0) {
      await selectPage(pages.value[0].type)
    } else {
      await selectPage('help')
    }
  } catch (error) {
    console.error('Failed to load pages:', error)
  } finally {
    pagesLoading.value = false
  }
}

const selectPage = async (type: string) => {
  activePage.value = type
  try {
    const response = await pagesApi.getPage(type, 'zh')
    const data = response.data
    pageFormData.value = {
      titleZh: data.titleZh || '',
      titleEn: data.titleEn || '',
      contentZh: data.contentZh || '',
      contentEn: data.contentEn || '',
    }
  } catch {
    pageFormData.value = { titleZh: '', titleEn: '', contentZh: '', contentEn: '' }
  }
}

const savePage = async () => {
  pagesSaving.value = true
  try {
    await pagesApi.updatePage({
      type: activePage.value,
      ...pageFormData.value,
    })
    alert('儲存成功')
  } catch (error) {
    console.error('Failed to save:', error)
    alert('儲存失敗')
  } finally {
    pagesSaving.value = false
  }
}

// ---- General Settings ----
// 註：platformName/platformUrl/supportEmail/supportPhone/platformFee 等欄位後端未支持保存（#8），
// 隱藏假欄位直到後端實作；目前只保留取貨資訊 + QR + 密碼修改
const settings = ref({
  platformName: 'PicardChu',
  platformUrl: 'https://card.aishoper.co',
  supportEmail: 'support@aishoper.co',
  supportPhone: '+853 1234 5678',
  platformFee: 5,
  minWithdraw: 100,
  maxAuctionDuration: 168,
  defaultBidIncrement: 10,
  pickupInfo: '',
  pickupQrCode: '',
})
const saving = ref(false)
const loading = ref(false)

const handleSave = async () => {
  saving.value = true
  try {
    await adminApi.updateSettings({
      pickupInfo: settings.value.pickupInfo,
      pickupQrCode: settings.value.pickupQrCode,
    })
    alert('設置已保存')
  } catch (e) {
    console.error('Save failed', e)
    alert('保存失敗')
  } finally {
    saving.value = false
  }
}

// Password change
const passwordData = ref({ currentPassword: '', newPassword: '', confirmPassword: '' })
const passwordError = ref('')
const passwordSuccess = ref('')

const handlePasswordChange = async () => {
  passwordError.value = ''
  passwordSuccess.value = ''
  if (passwordData.value.newPassword !== passwordData.value.confirmPassword) {
    passwordError.value = '兩次輸入的密碼不一致'
    return
  }
  if (passwordData.value.newPassword.length < 6) {
    passwordError.value = '密碼至少需要 6 個字符'
    return
  }
  saving.value = true
  try {
    await adminApi.changePassword({
      currentPassword: passwordData.value.currentPassword,
      newPassword: passwordData.value.newPassword,
    })
    passwordData.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
    passwordSuccess.value = '密碼已修改'
    setTimeout(() => passwordSuccess.value = '', 3000)
  } catch (e: any) {
    passwordError.value = e?.response?.data?.message || '修改密碼失敗'
  } finally {
    saving.value = false
  }
}

// ---- Tag Management ----
const tags = ref<Tag[]>([])
const tagLoading = ref(false)
const showTagForm = ref(false)
const editingTag = ref<Tag | null>(null)
const newTagName = ref('')
const newTagCategory = ref('all')
const tagError = ref('')

// Filters
const tagSearch = ref('')
const tagFilterCategory = ref('all')

const tagCategories = [
  { value: 'all', label: '全部分類' },
  { value: 'pokemon', label: '寶可夢' },
  { value: 'yugioh', label: '遊戲王' },
  { value: 'mtg', label: '萬智牌' },
  { value: 'ultraman', label: '奧特曼' },
  { value: 'onepiece', label: '海賊王' },
  { value: 'doraemon', label: '哆啦A夢' },
  { value: 'sports', label: '體育卡' },
  { value: 'other', label: '其他' },
]

const getCategoryLabel = (cat: string) => {
  return tagCategories.find(c => c.value === cat)?.label || cat
}

const filteredTags = computed(() => {
  let result = tags.value
  if (tagFilterCategory.value !== 'all') {
    result = result.filter(t => (t.category || 'all') === tagFilterCategory.value)
  }
  if (tagSearch.value.trim()) {
    const q = tagSearch.value.toLowerCase()
    result = result.filter(t =>
      t.name.toLowerCase().includes(q) ||
      (t.category || '').toLowerCase().includes(q)
    )
  }
  return result
})

const loadTags = async () => {
  tagLoading.value = true
  try {
    const res = await tagApi.getTags()
    tags.value = res.data
  } catch (e) {
    console.error('Failed to load tags', e)
  } finally {
    tagLoading.value = false
  }
}

const openTagForm = (tag?: Tag) => {
  if (tag) {
    editingTag.value = tag
    newTagName.value = tag.name
    newTagCategory.value = tag.category || 'all'
  } else {
    editingTag.value = null
    newTagName.value = ''
    newTagCategory.value = 'all'
  }
  tagError.value = ''
  showTagForm.value = true
}

const closeTagForm = () => {
  showTagForm.value = false
  editingTag.value = null
  newTagName.value = ''
  newTagCategory.value = 'all'
  tagError.value = ''
}

const handleSaveTag = async () => {
  if (!newTagName.value.trim()) {
    tagError.value = '請輸入標籤名稱'
    return
  }
  try {
    if (editingTag.value) {
      await tagApi.updateTag(editingTag.value.id, {
        name: newTagName.value.trim(),
        category: newTagCategory.value,
      })
    } else {
      await tagApi.createTag({
        name: newTagName.value.trim(),
        type: 'general',
        category: newTagCategory.value,
      })
    }
    await loadTags()
    closeTagForm()
  } catch (e: any) {
    tagError.value = e?.response?.data?.message || '操作失敗'
  }
}

const handleDeleteTag = async (tag: Tag) => {
  if (!confirm(`確定要刪除標籤「${tag.name}」嗎？`)) return
  try {
    await tagApi.deleteTag(tag.id)
    await loadTags()
  } catch (e: any) {
    alert(e?.response?.data?.message || '刪除失敗')
  }
}

// ===== 廣告走馬燈管理 =====

interface BannerItem {
  id: number
  title: string | null
  imageUrl: string
  linkUrl: string | null
  sortOrder: number
  isActive: boolean
}

const apiBase = import.meta.env.VITE_API_URL || ''
const banners = ref<BannerItem[]>([])
const newBanner = ref({ title: '', linkUrl: '', sortOrder: 0, imageUrl: '' })
const uploadingBanner = ref(false)

const loadBanners = async () => {
  try {
    const res = await api.get('/banners')
    banners.value = res.data || []
  } catch (e) {
    console.error('Failed to load banners', e)
  }
}

const handleBannerFileChange = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingBanner.value = true
  try {
    const res = await uploadApi.uploadImage(file)
    newBanner.value.imageUrl = res.data.url
  } catch (err: any) {
    alert(err?.response?.data?.message || '圖片上傳失敗')
  } finally {
    uploadingBanner.value = false
  }
}

const handleAddBanner = async () => {
  if (!newBanner.value.imageUrl) return
  try {
    await api.post('/banners', {
      title: newBanner.value.title || undefined,
      imageUrl: newBanner.value.imageUrl,
      linkUrl: newBanner.value.linkUrl || undefined,
      sortOrder: newBanner.value.sortOrder || 0,
      isActive: true,
    })
    newBanner.value = { title: '', linkUrl: '', sortOrder: 0, imageUrl: '' }
    const input = bannerFileInput.value as HTMLInputElement | null
    if (input) input.value = ''
    await loadBanners()
  } catch (e: any) {
    alert(e?.response?.data?.message || '添加失敗')
  }
}

const handleToggleBanner = async (banner: BannerItem) => {
  try {
    await api.put(`/banners/${banner.id}`, { isActive: !banner.isActive })
    await loadBanners()
  } catch (e: any) {
    alert(e?.response?.data?.message || '操作失敗')
  }
}

const handleMoveBanner = async (banner: BannerItem, dir: number) => {
  try {
    await api.put(`/banners/${banner.id}`, { sortOrder: Math.max(0, banner.sortOrder + dir) })
    await loadBanners()
  } catch (e: any) {
    alert(e?.response?.data?.message || '操作失敗')
  }
}

const handleDeleteBanner = async (banner: BannerItem) => {
  if (!confirm('確定要刪除這個廣告嗎？')) return
  try {
    await api.delete(`/banners/${banner.id}`)
    await loadBanners()
  } catch (e: any) {
    alert(e?.response?.data?.message || '刪除失敗')
  }
}

// ===== 首頁 Hero + 統計條編輯（GET/PATCH /home-settings）=====
interface HomeStatsRow { value: string; labelZh: string; labelEn: string }

const heroForm = ref({
  heroTitleZh: '', heroTitleEn: '',
  heroSubtitleZh: '', heroSubtitleEn: '',
  heroPrimaryBtnZh: '', heroPrimaryBtnEn: '', heroPrimaryLink: '',
  heroSecondaryBtnZh: '', heroSecondaryBtnEn: '', heroSecondaryLink: '',
  statsRows: [
    { value: '10,000+', labelZh: '拍賣總數', labelEn: 'Total Auctions' },
    { value: '5,000+', labelZh: '用戶總數', labelEn: 'Total Users' },
    { value: '98%', labelZh: '滿意度', labelEn: 'Satisfaction' },
  ] as HomeStatsRow[],
})
const heroLoading = ref(false)
const heroSaving = ref(false)

const loadHomeSettings = async () => {
  heroLoading.value = true
  try {
    const res = await api.get('/home-settings')
    const d = res.data || {}
    let rows: HomeStatsRow[] = []
    if (d.statsJson) {
      try {
        const parsed = JSON.parse(d.statsJson)
        if (Array.isArray(parsed)) {
          rows = parsed.map((s: any) => ({
            value: String(s.value ?? ''),
            labelZh: String(s.labelZh ?? s.label ?? ''),
            labelEn: String(s.labelEn ?? s.label ?? ''),
          }))
        }
      } catch { /* fallback 預設 */ }
    }
    heroForm.value = {
      heroTitleZh: d.heroTitleZh || '',
      heroTitleEn: d.heroTitleEn || '',
      heroSubtitleZh: d.heroSubtitleZh || '',
      heroSubtitleEn: d.heroSubtitleEn || '',
      heroPrimaryBtnZh: d.heroPrimaryBtnZh || '',
      heroPrimaryBtnEn: d.heroPrimaryBtnEn || '',
      heroPrimaryLink: d.heroPrimaryLink || '/auctions',
      heroSecondaryBtnZh: d.heroSecondaryBtnZh || '',
      heroSecondaryBtnEn: d.heroSecondaryBtnEn || '',
      heroSecondaryLink: d.heroSecondaryLink || '/marketplace',
      statsRows: rows.length > 0 ? rows : heroForm.value.statsRows,
    }
  } catch (e) {
    console.error('Failed to load home settings', e)
  } finally {
    heroLoading.value = false
  }
}

const addStatRow = () => {
  if (heroForm.value.statsRows.length >= 6) return
  heroForm.value.statsRows.push({ value: '', labelZh: '', labelEn: '' })
}

const removeStatRow = (i: number) => {
  heroForm.value.statsRows.splice(i, 1)
}

const saveHomeSettings = async () => {
  // 必填：至少一項統計（value 非空）
  const rows = heroForm.value.statsRows.filter(r => r.value.trim())
  if (rows.length === 0) { alert('請至少填一項統計（數值）'); return }
  heroSaving.value = true
  try {
    await api.patch('/home-settings', {
      heroTitleZh: heroForm.value.heroTitleZh || null,
      heroTitleEn: heroForm.value.heroTitleEn || null,
      heroSubtitleZh: heroForm.value.heroSubtitleZh || null,
      heroSubtitleEn: heroForm.value.heroSubtitleEn || null,
      heroPrimaryBtnZh: heroForm.value.heroPrimaryBtnZh || null,
      heroPrimaryBtnEn: heroForm.value.heroPrimaryBtnEn || null,
      heroPrimaryLink: heroForm.value.heroPrimaryLink || null,
      heroSecondaryBtnZh: heroForm.value.heroSecondaryBtnZh || null,
      heroSecondaryBtnEn: heroForm.value.heroSecondaryBtnEn || null,
      heroSecondaryLink: heroForm.value.heroSecondaryLink || null,
      statsJson: JSON.stringify(rows),
    })
    alert('首頁內容已保存，刷新首頁即見')
  } catch (e: any) {
    alert(e?.response?.data?.message || '保存失敗')
  } finally {
    heroSaving.value = false
  }
}

onMounted(async () => {
  loading.value = true
  try {
    const res = await adminApi.getSettings()
    if (res.data) {
      settings.value.pickupInfo = res.data.pickupInfo || ''
      settings.value.pickupQrCode = res.data.pickupQrCode || ''
    }
  } catch (e) {
    console.error('Failed to load settings', e)
  } finally {
    loading.value = false
  }
  await loadTags()
})
</script>

<template>
  <div class="settings-page">
    <!-- Tab bar -->
    <div class="tab-bar">
      <button class="tab-btn" :class="{ active: activeTab === 'general' }" @click="activeTab = 'general'">
        ⚙️ 平台設定
      </button>
      <button class="tab-btn" :class="{ active: activeTab === 'banners' }" @click="activeTab === 'banners' || (loadBanners(), loadHomeSettings()); activeTab = 'banners'">
        📢 廣告設置
      </button>
      <button class="tab-btn" :class="{ active: activeTab === 'pages' }" @click="activeTab === 'pages' || loadPages(); activeTab = 'pages'">
        📄 頁面管理
      </button>
      <button class="tab-btn" :class="{ active: activeTab === 'tags' }" @click="activeTab = 'tags'">
        🏷️ 標籤管理
      </button>
    </div>

    <!-- ===== Pages Tab（頁面管理） ===== -->
    <template v-if="activeTab === 'pages'">
      <div class="pages-editor-inline">
        <div class="pages-sidebar">
          <div
            v-for="page in pages.length > 0 ? pages : [{ type: 'help' }, { type: 'contact' }, { type: 'faq' }]"
            :key="page.type"
            class="page-item"
            :class="{ active: activePage === page.type }"
            @click="selectPage(page.type)"
          >
            {{ pageLabels[page.type] || page.type }}
          </div>
        </div>
        <div class="pages-main">
          <div v-if="pagesLoading" class="pages-loading">加載中...</div>
          <template v-else>
            <div class="form-group">
              <label>標題 (中文)</label>
              <input v-model="pageFormData.titleZh" type="text" placeholder="中文標題" />
            </div>
            <div class="form-group">
              <label>Title (English)</label>
              <input v-model="pageFormData.titleEn" type="text" placeholder="English title" />
            </div>
            <div class="form-group">
              <label>內容 (中文) - 支持 HTML</label>
              <textarea v-model="pageFormData.contentZh" rows="10" placeholder="支持 HTML 格式"></textarea>
            </div>
            <div class="form-group">
              <label>Content (English) - HTML supported</label>
              <textarea v-model="pageFormData.contentEn" rows="10" placeholder="HTML format supported"></textarea>
            </div>
            <button class="btn-primary pages-save-btn" :disabled="pagesSaving" @click="savePage">
              {{ pagesSaving ? '保存中...' : '保存更改' }}
            </button>
          </template>
        </div>
      </div>
    </template>

    <!-- ===== Banners Tab ===== -->
    <template v-if="activeTab === 'banners'">
      <!-- 首頁 Hero + 統計條編輯 -->
      <div class="settings-card">
        <h3 class="section-title">🏠 首頁主視覺（Hero + 統計條）</h3>
        <p class="section-desc">首頁頂部標題、副標題、兩粒按鈕同下方統計條（例：98% 滿意度）。留空 = 用預設值。保存後刷新首頁即見。</p>

        <div v-if="heroLoading" class="pages-loading">加載中...</div>
        <template v-else>
          <div class="form-grid">
            <div class="form-group">
              <label>主標題（中文）</label>
              <input v-model="heroForm.heroTitleZh" type="text" placeholder="珍稀卡牌 限時競拍" maxlength="200" />
            </div>
            <div class="form-group">
              <label>主標題（英文）</label>
              <input v-model="heroForm.heroTitleEn" type="text" placeholder="Rare Cards, Live Auctions" maxlength="200" />
            </div>
            <div class="form-group">
              <label>副標題（中文）</label>
              <input v-model="heroForm.heroSubtitleZh" type="text" placeholder="發現最珍貴的收藏卡牌，參與激動人心的即時競拍" maxlength="300" />
            </div>
            <div class="form-group">
              <label>副標題（英文）</label>
              <input v-model="heroForm.heroSubtitleEn" type="text" placeholder="Discover rare collectible cards..." maxlength="300" />
            </div>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label>主按鈕文字（中文）</label>
              <input v-model="heroForm.heroPrimaryBtnZh" type="text" placeholder="立即競拍" maxlength="60" />
            </div>
            <div class="form-group">
              <label>主按鈕連結</label>
              <input v-model="heroForm.heroPrimaryLink" type="text" placeholder="/auctions" />
            </div>
            <div class="form-group">
              <label>副按鈕文字（中文）</label>
              <input v-model="heroForm.heroSecondaryBtnZh" type="text" placeholder="瀏覽商品" maxlength="60" />
            </div>
            <div class="form-group">
              <label>副按鈕連結</label>
              <input v-model="heroForm.heroSecondaryLink" type="text" placeholder="/marketplace" />
            </div>
          </div>

          <div class="hero-stats-editor">
            <div class="stats-rows-header">
              <span class="stats-rows-title">統計條項目（{{ heroForm.statsRows.length }}/6）</span>
              <button class="banner-btn" :disabled="heroForm.statsRows.length >= 6" @click="addStatRow">+ 添加項目</button>
            </div>
            <div v-for="(row, i) in heroForm.statsRows" :key="i" class="stats-row">
              <input v-model="row.value" type="text" placeholder="數值（例：98%）" maxlength="20" class="stats-input-value" />
              <input v-model="row.labelZh" type="text" placeholder="標籤中文（例：滿意度）" maxlength="30" />
              <input v-model="row.labelEn" type="text" placeholder="Label EN" maxlength="30" />
              <button class="banner-btn-delete" :disabled="heroForm.statsRows.length <= 1" @click="removeStatRow(i)">🗑️</button>
            </div>
          </div>

          <button class="btn-primary add-banner-btn" :disabled="heroSaving" @click="saveHomeSettings">
            {{ heroSaving ? '保存中...' : '💾 保存首頁內容' }}
          </button>
        </template>
      </div>

      <div class="settings-card">
        <h3 class="section-title">首頁廣告走馬燈</h3>
        <p class="section-desc">圖片建議 1200×300 橫幅（手機自動調整比例）。排序越小越前，停用嘅不顯示。點擊可跳轉連結（留空 = 純展示）。</p>

        <div class="banner-form">
          <div class="form-grid">
            <div class="form-group">
              <label>備註（選填，不對外顯示）</label>
              <input v-model="newBanner.title" type="text" placeholder="例如：聖誕促銷" />
            </div>
            <div class="form-group">
              <label>點擊跳轉連結（選填）</label>
              <input v-model="newBanner.linkUrl" type="text" placeholder="https://example.com/promo" />
            </div>
            <div class="form-group">
              <label>排序（0 最前）</label>
              <input v-model.number="newBanner.sortOrder" type="number" min="0" />
            </div>
            <div class="form-group">
              <label>廣告圖片 <span class="required-mark">*</span></label>
              <input ref="bannerFileInput" type="file" accept="image/*" @change="handleBannerFileChange" />
              <div v-if="newBanner.imageUrl" class="banner-preview">
                <img :src="newBanner.imageUrl.startsWith('http') || newBanner.imageUrl.startsWith('data:') ? newBanner.imageUrl : apiBase + newBanner.imageUrl" alt="預覽" />
              </div>
            </div>
          </div>
          <button class="btn-primary add-banner-btn" :disabled="uploadingBanner || !newBanner.imageUrl" @click="handleAddBanner">
            {{ uploadingBanner ? '上傳中...' : '+ 添加廣告' }}
          </button>
        </div>
      </div>

      <div class="settings-card">
        <h3 class="section-title">現有廣告（{{ banners.length }}）</h3>
        <p v-if="banners.length === 0" class="section-desc">未有廣告。添加後首頁會顯示走馬燈。</p>
        <div v-else class="banner-list">
          <div v-for="banner in banners" :key="banner.id" class="banner-item" :class="{ inactive: !banner.isActive }">
            <img :src="banner.imageUrl.startsWith('http') || banner.imageUrl.startsWith('data:') ? banner.imageUrl : apiBase + banner.imageUrl" class="banner-thumb" :alt="banner.title || '廣告'" />
            <div class="banner-meta">
              <div class="banner-title-text">{{ banner.title || '（無備註）' }}</div>
              <div class="banner-link-text">{{ banner.linkUrl || '純展示，不可點擊' }}</div>
              <div class="banner-order-text">排序：{{ banner.sortOrder }}</div>
            </div>
            <div class="banner-actions">
              <button class="banner-btn" @click="handleToggleBanner(banner)">
                {{ banner.isActive ? '⏸ 停用' : '▶️ 啟用' }}
              </button>
              <button class="banner-btn-move" @click="handleMoveBanner(banner, -1)" :disabled="banner.sortOrder <= 0">↑</button>
              <button class="banner-btn-move" @click="handleMoveBanner(banner, 1)">↓</button>
              <button class="banner-btn-delete" @click="handleDeleteBanner(banner)">🗑️</button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ===== General Settings Tab ===== -->
    <template v-if="activeTab === 'general'">
      <div class="settings-card">
        <h3 class="section-title">平台資訊</h3>
        <p class="section-desc">平台名稱/網址/支援聯繫方式目前由代碼設定，網站設定欄位即將推出</p>
      </div>

      <div class="settings-card">
        <h3 class="section-title">預約攞貨設置</h3>
        <p class="section-desc">用戶點擊「預約攞貨」時會顯示以下信息</p>
        <div class="form-stack">
          <div class="form-group">
            <label>攞貨地點 / 時間 / WeChat（如無可留空）</label>
            <textarea
              v-model="settings.pickupInfo"
              rows="4"
              placeholder="範例：
📍 攞貨地點：澳門宋玉生廣場
🕐 攞貨時間：週一至週五 14:00-20:00
💬 WeChat：your_wechat_id"
            ></textarea>
          </div>
        </div>
      </div>

      <div class="settings-card">
        <h3 class="section-title">🔐 修改密碼</h3>
        <div class="form-grid">
          <div class="form-group">
            <label>當前密碼</label>
            <input v-model="passwordData.currentPassword" type="password" />
          </div>
          <div class="form-group">
            <label>新密碼</label>
            <input v-model="passwordData.newPassword" type="password" />
          </div>
          <div class="form-group">
            <label>確認新密碼</label>
            <input v-model="passwordData.confirmPassword" type="password" @keyup.enter="handlePasswordChange" />
          </div>
        </div>
        <div v-if="passwordError" class="error-text">{{ passwordError }}</div>
        <div v-if="passwordSuccess" class="success-text">{{ passwordSuccess }}</div>
        <div class="actions">
          <button @click="handlePasswordChange" class="btn-save" :disabled="saving">
            {{ saving ? '處理中...' : '修改密碼' }}
          </button>
        </div>
      </div>

      <div class="actions">
        <button @click="handleSave" class="btn-save" :disabled="saving">
          {{ saving ? '儲存中...' : '儲存設置' }}
        </button>
      </div>
    </template>

    <!-- ===== Tag Management Tab ===== -->
    <template v-if="activeTab === 'tags'">
      <div class="settings-card">
        <div class="section-header">
          <div>
            <h3 class="section-title">標籤管理</h3>
            <p class="section-desc">管理商品標籤，可按分類篩選或關鍵字搜尋</p>
          </div>
          <button class="btn-add" @click="openTagForm()">+ 新增標籤</button>
        </div>

        <!-- Filters -->
        <div class="tag-filters">
          <input
            v-model="tagSearch"
            type="text"
            class="tag-search"
            placeholder="🔍 搜尋標籤名稱..."
          />
          <select v-model="tagFilterCategory" class="tag-filter-select">
            <option v-for="cat in tagCategories" :key="cat.value" :value="cat.value">
              {{ cat.label }}
            </option>
          </select>
          <span class="tag-count">共 {{ filteredTags.length }} 個標籤</span>
        </div>

        <!-- Loading -->
        <div v-if="tagLoading" class="loading-state">
          <div class="spinner"></div>
          <p>載入中...</p>
        </div>

        <!-- Tag table -->
        <div v-else class="tag-table-wrap">
          <table class="tag-table">
            <thead>
              <tr>
                <th style="width: 50px">#</th>
                <th>標籤名稱</th>
                <th>歸屬分類</th>
                <th>排序</th>
                <th style="width: 90px">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredTags.length === 0">
                <td colspan="5" class="empty-row">暫無符合條件的標籤</td>
              </tr>
              <tr v-for="(tag, idx) in filteredTags" :key="tag.id">
                <td class="td-idx">{{ idx + 1 }}</td>
                <td class="td-name">
                  <span class="tag-dot" :style="{ backgroundColor: tag.color || '#818cf8' }"></span>
                  {{ tag.name }}
                </td>
                <td class="td-category">
                  <span class="cat-badge">{{ getCategoryLabel(tag.category || 'all') }}</span>
                </td>
                <td class="td-sort">{{ tag.sortOrder }}</td>
                <td class="td-actions">
                  <button class="btn-icon" @click="openTagForm(tag)" title="編輯">✏️</button>
                  <button class="btn-icon btn-danger" @click="handleDeleteTag(tag)" title="刪除">🗑️</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Tag create/edit modal -->
    <div v-if="showTagForm" class="modal-overlay" @click.self="closeTagForm">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editingTag ? '編輯標籤' : '新增標籤' }}</h3>
          <button class="btn-close" @click="closeTagForm">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>標籤名稱</label>
            <input
              v-model="newTagName"
              type="text"
              placeholder="例如：S10a、1st Edition..."
              @keyup.enter="handleSaveTag"
            />
          </div>
          <div class="form-group">
            <label>歸屬分類</label>
            <select v-model="newTagCategory" class="form-select">
              <option v-for="cat in tagCategories" :key="cat.value" :value="cat.value">
                {{ cat.label }}
              </option>
            </select>
            <p class="form-hint">選擇「全部分類」則所有商品類別均可使用此標籤</p>
          </div>
          <div v-if="tagError" class="error-text">{{ tagError }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeTagForm">取消</button>
          <button class="btn-confirm" @click="handleSaveTag">
            {{ editingTag ? '保存修改' : '確認添加' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-page { display: flex; flex-direction: column; gap: var(--space-6); }

/* Tab bar */
.tab-bar { display: flex; gap: var(--space-2); border-bottom: 2px solid var(--border); }
.tab-btn {
  padding: var(--space-3) var(--space-6);
  border: none; background: transparent;
  color: var(--text-secondary);
  font-size: var(--text-sm); font-weight: 500;
  cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px;
  transition: all 0.2s;
}
.tab-btn:hover { color: var(--text-primary); }
.tab-btn.active { color: var(--primary); border-bottom-color: var(--primary); font-weight: 600; }

.settings-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: var(--space-6); }
.section-title { font-size: var(--text-base); font-weight: 600; color: var(--text-primary); margin-bottom: var(--space-4); }
.section-desc { font-size: var(--text-sm); color: var(--text-muted); margin-bottom: var(--space-4); }
.section-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-4); }
.section-header .section-title { margin-bottom: var(--space-1); }
.section-header .section-desc { margin-bottom: 0; }
.form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-4); }
.form-stack { display: flex; flex-direction: column; gap: var(--space-4); }
.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
.form-group label { font-size: var(--text-sm); font-weight: 500; color: var(--text-secondary); }
.form-group input, .form-group textarea, .form-select { padding: var(--space-3); background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-lg); color: var(--text-primary); font-size: var(--text-sm); resize: vertical; font-family: inherit; }
.form-group input:focus, .form-group textarea:focus, .form-select:focus { outline: none; border-color: var(--primary); }
.actions { display: flex; justify-content: flex-end; }
.btn-save { padding: var(--space-3) var(--space-8); background: var(--primary-gradient); border: none; border-radius: var(--radius-lg); color: white; font-weight: 600; cursor: pointer; }
.btn-save:hover:not(:disabled) { opacity: 0.9; }
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

/* Tag filters */
.tag-filters { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-4); flex-wrap: wrap; }
.tag-search { flex: 1; min-width: 180px; padding: var(--space-2) var(--space-4); background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-lg); color: var(--text-primary); font-size: var(--text-sm); }
.tag-search:focus { outline: none; border-color: var(--primary); }
.tag-filter-select { padding: var(--space-2) var(--space-3); background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-lg); color: var(--text-primary); font-size: var(--text-sm); cursor: pointer; }
.tag-count { font-size: var(--text-sm); color: var(--text-muted); white-space: nowrap; }

/* Tag table */
.tag-table-wrap { overflow-x: auto; }
.tag-table { width: 100%; border-collapse: collapse; }
.tag-table th { text-align: left; padding: var(--space-3) var(--space-4); font-size: var(--text-xs); font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border); }
.tag-table td { padding: var(--space-3) var(--space-4); font-size: var(--text-sm); color: var(--text-primary); border-bottom: 1px solid var(--border); }
.tag-table tr:hover td { background: rgba(99, 102, 241, 0.05); }
.empty-row { text-align: center; color: var(--text-muted); padding: var(--space-8) 0; }

.td-idx { color: var(--text-muted); }
.td-name { display: flex; align-items: center; gap: var(--space-2); font-weight: 500; }
.tag-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.cat-badge { padding: 2px 10px; border-radius: var(--radius-full); font-size: var(--text-xs); background: var(--bg-elevated); color: var(--text-secondary); border: 1px solid var(--border); }
.td-sort { color: var(--text-muted); }
.td-actions { display: flex; gap: var(--space-1); }

/* Buttons */
.btn-add { padding: var(--space-2) var(--space-4); background: var(--primary); border: none; border-radius: var(--radius-lg); color: white; font-weight: 600; cursor: pointer; font-size: var(--text-sm); }
.btn-add:hover { opacity: 0.9; }
.btn-icon { padding: 4px 8px; background: transparent; border: none; cursor: pointer; font-size: 14px; opacity: 0.6; transition: opacity 0.2s; }
.btn-icon:hover { opacity: 1; }
.btn-icon.btn-danger:hover { color: var(--danger); }

/* Loading */
.loading-state { display: flex; flex-direction: column; align-items: center; gap: var(--space-2); padding: var(--space-6); }
.spinner { width: 32px; height: 32px; border: 3px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { background: var(--bg-card); border-radius: var(--radius-xl); width: 90%; max-width: 400px; overflow: hidden; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: var(--space-4) var(--space-6); border-bottom: 1px solid var(--border); }
.modal-header h3 { font-size: var(--text-base); font-weight: 600; }
.btn-close { background: none; border: none; font-size: 18px; cursor: pointer; color: var(--text-secondary); padding: 4px; }
.btn-close:hover { color: var(--text-primary); }
.modal-body { padding: var(--space-6); display: flex; flex-direction: column; gap: var(--space-4); }
.modal-footer { display: flex; gap: var(--space-3); justify-content: flex-end; padding: var(--space-4) var(--space-6); border-top: 1px solid var(--border); }
.btn-cancel { padding: var(--space-2) var(--space-4); background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-lg); color: var(--text-primary); cursor: pointer; font-weight: 500; }
.btn-confirm { padding: var(--space-2) var(--space-4); background: var(--primary); border: none; border-radius: var(--radius-lg); color: white; cursor: pointer; font-weight: 500; }
.btn-confirm:hover { opacity: 0.9; }
.error-text { color: var(--danger); font-size: var(--text-sm); }
.success-text { color: #10b981; font-size: var(--text-sm); margin-top: var(--space-2); }
.form-hint { font-size: var(--text-xs); color: var(--text-muted); margin-top: var(--space-1); }

@media (max-width: 640px) {
  .form-grid { grid-template-columns: 1fr; }
  .tag-filters { flex-direction: column; align-items: stretch; }
  .tag-search, .tag-filter-select { width: 100%; }
}

/* ===== 廣告走馬燈管理 ===== */
.banner-form { margin-top: var(--space-4); display: flex; flex-direction: column; gap: var(--space-4); }

/* ===== 首頁 Hero + 統計條編輯 ===== */
.hero-stats-editor { margin-top: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3); }
.stats-rows-header { display: flex; justify-content: space-between; align-items: center; }
.stats-rows-title { font-weight: 600; font-size: var(--text-sm); }
.stats-row { display: grid; grid-template-columns: 140px 1fr 1fr 44px; gap: var(--space-2); align-items: center; }
.stats-row .stats-input-value { font-weight: 600; }
.stats-row button:disabled { opacity: 0.4; cursor: not-allowed; }
@media (max-width: 767px) {
  .stats-row { grid-template-columns: 1fr 1fr; }
}
.banner-preview { margin-top: var(--space-2); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; max-width: 400px; }
.banner-preview img { width: 100%; display: block; }
.add-banner-btn { align-self: flex-start; padding: var(--space-2) var(--space-6); border: none; border-radius: var(--radius-lg); cursor: pointer; font-weight: 600; }
.add-banner-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.banner-list { display: flex; flex-direction: column; gap: var(--space-3); margin-top: var(--space-4); }
.banner-item { display: flex; align-items: center; gap: var(--space-4); padding: var(--space-3); border: 1px solid var(--border); border-radius: var(--radius-lg); }
.banner-item.inactive { opacity: 0.5; }
.banner-thumb { width: 160px; height: 48px; object-fit: cover; border-radius: var(--radius-md); flex-shrink: 0; background: var(--bg-elevated); }
.banner-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.banner-title-text { font-weight: 600; font-size: var(--text-sm); color: var(--text-primary); }
.banner-link-text { font-size: var(--text-xs); color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.banner-order-text { font-size: var(--text-xs); color: var(--text-muted); }
.banner-actions { display: flex; gap: 6px; flex-shrink: 0; }
.banner-btn, .banner-btn-move, .banner-btn-delete { padding: 4px 10px; border-radius: var(--radius-md); border: 1px solid var(--border); background: var(--bg-elevated); color: var(--text-primary); cursor: pointer; font-size: var(--text-xs); }
.banner-btn:hover { border-color: var(--primary); }
.banner-btn-move { width: 30px; padding: 4px 0; }
.banner-btn-move:disabled { opacity: 0.35; cursor: not-allowed; }
.banner-btn-delete:hover { background: rgba(239, 68, 68, 0.15); border-color: var(--danger); }

/* ===== 頁面管理（Pages tab） ===== */
.pages-editor-inline { display: grid; grid-template-columns: 200px 1fr; gap: var(--space-5); }
.pages-sidebar { background: var(--bg-elevated); border-radius: var(--radius-lg); padding: var(--space-2); align-self: start; }
.page-item { padding: var(--space-3) var(--space-4); border-radius: var(--radius-md); cursor: pointer; color: var(--text-secondary); transition: all 0.2s; font-size: var(--text-sm); }
.page-item:hover { background: rgba(255, 255, 255, 0.06); }
.page-item.active { background: var(--primary-gradient); color: white; }
.pages-main { background: var(--bg-card); border-radius: var(--radius-lg); padding: var(--space-5); }
.pages-loading { text-align: center; padding: var(--space-12); color: var(--text-muted); }
.pages-save-btn { padding: var(--space-2) var(--space-6); background: var(--primary-gradient); border: none; border-radius: var(--radius-lg); color: white; font-weight: 600; cursor: pointer; }
.pages-save-btn:disabled { opacity: 0.5; cursor: not-allowed; }

@media (max-width: 768px) {
  .pages-editor-inline { grid-template-columns: 1fr; }
}
</style>