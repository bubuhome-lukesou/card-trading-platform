<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import api from '@/api'

const { t, locale } = useI18n()
const authStore = useAuthStore()

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

const notificationSettings = ref({
  emailNotifications: true,
  wechatNotifications: true,
  bidUpdates: true,
  outbidAlerts: true,
  auctionEnding: true,
})

const loading = ref(false)
const passLoading = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const passErrorMessage = ref('')
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
}

const handleProfileUpdate = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const res = await api.patch('/users/profile', {
      nickname: formData.value.nickname,
      phone: formData.value.phone,
    })
    // Update auth store
    if (authStore.user) {
      authStore.user.nickname = formData.value.nickname
      authStore.user.phone = formData.value.phone
    }
    showToast(locale.value === 'zh' ? '個人資料已更新' : 'Profile updated')
  } catch (err: any) {
    errorMessage.value = err.response?.data?.message || (locale.value === 'zh' ? '更新失敗' : 'Update failed')
    showToast(errorMessage.value)
  } finally {
    loading.value = false
  }
}

const handlePasswordChange = async () => {
  passErrorMessage.value = ''
  if (passwordData.value.newPassword !== passwordData.value.confirmPassword) {
    passErrorMessage.value = locale.value === 'zh' ? '兩次輸入的密碼不一致' : 'Passwords do not match'
    showToast(passErrorMessage.value)
    return
  }
  if (passwordData.value.newPassword.length < 6) {
    passErrorMessage.value = locale.value === 'zh' ? '新密碼至少 6 位' : 'Password must be at least 6 characters'
    showToast(passErrorMessage.value)
    return
  }
  passLoading.value = true
  try {
    await api.patch('/users/password', {
      currentPassword: passwordData.value.currentPassword,
      newPassword: passwordData.value.newPassword,
    })
    showToast(locale.value === 'zh' ? '密碼已修改' : 'Password changed')
    passwordData.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
  } catch (err: any) {
    passErrorMessage.value = err.response?.data?.message || (locale.value === 'zh' ? '密碼修改失敗' : 'Failed to change password')
    showToast(passErrorMessage.value)
  } finally {
    passLoading.value = false
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
    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toastMessage" class="toast">{{ toastMessage }}</div>
    </Transition>

    <h1 class="page-title">{{ locale === 'zh' ? '賬戶設置' : 'Account Settings' }}</h1>

    <!-- Profile Section -->
    <div class="settings-section">
      <h3 class="section-title">👤 {{ locale === 'zh' ? '個人資料' : 'Profile' }}</h3>
      <div class="settings-card">
        <div class="form-grid">
          <div class="form-group">
            <label>{{ locale === 'zh' ? '暱稱' : 'Nickname' }}</label>
            <input v-model="formData.nickname" type="text" />
          </div>
          <div class="form-group">
            <label>{{ locale === 'zh' ? '郵箱' : 'Email' }}</label>
            <input :value="formData.email" type="email" disabled :placeholder="locale === 'zh' ? '未設定' : 'Not set'" />
          </div>
          <div class="form-group">
            <label>{{ locale === 'zh' ? '電話' : 'Phone' }}</label>
            <input v-model="formData.phone" type="tel" :placeholder="locale === 'zh' ? '未設定' : 'Not set'" />
          </div>
        </div>
        <button @click="handleProfileUpdate" class="btn-save" :disabled="loading">
          {{ loading ? (locale === 'zh' ? '儲存中...' : 'Saving...') : (locale === 'zh' ? '儲存修改' : 'Save') }}
        </button>
      </div>
    </div>

    <!-- Password Section -->
    <div class="settings-section">
      <h3 class="section-title">🔐 {{ locale === 'zh' ? '修改密碼' : 'Change Password' }}</h3>
      <div class="settings-card">
        <div class="form-grid">
          <div class="form-group">
            <label>{{ locale === 'zh' ? '當前密碼' : 'Current Password' }}</label>
            <input v-model="passwordData.currentPassword" type="password" />
          </div>
          <div class="form-group">
            <label>{{ locale === 'zh' ? '新密碼' : 'New Password' }}</label>
            <input v-model="passwordData.newPassword" type="password" />
          </div>
          <div class="form-group">
            <label>{{ locale === 'zh' ? '確認新密碼' : 'Confirm New Password' }}</label>
            <input v-model="passwordData.confirmPassword" type="password" />
          </div>
        </div>
        <button @click="handlePasswordChange" class="btn-save" :disabled="passLoading">
          {{ passLoading ? (locale === 'zh' ? '修改中...' : 'Changing...') : (locale === 'zh' ? '修改密碼' : 'Change Password') }}
        </button>
      </div>
    </div>

    <!-- Language Section -->
    <div class="settings-section">
      <h3 class="section-title">🌐 {{ locale === 'zh' ? '語言設置' : 'Language' }}</h3>
      <div class="settings-card">
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">{{ locale === 'zh' ? '介面語言' : 'Interface Language' }}</div>
            <div class="setting-desc">{{ locale === 'zh' ? '選擇您偏好的語言' : 'Choose your preferred language' }}</div>
          </div>
          <button @click="toggleLanguage" class="btn-language">
            {{ locale === 'zh' ? '🇬🇧 English' : '🇨🇳 中文' }}
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