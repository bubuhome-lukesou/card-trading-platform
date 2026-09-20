<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { RouterView } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'

const route = useRoute()
// 商家/管理員後台唔顯示公共頂部導覽列同底部資訊框（後台自有 sidebar 導航）
const hideChrome = computed(() => route.path.startsWith('/seller') || route.path.startsWith('/admin'))
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