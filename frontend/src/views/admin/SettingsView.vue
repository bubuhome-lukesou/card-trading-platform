<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { adminApi } from '@/api/admin'
import { tagApi } from '@/api/tags'
import type { Tag } from '@/types'

const activeTab = ref('general')

// ---- General Settings ----
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

// Password change
const passwordData = ref({ currentPassword: '', newPassword: '', confirmPassword: '' })
const passwordError = ref('')
const passwordSuccess = ref('')

const handlePasswordChange = async () => {
  passwordError.value = ''
  passwordSuccess.value = ''
  if (passwordData.value.newPassword !== passwordData.value.confirmPassword) {
    passwordError.value = '兩次輸入的密碼不一致'
    return
  }
  if (passwordData.value.newPassword.length < 6) {
    passwordError.value = '密碼至少需要 6 個字符'
    return
  }
  saving.value = true
  try {
    await adminApi.changePassword({
      currentPassword: passwordData.value.currentPassword,
      newPassword: passwordData.value.newPassword,
    })
    passwordData.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
    passwordSuccess.value = '密碼已修改'
    setTimeout(() => passwordSuccess.value = '', 3000)
  } catch (e: any) {
    passwordError.value = e?.response?.data?.message || '修改密碼失敗'
  } finally {
    saving.value = false
  }
}

// ---- Tag Management ----
const tags = ref<Tag[]>([])
const tagLoading = ref(false)
const showTagForm = ref(false)
const editingTag = ref<Tag | null>(null)
const newTagName = ref('')
const newTagCategory = ref('all')
const tagError = ref('')

// Filters
const tagSearch = ref('')
const tagFilterCategory = ref('all')

const tagCategories = [
  { value: 'all', label: '全部分類' },
  { value: 'pokemon', label: '寶可夢' },
  { value: 'yugioh', label: '遊戲王' },
  { value: 'mtg', label: '萬智牌' },
  { value: 'ultraman', label: '奧特曼' },
  { value: 'onepiece', label: '海賊王' },
  { value: 'doraemon', label: '哆啦A夢' },
  { value: 'sports', label: '體育卡' },
  { value: 'other', label: '其他' },
]

const getCategoryLabel = (cat: string) => {
  return tagCategories.find(c => c.value === cat)?.label || cat
}

const filteredTags = computed(() => {
  let result = tags.value
  if (tagFilterCategory.value !== 'all') {
    result = result.filter(t => (t.category || 'all') === tagFilterCategory.value)
  }
  if (tagSearch.value.trim()) {
    const q = tagSearch.value.toLowerCase()
    result = result.filter(t =>
      t.name.toLowerCase().includes(q) ||
      (t.category || '').toLowerCase().includes(q)
    )
  }
  return result
})

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

const openTagForm = (tag?: Tag) => {
  if (tag) {
    editingTag.value = tag
    newTagName.value = tag.name
    newTagCategory.value = tag.category || 'all'
  } else {
    editingTag.value = null
    newTagName.value = ''
    newTagCategory.value = 'all'
  }
  tagError.value = ''
  showTagForm.value = true
}

const closeTagForm = () => {
  showTagForm.value = false
  editingTag.value = null
  newTagName.value = ''
  newTagCategory.value = 'all'
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
        category: newTagCategory.value,
      })
    } else {
      await tagApi.createTag({
        name: newTagName.value.trim(),
        type: 'general',
        category: newTagCategory.value,
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
</script>

<template>
  <div class="settings-page">
    <!-- Tab bar -->
    <div class="tab-bar">
      <button class="tab-btn" :class="{ active: activeTab === 'general' }" @click="activeTab = 'general'">
        ⚙️ 平台設定
      </button>
      <button class="tab-btn" :class="{ active: activeTab === 'tags' }" @click="activeTab = 'tags'">
        🏷️ 標籤管理
      </button>
    </div>

    <!-- ===== General Settings Tab ===== -->
    <template v-if="activeTab === 'general'">
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

      <div class="settings-card">
        <h3 class="section-title">🔐 修改密碼</h3>
        <div class="form-grid">
          <div class="form-group">
            <label>當前密碼</label>
            <input v-model="passwordData.currentPassword" type="password" />
          </div>
          <div class="form-group">
            <label>新密碼</label>
            <input v-model="passwordData.newPassword" type="password" />
          </div>
          <div class="form-group">
            <label>確認新密碼</label>
            <input v-model="passwordData.confirmPassword" type="password" @keyup.enter="handlePasswordChange" />
          </div>
        </div>
        <div v-if="passwordError" class="error-text">{{ passwordError }}</div>
        <div v-if="passwordSuccess" class="success-text">{{ passwordSuccess }}</div>
        <div class="actions">
          <button @click="handlePasswordChange" class="btn-save" :disabled="saving">
            {{ saving ? '處理中...' : '修改密碼' }}
          </button>
        </div>
      </div>

      <div class="actions">
        <button @click="handleSave" class="btn-save" :disabled="saving">
          {{ saving ? '儲存中...' : '儲存設置' }}
        </button>
      </div>
    </template>

    <!-- ===== Tag Management Tab ===== -->
    <template v-if="activeTab === 'tags'">
      <div class="settings-card">
        <div class="section-header">
          <div>
            <h3 class="section-title">標籤管理</h3>
            <p class="section-desc">管理商品標籤，可按分類篩選或關鍵字搜尋</p>
          </div>
          <button class="btn-add" @click="openTagForm()">+ 新增標籤</button>
        </div>

        <!-- Filters -->
        <div class="tag-filters">
          <input
            v-model="tagSearch"
            type="text"
            class="tag-search"
            placeholder="🔍 搜尋標籤名稱..."
          />
          <select v-model="tagFilterCategory" class="tag-filter-select">
            <option v-for="cat in tagCategories" :key="cat.value" :value="cat.value">
              {{ cat.label }}
            </option>
          </select>
          <span class="tag-count">共 {{ filteredTags.length }} 個標籤</span>
        </div>

        <!-- Loading -->
        <div v-if="tagLoading" class="loading-state">
          <div class="spinner"></div>
          <p>載入中...</p>
        </div>

        <!-- Tag table -->
        <div v-else class="tag-table-wrap">
          <table class="tag-table">
            <thead>
              <tr>
                <th style="width: 50px">#</th>
                <th>標籤名稱</th>
                <th>歸屬分類</th>
                <th>排序</th>
                <th style="width: 90px">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredTags.length === 0">
                <td colspan="5" class="empty-row">暫無符合條件的標籤</td>
              </tr>
              <tr v-for="(tag, idx) in filteredTags" :key="tag.id">
                <td class="td-idx">{{ idx + 1 }}</td>
                <td class="td-name">
                  <span class="tag-dot" :style="{ backgroundColor: tag.color || '#818cf8' }"></span>
                  {{ tag.name }}
                </td>
                <td class="td-category">
                  <span class="cat-badge">{{ getCategoryLabel(tag.category || 'all') }}</span>
                </td>
                <td class="td-sort">{{ tag.sortOrder }}</td>
                <td class="td-actions">
                  <button class="btn-icon" @click="openTagForm(tag)" title="編輯">✏️</button>
                  <button class="btn-icon btn-danger" @click="handleDeleteTag(tag)" title="刪除">🗑️</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Tag create/edit modal -->
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
              placeholder="例如：S10a、1st Edition..."
              @keyup.enter="handleSaveTag"
            />
          </div>
          <div class="form-group">
            <label>歸屬分類</label>
            <select v-model="newTagCategory" class="form-select">
              <option v-for="cat in tagCategories" :key="cat.value" :value="cat.value">
                {{ cat.label }}
              </option>
            </select>
            <p class="form-hint">選擇「全部分類」則所有商品類別均可使用此標籤</p>
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
.settings-page { display: flex; flex-direction: column; gap: var(--space-6); }

/* Tab bar */
.tab-bar { display: flex; gap: var(--space-2); border-bottom: 2px solid var(--border); }
.tab-btn {
  padding: var(--space-3) var(--space-6);
  border: none; background: transparent;
  color: var(--text-secondary);
  font-size: var(--text-sm); font-weight: 500;
  cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px;
  transition: all 0.2s;
}
.tab-btn:hover { color: var(--text-primary); }
.tab-btn.active { color: var(--primary); border-bottom-color: var(--primary); font-weight: 600; }

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

/* Tag filters */
.tag-filters { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-4); flex-wrap: wrap; }
.tag-search { flex: 1; min-width: 180px; padding: var(--space-2) var(--space-4); background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-lg); color: var(--text-primary); font-size: var(--text-sm); }
.tag-search:focus { outline: none; border-color: var(--primary); }
.tag-filter-select { padding: var(--space-2) var(--space-3); background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-lg); color: var(--text-primary); font-size: var(--text-sm); cursor: pointer; }
.tag-count { font-size: var(--text-sm); color: var(--text-muted); white-space: nowrap; }

/* Tag table */
.tag-table-wrap { overflow-x: auto; }
.tag-table { width: 100%; border-collapse: collapse; }
.tag-table th { text-align: left; padding: var(--space-3) var(--space-4); font-size: var(--text-xs); font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border); }
.tag-table td { padding: var(--space-3) var(--space-4); font-size: var(--text-sm); color: var(--text-primary); border-bottom: 1px solid var(--border); }
.tag-table tr:hover td { background: rgba(99, 102, 241, 0.05); }
.empty-row { text-align: center; color: var(--text-muted); padding: var(--space-8) 0; }

.td-idx { color: var(--text-muted); }
.td-name { display: flex; align-items: center; gap: var(--space-2); font-weight: 500; }
.tag-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.cat-badge { padding: 2px 10px; border-radius: var(--radius-full); font-size: var(--text-xs); background: var(--bg-elevated); color: var(--text-secondary); border: 1px solid var(--border); }
.td-sort { color: var(--text-muted); }
.td-actions { display: flex; gap: var(--space-1); }

/* Buttons */
.btn-add { padding: var(--space-2) var(--space-4); background: var(--primary); border: none; border-radius: var(--radius-lg); color: white; font-weight: 600; cursor: pointer; font-size: var(--text-sm); }
.btn-add:hover { opacity: 0.9; }
.btn-icon { padding: 4px 8px; background: transparent; border: none; cursor: pointer; font-size: 14px; opacity: 0.6; transition: opacity 0.2s; }
.btn-icon:hover { opacity: 1; }
.btn-icon.btn-danger:hover { color: var(--danger); }

/* Loading */
.loading-state { display: flex; flex-direction: column; align-items: center; gap: var(--space-2); padding: var(--space-6); }
.spinner { width: 32px; height: 32px; border: 3px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Modal */
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
.success-text { color: #10b981; font-size: var(--text-sm); margin-top: var(--space-2); }
.form-hint { font-size: var(--text-xs); color: var(--text-muted); margin-top: var(--space-1); }

@media (max-width: 640px) {
  .form-grid { grid-template-columns: 1fr; }
  .tag-filters { flex-direction: column; align-items: stretch; }
  .tag-search, .tag-filter-select { width: 100%; }
}
</style>