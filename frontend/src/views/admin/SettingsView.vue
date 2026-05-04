<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminApi } from '@/api/admin'

const settings = ref({
  platformName: 'Card Quest',
  platformUrl: 'https://card.aishoper.co',
  supportEmail: 'support@cardquest.com',
  supportPhone: '+853 1234 5678',
  platformFee: 5,
  minWithdraw: 100,
  maxAuctionDuration: 168,
  defaultBidIncrement: 10,
  pickupInfo: '',
  pickupQrCode: '',
})

const saving = ref(false)
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    const res = await adminApi.getSettings()
    if (res.data) {
      settings.value.pickupInfo = res.data.pickupInfo || ''
      settings.value.pickupQrCode = res.data.pickupQrCode || ''
    }
  } catch (e) {
    console.error('Failed to load settings', e)
  } finally {
    loading.value = false
  }
})

const handleSave = async () => {
  saving.value = true
  try {
    await adminApi.updateSettings({
      pickupInfo: settings.value.pickupInfo,
      pickupQrCode: settings.value.pickupQrCode,
    })
    alert('設置已保存')
  } catch (e) {
    console.error('Save failed', e)
    alert('保存失敗')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="settings-page">
    <div class="settings-card">
      <h3 class="section-title">平台資訊</h3>
      <div class="form-grid">
        <div class="form-group">
          <label>平台名稱</label>
          <input v-model="settings.platformName" type="text" />
        </div>
        <div class="form-group">
          <label>平台網址</label>
          <input v-model="settings.platformUrl" type="url" />
        </div>
        <div class="form-group">
          <label>支援郵箱</label>
          <input v-model="settings.supportEmail" type="email" />
        </div>
        <div class="form-group">
          <label>支援電話</label>
          <input v-model="settings.supportPhone" type="tel" />
        </div>
      </div>
    </div>

    <div class="settings-card">
      <h3 class="section-title">費用設置</h3>
      <div class="form-grid">
        <div class="form-group">
          <label>平台費率 (%)</label>
          <input v-model.number="settings.platformFee" type="number" min="0" max="100" />
        </div>
        <div class="form-group">
          <label>最低提現金額 (MOP)</label>
          <input v-model.number="settings.minWithdraw" type="number" min="1" />
        </div>
      </div>
    </div>

    <div class="settings-card">
      <h3 class="section-title">拍賣設置</h3>
      <div class="form-grid">
        <div class="form-group">
          <label>最長拍賣時長 (小時)</label>
          <input v-model.number="settings.maxAuctionDuration" type="number" min="1" />
        </div>
        <div class="form-group">
          <label>預設最低加價 (MOP)</label>
          <input v-model.number="settings.defaultBidIncrement" type="number" min="1" />
        </div>
      </div>
    </div>

    <div class="settings-card">
      <h3 class="section-title">預約攞貨設置</h3>
      <p class="section-desc">用戶點擊「預約攞貨」時會顯示以下信息</p>
      <div class="form-stack">
        <div class="form-group">
          <label>攞貨地點 / 時間 / WeChat（如無可留空）</label>
          <textarea
            v-model="settings.pickupInfo"
            rows="4"
            placeholder="範例：
📍 攞貨地點：澳門宋玉生廣場
🕐 攞貨時間：週一至週五 14:00-20:00
💬 WeChat：your_wechat_id"
          ></textarea>
        </div>
      </div>
    </div>

    <div class="actions">
      <button @click="handleSave" class="btn-save" :disabled="saving">
        {{ saving ? '儲存中...' : '儲存設置' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.settings-page { display: flex; flex-direction: column; gap: var(--space-6); max-width: 800px; }
.settings-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: var(--space-6); }
.section-title { font-size: var(--text-base); font-weight: 600; color: var(--text-primary); margin-bottom: var(--space-4); }
.section-desc { font-size: var(--text-sm); color: var(--text-muted); margin-bottom: var(--space-4); }
.form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-4); }
.form-stack { display: flex; flex-direction: column; gap: var(--space-4); }
.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
.form-group label { font-size: var(--text-sm); font-weight: 500; color: var(--text-secondary); }
.form-group input, .form-group textarea { padding: var(--space-3); background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-lg); color: var(--text-primary); font-size: var(--text-sm); resize: vertical; font-family: inherit; }
.form-group input:focus, .form-group textarea:focus { outline: none; border-color: var(--primary); }
.actions { display: flex; justify-content: flex-end; }
.btn-save { padding: var(--space-3) var(--space-8); background: var(--primary-gradient); border: none; border-radius: var(--radius-lg); color: white; font-weight: 600; cursor: pointer; }
.btn-save:hover:not(:disabled) { opacity: 0.9; }
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
@media (max-width: 640px) { .form-grid { grid-template-columns: 1fr; } }
</style>
