<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { RouterView } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'

const route = useRoute()
// 商家/管理員/用戶後台唔顯示公共頂部導覽列同底部資訊框（後台自有 sidebar 導航；Luke 2026-11-02 用戶後台同款）
const hideChrome = computed(
  () => route.path.startsWith('/seller') || route.path.startsWith('/admin') || route.path.startsWith('/user')
)
</script>

<template>
  <div :class="['app-shell', { 'hide-chrome': hideChrome }]">
    <AppLayout>
      <RouterView v-slot="{ Component }">
        <component :is="Component" />
      </RouterView>
    </AppLayout>
  </div>
</template>

<style>
/* 後台路徑：AppLayout 內的公共 header / footer 直接唔渲染 */
.hide-chrome .header,
.hide-chrome .footer {
  display: none !important;
}
</style>