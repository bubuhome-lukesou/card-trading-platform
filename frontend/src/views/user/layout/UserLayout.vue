<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { cartApi } from '@/api/cart'
import { ref, onMounted } from 'vue'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const cartCount = ref(0)

const navItems = [
  { path: '/user', name: 'dashboard', icon: '👤', label: 'user.dashboard' },
  { path: '/user/orders', name: 'orders', icon: '📦', label: 'user.myOrders' },
  { path: '/user/cart', name: 'cart', icon: '🛒', label: '购物车' },
  { path: '/user/favorites', name: 'favorites', icon: '❤️', label: 'user.myFavorites' },
  { path: '/user/wallet', name: 'wallet', icon: '💳', label: 'user.wallet' },
  { path: '/user/settings', name: 'settings', icon: '⚙️', label: 'user.settings' },
]

const isActive = (path: string) => route.path === path

const handleLogout = async () => {
  await authStore.logout()
  router.push('/')
}

const loadCartCount = async () => {
  try {
    const res = await cartApi.getCart()
    cartCount.value = res.data?.length || 0
  } catch (e) {
    cartCount.value = 0
  }
}

onMounted(() => {
  loadCartCount()
})
</script>

<template>
  <div class="user-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="user-avatar">
          {{ authStore.user?.nickname?.charAt(0).toUpperCase() || 'U' }}
        </div>
        <div class="user-info">
          <span class="user-name">{{ authStore.user?.nickname || 'User' }}</span>
          <span class="user-email">{{ authStore.user?.email }}</span>
        </div>
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
          <span v-if="item.name === 'cart' && cartCount > 0" class="cart-badge">
            {{ cartCount > 99 ? '99+' : cartCount }}
          </span>
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
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.user-layout {
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
}

.sidebar-header {
  padding: var(--space-6);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--primary-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  color: white;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
}

.user-email {
  font-size: var(--text-xs);
  color: var(--text-muted);
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

.cart-badge {
  margin-left: auto;
  background: var(--danger);
  color: white;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
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
</style>
