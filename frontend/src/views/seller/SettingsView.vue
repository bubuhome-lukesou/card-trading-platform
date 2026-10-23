<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import api from '@/api'
import { uploadApi } from '@/api/upload'
import { sellerProfilesApi } from '@/api/seller-profiles'

const { t, locale } = useI18n()
const authStore = useAuthStore()

// Account settings
const accountData = ref({
  nickname: '',
  email: '',
})

const passwordData = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const notificationSettings = ref({
  outbidAlerts: true,
  auctionEnding: true,
  auctionResult: true,
  newBidAlerts: true,
  orderUpdates: true,
  paymentReceivedAlerts: true,
  reservationUpdates: true,
})

// Pickup info
const pickupData = ref({
  pickupInfo: '',
})

// ===== 商家介紹頁資料（2026-10-23） =====
const profileData = ref({
  logo: '' as string,
  banner: '' as string,
  descriptionZh: '' as string,
  descriptionEn: '' as string,
  businessHours: '' as string,
  wechatId: '' as string,
  wechatQrCode: '' as string,
  location: '' as string,
})
const logoFile = ref<File | null>(null)
const logoPreview = ref('')
const bannerFile = ref<File | null>(null)
const bannerPreview = ref('')
const qrFile = ref<File | null>(null)
const qrPreview = ref('')
const profileLoading = ref(false)

const loadSellerProfile = async () => {
  try {
    const res = await sellerProfilesApi.getMyProfile()
    const p = res.profile || {}
    profileData.value = {
      logo: p.logo || '',
      banner: p.banner || '',
      descriptionZh: p.descriptionZh || '',
      descriptionEn: p.descriptionEn || '',
      businessHours: p.businessHours || '',
      wechatId: p.wechatId || '',
      wechatQrCode: p.wechatQrCode || '',
      location: p.location || '',
    }
  } catch {
    // 首次使用未建行 — 保持空表單
  }
}

const handleImageSelect = (e: Event, kind: 'logo' | 'banner' | 'qr') => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const preview = URL.createObjectURL(file)
  if (kind === 'logo') { logoFile.value = file; logoPreview.value = preview }
  if (kind === 'banner') { bannerFile.value = file; bannerPreview.value = preview }
  if (kind === 'qr') { qrFile.value = file; qrPreview.value = preview }
}

const clearImage = (kind: 'logo' | 'banner' | 'qr') => {
  if (kind === 'logo') { logoFile.value = null; logoPreview.value = ''; profileData.value.logo = '' }
  if (kind === 'banner') { bannerFile.value = null; bannerPreview.value = ''; profileData.value.banner = '' }
  if (kind === 'qr') { qrFile.value = null; qrPreview.value = ''; profileData.value.wechatQrCode = '' }
}

const handleProfileUpdate = async () => {
  profileLoading.value = true
  errorMessage.value = ''
  try {
    const payload: any = { ...profileData.value }
    if (logoFile.value) payload.logo = (await uploadApi.uploadImage(logoFile.value)).data.url
    if (bannerFile.value) payload.banner = (await uploadApi.uploadImage(bannerFile.value)).data.url
    if (qrFile.value) payload.wechatQrCode = (await uploadApi.uploadImage(qrFile.value)).data.url
    await sellerProfilesApi.updateMyProfile(payload)
    loadSellerProfile()
    logoFile.value = null; logoPreview.value = ''
    bannerFile.value = null; bannerPreview.value = ''
    qrFile.value = null; qrPreview.value = ''
    showSuccess('商家資料已更新')
  } catch (error: any) {
    showError(error.response?.data?.message || '更新失敗')
  } finally {
    profileLoading.value = false
  }
}

const qrCodeFile = ref<File | null>(null)
const qrCodePreview = ref('')
const qrCodeUrl = ref('')

const loading = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

const showSuccess = (msg: string) => {
  successMessage.value = msg
  setTimeout(() => successMessage.value = '', 3000)
}

const showError = (msg: string) => {
  errorMessage.value = msg
  setTimeout(() => errorMessage.value = '', 5000)
}

const loadProfile = async () => {
  const user = authStore.user
  accountData.value = {
    nickname: user?.nickname || '',
    email: user?.email || '',
  }
  // Load pickup info if available
  pickupData.value.pickupInfo = user?.pickupInfo || ''
  qrCodeUrl.value = user?.pickupQrCode || ''
  // 讀取通知偏好真實值（/auth/profile 返回完整 user entity）
  try {
    const res = await api.get('/auth/profile')
    const u = res.data
    notificationSettings.value = {
      outbidAlerts: u.outbidAlerts !== false,
      auctionEnding: u.auctionEnding !== false,
      auctionResult: u.auctionResult !== false,
      newBidAlerts: u.newBidAlerts !== false,
      orderUpdates: u.orderUpdates !== false,
      paymentReceivedAlerts: u.paymentReceivedAlerts !== false,
      reservationUpdates: u.reservationUpdates !== false,
    }
  } catch {
    // 讀取失敗保持默認值
  }
}

const handleAccountUpdate = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    await api.patch('/users/profile', { nickname: accountData.value.nickname })
    if (authStore.user) {
      authStore.user.nickname = accountData.value.nickname
    }
    showSuccess('個人資料已更新')
  } catch (error: any) {
    showError(error.response?.data?.message || '更新失敗')
  } finally {
    loading.value = false
  }
}

const handlePasswordChange = async () => {
  if (passwordData.value.newPassword !== passwordData.value.confirmPassword) {
    showError('兩次輸入的密碼不一致')
    return
  }
  if (passwordData.value.newPassword.length < 6) {
    showError('密碼至少需要 6 個字符')
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    await api.patch('/users/password', {
      currentPassword: passwordData.value.currentPassword,
      newPassword: passwordData.value.newPassword,
    })
    passwordData.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
    showSuccess('密碼已修改')
  } catch (error: any) {
    showError(error.response?.data?.message || '修改密碼失敗')
  } finally {
    loading.value = false
  }
}

const handleNotificationUpdate = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    await api.patch('/users/notifications', { ...notificationSettings.value })
    showSuccess('通知設置已更新')
  } catch (error: any) {
    showError(error.response?.data?.message || '更新失敗')
  } finally {
    loading.value = false
  }
}

const handleQrCodeChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  qrCodeFile.value = file
  qrCodePreview.value = URL.createObjectURL(file)
}

const resolveImageUrl = (url: string) => {
  if (!url) return '/placeholder.png'
  if (url.startsWith('data:') || url.startsWith('http')) return url
  const apiBaseUrl = import.meta.env.VITE_API_URL || ''
  return apiBaseUrl + url
}

const handlePickupUpdate = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    let qrCode = qrCodeUrl.value
    // Upload new QR code if selected
    if (qrCodeFile.value) {
      const res = await uploadApi.uploadImage(qrCodeFile.value)
      qrCode = res.data.url
    }
    await api.patch('/users/pickup-info', {
      pickupInfo: pickupData.value.pickupInfo,
      pickupQrCode: qrCode,
    })
    if (authStore.user) {
      authStore.user.pickupInfo = pickupData.value.pickupInfo
      authStore.user.pickupQrCode = qrCode
    }
    qrCodeFile.value = null
    qrCodePreview.value = ''
    showSuccess('取貨資訊已更新')
  } catch (error: any) {
    showError(error.response?.data?.message || '更新失敗')
  } finally {
    loading.value = false
  }
}

const toggleLanguage = () => {
  locale.value = locale.value === 'zh' ? 'en' : 'zh'
}

onMounted(() => {
  loadProfile()
  loadSellerProfile()
})
</script>

<template>
  <div class="settings-page">
    <h1 class="page-title">商家設定</h1>

    <div v-if="successMessage" class="success-toast">✅ {{ successMessage }}</div>
    <div v-if="errorMessage" class="error-toast">❌ {{ errorMessage }}</div>

    <!-- Account Section -->
    <div class="settings-section">
      <h3 class="section-title">👤 賬戶設定</h3>
      <div class="settings-card">
        <div class="form-grid">
          <div class="form-group">
            <label>暱稱</label>
            <input v-model="accountData.nickname" type="text" />
          </div>
          <div class="form-group">
            <label>郵箱</label>
            <input v-model="accountData.email" type="email" disabled />
          </div>
        </div>
        <button @click="handleAccountUpdate" class="btn-save" :disabled="loading">
          {{ loading ? '儲存中...' : '儲存修改' }}
        </button>
      </div>
    </div>

    <!-- Password Section -->
    <div class="settings-section">
      <h3 class="section-title">🔐 修改密碼</h3>
      <div class="settings-card">
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
            <input v-model="passwordData.confirmPassword" type="password" />
          </div>
        </div>
        <button @click="handlePasswordChange" class="btn-save" :disabled="loading">
          修改密碼
        </button>
      </div>
    </div>

    <!-- Notifications Section — 事件分組 -->
    <div class="settings-section">
      <h3 class="section-title">🔔 通知設置</h3>
      <p class="section-desc">選擇您想接收的站內通知類型，通知會顯示在側欄「通知中心」。</p>
      <div class="settings-card">
        <div class="notif-group-title">拍賣通知</div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">出價被超越</div>
            <div class="setting-desc">您參與的拍賣被其他人出更高價時通知您</div>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="notificationSettings.outbidAlerts" @change="handleNotificationUpdate" />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">拍賣將結束提醒</div>
            <div class="setting-desc">您參與的拍賣即將結束時提醒您</div>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="notificationSettings.auctionEnding" @change="handleNotificationUpdate" />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">拍賣結果</div>
            <div class="setting-desc">中標、成交或流標結果</div>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="notificationSettings.auctionResult" @change="handleNotificationUpdate" />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">我的拍賣收到新出價</div>
            <div class="setting-desc">您刊登的拍賣收到新出價時</div>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="notificationSettings.newBidAlerts" @change="handleNotificationUpdate" />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="notif-group-divider"></div>
        <div class="notif-group-title">交易通知</div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">訂單狀態更新</div>
            <div class="setting-desc">訂單確認、發貨、完成等狀態變化</div>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="notificationSettings.orderUpdates" @change="handleNotificationUpdate" />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">收到付款憑證</div>
            <div class="setting-desc">買家上傳付款憑證待您確認時</div>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="notificationSettings.paymentReceivedAlerts" @change="handleNotificationUpdate" />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">預約更新</div>
            <div class="setting-desc">新預約、訂金確認、預約過期等</div>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="notificationSettings.reservationUpdates" @change="handleNotificationUpdate" />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>

    <!-- Store Profile Section — 商家介紹頁資料（公開 /seller/:id） -->
    <div class="settings-section">
      <h3 class="section-title">🏬 商家介紹頁</h3>
      <p class="section-desc">這些資料會顯示在你的公開商家頁（商品詳情「商鋪」卡可點入）。</p>
      <div class="settings-card">
        <!-- Logo + Banner -->
        <div class="media-row">
          <div class="media-item">
            <label class="media-label">商家 Logo</label>
            <div class="media-preview logo-box" v-if="logoPreview || profileData.logo">
              <img :src="logoPreview || resolveImageUrl(profileData.logo)" alt="logo" />
              <button class="media-remove" @click="clearImage('logo')">✕</button>
            </div>
            <label v-else class="media-upload">
              <input type="file" accept="image/*" @change="handleImageSelect($event, 'logo')" />
              <span>上傳 Logo</span>
            </label>
          </div>
          <div class="media-item media-item-wide">
            <label class="media-label">封面橫幅（選填）</label>
            <div class="media-preview banner-box" v-if="bannerPreview || profileData.banner">
              <img :src="bannerPreview || resolveImageUrl(profileData.banner)" alt="banner" />
              <button class="media-remove" @click="clearImage('banner')">✕</button>
            </div>
            <label v-else class="media-upload">
              <input type="file" accept="image/*" @change="handleImageSelect($event, 'banner')" />
              <span>上傳橫幅圖</span>
            </label>
          </div>
        </div>

        <!-- 簡介 -->
        <div class="form-grid">
          <div class="form-group">
            <label>商家簡介（中文）</label>
            <textarea v-model="profileData.descriptionZh" rows="4" placeholder="介紹你的店鋪、專營類別、服務特色…"></textarea>
          </div>
          <div class="form-group">
            <label>商家簡介（English，選填）</label>
            <textarea v-model="profileData.descriptionEn" rows="4" placeholder="Store description in English (optional)"></textarea>
          </div>
        </div>

        <!-- 營業時間 / 地區 / 微信 -->
        <div class="form-grid">
          <div class="form-group">
            <label>營業時間</label>
            <input v-model="profileData.businessHours" type="text" placeholder="例：週一至週五 14:00-20:00；週六日 12:00-18:00" />
          </div>
          <div class="form-group">
            <label>所在地區</label>
            <input v-model="profileData.location" type="text" placeholder="例：澳門" />
          </div>
          <div class="form-group">
            <label>微信號</label>
            <input v-model="profileData.wechatId" type="text" placeholder="例：your_wechat_id" />
          </div>
        </div>

        <!-- WeChat QR -->
        <div class="qr-section">
          <label class="qr-label">WeChat 二維碼（買家可長按識別）</label>
          <div class="media-preview qr-box" v-if="qrPreview || profileData.wechatQrCode">
            <img :src="qrPreview || resolveImageUrl(profileData.wechatQrCode)" alt="WeChat QR" />
            <button class="media-remove" @click="clearImage('qr')">✕</button>
          </div>
          <label v-else class="media-upload">
            <input type="file" accept="image/*" @change="handleImageSelect($event, 'qr')" />
            <span>上傳二維碼</span>
          </label>
        </div>

        <button @click="handleProfileUpdate" class="btn-save" :disabled="profileLoading">
          {{ profileLoading ? '儲存中...' : '儲存商家資料' }}
        </button>
      </div>
    </div>

    <!-- Pickup Info Section -->
    <div class="settings-section">
      <h3 class="section-title">📦 預約取貨資訊</h3>
      <div class="settings-card">
        <div class="form-group">
          <label>取貨提示（時間 / 地點 / WeChat）</label>
          <textarea
            v-model="pickupData.pickupInfo"
            rows="4"
            placeholder="範例：
📍 取貨地點：澳門宋玉生廣場
🕐 取貨時間：週一至週五 14:00-20:00
💬 WeChat：your_wechat_id"
          ></textarea>
        </div>
        <div class="qr-section">
          <label class="qr-label">WeChat 二維碼</label>
          <div class="qr-upload" v-if="!qrCodePreview && !qrCodeUrl">
            <input type="file" accept="image/*" @change="handleQrCodeChange" id="qrInput" class="qr-input" />
            <label for="qrInput" class="qr-upload-label">
              <span class="qr-icon">📷</span>
              <span>上傳二維碼</span>
            </label>
          </div>
          <div class="qr-preview" v-else>
            <img :src="qrCodePreview || resolveImageUrl(qrCodeUrl)" alt="WeChat 二維碼" class="qr-image" />
            <button @click="qrCodePreview = ''; qrCodeUrl = ''; qrCodeFile = null" class="qr-remove">✕</button>
          </div>
        </div>
        <button @click="handlePickupUpdate" class="btn-save" :disabled="loading">
          {{ loading ? '儲存中...' : '儲存取貨資訊' }}
        </button>
      </div>
    </div>

    <!-- Language Section -->
    <div class="settings-section">
      <h3 class="section-title">🌐 語言設置</h3>
      <div class="settings-card">
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">介面語言</div>
            <div class="setting-desc">選擇您偏好的語言</div>
          </div>
          <button @click="toggleLanguage" class="btn-language">
            {{ locale === 'zh' ? '🇨🇳 中文' : '🇬🇧 English' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  max-width: 800px;
}

.page-title {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--text-primary);
}

.success-toast {
  padding: var(--space-4);
  background: #10b981;
  color: white;
  border-radius: var(--radius-lg);
  text-align: center;
  font-weight: 500;
}

.error-toast {
  padding: var(--space-4);
  background: #ef4444;
  color: white;
  border-radius: var(--radius-lg);
  text-align: center;
  font-weight: 500;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.section-title {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-primary);
}

.section-desc {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  margin-top: -8px;
}

.notif-group-title {
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding-bottom: var(--space-2);
}

.notif-group-divider {
  height: 1px;
  background: var(--border);
  margin: var(--space-4) 0;
}

.settings-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
}

.form-group input {
  padding: var(--space-3) var(--space-4);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  color: var(--text-primary);
  font-size: var(--text-sm);
}

.form-group input:focus {
  outline: none;
  border-color: var(--primary);
}

.form-group textarea {
  padding: var(--space-3);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  color: var(--text-primary);
  font-size: var(--text-sm);
  resize: vertical;
  font-family: inherit;
}

/* ===== 商家介紹頁 media 上傳（logo/banner/QR） ===== */
.media-row {
  display: flex;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
  flex-wrap: wrap;
}
.media-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  flex: 0 0 auto;
}
.media-item-wide {
  flex: 1 1 260px;
  min-width: 0;
}
.media-label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
}
.media-upload {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-5);
  background: var(--bg-elevated);
  border: 2px dashed var(--border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
  color: var(--text-secondary);
  font-size: var(--text-sm);
  min-height: 84px;
}
.media-upload:hover {
  border-color: var(--primary);
  color: var(--primary);
}
.media-upload input[type="file"] {
  display: none;
}
.media-preview {
  position: relative;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
}
.media-preview img {
  display: block;
  object-fit: cover;
  width: 100%;
  height: 100%;
}
.logo-box {
  width: 96px;
  height: 96px;
}
.banner-box {
  height: 96px;
  width: 100%;
}
.banner-box img {
  object-fit: cover;
}
.qr-box {
  width: 140px;
  height: 140px;
}
.qr-box img {
  object-fit: contain;
  background: #fff;
}
.media-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.media-remove:hover {
  background: rgba(239, 68, 68, 0.8);
}

.qr-section {
  margin-top: var(--space-4);
}

.qr-label {
  display: block;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}

.qr-upload {
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-input {
  display: none;
}

.qr-upload-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-6);
  background: var(--bg-elevated);
  border: 2px dashed var(--border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
  color: var(--text-secondary);
  width: 100%;
}

.qr-upload-label:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.qr-icon {
  font-size: 24px;
}

.qr-preview {
  position: relative;
  display: flex;
  justify-content: center;
}

.qr-image {
  max-width: 200px;
  max-height: 200px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
}

.qr-remove {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  background: var(--color-error, #ef4444);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-save {
  padding: var(--space-3) var(--space-6);
  background: var(--primary-gradient);
  border: none;
  border-radius: var(--radius-lg);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-save:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4) 0;
  border-bottom: 1px solid var(--border);
}

.setting-item:last-of-type {
  border-bottom: none;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.setting-label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-primary);
}

.setting-desc {
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.setting-item + .btn-save {
  margin-top: var(--space-4);
}

/* Toggle Switch */
.toggle {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 26px;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: var(--bg-elevated);
  border-radius: 26px;
  transition: all var(--transition-fast);
}

.toggle-slider:before {
  content: '';
  position: absolute;
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: all var(--transition-fast);
}

.toggle input:checked + .toggle-slider {
  background: var(--primary-gradient);
}

.toggle input:checked + .toggle-slider:before {
  transform: translateX(22px);
}

.btn-language {
  padding: var(--space-2) var(--space-4);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  color: var(--text-primary);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-language:hover {
  border-color: var(--primary);
  color: var(--primary);
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
