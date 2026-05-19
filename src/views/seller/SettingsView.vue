<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import api from '@/api'
import { uploadApi } from '@/api/upload'

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
  emailNotifications: true,
  wechatNotifications: true,
  bidUpdates: true,
  outbidAlerts: true,
  auctionEnding: true,
})

// Pickup info
const pickupData = ref({
  pickupInfo: '',
})

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
    // TODO: Connect to notification settings API when available
    await new Promise(resolve => setTimeout(resolve, 500))
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

    <!-- Notifications Section -->
    <div class="settings-section">
      <h3 class="section-title">🔔 通知設置</h3>
      <div class="settings-card">
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">郵件通知</div>
            <div class="setting-desc">接收郵件通知</div>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="notificationSettings.emailNotifications" />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">微信通知</div>
            <div class="setting-desc">通過微信接收通知</div>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="notificationSettings.wechatNotifications" />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">出價更新</div>
            <div class="setting-desc">拍賣出價變化時通知</div>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="notificationSettings.bidUpdates" />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">出局提醒</div>
            <div class="setting-desc">您的出價被超過時通知</div>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="notificationSettings.outbidAlerts" />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">拍賣結束提醒</div>
            <div class="setting-desc">您參與的拍賣即將結束時通知</div>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="notificationSettings.auctionEnding" />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <button @click="handleNotificationUpdate" class="btn-save" :disabled="loading">
          {{ loading ? '儲存中...' : '儲存設置' }}
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
