<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const sidebarOpen = ref(false)

const navItems = [
  { path: '/seller', name: 'dashboard', icon: '📊', label: 'seller.dashboard' },
  { path: '/seller/products', name: 'products', icon: '📦', label: 'seller.products' },
  { path: '/seller/auctions', name: 'auctions', icon: '🔨', label: 'seller.auctions' },
  { path: '/seller/orders', name: 'orders', icon: '📋', label: 'seller.orders' },
  { path: '/seller/earnings', name: 'earnings', icon: '💰', label: 'seller.earnings' },
]

const isActive = (path: string) => route.path === path

const handleLogout = async () => {
  sidebarOpen.value = false
  await authStore.logout()
  router.push('/')
}
</script>

<template>
  <div class="seller-layout">
    <!-- Desktop Sidebar -->
    <aside class="sidebar sidebar-desktop">
      <div class="sidebar-header">
        <router-link to="/" class="logo">🃏 Card Quest</router-link>
        <span class="badge">Seller</span>
      </div>
      <nav class="sidebar-nav">
        <router-link v-for="item in navItems" :key="item.path" :to="item.path" class="nav-item" :class="{ active: isActive(item.path) }">
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

    <!-- Mobile Bottom Nav -->
    <nav class="mobile-nav">
      <button class="mobile-nav-toggle" @click="sidebarOpen = !sidebarOpen" :class="{ active: sidebarOpen }">
        <span class="toggle-icon">{{ sidebarOpen ? '✕' : '☰' }}</span>
        <span class="toggle-label">{{ sidebarOpen ? '關閉' : '選單' }}</span>
      </button>
      <div class="mobile-nav-icons">
        <router-link v-for="item in navItems" :key="item.path" :to="item.path" class="mobile-nav-icon" :class="{ active: isActive(item.path) }">
          <span>{{ item.icon }}</span>
        </router-link>
      </div>
    </nav>

    <!-- Mobile Expanded Panel -->
    <Teleport to="body">
      <div v-if="sidebarOpen" class="mobile-panel-overlay" @click="sidebarOpen = false">
        <div class="mobile-panel" @click.stop>
          <div class="mobile-panel-header">
            <router-link to="/" class="logo" @click="sidebarOpen = false">🃏 Card Quest</router-link>
            <span class="badge">Seller</span>
          </div>
          <div class="mobile-nav-grid">
            <router-link
              v-for="item in navItems"
              :key="item.path"
              :to="item.path"
              class="mobile-nav-item"
              :class="{ active: isActive(item.path) }"
              @click="sidebarOpen = false"
            >
              <span class="mobile-nav-item-icon">{{ item.icon }}</span>
              <span class="mobile-nav-item-label">{{ t(item.label) }}</span>
            </router-link>
          </div>
          <div class="mobile-panel-footer">
            <router-link to="/" class="mobile-nav-item" @click="sidebarOpen = false">
              <span class="mobile-nav-item-icon">🏠</span>
              <span class="mobile-nav-item-label">{{ t('nav.home') }}</span>
            </router-link>
            <button class="mobile-nav-item logout" @click="handleLogout">
              <span class="mobile-nav-item-icon">🚪</span>
              <span class="mobile-nav-item-label">{{ t('nav.logout') }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Main Content -->
    <main class="main-content">
      <header class="content-header">
        <h1 class="page-title">{{ t(`seller.${route.name?.toString().replace('Seller', '').toLowerCase()}`) }}</h1>
        <div class="header-actions"></div>
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

/* Desktop Sidebar */
.sidebar-desktop {
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

/* Desktop main content */
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

.content-body {}

/* =====================
   MOBILE NAVIGATION
   ===================== */
@media (max-width: 767px) {
  .sidebar-desktop {
    display: none;
  }

  .main-content {
    margin-left: 0;
    padding: var(--space-4);
    padding-bottom: calc(var(--space-4) + 64px);
  }

  .content-header {
    margin-bottom: var(--space-4);
  }

  .page-title {
    font-size: var(--text-xl);
  }
}

/* Mobile Bottom Nav Bar */
.mobile-nav {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 200;
  background: var(--bg-card);
  border-top: 1px solid var(--border);
  padding: var(--space-2) var(--space-3);
  padding-bottom: calc(var(--space-2) + env(safe-area-inset-bottom, 0px));
  gap: var(--space-2);
  align-items: center;
}

@media (max-width: 767px) {
  .mobile-nav {
    display: flex;
  }
}

.mobile-nav-toggle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--space-2);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  min-width: 48px;
  transition: all var(--transition-fast);
}

.mobile-nav-toggle.active,
.mobile-nav-toggle:active {
  background: var(--primary-gradient);
  border-color: transparent;
}

.toggle-icon {
  font-size: 18px;
  line-height: 1;
}

.toggle-label {
  font-size: 10px;
  color: var(--text-muted);
}

.mobile-nav-toggle.active .toggle-label {
  color: white;
}

.mobile-nav-icons {
  display: flex;
  flex: 1;
  justify-content: space-around;
  gap: var(--space-1);
  overflow: hidden;
}

.mobile-nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  font-size: 22px;
  text-decoration: none;
  transition: all var(--transition-fast);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  flex-shrink: 0;
}

.mobile-nav-icon.active {
  background: var(--primary-gradient);
  border-color: transparent;
  transform: scale(1.1);
}

/* Mobile Expanded Panel */
.mobile-panel-overlay {
  display: none;
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}

@media (max-width: 767px) {
  .mobile-panel-overlay {
    display: block;
  }
}

.mobile-panel {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--bg-card);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  padding: var(--space-4);
  padding-bottom: calc(var(--space-4) + env(safe-area-inset-bottom, 0px));
  max-height: 80vh;
  overflow-y: auto;
  animation: slideUp 0.25s ease-out;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.mobile-panel-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--border);
  margin-bottom: var(--space-4);
}

.mobile-nav-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.mobile-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-3);
  border-radius: var(--radius-lg);
  text-decoration: none;
  color: var(--text-secondary);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  transition: all var(--transition-fast);
  cursor: pointer;
  font-size: var(--text-sm);
}

.mobile-nav-item:active {
  transform: scale(0.95);
}

.mobile-nav-item.active {
  background: var(--primary-gradient);
  border-color: transparent;
  color: white;
}

.mobile-nav-item.logout {
  color: var(--danger);
}

.mobile-nav-item.logout:active {
  background: var(--danger);
  border-color: transparent;
  color: white;
}

.mobile-nav-item-icon {
  font-size: 24px;
  line-height: 1;
}

.mobile-nav-item-label {
  font-size: 11px;
  font-weight: 500;
  text-align: center;
  line-height: 1.2;
}

.mobile-panel-footer {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--space-2);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border);
}
</style>
