<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'

const { t, locale } = useI18n()
const authStore = useAuthStore()

const formData = ref({
  nickname: '',
  email: '',
  phone: '',
  wechat: '',
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
const successMessage = ref('')

const loadProfile = async () => {
  formData.value = {
    nickname: authStore.user?.nickname || 'CardCollector',
    email: authStore.user?.email || 'user@email.com',
    phone: '+853 1234 5678',
    wechat: 'card_collector',
  }
}

const handleProfileUpdate = async () => {
  loading.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 1000))
    successMessage.value = '个人资料已更新'
    setTimeout(() => successMessage.value = '', 3000)
  } catch (error) {
    console.error('Failed to update profile:', error)
  } finally {
    loading.value = false
  }
}

const handlePasswordChange = async () => {
  if (passwordData.value.newPassword !== passwordData.value.confirmPassword) {
    alert('两次输入的密码不一致')
    return
  }
  loading.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 1000))
    successMessage.value = '密码已修改'
    passwordData.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
    setTimeout(() => successMessage.value = '', 3000)
  } catch (error) {
    console.error('Failed to change password:', error)
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
    <h1 class="page-title">账户设置</h1>

    <div v-if="successMessage" class="success-toast">
      ✅ {{ successMessage }}
    </div>

    <!-- Profile Section -->
    <div class="settings-section">
      <h3 class="section-title">👤 个人资料</h3>
      <div class="settings-card">
        <div class="form-grid">
          <div class="form-group">
            <label>昵称</label>
            <input v-model="formData.nickname" type="text" />
          </div>
          <div class="form-group">
            <label>邮箱</label>
            <input v-model="formData.email" type="email" disabled />
          </div>
          <div class="form-group">
            <label>电话</label>
            <input v-model="formData.phone" type="tel" />
          </div>
          <div class="form-group">
            <label>微信</label>
            <input v-model="formData.wechat" type="text" />
          </div>
        </div>
        <button @click="handleProfileUpdate" class="btn-save" :disabled="loading">
          {{ loading ? '保存中...' : '保存修改' }}
        </button>
      </div>
    </div>

    <!-- Password Section -->
    <div class="settings-section">
      <h3 class="section-title">🔐 修改密码</h3>
      <div class="settings-card">
        <div class="form-grid">
          <div class="form-group">
            <label>当前密码</label>
            <input v-model="passwordData.currentPassword" type="password" />
          </div>
          <div class="form-group">
            <label>新密码</label>
            <input v-model="passwordData.newPassword" type="password" />
          </div>
          <div class="form-group">
            <label>确认新密码</label>
            <input v-model="passwordData.confirmPassword" type="password" />
          </div>
        </div>
        <button @click="handlePasswordChange" class="btn-save" :disabled="loading">
          修改密码
        </button>
      </div>
    </div>

    <!-- Notifications Section -->
    <div class="settings-section">
      <h3 class="section-title">🔔 通知设置</h3>
      <div class="settings-card">
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">邮件通知</div>
            <div class="setting-desc">接收邮件通知</div>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="notificationSettings.emailNotifications" />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">微信通知</div>
            <div class="setting-desc">通过微信接收通知</div>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="notificationSettings.wechatNotifications" />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">出价更新</div>
            <div class="setting-desc">拍卖出价变化时通知</div>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="notificationSettings.bidUpdates" />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">出局提醒</div>
            <div class="setting-desc">您的出价被超过时通知</div>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="notificationSettings.outbidAlerts" />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">拍卖结束提醒</div>
            <div class="setting-desc">您参与的拍卖即将结束时通知</div>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="notificationSettings.auctionEnding" />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>

    <!-- Language Section -->
    <div class="settings-section">
      <h3 class="section-title">🌐 语言设置</h3>
      <div class="settings-card">
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">界面语言</div>
            <div class="setting-desc">选择您偏好的语言</div>
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

.setting-item:last-child {
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
