<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { sellerApplicationApi } from '@/api/seller-application'

const { t } = useI18n()

interface Application {
  id: string
  userId: string | null
  email: string
  nickname: string
  storeName: string
  storeDescription: string
  phone: string
  pickupInfo: string
  pickupQrCode: string
  status: 'pending' | 'approved' | 'rejected'
  rejectionReason: string
  createdAt: string
}

const applications = ref<Application[]>([])
const loading = ref(false)
const actionLoading = ref<string | null>(null)
const currentPage = ref(1)
const totalPages = ref(1)
const total = ref(0)

const loadApplications = async (page = 1) => {
  loading.value = true
  try {
    const res = await sellerApplicationApi.getAllApplications(page, 10)
    applications.value = res.data.data
    total.value = res.data.total
    totalPages.value = Math.ceil(res.data.total / 10)
    currentPage.value = page
  } catch (e) {
    console.error('Failed to load applications', e)
  } finally {
    loading.value = false
  }
}

const handleApprove = async (id: string) => {
  if (!confirm('確認通過此商家申請？')) return
  actionLoading.value = id
  try {
    await sellerApplicationApi.approve(id)
    await loadApplications(currentPage.value)
  } catch (e) {
    alert('操作失敗')
  } finally {
    actionLoading.value = null
  }
}

const handleReject = async (id: string) => {
  const reason = prompt('請輸入拒絕原因：')
  if (reason === null) return
  actionLoading.value = id
  try {
    await sellerApplicationApi.reject(id, reason || undefined)
    await loadApplications(currentPage.value)
  } catch (e) {
    alert('操作失敗')
  } finally {
    actionLoading.value = null
  }
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('zh-TW')
}

const resolveImageUrl = (url: string) => {
  if (!url) return '/placeholder.png'
  if (url.startsWith('data:') || url.startsWith('http')) return url
  return '/api' + url
}

onMounted(() => {
  loadApplications()
})
</script>

<template>
  <div class="seller-applications-page">
    <div class="page-header">
      <h1 class="page-title">商家入駐審批</h1>
      <p class="page-desc">審批用戶的商家入駐申請</p>
    </div>

    <div class="applications-list" v-if="!loading && applications.length">
      <div
        v-for="app in applications"
        :key="app.id"
        class="application-card"
        :class="{ pending: app.status === 'pending', approved: app.status === 'approved', rejected: app.status === 'rejected' }"
      >
        <div class="app-header">
          <div class="app-status">
            <span v-if="app.status === 'pending'" class="badge pending">待審批</span>
            <span v-else-if="app.status === 'approved'" class="badge approved">已通過</span>
            <span v-else class="badge rejected">已拒絕</span>
          </div>
          <span class="app-date">{{ formatDate(app.createdAt) }}</span>
        </div>

        <div class="app-content">
          <div class="app-section">
            <h4>申請人資料</h4>
            <div class="info-grid">
              <div class="info-item">
                <label>用戶昵稱</label>
                <span>{{ app.nickname || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <label>郵箱</label>
                <span>{{ app.email || 'N/A' }}</span>
              </div>
            </div>
          </div>

          <div class="app-section">
            <h4>商店資訊</h4>
            <div class="info-grid">
              <div class="info-item">
                <label>商店名稱</label>
                <span>{{ app.storeName }}</span>
              </div>
              <div class="info-item" v-if="app.phone">
                <label>聯絡電話</label>
                <span>{{ app.phone }}</span>
              </div>
              <div class="info-item full-width" v-if="app.storeDescription">
                <label>商店簡介</label>
                <span>{{ app.storeDescription }}</span>
              </div>
            </div>
          </div>

          <div class="app-section" v-if="app.pickupInfo">
            <h4>取貨資訊</h4>
            <pre class="pickup-info">{{ app.pickupInfo }}</pre>
          </div>

          <div class="app-section" v-if="app.pickupQrCode">
            <h4>WeChat 二維碼</h4>
            <img :src="resolveImageUrl(app.pickupQrCode)" alt="WeChat QR" class="qr-code" />
          </div>

          <div class="app-section rejection-reason" v-if="app.status === 'rejected' && app.rejectionReason">
            <h4>拒絕原因</h4>
            <p>{{ app.rejectionReason }}</p>
          </div>
        </div>

        <div class="app-actions" v-if="app.status === 'pending'">
          <button
            class="btn btn-approve"
            @click="handleApprove(app.id)"
            :disabled="actionLoading === app.id"
          >
            {{ actionLoading === app.id ? '處理中...' : '✅ 通過' }}
          </button>
          <button
            class="btn btn-reject"
            @click="handleReject(app.id)"
            :disabled="actionLoading === app.id"
          >
            {{ actionLoading === app.id ? '處理中...' : '❌ 拒絕' }}
          </button>
        </div>
      </div>

      <!-- Pagination -->
      <div class="pagination" v-if="totalPages > 1">
        <button
          class="page-btn"
          :disabled="currentPage === 1"
          @click="loadApplications(currentPage - 1)"
        >
          上一頁
        </button>
        <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
        <button
          class="page-btn"
          :disabled="currentPage === totalPages"
          @click="loadApplications(currentPage + 1)"
        >
          下一頁
        </button>
      </div>
    </div>

    <div class="empty-state" v-else-if="!loading">
      <div class="empty-icon">📋</div>
      <p>暫無商家申請</p>
    </div>

    <div class="loading-state" v-else>
      <div class="spinner"></div>
      <p>載入中...</p>
    </div>
  </div>
</template>

<style scoped>
.seller-applications-page {
  padding: var(--space-6);
}

.page-header {
  margin-bottom: var(--space-6);
}

.page-title {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}

.page-desc {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.applications-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.application-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.application-card.pending {
  border-left: 4px solid #f59e0b;
}

.application-card.approved {
  border-left: 4px solid #10b981;
}

.application-card.rejected {
  border-left: 4px solid #ef4444;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4) var(--space-6);
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border);
}

.badge {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 600;
}

.badge.pending {
  background: #f59e0b;
  color: white;
}

.badge.approved {
  background: #10b981;
  color: white;
}

.badge.rejected {
  background: #ef4444;
  color: white;
}

.app-date {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.app-content {
  padding: var(--space-6);
}

.app-section {
  margin-bottom: var(--space-6);
}

.app-section:last-child {
  margin-bottom: 0;
}

.app-section h4 {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: var(--space-3);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.info-item.full-width {
  grid-column: 1 / -1;
}

.info-item label {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.info-item span {
  font-size: var(--text-sm);
  color: var(--text-primary);
}

.pickup-info {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-3);
  font-size: var(--text-sm);
  color: var(--text-primary);
  white-space: pre-wrap;
  margin: 0;
  font-family: inherit;
}

.qr-code {
  max-width: 150px;
  max-height: 150px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
}

.rejection-reason p {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: var(--radius-lg);
  padding: var(--space-3);
  font-size: var(--text-sm);
  color: #dc2626;
  margin: 0;
}

.app-actions {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--border);
  background: var(--bg-elevated);
}

.btn {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  border: none;
}

.btn-approve {
  background: #10b981;
  color: white;
}

.btn-approve:hover:not(:disabled) {
  background: #059669;
}

.btn-reject {
  background: #ef4444;
  color: white;
}

.btn-reject:hover:not(:disabled) {
  background: #dc2626;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--space-4);
  margin-top: var(--space-6);
}

.page-btn {
  padding: var(--space-2) var(--space-4);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  color: var(--text-primary);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.page-btn:hover:not(:disabled) {
  border-color: var(--primary);
  color: var(--primary);
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.empty-state,
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-16);
  color: var(--text-muted);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: var(--space-4);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: var(--space-4);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 640px) {
  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
