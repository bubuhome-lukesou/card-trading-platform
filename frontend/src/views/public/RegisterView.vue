<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { UserPlus } from 'lucide-vue-next'

const { t } = useI18n()
const authStore = useAuthStore()

const email = ref('')
const nickname = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')

const handleSubmit = async () => {
  error.value = ''

  if (password.value !== confirmPassword.value) {
    error.value = t('errors.passwordMismatch')
    return
  }

  loading.value = true

  const success = await authStore.register({
    email: email.value,
    password: password.value,
    nickname: nickname.value
  })

  if (!success) {
    error.value = authStore.error || 'Registration failed'
  }

  loading.value = false
}
</script>

<template>
  <div class="register-page">
    <div class="register-card">
      <div class="register-header">
        <h1 class="register-title">{{ t('auth.register.title') }}</h1>
        <p class="register-subtitle">{{ t('app.tagline') }}</p>
      </div>

      <form class="register-form" @submit.prevent="handleSubmit">
        <div v-if="error" class="error-alert">
          {{ error }}
        </div>

        <div class="input-group">
          <label class="input-label">{{ t('auth.register.email') }}</label>
          <input
            v-model="email"
            type="email"
            class="input"
            :placeholder="t('auth.register.email')"
            required
          />
        </div>

        <div class="input-group">
          <label class="input-label">{{ t('auth.register.nickname') }}</label>
          <input
            v-model="nickname"
            type="text"
            class="input"
            :placeholder="t('auth.register.nickname')"
            required
          />
        </div>

        <div class="input-group">
          <label class="input-label">{{ t('auth.register.password') }}</label>
          <input
            v-model="password"
            type="password"
            class="input"
            :placeholder="t('auth.register.password')"
            minlength="6"
            required
          />
        </div>

        <div class="input-group">
          <label class="input-label">{{ t('auth.register.confirmPassword') }}</label>
          <input
            v-model="confirmPassword"
            type="password"
            class="input"
            :placeholder="t('auth.register.confirmPassword')"
            required
          />
        </div>

        <button type="submit" class="btn btn-primary btn-lg" :disabled="loading">
          <UserPlus v-if="!loading" class="icon" />
          <span v-if="loading">Loading...</span>
          <span v-else>{{ t('auth.register.submit') }}</span>
        </button>
      </form>

      <div class="register-footer">
        <p>
          {{ t('auth.register.hasAccount') }}
          <RouterLink to="/login" class="link">
            {{ t('auth.register.loginNow') }}
          </RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.register-page {
  min-height: calc(100vh - 64px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-8);
  background: radial-gradient(circle at 50% 50%, rgba(118, 75, 162, 0.1) 0%, transparent 50%);
}

.register-card {
  width: 100%;
  max-width: 420px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-2xl);
  padding: var(--space-10);
}

.register-header {
  text-align: center;
  margin-bottom: var(--space-8);
}

.register-title {
  font-size: var(--text-3xl);
  font-weight: 700;
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: var(--space-2);
}

.register-subtitle {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.register-form {
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

.btn {
  margin-top: var(--space-4);

  .icon {
    width: 20px;
    height: 20px;
  }
}

.register-footer {
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
