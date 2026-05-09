<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminApi } from '@/api/admin'
import { tagApi } from '@/api/tags'
import type { Tag } from '@/types'

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

// Tag management
const tags = ref<Tag[]>([])
const tagLoading = ref(false)
const showTagForm = ref(false)
const editingTag = ref<Tag | null>(null)
const newTagName = ref('')
const newTagType = ref<'general' | 'product_type'>('product_type')
const tagError = ref('')

const loadTags = async () => {
  tagLoading.value = true
  try {
    const res = await tagApi.getTags()
    tags.value = res.data
  } catch (e) {
    console.error('Failed to load tags', e)
  } finally {
    tagLoading.value = false
  }
}

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
  await loadTags()
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

// Tag management functions
const openTagForm = (tag?: Tag) => {
  if (tag) {
    editingTag.value = tag
    newTagName.value = tag.name
    newTagType.value = tag.type || 'general'
  } else {
    editingTag.value = null
    newTagName.value = ''
    newTagType.value = 'product_type'
  }
  tagError.value = ''
  showTagForm.value = true
}

const closeTagForm = () => {
  showTagForm.value = false
  editingTag.value = null
  newTagName.value = ''
  newTagType.value = 'product_type'
  tagError.value = ''
}

const handleSaveTag = async () => {
  if (!newTagName.value.trim()) {
    tagError.value = '請輸入標籤名稱'
    return
  }

  try {
    if (editingTag.value) {
      await tagApi.updateTag(editingTag.value.id, {
        name: newTagName.value.trim(),
        type: newTagType.value,
      })
    } else {
      await tagApi.createTag({
        name: newTagName.value.trim(),
        type: newTagType.value,
      })
    }
    await loadTags()
    closeTagForm()
  } catch (e: any) {
    tagError.value = e?.response?.data?.message || '操作失敗'
  }
}

const handleDeleteTag = async (tag: Tag) => {
  if (!confirm(`確定要刪除標籤「${tag.name}」嗎？`)) return
  try {
    await tagApi.deleteTag(tag.id)
    await loadTags()
  } catch (e: any) {
    alert(e?.response?.data?.message || '刪除失敗')
  }
}

const productTypeTags = () => tags.value.filter(t => t.type === 'product_type')
const generalTags = () => tags.value.filter(t => t.type === 'general' || !t.type)
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

    <!-- 商品種類管理 -->
    <div class="settings-card">
      <div class="section-header">
        <div>
          <h3 class="section-title">商品種類管理</h3>
          <p class="section-desc">管理商品種類標籤（評分卡、原箱、原盒、原袋、裸卡等）</p>
        </div>
        <button class="btn-add" @click="openTagForm()">+ 新增種類</button>
      </div>

      <!-- 載入中 -->
      <div v-if="tagLoading" class="loading-state">
        <div class="spinner"></div>
        <p>載入中...</p>
      </div>

      <!-- 標籤列表 -->
      <div v-else class="tags-section">
        <!-- 商品種類 -->
        <div class="tag-category">
          <h4 class="tag-category-title">商品種類</h4>
          <div v-if="productTypeTags().length === 0" class="empty-hint">暫無商品種類，點擊上方「新增種類」添加</div>
          <div class="tag-list">
            <div v-for="tag in productTypeTags()" :key="tag.id" class="tag-item">
              <span class="tag-badge product-type">{{ tag.name }}</span>
              <div class="tag-actions">
                <button class="btn-icon" @click="openTagForm(tag)" title="編輯">✏️</button>
                <button class="btn-icon btn-danger" @click="handleDeleteTag(tag)" title="刪除">🗑️</button>
              </div>
            </div>
          </div>
        </div>

        <!-- 一般標籤 -->
        <div class="tag-category">
          <h4 class="tag-category-title">一般標籤</h4>
          <div v-if="generalTags().length === 0" class="empty-hint">暫無一般標籤</div>
          <div class="tag-list">
            <div v-for="tag in generalTags()" :key="tag.id" class="tag-item">
              <span class="tag-badge general">{{ tag.name }}</span>
              <div class="tag-actions">
                <button class="btn-icon" @click="openTagForm(tag)" title="編輯">✏️</button>
                <button class="btn-icon btn-danger" @click="handleDeleteTag(tag)" title="刪除">🗑️</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="actions">
      <button @click="handleSave" class="btn-save" :disabled="saving">
        {{ saving ? '儲存中...' : '儲存設置' }}
      </button>
    </div>

    <!-- 新增/編輯標籤彈窗 -->
    <div v-if="showTagForm" class="modal-overlay" @click.self="closeTagForm">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editingTag ? '編輯標籤' : '新增標籤' }}</h3>
          <button class="btn-close" @click="closeTagForm">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>標籤名稱</label>
            <input
              v-model="newTagName"
              type="text"
              placeholder="例如：評分卡、原箱、原盒..."
              @keyup.enter="handleSaveTag"
            />
          </div>
          <div class="form-group">
            <label>標籤類型</label>
            <select v-model="newTagType" class="form-select">
              <option value="product_type">商品種類</option>
              <option value="general">一般標籤</option>
            </select>
          </div>
          <div v-if="tagError" class="error-text">{{ tagError }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeTagForm">取消</button>
          <button class="btn-confirm" @click="handleSaveTag">
            {{ editingTag ? '保存修改' : '確認添加' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-page { display: flex; flex-direction: column; gap: var(--space-6); max-width: 800px; }
.settings-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: var(--space-6); }
.section-title { font-size: var(--text-base); font-weight: 600; color: var(--text-primary); margin-bottom: var(--space-4); }
.section-desc { font-size: var(--text-sm); color: var(--text-muted); margin-bottom: var(--space-4); }
.section-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-4); }
.section-header .section-title { margin-bottom: var(--space-1); }
.section-header .section-desc { margin-bottom: 0; }
.form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-4); }
.form-stack { display: flex; flex-direction: column; gap: var(--space-4); }
.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
.form-group label { font-size: var(--text-sm); font-weight: 500; color: var(--text-secondary); }
.form-group input, .form-group textarea, .form-select { padding: var(--space-3); background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-lg); color: var(--text-primary); font-size: var(--text-sm); resize: vertical; font-family: inherit; }
.form-group input:focus, .form-group textarea:focus, .form-select:focus { outline: none; border-color: var(--primary); }
.actions { display: flex; justify-content: flex-end; }
.btn-save { padding: var(--space-3) var(--space-8); background: var(--primary-gradient); border: none; border-radius: var(--radius-lg); color: white; font-weight: 600; cursor: pointer; }
.btn-save:hover:not(:disabled) { opacity: 0.9; }
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

/* Tag management styles */
.btn-add { padding: var(--space-2) var(--space-4); background: var(--primary); border: none; border-radius: var(--radius-lg); color: white; font-weight: 600; cursor: pointer; font-size: var(--text-sm); }
.btn-add:hover { opacity: 0.9; }

.loading-state { display: flex; flex-direction: column; align-items: center; gap: var(--space-2); padding: var(--space-6); }
.spinner { width: 32px; height: 32px; border: 3px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.tags-section { display: flex; flex-direction: column; gap: var(--space-6); }
.tag-category {}
.tag-category-title { font-size: var(--text-sm); font-weight: 600; color: var(--text-secondary); margin-bottom: var(--space-3); }
.empty-hint { font-size: var(--text-sm); color: var(--text-muted); padding: var(--space-2) 0; }

.tag-list { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.tag-item { display: flex; align-items: center; gap: var(--space-2); }
.tag-badge { padding: var(--space-1) var(--space-3); border-radius: var(--radius-full); font-size: var(--text-sm); font-weight: 500; }
.tag-badge.product-type { background: rgba(99, 102, 241, 0.1); color: var(--primary); border: 1px solid var(--primary); }
.tag-badge.general { background: var(--bg-elevated); color: var(--text-secondary); border: 1px solid var(--border); }

.tag-actions { display: flex; gap: var(--space-1); }
.btn-icon { padding: 2px 6px; background: transparent; border: none; cursor: pointer; font-size: 14px; opacity: 0.6; transition: opacity 0.2s; }
.btn-icon:hover { opacity: 1; }
.btn-icon.btn-danger:hover { color: var(--danger); }

/* Modal styles */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { background: var(--bg-card); border-radius: var(--radius-xl); width: 90%; max-width: 400px; overflow: hidden; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: var(--space-4) var(--space-6); border-bottom: 1px solid var(--border); }
.modal-header h3 { font-size: var(--text-base); font-weight: 600; }
.btn-close { background: none; border: none; font-size: 18px; cursor: pointer; color: var(--text-secondary); padding: 4px; }
.btn-close:hover { color: var(--text-primary); }
.modal-body { padding: var(--space-6); display: flex; flex-direction: column; gap: var(--space-4); }
.modal-footer { display: flex; gap: var(--space-3); justify-content: flex-end; padding: var(--space-4) var(--space-6); border-top: 1px solid var(--border); }
.btn-cancel { padding: var(--space-2) var(--space-4); background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-lg); color: var(--text-primary); cursor: pointer; font-weight: 500; }
.btn-confirm { padding: var(--space-2) var(--space-4); background: var(--primary); border: none; border-radius: var(--radius-lg); color: white; cursor: pointer; font-weight: 500; }
.btn-confirm:hover { opacity: 0.9; }
.error-text { color: var(--danger); font-size: var(--text-sm); }

@media (max-width: 640px) { .form-grid { grid-template-columns: 1fr; } }
</style>