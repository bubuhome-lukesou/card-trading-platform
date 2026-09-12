<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import api from '@/api'

const { t, locale } = useI18n()
const authStore = useAuthStore()

const zh = () => locale.value === 'zh'

const formData = ref({
  nickname: '',
  email: '',
  phone: '',
})

const passwordData = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

// 通知偏好 — 事件分組，從後端讀取真實值
const notificationSettings = ref({
  outbidAlerts: true,
  auctionEnding: true,
  auctionResult: true,
  newBidAlerts: true,
  orderUpdates: true,
  paymentReceivedAlerts: true,
  reservationUpdates: true,
})

const loading = ref(false)
const passLoading = ref(false)
const notifLoading = ref(false)
const errorMessage = ref('')
const toastMessage = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null
const showToast = (msg: string) => {
  toastMessage.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMessage.value = '' }, 3000)
}

const loadProfile = async () => {
  formData.value = {
    nickname: authStore.user?.nickname || '',
    email: authStore.user?.email || '',
    phone: authStore.user?.phone || '',
  }
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

const handleProfileUpdate = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    await api.patch('/users/profile', {
      nickname: formData.value.nickname,
      phone: formData.value.phone,
    })
    if (authStore.user) {
      authStore.user.nickname = formData.value.nickname
      authStore.user.phone = formData.value.phone
    }
    showToast(zh() ? '個人資料已更新' : 'Profile updated')
  } catch (err: any) {
    errorMessage.value = err.response?.data?.message || (zh() ? '更新失敗' : 'Update failed')
    showToast(errorMessage.value)
  } finally {
    loading.value = false
  }
}

const handlePasswordChange = async () => {
  if (passwordData.value.newPassword !== passwordData.value.confirmPassword) {
    showToast(zh() ? '兩次輸入的密碼不一致' : 'Passwords do not match')
    return
  }
  if (passwordData.value.newPassword.length < 6) {
    showToast(zh() ? '新密碼至少 6 位' : 'Password must be at least 6 characters')
    return
  }
  passLoading.value = true
  try {
    await api.patch('/users/password', {
      currentPassword: passwordData.value.currentPassword,
      newPassword: passwordData.value.newPassword,
    })
    showToast(zh() ? '密碼已修改' : 'Password changed')
    passwordData.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
  } catch (err: any) {
    showToast(err.response?.data?.message || (zh() ? '密碼修改失敗' : 'Failed to change password'))
  } finally {
    passLoading.value = false
  }
}

const toggleLanguage = () => {
  locale.value = locale.value === 'zh' ? 'en' : 'zh'
}

// 通知設置 — 切換時自動保存（事件分組，純站內通知）
const handleNotificationChange = async () => {
  notifLoading.value = true
  try {
    await api.patch('/users/notifications', { ...notificationSettings.value })
    showToast(zh() ? '通知設置已更新' : 'Notifications updated')
  } catch (err: any) {
    showToast(err.response?.data?.message || (zh() ? '更新失敗' : 'Update failed'))
  } finally {
    notifLoading.value = false
  }
}

onMounted(() => {
  loadProfile()
})
</script>

<template>
  <div class="settings-page">
    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toastMessage" class="toast">{{ toastMessage }}</div>
    </Transition>

    <h1 class="page-title">{{ zh() ? '賬戶設置' : 'Account Settings' }}</h1>

    <!-- Profile Section -->
    <div class="settings-section">
      <h3 class="section-title">👤 {{ zh() ? '個人資料' : 'Profile' }}</h3>
      <div class="settings-card">
        <div class="form-grid">
          <div class="form-group">
            <label>{{ zh() ? '暱稱' : 'Nickname' }}</label>
            <input v-model="formData.nickname" type="text" />
          </div>
          <div class="form-group">
            <label>{{ zh() ? '郵箱' : 'Email' }}</label>
            <input :value="formData.email" type="email" disabled :placeholder="zh() ? '未設定' : 'Not set'" />
          </div>
          <div class="form-group">
            <label>{{ zh() ? '電話' : 'Phone' }}</label>
            <input v-model="formData.phone" type="tel" :placeholder="zh() ? '未設定' : 'Not set'" />
          </div>
        </div>
        <button @click="handleProfileUpdate" class="btn-save" :disabled="loading">
          {{ loading ? (zh() ? '儲存中...' : 'Saving...') : (zh() ? '儲存修改' : 'Save') }}
        </button>
      </div>
    </div>

    <!-- Password Section -->
    <div class="settings-section">
      <h3 class="section-title">🔐 {{ zh() ? '修改密碼' : 'Change Password' }}</h3>
      <div class="settings-card">
        <div class="form-grid">
          <div class="form-group">
            <label>{{ zh() ? '當前密碼' : 'Current Password' }}</label>
            <input v-model="passwordData.currentPassword" type="password" />
          </div>
          <div class="form-group">
            <label>{{ zh() ? '新密碼' : 'New Password' }}</label>
            <input v-model="passwordData.newPassword" type="password" />
          </div>
          <div class="form-group">
            <label>{{ zh() ? '確認新密碼' : 'Confirm New Password' }}</label>
            <input v-model="passwordData.confirmPassword" type="password" />
          </div>
        </div>
        <button @click="handlePasswordChange" class="btn-save" :disabled="passLoading">
          {{ passLoading ? (zh() ? '修改中...' : 'Changing...') : (zh() ? '修改密碼' : 'Change Password') }}
        </button>
      </div>
    </div>

    <!-- Notifications Section — 事件分組 -->
    <div class="settings-section">
      <h3 class="section-title">🔔 {{ zh() ? '通知設置' : 'Notifications' }}</h3>
      <p class="section-desc">{{ zh() ? '選擇您想接收的站內通知類型，通知會顯示在「通知中心」。' : 'Choose which in-app notifications you receive. They appear in the Notification Center.' }}</p>

      <div class="settings-card">
        <div class="notif-group-title">{{ zh() ? '拍賣通知' : 'Auction Notifications' }}</div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">{{ zh() ? '出價被超越' : 'Outbid Alerts' }}</div>
            <div class="setting-desc">{{ zh() ? '您參與的拍賣被其他人出更高價時通知您' : "When someone outbids you in an auction" }}</div>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="notificationSettings.outbidAlerts" @change="handleNotificationChange" />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">{{ zh() ? '拍賣將結束提醒' : 'Auction Ending' }}</div>
            <div class="setting-desc">{{ zh() ? '您參與的拍賣即將結束時提醒您' : 'When an auction you joined is ending soon' }}</div>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="notificationSettings.auctionEnding" @change="handleNotificationChange" />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">{{ zh() ? '拍賣結果' : 'Auction Result' }}</div>
            <div class="setting-label-desc">{{ zh() ? '中標、成交或流標結果' : 'Win, sold or ended without a winner' }}</div>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="notificationSettings.auctionResult" @change="handleNotificationChange" />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">{{ zh() ? '我的拍賣收到新出價' : 'New Bid on My Auction' }}</div>
            <div class="setting-label-desc">{{ zh() ? '您刊登的拍賣收到新出價時' : 'When your auction receives a new bid' }}</div>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="notificationSettings.newBidAlerts" @change="handleNotificationChange" />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="notif-group-divider"></div>
        <div class="notif-group-title">{{ zh() ? '交易通知' : 'Transaction Notifications' }}</div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">{{ zh() ? '訂單狀態更新' : 'Order Updates' }}</div>
            <div class="setting-label-desc">{{ zh() ? '訂單確認、發貨、完成等狀態變化' : 'Order confirmed, shipped or completed' }}</div>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="notificationSettings.orderUpdates" @change="handleNotificationChange" />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">{{ zh() ? '收到付款憑證' : 'Payment Proof Received' }}</div>
            <div class="setting-label-desc">{{ zh() ? '（賣家）買家上傳付款憑證待您確認時' : '(Sellers) When a buyer uploads payment proof' }}</div>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="notificationSettings.paymentReceivedAlerts" @change="handleNotificationChange" />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">{{ zh() ? '預約更新' : 'Reservation Updates' }}</div>
            <div class="setting-label-desc">{{ zh() ? '新預約、訂金確認、預約過期等' : 'New reservations, deposit confirmations, expirations' }}</div>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="notificationSettings.reservationUpdates" @change="handleNotificationChange" />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>

    <!-- Language Section -->
    <div class="settings-section">
      <h3 class="section-title">🌐 {{ zh() ? '語言設置' : 'Language' }}</h3>
      <div class="settings-card">
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">{{ zh() ? '介面語言' : 'Interface Language' }}</div>
            <div class="setting-desc">{{ zh() ? '選擇您偏好的語言' : 'Choose your preferred language' }}</div>
          </div>
          <button @click="toggleLanguage" class="btn-language">
            {{ zh() ? '🇬🇧 English' : '🇨🇳 中文' }}
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

/* Toast */
.toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: 8px;
  background: var(--primary-gradient);
  color: white;
  font-size: 14px;
  font-weight: 500;
  z-index: 9999;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(-10px); }

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

.form-group input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.btn-save:hover:not(:disabled) { opacity: 0.9; }
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4) 0;
}

.setting-info { display: flex; flex-direction: column; gap: 2px; }
.setting-label { font-size: var(--text-sm); font-weight: 500; color: var(--text-primary); }
.setting-label-desc { font-size: var(--text-xs); color: var(--text-secondary); }

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

/* Toggle Switch */
.toggle { position: relative; display: inline-block; width: 48px; height: 26px; }
.toggle input { opacity: 0; width: 0; height: 0; }
.toggle-slider {
  position: absolute; cursor: pointer; inset: 0;
  background: var(--bg-elevated); border-radius: 26px; transition: all 0.2s;
  border: 1px solid var(--border);
}
.toggle-slider:before {
  content: ''; position: absolute; height: 20px; width: 20px; left: 3px; bottom: 2px;
  background: white; border-radius: 50%; transition: all 0.2s;
}
.toggle input:checked + .toggle-slider { background: var(--primary-gradient); border-color: transparent; }
.toggle input:checked + .toggle-slider:before { transform: translateX(22px); }
.setting-desc { font-size: var(--text-xs); color: var(--text-secondary); }

.btn-language {
  padding: var(--space-2) var(--space-4);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  color: var(--text-primary);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
}

.btn-language:hover { border-color: var(--primary); color: var(--primary); }

@media (max-width: 640px) {
  .form-grid { grid-template-columns: 1fr; }
}
</style>