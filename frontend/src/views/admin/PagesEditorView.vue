<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { pagesApi } from '@/api/pages'

const { t } = useI18n()

interface Page {
  type: string
  titleZh: string
  titleEn: string
  contentZh: string
  contentEn: string
}

const pages = ref<Page[]>([])
const activePage = ref<string>('help')
const loading = ref(false)
const saving = ref(false)

const formData = ref({
  titleZh: '',
  titleEn: '',
  contentZh: '',
  contentEn: '',
})

onMounted(async () => {
  await loadPages()
})

const loadPages = async () => {
  loading.value = true
  try {
    const response = await pagesApi.getAllPages()
    pages.value = response.data
    if (pages.value.length > 0) {
      selectPage(pages.value[0].type)
    } else {
      // Load defaults
      selectPage('help')
    }
  } catch (error) {
    console.error('Failed to load pages:', error)
  } finally {
    loading.value = false
  }
}

const selectPage = async (type: string) => {
  activePage.value = type
  const response = await pagesApi.getPage(type, 'zh')
  const data = response.data
  formData.value = {
    titleZh: data.titleZh || '',
    titleEn: data.titleEn || '',
    contentZh: data.contentZh || '',
    contentEn: data.contentEn || '',
  }
}

const savePage = async () => {
  saving.value = true
  try {
    await pagesApi.updatePage({
      type: activePage.value,
      ...formData.value,
    })
    alert(t('admin.pages.saveSuccess') || '保存成功')
  } catch (error) {
    console.error('Failed to save:', error)
    alert(t('admin.pages.saveFailed') || '保存失败')
  } finally {
    saving.value = false
  }
}

const pageLabels: Record<string, string> = {
  help: '帮助中心',
  contact: '联系我们',
  faq: '常见问题',
}
</script>

<template>
  <div class="pages-editor">
    <div class="editor-header">
      <h1>{{ t('admin.pages.title') || '页面管理' }}</h1>
    </div>

    <div class="editor-layout">
      <!-- Sidebar -->
      <div class="editor-sidebar">
        <div
          v-for="page in pages.length > 0 ? pages : [{ type: 'help' }, { type: 'contact' }, { type: 'faq' }]"
          :key="page.type"
          class="page-item"
          :class="{ active: activePage === page.type }"
          @click="selectPage(page.type)"
        >
          {{ pageLabels[page.type] || page.type }}
        </div>
      </div>

      <!-- Editor -->
      <div class="editor-main">
        <div v-if="loading" class="loading">加载中...</div>
        <template v-else>
          <div class="form-group">
            <label>标题 (中文)</label>
            <input v-model="formData.titleZh" type="text" placeholder="中文标题" />
          </div>
          <div class="form-group">
            <label>Title (English)</label>
            <input v-model="formData.titleEn" type="text" placeholder="English title" />
          </div>
          <div class="form-group">
            <label>内容 (中文) - 支持 HTML</label>
            <textarea v-model="formData.contentZh" rows="10" placeholder="支持 HTML 格式"></textarea>
          </div>
          <div class="form-group">
            <label>Content (English) - HTML supported</label>
            <textarea v-model="formData.contentEn" rows="10" placeholder="HTML format supported"></textarea>
          </div>
          <div class="form-actions">
            <button class="btn btn-primary" :disabled="saving" @click="savePage">
              {{ saving ? '保存中...' : '保存更改' }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.pages-editor {
  padding: var(--space-6);
}

.editor-header {
  margin-bottom: var(--space-6);
  h1 {
    font-size: var(--text-2xl);
    font-weight: 700;
  }
}

.editor-layout {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: var(--space-6);
}

.editor-sidebar {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-3);
}

.page-item {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s;

  &:hover {
    background: var(--bg-dark);
  }

  &.active {
    background: var(--primary);
    color: white;
  }
}

.editor-main {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
}

.form-group {
  margin-bottom: var(--space-5);

  label {
    display: block;
    font-weight: 600;
    margin-bottom: var(--space-2);
    color: var(--text-primary);
  }

  input,
  textarea {
    width: 100%;
    padding: var(--space-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--bg-dark);
    color: var(--text-primary);
    font-family: inherit;

    &:focus {
      outline: none;
      border-color: var(--primary);
    }
  }

  textarea {
    resize: vertical;
    font-family: monospace;
  }
}

.form-actions {
  margin-top: var(--space-6);
}

.loading {
  text-align: center;
  padding: var(--space-12);
  color: var(--text-muted);
}
</style>
