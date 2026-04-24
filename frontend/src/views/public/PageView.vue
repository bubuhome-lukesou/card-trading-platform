<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { pagesApi } from '@/api/pages'

const { t, locale } = useI18n()
const route = useRoute()

const loading = ref(true)
const pageData = ref<any>(null)

const pageTitle = computed(() => {
  if (!pageData.value) return ''
  return locale.value === 'zh'
    ? pageData.value.titleZh || pageData.value.titleEn
    : pageData.value.titleEn || pageData.value.titleZh
})

const pageContent = computed(() => {
  if (!pageData.value) return ''
  return locale.value === 'zh'
    ? pageData.value.contentZh || pageData.value.contentEn
    : pageData.value.contentEn || pageData.value.contentZh
})

onMounted(async () => {
  try {
    const type = route.path.replace('/', '') // help, contact, or faq
    const response = await pagesApi.getPage(type, locale.value)
    pageData.value = response.data
  } catch (error) {
    console.error('Failed to load page:', error)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="page-view">
    <div class="container">
      <div v-if="loading" class="loading-state">
        <p>{{ t('common.loading') || '加载中...' }}</p>
      </div>
      <div v-else-if="pageData" class="page-content">
        <h1 class="page-title">{{ pageTitle }}</h1>
        <div class="page-body" v-html="pageContent"></div>
      </div>
      <div v-else class="error-state">
        <p>{{ t('common.error') || '页面不存在' }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.page-view {
  padding: var(--space-12) 0 var(--space-16);
  min-height: 60vh;
}

.page-content {
  max-width: 800px;
  margin: 0 auto;
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  padding: var(--space-8);
}

.page-title {
  font-size: var(--text-3xl);
  font-weight: 700;
  margin-bottom: var(--space-6);
  color: var(--text-primary);
}

.page-body {
  color: var(--text-secondary);
  line-height: 1.8;

  :deep(h2) {
    font-size: var(--text-xl);
    font-weight: 600;
    margin: var(--space-6) 0 var(--space-3);
    color: var(--text-primary);
  }

  :deep(h3) {
    font-size: var(--text-lg);
    font-weight: 600;
    margin: var(--space-4) 0 var(--space-2);
    color: var(--text-primary);
  }

  :deep(p) {
    margin-bottom: var(--space-4);
  }

  :deep(ul), :deep(ol) {
    margin: var(--space-4) 0;
    padding-left: var(--space-6);
  }

  :deep(li) {
    margin-bottom: var(--space-2);
  }
}

.loading-state,
.error-state {
  text-align: center;
  padding: var(--space-16);
  color: var(--text-muted);
}
</style>
