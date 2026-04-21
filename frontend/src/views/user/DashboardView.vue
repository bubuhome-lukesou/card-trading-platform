<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Package, Heart, Wallet, Settings } from 'lucide-vue-next'

const { t } = useI18n()
const authStore = useAuthStore()

const menuItems = [
  { to: '/user/orders', icon: Package, labelKey: 'user.myOrders' },
  { to: '/user/favorites', icon: Heart, labelKey: 'user.myFavorites' },
  { to: '/user/wallet', icon: Wallet, labelKey: 'user.wallet' },
  { to: '/user/settings', icon: Settings, labelKey: 'user.settings' }
]
</script>

<template>
  <div class="dashboard">
    <div class="container">
      <h1 class="page-title">{{ t('user.dashboard') }}</h1>

      <div class="welcome-card">
        <h2>Welcome, {{ authStore.user?.nickname || 'User' }}!</h2>
        <p>Email: {{ authStore.user?.email }}</p>
      </div>

      <div class="menu-grid">
        <RouterLink v-for="item in menuItems" :key="item.labelKey" :to="item.to" class="menu-card">
          <component :is="item.icon" class="menu-icon" />
          <span>{{ t(item.labelKey) }}</span>
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.dashboard {
  padding: var(--space-8) 0 var(--space-16);
}
.page-title {
  font-size: var(--text-3xl);
  font-weight: 700;
  margin-bottom: var(--space-8);
}
.welcome-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: var(--space-8);
  margin-bottom: var(--space-8);

  h2 {
    font-size: var(--text-xl);
    margin-bottom: var(--space-2);
  }
  p {
    color: var(--text-muted);
  }
}
.menu-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
}
.menu-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-8);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  text-decoration: none;
  color: var(--text-secondary);
  transition: all var(--transition-base);

  &:hover {
    border-color: var(--primary);
    color: var(--primary);
    transform: translateY(-2px);
  }

  .menu-icon {
    width: 32px;
    height: 32px;
  }
  span {
    font-weight: 500;
  }
}
</style>
