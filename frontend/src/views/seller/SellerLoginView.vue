<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const loginForm = ref({
  email: '',
  password: ''
})
const loading = ref(false)
const errorMsg = ref('')

onMounted(() => {
  if (authStore.isAuthenticated && authStore.isSeller) {
    router.push('/seller')
  }
})

const handleLogin = async () => {
  errorMsg.value = ''
  if (!loginForm.value.email || !loginForm.value.password) {
    errorMsg.value = '请输入邮箱和密码'
    return
  }

  loading.value = true
  try {
    const success = await authStore.login({ email: loginForm.value.email, password: loginForm.value.password })
    if (success) {
      if (authStore.isSeller) {
        router.push('/seller')
      } else {
        errorMsg.value = '您不是商家，无权访问商家后台'
        authStore.logout()
      }
    } else {
      errorMsg.value = '登录失败，请检查邮箱和密码'
    }
  } catch (error: any) {
    errorMsg.value = error?.response?.data?.message || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="seller-login-page">
    <div class="login-container">
      <div class="login-header">
        <div class="logo">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="24" fill="url(#grad)"/>
            <path d="M24 12L30 20L24 28L18 20L24 12Z" fill="white" opacity="0.9"/>
            <path d="M24 28L30 36H18L24 28Z" fill="white" opacity="0.6"/>
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="48" y2="48">
                <stop offset="0%" stop-color="#f093fb"/>
                <stop offset="100%" stop-color="#f5576c"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <h1>商家登录</h1>
        <p>Card Quest 商家管理系统</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

        <div class="form-group">
          <label>商家邮箱</label>
          <input
            v-model="loginForm.email"
            type="email"
            placeholder="seller@example.com"
            autocomplete="username"
          />
        </div>

        <div class="form-group">
          <label>密码</label>
          <input
            v-model="loginForm.password"
            type="password"
            placeholder="输入密码..."
            autocomplete="current-password"
          />
        </div>

        <button type="submit" class="btn-login" :disabled="loading">
          <span v-if="loading" class="loading-spinner"></span>
          {{ loading ? '登录中...' : '登录' }}
        </button>

        <div class="back-link">
          <router-link to="/">← 返回首页</router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.seller-login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-dark);
  padding: var(--space-6);
}

.login-container {
  width: 100%;
  max-width: 400px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-2xl);
  padding: var(--space-8);
}

.login-header {
  text-align: center;
  margin-bottom: var(--space-8);
}

.logo {
  margin-bottom: var(--space-4);
}

.login-header h1 {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}

.login-header p {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.error-msg {
  color: var(--danger);
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--radius-lg);
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-sm);
  text-align: center;
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
  background: var(--bg-dark);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  color: var(--text-primary);
  font-size: var(--text-base);
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: var(--primary);
}

.form-group input::placeholder {
  color: var(--text-muted);
}

.btn-login {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-4);
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border: none;
  border-radius: var(--radius-lg);
  color: white;
  font-size: var(--text-base);
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-login:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-login:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.back-link {
  text-align: center;
  margin-top: var(--space-4);
}

.back-link a {
  color: var(--text-muted);
  font-size: var(--text-sm);
  text-decoration: none;
  transition: color 0.2s;
}

.back-link a:hover {
  color: var(--primary);
}
</style>
