<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { LogIn, Phone, KeyRound, Mail } from 'lucide-vue-next'
import api from '@/api'

const { t, locale } = useI18n()
const authStore = useAuthStore()
const router = useRouter()

// Tab 切換：手機登入 / 電郵登入
const activeTab = ref<'phone' | 'email'>('phone')

// 電郵登入
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

// 手機登入
const regions = [
  { code: '+853', label: locale.value === 'zh' ? '澳門 +853' : 'Macao +853' },
  { code: '+852', label: locale.value === 'zh' ? '香港 +852' : 'Hong Kong +852' },
  { code: '+886', label: locale.value === 'zh' ? '台灣 +886' : 'Taiwan +886' },
  { code: '+86',  label: locale.value === 'zh' ? '大陸 +86' : 'Mainland China +86' },
]
const selectedRegion = ref('+853')
const phone = ref('')
const code = ref('')
const codeSent = ref(false)
const countdown = ref(0)
const sendingCode = ref(false)
const phoneLoading = ref(false)
const phoneError = ref('')
const phoneSuccess = ref('')

// 倒計時
let countdownTimer: ReturnType<typeof setInterval> | null = null
const startCountdown = () => {
  countdown.value = 60
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      if (countdownTimer) clearInterval(countdownTimer)
      codeSent.value = false
    }
  }, 1000)
}

// 發送驗證碼
const handleSendCode = async () => {
  phoneError.value = ''
  phoneSuccess.value = ''

  if (!phone.value || phone.value.length < 7) {
    phoneError.value = locale.value === 'zh' ? '請輸入正確的手機號碼' : 'Please enter a valid phone number'
    return
  }

  sendingCode.value = true
  try {
    const res = await api.post('/auth/send-code', {
      regionCode: selectedRegion.value,
      phone: phone.value,
    })
    codeSent.value = true
    startCountdown()
    phoneSuccess.value = res.data?.message || (locale.value === 'zh' ? '驗證碼已發送' : 'Code sent')
  } catch (err: any) {
    phoneError.value = err.response?.data?.message || (locale.value === 'zh' ? '發送失敗，請重試' : 'Failed to send code')
  } finally {
    sendingCode.value = false
  }
}

// 手機登入
const handlePhoneLogin = async () => {
  phoneError.value = ''
  phoneSuccess.value = ''

  if (!phone.value || phone.value.length < 7) {
    phoneError.value = locale.value === 'zh' ? '請輸入手機號碼' : 'Please enter phone number'
    return
  }
  if (!code.value || code.value.length < 4) {
    phoneError.value = locale.value === 'zh' ? '請輸入驗證碼' : 'Please enter verification code'
    return
  }

  phoneLoading.value = true
  try {
    const res = await api.post('/auth/phone-login', {
      regionCode: selectedRegion.value,
      phone: phone.value,
      code: code.value,
    })

    const result = res.data
    if (result.accessToken) {
      authStore.setPhoneLogin(result)
      // Redirect by role
      if (authStore.isAdmin) {
        router.push('/admin')
      } else if (authStore.isSeller) {
        router.push('/seller')
      } else {
        router.push('/user')
      }
    }
  } catch (err: any) {
    phoneError.value = err.response?.data?.message || (locale.value === 'zh' ? '登入失敗' : 'Login failed')
  } finally {
    phoneLoading.value = false
  }
}

// 電郵登入
const handleSubmit = async () => {
  error.value = ''
  loading.value = true

  const success = await authStore.login({ email: email.value, password: password.value })

  if (!success) {
    error.value = authStore.error || 'Login failed'
  } else {
    if (authStore.isAdmin) {
      router.push('/admin')
    } else if (authStore.isSeller) {
      router.push('/seller')
    } else {
      router.push('/user')
    }
  }

  loading.value = false
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <h1 class="login-title">{{ t('auth.login.title') }}</h1>
        <p class="login-subtitle">{{ t('app.tagline') }}</p>
      </div>

      <!-- Tab 切換 -->
      <div class="login-tabs">
        <button
          class="login-tab"
          :class="{ active: activeTab === 'phone' }"
          @click="activeTab = 'phone'"
        >
          <Phone :size="16" />
          {{ locale === 'zh' ? '手機登入' : 'Phone Login' }}
        </button>
        <button
          class="login-tab"
          :class="{ active: activeTab === 'email' }"
          @click="activeTab = 'email'"
        >
          <Mail :size="16" />
          {{ locale === 'zh' ? '電郵登入' : 'Email Login' }}
        </button>
      </div>

      <!-- 手機登入 -->
      <form v-if="activeTab === 'phone'" class="login-form" @submit.prevent="handlePhoneLogin">
        <div v-if="phoneError" class="error-alert">{{ phoneError }}</div>
        <div v-if="phoneSuccess" class="success-alert">{{ phoneSuccess }}</div>

        <!-- 區號 + 手機號 -->
        <div class="phone-row">
          <div class="input-group region-group">
            <label class="input-label">{{ locale === 'zh' ? '區號' : 'Region' }}</label>
            <select v-model="selectedRegion" class="input region-select">
              <option v-for="r in regions" :key="r.code" :value="r.code">{{ r.label }}</option>
            </select>
          </div>
          <div class="input-group phone-group">
            <label class="input-label">{{ locale === 'zh' ? '手機號碼' : 'Phone Number' }}</label>
            <input
              v-model="phone"
              type="tel"
              class="input"
              :placeholder="locale === 'zh' ? '請輸入手機號碼' : 'Enter phone number'"
              required
            />
          </div>
        </div>

        <!-- 驗證碼 -->
        <div class="input-group">
          <label class="input-label">{{ locale === 'zh' ? '驗證碼' : 'Verification Code' }}</label>
          <div class="code-row">
            <input
              v-model="code"
              type="text"
              class="input"
              :placeholder="locale === 'zh' ? '請輸入驗證碼' : 'Enter code'"
              maxlength="8"
              required
            />
            <button
              type="button"
              class="btn-code"
              :disabled="sendingCode || countdown > 0"
              @click="handleSendCode"
            >
              <KeyRound v-if="!sendingCode && countdown === 0" :size="16" />
              {{ countdown > 0 ? `${countdown}s` : (sendingCode ? '...' : (locale === 'zh' ? '獲取驗證碼' : 'Send Code')) }}
            </button>
          </div>
        </div>

        <button type="submit" class="btn btn-primary btn-lg" :disabled="phoneLoading">
          <LogIn v-if="!phoneLoading" class="icon" />
          <span v-if="phoneLoading">Loading...</span>
          <span v-else>{{ locale === 'zh' ? '登入 / 註冊' : 'Login / Register' }}</span>
        </button>

        <p class="phone-hint">{{ locale === 'zh' ? '未註冊的手機號將自動創建帳號' : 'New phone numbers will be auto-registered' }}</p>
      </form>

      <!-- 電郵登入 -->
      <form v-else class="login-form" @submit.prevent="handleSubmit">
        <div v-if="error" class="error-alert">{{ error }}</div>

        <div class="input-group">
          <label class="input-label">{{ t('auth.login.email') }}</label>
          <input
            v-model="email"
            type="email"
            class="input"
            :placeholder="t('auth.login.email')"
            required
          />
        </div>

        <div class="input-group">
          <label class="input-label">{{ t('auth.login.password') }}</label>
          <input
            v-model="password"
            type="password"
            class="input"
            :placeholder="t('auth.login.password')"
            required
          />
        </div>

        <button type="submit" class="btn btn-primary btn-lg" :disabled="loading">
          <LogIn v-if="!loading" class="icon" />
          <span v-if="loading">Loading...</span>
          <span v-else>{{ t('auth.login.submit') }}</span>
        </button>
      </form>

      <div class="login-footer">
        <p>
          {{ t('auth.login.noAccount') }}
          <RouterLink to="/register" class="link">
            {{ t('auth.login.registerNow') }}
          </RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.login-page {
  min-height: calc(100vh - 64px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-8);
  background: radial-gradient(circle at 50% 50%, rgba(102, 126, 234, 0.1) 0%, transparent 50%);
}

.login-card {
  width: 100%;
  max-width: 440px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-2xl);
  padding: var(--space-10);
}

.login-header {
  text-align: center;
  margin-bottom: var(--space-6);
}

.login-title {
  font-size: var(--text-3xl);
  font-weight: 700;
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: var(--space-2);
}

.login-subtitle {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

/* Tabs */
.login-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: var(--space-6);
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
  padding: 4px;
}

.login-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: var(--text-sm);
  font-weight: 500;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: var(--text-secondary);
  }

  &.active {
    background: var(--bg-card);
    color: var(--primary);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.error-alert {
  padding: var(--space-3) var(--space-4);
  background: rgba(252, 129, 129, 0.1);
  border: 1px solid var(--danger);
  border-radius: var(--radius-lg);
  color: var(--danger);
  font-size: var(--text-sm);
}

.success-alert {
  padding: var(--space-3) var(--space-4);
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid #22c55e;
  border-radius: var(--radius-lg);
  color: #22c55e;
  font-size: var(--text-sm);
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.input-label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
}

/* Phone row */
.phone-row {
  display: flex;
  gap: 12px;
}

.region-group {
  width: 130px;
  flex-shrink: 0;
}

.phone-group {
  flex: 1;
}

.region-select {
  cursor: pointer;
  appearance: auto;
}

/* Code row */
.code-row {
  display: flex;
  gap: 12px;
}

.code-row .input {
  flex: 1;
}

.btn-code {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 16px;
  height: 44px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--primary);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: var(--bg-card);
    border-color: var(--primary);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btn {
  margin-top: var(--space-4);

  .icon {
    width: 20px;
    height: 20px;
  }
}

.phone-hint {
  text-align: center;
  color: var(--text-muted);
  font-size: var(--text-xs);
  margin-top: -8px;
}

.login-footer {
  text-align: center;
  margin-top: var(--space-8);
  padding-top: var(--space-6);
  border-top: 1px solid var(--border);

  p {
    color: var(--text-muted);
    font-size: var(--text-sm);
  }

  .link {
    color: var(--primary);
    font-weight: 500;

    &:hover {
      text-decoration: underline;
    }
  }
}
</style>