<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { RouterView } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'

const route = useRoute()
// 後台路徑唔顯示公共頂部導覽列同底部資訊框（後台自有 sidebar 導航；Luke 2026-11-02 用戶後台同款）
// ❗ 公開頁豁免（D10 修復 11/2）：/seller/:id 商家介紹頁、/seller/apply 商家申請 — 佢哋以 /seller 開頭但係公開頁，要有 header/footer
const isSellerPublicPage = (p: string) =>
  p === '/seller/apply' || /^\/seller\/[^/]+$/.test(p)
const hideChrome = computed(() => {
  if (route.path.startsWith('/admin') || route.path.startsWith('/user')) return true
  if (route.path.startsWith('/seller')) return !isSellerPublicPage(route.path)
  return false
})
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