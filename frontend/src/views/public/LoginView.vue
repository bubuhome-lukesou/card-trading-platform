<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { LogIn, KeyRound } from 'lucide-vue-next'
import api from '@/api'

const { locale } = useI18n()
const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

// 用戶端登入只開放：手機驗證碼 + Google（2026-10-12 定案）
// 商家 / 管理員帳號一律喺 /admin/login 後台入口登入，喺呢頁登入統一提示「賬號或密碼錯誤」
const redirectAfterLogin = () => {
  const redirect = route.query.redirect as string
  if (redirect) {
    router.push(redirect)
  } else {
    router.push('/user')
  }
}

const isAllowedRole = (user: { role?: string } | null | undefined) => user?.role === 'user'

const rejectWrongPortal = () => {
  authStore.logout()
  error.value = locale.value === 'zh' ? '賬號或密碼錯誤' : 'Invalid account or password'
}

// ===== 手機驗證碼登入（未註冊號碼自動創建帳號）=====
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
const loading = ref(false)
const error = ref('')
const success = ref('')

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
  error.value = ''
  success.value = ''

  if (!phone.value || phone.value.length < 7) {
    error.value = locale.value === 'zh' ? '請輸入正確的手機號碼' : 'Please enter a valid phone number'
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
    success.value = res.data?.message || (locale.value === 'zh' ? '驗證碼已發送' : 'Code sent')
  } catch (err: any) {
    error.value = err.response?.data?.message || (locale.value === 'zh' ? '發送失敗，請重試' : 'Failed to send code')
  } finally {
    sendingCode.value = false
  }
}

// 手機登入
const handlePhoneLogin = async () => {
  error.value = ''
  success.value = ''

  if (!phone.value || phone.value.length < 7) {
    error.value = locale.value === 'zh' ? '請輸入手機號碼' : 'Please enter phone number'
    return
  }
  if (!code.value || code.value.length < 4) {
    error.value = locale.value === 'zh' ? '請輸入驗證碼' : 'Please enter verification code'
    return
  }

  loading.value = true
  try {
    const res = await api.post('/auth/phone-login', {
      regionCode: selectedRegion.value,
      phone: phone.value,
      code: code.value,
    })

    const result = res.data
    if (result.accessToken) {
      if (!isAllowedRole(result.user)) {
        rejectWrongPortal()
        return
      }
      authStore.setPhoneLogin(result)
      redirectAfterLogin()
    }
  } catch (err: any) {
    // 401（含 seller/admin 帳號被後端拒絕）統一口徑：賬號或密碼錯誤
    error.value = err.response?.status === 401
      ? (locale.value === 'zh' ? '賬號或密碼錯誤' : 'Invalid account or password')
      : (err.response?.data?.message || (locale.value === 'zh' ? '登入失敗' : 'Login failed'))
  } finally {
    loading.value = false
  }
}

// ===== Google 登入（GIS SDK）=====
declare const google: any
const GOOGLE_CLIENT_ID = 'REPLACE_WITH_GOOGLE_CLIENT_ID' // 部署時由 .env VITE_GOOGLE_CLIENT_ID 注入
const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID
const googleSdkReady = ref(false)
const googleError = ref('')

const handleGoogleCredential = async (response: any) => {
  googleError.value = ''
  try {
    const res = await api.post('/auth/google', { credential: response.credential })
    const result = res.data
    if (result.accessToken) {
      if (!isAllowedRole(result.user)) {
        rejectWrongPortal()
        return
      }
      authStore.setPhoneLogin(result) // 同樣格式：{user, accessToken}，復用 setter
      redirectAfterLogin()
    }
  } catch (err: any) {
    // 401（含 seller/admin 帳號被後端拒絕）統一口徑：賬號或密碼錯誤
    googleError.value = err.response?.status === 401
      ? (locale.value === 'zh' ? '賬號或密碼錯誤' : 'Invalid account or password')
      : (err.response?.data?.message || 'Google 登入失敗，請重試')
  }
}

const renderGoogleButton = () => {
  try {
    google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleCredential,
      auto_select: false,
      cancel_on_tap_outside: true,
    })
    // filled_black：官方深色主題，配合網站深色浮世繪風格
    // width 依容器實測（上限 400），避免窄螢幕溢出
    const el = document.getElementById('googleBtnContainer')
    const btnWidth = Math.min(el?.clientWidth || 380, 400)
    google.accounts.id.renderButton(
      el,
      { theme: 'filled_black', size: 'large', width: btnWidth, text: 'continue_with', locale: locale.value === 'zh' ? 'zh-HK' : 'en' }
    )
    googleSdkReady.value = true
  } catch (e) {
    console.error('Google button render failed:', e)
  }
}

// 動態載入 GIS SDK，成功後渲染按鈕
const loadGoogleSdk = () => {
  if (document.getElementById('google-gis-script')) return
  const s = document.createElement('script')
  s.id = 'google-gis-script'
  s.src = 'https://accounts.google.com/gsi/client'
  s.async = true
  s.defer = true
  s.onload = renderGoogleButton
  s.onerror = () => { googleError.value = 'Google 服務載入失敗' }
  document.head.appendChild(s)
}

const initGoogleBtn = () => {
  if (googleSdkReady.value) return
  if ((window as any).google?.accounts?.id) renderGoogleButton()
  else loadGoogleSdk()
}

onMounted(() => {
  // 僅在配置了 Client ID 時載入（避免未配置時報錯）
  if (clientId && !clientId.startsWith('REPLACE')) initGoogleBtn()
})
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <h1 class="login-title">{{ $t('auth.login.title') }}</h1>
        <p class="login-subtitle">{{ $t('app.tagline') }}</p>
      </div>

      <form class="login-form" @submit.prevent="handlePhoneLogin">
        <div v-if="error" class="error-alert">{{ error }}</div>
        <div v-if="success" class="success-alert">{{ success }}</div>

        <!-- 區號 + 手機號 -->
        <div class="input-group">
          <label class="input-label">{{ locale === 'zh' ? '手機號碼' : 'Phone Number' }}</label>
          <div class="account-row">
            <select v-model="selectedRegion" class="input region-select">
              <option v-for="r in regions" :key="r.code" :value="r.code">{{ r.code }}</option>
            </select>
            <input
              v-model="phone"
              type="tel"
              class="input account-input"
              :placeholder="locale === 'zh' ? '請輸入手機號碼' : 'Enter phone number'"
              autocomplete="tel"
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

        <button
          type="submit"
          class="btn btn-primary btn-lg"
          :disabled="loading"
        >
          <LogIn v-if="!loading" class="icon" />
          <span v-if="loading">Loading...</span>
          <span v-else>{{ locale === 'zh' ? '登入 / 註冊' : 'Login / Register' }}</span>
        </button>

        <p class="phone-hint">
          {{ locale === 'zh' ? '📱 未註冊的手機號將自動創建帳號' : '📱 New phone numbers will be auto-registered' }}
        </p>
      </form>

      <!-- Google 登入分隔線 + 按鈕 -->
      <div class="google-divider">
        <span>{{ locale === 'zh' ? '或' : 'or' }}</span>
      </div>
      <div class="google-btn-wrap">
        <div id="googleBtnContainer"></div>
        <button v-if="!googleSdkReady" class="btn-google-fallback" @click="initGoogleBtn">
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.78 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
          {{ locale === 'zh' ? '以 Google 帳號繼續' : 'Continue with Google' }}
        </button>
        <p v-if="googleError" class="google-error">{{ googleError }}</p>
      </div>

      <div class="login-footer">
        <p>
          {{ locale === 'zh' ? '輸入手機號即可登入或註冊' : 'Sign in or register with your phone number' }}
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
  max-width: 460px;
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

/* Account row — 區號選單 + 手機號輸入框 */
.account-row {
  display: flex;
  gap: 10px;
  width: 100%;
}

.account-row .region-select {
  width: 92px;
  flex-shrink: 0;
}

.account-input {
  flex: 1;
  min-width: 0;
}

/* Code row — 驗證碼輸入框占大部分，按鈕固定寬度 */
.code-row {
  display: flex;
  gap: 10px;
  width: 100%;
}

.code-row .input {
  flex: 1;
  min-width: 0; /* 允許收縮，防止溢出 */
}

.btn-code {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  height: 44px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--primary);
  font-size: var(--text-xs);
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

/* Google 登入 */
.google-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: var(--space-6) 0;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border);
  }

  span {
    color: var(--text-muted);
    font-size: var(--text-xs);
  }
}

.google-btn-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);

  #googleBtnContainer {
    min-height: 44px;
    display: flex;
    justify-content: center;
    width: 100%;
  }
}

.btn-google-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 12px 16px;
  background: var(--bg-elevated, #16181d);
  color: var(--text-primary, #e5e7eb);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.25);
  }
}

.google-error {
  color: var(--danger);
  font-size: var(--text-xs);
  text-align: center;
}
</style>