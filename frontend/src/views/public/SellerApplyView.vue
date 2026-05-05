<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { sellerApplicationApi } from '@/api/seller-application'
import { uploadApi } from '@/api/upload'

const { t } = useI18n()
const router = useRouter()

const formData = ref({
  email: '',
  nickname: '',
  password: '',
  storeName: '',
  storeDescription: '',
  phone: '',
  pickupInfo: '',
})

const qrCodeFile = ref<File | null>(null)
const qrCodePreview = ref('')
const qrCodeUrl = ref('')

const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const applicationStatus = ref<'none' | 'pending' | 'approved' | 'rejected'>('none')
const existingApplication = ref<any>(null)

const resolveImageUrl = (url: string) => {
  if (!url) return '/placeholder.png'
  if (url.startsWith('data:') || url.startsWith('http')) return url
  const apiBaseUrl = import.meta.env.VITE_API_URL || ''
  return apiBaseUrl + url
}

const handleQrCodeChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  qrCodeFile.value = file
  qrCodePreview.value = URL.createObjectURL(file)
}

const loadApplicationStatus = async () => {
  const savedEmail = localStorage.getItem('seller_application_email')
  if (!savedEmail) return
  try {
    const res = await sellerApplicationApi.getStatusByEmail(savedEmail)
    if (res.data) {
      existingApplication.value = res.data
      if (res.data.status === 'pending') {
        applicationStatus.value = 'pending'
      } else if (res.data.status === 'approved') {
        applicationStatus.value = 'approved'
      } else if (res.data.status === 'rejected') {
        applicationStatus.value = 'rejected'
      }
    }
  } catch (e) {
    // No application found
  }
}

const handleSubmit = async () => {
  errorMessage.value = ''

  // 校驗
  if (!formData.value.email.trim()) {
    errorMessage.value = '請填寫電郵'
    return
  }
  if (!formData.value.nickname.trim()) {
    errorMessage.value = '請填寫暱稱'
    return
  }
  if (!formData.value.password || formData.value.password.length < 6) {
    errorMessage.value = '密碼至少需要 6 個字符'
    return
  }
  if (!formData.value.storeName.trim()) {
    errorMessage.value = '請填寫商店名稱'
    return
  }

  loading.value = true

  try {
    let qrCode = qrCodeUrl.value
    // Upload new QR code if selected
    if (qrCodeFile.value) {
      const res = await uploadApi.uploadImage(qrCodeFile.value)
      qrCode = res.data.url
    }

    await sellerApplicationApi.submitApplication({
      email: formData.value.email,
      nickname: formData.value.nickname,
      password: formData.value.password,
      storeName: formData.value.storeName,
      storeDescription: formData.value.storeDescription,
      phone: formData.value.phone,
      pickupInfo: formData.value.pickupInfo,
      pickupQrCode: qrCode,
    })

    // 記住郵箱，方便查詢狀態
    localStorage.setItem('seller_application_email', formData.value.email)

    successMessage.value = '申請已提交，請等待管理員審批'
    applicationStatus.value = 'pending'
    qrCodeFile.value = null
    qrCodePreview.value = ''
  } catch (error: any) {
    errorMessage.value = error.response?.data?.message || '提交失敗，請稍後再試'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadApplicationStatus()
})
</script>

<template>
  <div class="seller-apply-page">
    <div class="container">
      <div class="page-header">
        <h1 class="page-title">商家入駐申請</h1>
        <p class="page-desc">填寫以下資料申請成為商家，管理員審批後即可開始銷售</p>
      </div>

      <!-- Pending Status -->
      <div v-if="applicationStatus === 'pending'" class="status-card pending">
        <div class="status-icon">⏳</div>
        <h2>申請已提交</h2>
        <p>您的商家入駐申請正在審批中，請耐心等待...</p>
        <div class="application-info" v-if="existingApplication">
          <p><strong>商店名稱：</strong>{{ existingApplication.storeName }}</p>
          <p><strong>申請時間：</strong>{{ new Date(existingApplication.createdAt).toLocaleString('zh-TW') }}</p>
        </div>
        <RouterLink to="/" class="btn btn-outline">返回首頁</RouterLink>
      </div>

      <!-- Approved Status -->
      <div v-else-if="applicationStatus === 'approved'" class="status-card approved">
        <div class="status-icon">✅</div>
        <h2>申請已通過</h2>
        <p>恭喜！您的商家申請已通過審批</p>
        <p>使用註冊的電郵和密碼登入賣家帳號</p>
        <RouterLink to="/seller/login" class="btn btn-primary">前往登入</RouterLink>
      </div>

      <!-- Rejected Status -->
      <div v-else-if="applicationStatus === 'rejected'" class="status-card rejected">
        <div class="status-icon">❌</div>
        <h2>申請未通過</h2>
        <p v-if="existingApplication?.rejectionReason">
          原因：{{ existingApplication.rejectionReason }}
        </p>
        <p>您可以重新提交申請</p>
        <button @click="applicationStatus = 'none'" class="btn btn-primary">重新申請</button>
      </div>

      <!-- Application Form -->
      <div v-else class="apply-form-card">
        <div v-if="successMessage" class="success-toast">✅ {{ successMessage }}</div>
        <div v-if="errorMessage" class="error-toast">❌ {{ errorMessage }}</div>

        <form @submit.prevent="handleSubmit">
          <!-- 帳號資料 -->
          <div class="form-section">
            <h3 class="section-title">帳號資料</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>電郵 *</label>
                <input
                  v-model="formData.email"
                  type="email"
                  placeholder="your@email.com"
                  maxlength="50"
                />
              </div>
              <div class="form-group">
                <label>暱稱 *</label>
                <input
                  v-model="formData.nickname"
                  type="text"
                  placeholder="輸入暱稱"
                  maxlength="20"
                />
              </div>
              <div class="form-group full-width">
                <label>密碼 *</label>
                <input
                  v-model="formData.password"
                  type="password"
                  placeholder="至少 6 個字符"
                  minlength="6"
                />
              </div>
            </div>
          </div>

          <!-- 商店資訊 -->
          <div class="form-section">
            <h3 class="section-title">商店資訊</h3>
            <div class="form-grid">
              <div class="form-group full-width">
                <label>商店名稱 *</label>
                <input
                  v-model="formData.storeName"
                  type="text"
                  placeholder="輸入商店名稱"
                  maxlength="50"
                />
              </div>
              <div class="form-group full-width">
                <label>商店簡介</label>
                <textarea
                  v-model="formData.storeDescription"
                  rows="3"
                  placeholder="簡單介紹您的商店（可選）"
                  maxlength="200"
                ></textarea>
              </div>
              <div class="form-group">
                <label>聯絡電話</label>
                <input
                  v-model="formData.phone"
                  type="tel"
                  placeholder="+853 XXXX XXXX"
                />
              </div>
            </div>
          </div>

          <!-- 取貨資訊 -->
          <div class="form-section">
            <h3 class="section-title">取貨資訊</h3>
            <div class="form-group full-width">
              <label>取貨地點 / 時間 / WeChat</label>
              <textarea
                v-model="formData.pickupInfo"
                rows="4"
                placeholder="範例：
📍 取貨地點：澳門宋玉生廣場
🕐 取貨時間：週一至週五 14:00-20:00
💬 WeChat：your_wechat_id"
              ></textarea>
            </div>

            <div class="form-group full-width">
              <label>WeChat 二維碼</label>
              <div class="qr-upload-area">
                <div class="qr-upload" v-if="!qrCodePreview && !qrCodeUrl">
                  <input type="file" accept="image/*" @change="handleQrCodeChange" id="qrInput" class="qr-input" />
                  <label for="qrInput" class="qr-upload-label">
                    <span class="qr-icon">📷</span>
                    <span>上傳二維碼</span>
                  </label>
                </div>
                <div class="qr-preview" v-else>
                  <img :src="qrCodePreview || resolveImageUrl(qrCodeUrl)" alt="WeChat 二維碼" class="qr-image" />
                  <button type="button" @click="qrCodePreview = ''; qrCodeUrl = ''; qrCodeFile = null" class="qr-remove">✕</button>
                </div>
              </div>
            </div>
          </div>

          <div class="form-actions">
            <RouterLink to="/" class="btn btn-outline">取消</RouterLink>
            <button type="submit" class="btn btn-primary" :disabled="loading">
              {{ loading ? '提交中...' : '提交申請' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.seller-apply-page {
  min-height: 100vh;
  padding: var(--space-8) var(--space-4);
  background: var(--bg-dark);
}

.container {
  max-width: 700px;
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: var(--space-8);
}

.page-title {
  font-size: var(--text-3xl);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--space-3);
}

.page-desc {
  color: var(--text-secondary);
  font-size: var(--text-base);
}

.status-card {
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  padding: var(--space-12);
  text-align: center;
  border: 1px solid var(--border);
}

.status-card.pending {
  border-color: var(--warning);
}

.status-card.approved {
  border-color: var(--success);
}

.status-card.rejected {
  border-color: var(--error);
}

.status-icon {
  font-size: 64px;
  margin-bottom: var(--space-4);
}

.status-card h2 {
  font-size: var(--text-2xl);
  margin-bottom: var(--space-3);
}

.status-card p {
  color: var(--text-secondary);
  margin-bottom: var(--space-4);
}

.application-info {
  background: var(--bg-dark);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-6);
  text-align: left;
}

.application-info p {
  margin-bottom: var(--space-2);
  font-size: var(--text-sm);
}

.apply-form-card {
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  padding: var(--space-8);
  border: 1px solid var(--border);
}

.success-toast {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid var(--success);
  color: var(--success);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-4);
  font-size: var(--text-sm);
}

.error-toast {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid var(--error);
  color: var(--error);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-4);
  font-size: var(--text-sm);
}

.form-section {
  margin-bottom: var(--space-8);
}

.form-section:last-of-type {
  margin-bottom: var(--space-6);
}

.section-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--border);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-4);
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

.form-group input,
.form-group textarea,
.form-group select {
  padding: var(--space-3);
  background: var(--bg-dark);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  color: var(--text-primary);
  font-size: var(--text-base);
  transition: all 0.2s;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.form-group textarea {
  resize: vertical;
  min-height: 100px;
}

.form-actions {
  display: flex;
  gap: var(--space-4);
  justify-content: flex-end;
  padding-top: var(--space-6);
  border-top: 1px solid var(--border);
}

/* QR Code Upload */
.qr-upload-area {
  display: flex;
  gap: var(--space-4);
  align-items: flex-start;
}

.qr-upload {
  flex: 1;
}

.qr-input {
  display: none;
}

.qr-upload-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-6);
  background: var(--bg-dark);
  border: 2px dashed var(--border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-secondary);
}

.qr-upload-label:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.qr-icon {
  font-size: 32px;
}

.qr-preview {
  position: relative;
  flex: 1;
  max-width: 200px;
}

.qr-image {
  width: 100%;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
}

.qr-remove {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--error);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-group.full-width {
    grid-column: 1;
  }

  .apply-form-card {
    padding: var(--space-4);
  }

  .form-actions {
    flex-direction: column;
  }

  .form-actions .btn {
    width: 100%;
  }
}
</style>
