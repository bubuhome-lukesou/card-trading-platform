<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Mail, MapPin, Send } from 'lucide-vue-next'

const { locale } = useI18n()
const zh = computed(() => locale.value === 'zh')

const form = reactive({
  name: '',
  email: '',
  phone: '',
  subject: '',
  message: '',
})

const fieldErrors = reactive({
  name: '',
  email: '',
  subject: '',
  message: '',
})

const submitting = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

// 主題快捷選項（幫用戶開口）
const subjectPresets = computed(() =>
  zh.value
    ? ['商品問題', '訂單／付款問題', '商家入駐查詢', '合作提案', '其他']
    : ['Product inquiry', 'Order issue', 'Seller application', 'Partnership', 'Other']
)

const validate = (): boolean => {
  fieldErrors.name = form.name.trim() ? '' : (zh.value ? '請填寫稱呼' : 'Name is required')
  if (!form.email.trim()) {
    fieldErrors.email = zh.value ? '請填寫電郵' : 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    fieldErrors.email = zh.value ? '電郵格式不正確' : 'Invalid email format'
  } else {
    fieldErrors.email = ''
  }
  fieldErrors.subject = form.subject.trim() ? '' : (zh.value ? '請填寫主題' : 'Subject is required')
  fieldErrors.message = form.message.trim() ? '' : (zh.value ? '請填寫內容' : 'Message is required')
  return !fieldErrors.name && !fieldErrors.email && !fieldErrors.subject && !fieldErrors.message
}

const handleSubmit = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  if (!validate()) return

  submitting.value = true
  try {
    const { default: api } = await import('@/api')
    await api.post('/contact-messages', {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      subject: form.subject.trim(),
      message: form.message.trim(),
    })
    successMessage.value = zh.value
      ? '訊息已送出！我們會盡快回覆你的電郵。'
      : 'Message sent! We will reply to your email soon.'
    form.name = ''
    form.email = ''
    form.phone = ''
    form.subject = ''
    form.message = ''
  } catch (e: any) {
    const msg = e?.response?.data?.message
    errorMessage.value = typeof msg === 'string'
      ? msg
      : (zh.value ? '發送失敗，請稍後再試或直接電郵 support@aishoper.co' : 'Failed to send. Please try again later or email support@aishoper.co directly')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="contact-view">
    <div class="container">
      <div class="page-header">
        <h1 class="page-title">{{ zh ? '聯絡我們' : 'Contact Us' }}</h1>
        <p class="page-desc">{{ zh ? '有任何問題或建議，歡迎填寫表單，我們會盡快以電郵回覆。' : 'Have a question or suggestion? Fill in the form and we will reply by email as soon as possible.' }}</p>
      </div>

      <div class="contact-layout">
        <!-- 左：聯絡表單 -->
        <div class="contact-form-card">
          <form @submit.prevent="handleSubmit">
            <div class="form-row">
              <div class="form-group">
                <label>{{ zh ? '稱呼 *' : 'Name *' }}</label>
                <input
                  v-model="form.name"
                  type="text"
                  maxlength="100"
                  :placeholder="zh ? '你的稱呼' : 'Your name'"
                  :class="{ 'input-error': fieldErrors.name }"
                />
                <span v-if="fieldErrors.name" class="error-msg">{{ fieldErrors.name }}</span>
              </div>
              <div class="form-group">
                <label>{{ zh ? '電郵 *' : 'Email *' }}</label>
                <input
                  v-model="form.email"
                  type="text"
                  maxlength="200"
                  placeholder="you@example.com"
                  :class="{ 'input-error': fieldErrors.email }"
                />
                <span v-if="fieldErrors.email" class="error-msg">{{ fieldErrors.email }}</span>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>{{ zh ? '聯絡電話（可選）' : 'Phone (optional)' }}</label>
                <input
                  v-model="form.phone"
                  type="tel"
                  maxlength="30"
                  :placeholder="zh ? '+853 XXXX XXXX' : '+853 XXXX XXXX'"
                />
              </div>
              <div class="form-group">
                <label>{{ zh ? '主題 *' : 'Subject *' }}</label>
                <input
                  v-model="form.subject"
                  type="text"
                  maxlength="200"
                  :placeholder="zh ? '簡述你的問題' : 'Briefly describe your issue'"
                  :class="{ 'input-error': fieldErrors.subject }"
                />
                <span v-if="fieldErrors.subject" class="error-msg">{{ fieldErrors.subject }}</span>
              </div>
            </div>

            <div class="preset-row">
              <button
                v-for="preset in subjectPresets"
                :key="preset"
                type="button"
                class="preset-chip"
                :class="{ active: form.subject === preset }"
                @click="form.subject = preset"
              >
                {{ preset }}
              </button>
            </div>

            <div class="form-group">
              <label>{{ zh ? '內容 *' : 'Message *' }}</label>
              <textarea
                v-model="form.message"
                rows="7"
                maxlength="5000"
                :placeholder="zh ? '請描述你的問題（訂單號／商品編號等資料有助加快處理）' : 'Describe your issue (order number / product number helps speed things up)'"
                :class="{ 'input-error': fieldErrors.message }"
              ></textarea>
              <span v-if="fieldErrors.message" class="error-msg">{{ fieldErrors.message }}</span>
            </div>

            <div v-if="successMessage" class="toast success">✅ {{ successMessage }}</div>
            <div v-if="errorMessage" class="toast error">❌ {{ errorMessage }}</div>

            <button type="submit" class="btn-submit" :disabled="submitting">
              <Send class="icon" />
              {{ submitting ? (zh ? '發送中...' : 'Sending...') : (zh ? '發送訊息' : 'Send Message') }}
            </button>
          </form>
        </div>

        <!-- 右：聯絡資訊卡 -->
        <div class="contact-info-col">
          <div class="info-card">
            <div class="info-icon"><Mail class="icon" /></div>
            <h3>{{ zh ? '電郵支援' : 'Email Support' }}</h3>
            <a href="mailto:support@aishoper.co" class="info-value">support@aishoper.co</a>
            <p class="info-hint">{{ zh ? '一般 1-2 個工作天內回覆' : 'Usually replies within 1-2 business days' }}</p>
          </div>

          <div class="info-card">
            <div class="info-icon"><MapPin class="icon" /></div>
            <h3>{{ zh ? '所在地區' : 'Location' }}</h3>
            <p class="info-value">{{ zh ? '澳門' : 'Macao' }}</p>
            <p class="info-hint">{{ zh ? '預約商品取貨以各商家取貨資訊為準' : 'Pickup per each seller\'s info on reservation orders' }}</p>
          </div>

          <div class="info-card faq-link-card">
            <h3>{{ zh ? '想自己搵答案？' : 'Prefer to find answers yourself?' }}</h3>
            <p class="info-hint">{{ zh ? '常見問題頁有 10 條快問快答，操作教學在幫助中心。' : '10 quick Q&As on the FAQ page; step-by-step guides in the Help Center.' }}</p>
            <div class="quick-links">
              <RouterLink to="/faq" class="quick-link">FAQ {{ zh ? '常見問題' : '' }}</RouterLink>
              <RouterLink to="/help" class="quick-link">{{ zh ? '幫助中心' : 'Help Center' }}</RouterLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.contact-view {
  padding: var(--space-12) 0 var(--space-16);
  min-height: 60vh;
}

.page-header {
  text-align: center;
  margin-bottom: var(--space-8);
}

.page-title {
  font-size: var(--text-3xl);
  font-weight: 700;
  margin-bottom: var(--space-2);
  color: var(--text-primary);
}

.page-desc {
  color: var(--text-secondary);
}

.contact-layout {
  max-width: 960px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: var(--space-6);
  align-items: start;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
}

.contact-form-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-4);

  label {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--text-primary);
  }

  input,
  textarea {
    width: 100%;
    padding: var(--space-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--bg-elevated);
    color: var(--text-primary);
    font-size: var(--text-sm);
    font-family: inherit;
    transition: border-color var(--transition-fast);

    &:focus {
      outline: none;
      border-color: var(--primary);
    }

    &.input-error {
      border-color: #ef4444;
    }
  }

  textarea {
    resize: vertical;
  }
}

.error-msg {
  font-size: 12px;
  color: #ef4444;
}

.preset-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.preset-chip {
  padding: 6px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  background: var(--bg-elevated);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    border-color: var(--primary);
    color: var(--primary);
  }

  &.active {
    background: var(--primary);
    border-color: var(--primary);
    color: white;
  }
}

.toast {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-4);
  font-size: var(--text-sm);

  &.success {
    background: rgba(16, 185, 129, 0.12);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }

  &.error {
    background: rgba(239, 68, 68, 0.12);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }
}

.btn-submit {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-8);
  background: var(--primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  transition: opacity var(--transition-fast);

  &:hover:not(:disabled) {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .icon {
    width: 16px;
    height: 16px;
  }
}

.contact-info-col {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.info-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: var(--space-5);

  h3 {
    font-size: var(--text-base);
    font-weight: 600;
    margin-bottom: var(--space-2);
    color: var(--text-primary);
  }

  .info-value {
    font-size: var(--text-sm);
    color: var(--primary);
    text-decoration: none;
    font-weight: 500;

    &:hover {
      text-decoration: underline;
    }
  }

  p.info-value {
    color: var(--text-primary);
  }

  .info-hint {
    font-size: 12px;
    color: var(--text-muted);
    margin-top: var(--space-1);
  }

  .info-icon {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
    background: rgba(102, 126, 234, 0.12);
    margin-bottom: var(--space-3);

    .icon {
      width: 20px;
      height: 20px;
      color: var(--primary);
    }
  }
}

.faq-link-card {
  .quick-links {
    display: flex;
    gap: var(--space-2);
    margin-top: var(--space-3);
    flex-wrap: wrap;
  }

  .quick-link {
    padding: 6px 14px;
    border: 1px solid var(--border);
    border-radius: var(--radius-full);
    font-size: 13px;
    color: var(--text-secondary);
    text-decoration: none;
    transition: all var(--transition-fast);

    &:hover {
      border-color: var(--primary);
      color: var(--primary);
    }
  }
}
</style>