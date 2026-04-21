<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const navItems = [
  { path: '/seller', name: 'dashboard', icon: '📊', label: 'seller.dashboard' },
  { path: '/seller/products', name: 'products', icon: '📦', label: 'seller.products' },
  { path: '/seller/auctions', name: 'auctions', icon: '🔨', label: 'seller.auctions' },
  { path: '/seller/orders', name: 'orders', icon: '📋', label: 'seller.orders' },
  { path: '/seller/earnings', name: 'earnings', icon: '💰', label: 'seller.earnings' },
]

const isActive = (path: string) => route.path === path

const handleLogout = async () => {
  await authStore.logout()
  router.push('/')
}
</script>

<template>
  <div class="seller-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <router-link to="/" class="logo">
          🃏 Card Quest
        </router-link>
        <span class="badge">Seller</span>
      </div>

      <nav class="sidebar-nav">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-label">{{ t(item.label) }}</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <router-link to="/" class="nav-item">
          <span class="nav-icon">🏠</span>
          <span class="nav-label">{{ t('nav.home') }}</span>
        </router-link>
        <button @click="handleLogout" class="nav-item logout">
          <span class="nav-icon">🚪</span>
          <span class="nav-label">{{ t('nav.logout') }}</span>
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <header class="content-header">
        <h1 class="page-title">{{ t(`seller.${route.name?.toString().toLowerCase()}`) }}</h1>
        <div class="header-actions">
          <router-link v-if="route.path.includes('/products')" to="/seller/products?action=create" class="btn-primary">
            + {{ t('product.create') }}
          </router-link>
          <router-link v-if="route.path.includes('/auctions')" to="/seller/auctions?action=create" class="btn-primary">
            + 创建拍卖
          </router-link>
        </div>
      </header>

      <div class="content-body">
        <router-view />
      </div>
    </main>
  </div>
</template>

<style scoped>
.seller-layout {
  display: flex;
  min-height: 100vh;
  background: var(--bg-dark);
}

.sidebar {
  width: 240px;
  background: var(--bg-card);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 100;
}

.sidebar-header {
  padding: var(--space-6);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.logo {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--text-primary);
  text-decoration: none;
}

.badge {
  font-size: var(--text-xs);
  padding: 2px 8px;
  background: var(--primary-gradient);
  border-radius: var(--radius-full);
  color: white;
}

.sidebar-nav {
  flex: 1;
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.sidebar-footer {
  padding: var(--space-4);
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  color: var(--text-secondary);
  text-decoration: none;
  transition: all var(--transition-fast);
  cursor: pointer;
  border: none;
  background: none;
  width: 100%;
  font-size: var(--text-sm);
}

.nav-item:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.nav-item.active {
  background: var(--primary-gradient);
  color: white;
}

.nav-icon {
  font-size: 18px;
  width: 24px;
  text-align: center;
}

.nav-label {
  font-weight: 500;
}

.nav-item.logout:hover {
  background: var(--danger);
  color: white;
}

.main-content {
  flex: 1;
  margin-left: 240px;
  padding: var(--space-6);
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-6);
}

.page-title {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--text-primary);
}

.header-actions {
  display: flex;
  gap: var(--space-3);
}

.btn-primary {
  padding: var(--space-3) var(--space-6);
  background: var(--primary-gradient);
  border-radius: var(--radius-lg);
  color: white;
  font-weight: 600;
  text-decoration: none;
  transition: all var(--transition-fast);
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-2px);
  box-shadow: 0 4px 16px #667eea66;
}

.content-body {
  /* Content styles */
}
</style>
