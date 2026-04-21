<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  Home,
  ShoppingBag,
  Gavel,
  User,
  Store,
  Settings,
  LogOut,
  Menu,
  X,
  Globe,
  Bell
} from 'lucide-vue-next'

const { t, locale } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const mobileMenuOpen = ref(false)
const userMenuOpen = ref(false)

const toggleLocale = () => {
  locale.value = locale.value === 'zh' ? 'en' : 'zh'
}

const navLinks = computed(() => [
  { to: '/', name: 'home', icon: Home },
  { to: '/marketplace', name: 'marketplace', icon: ShoppingBag },
  { to: '/auctions', name: 'auctions', icon: Gavel }
])

const userMenuItems = computed(() => {
  const items: Array<{ to?: string; action?: string; name: string; icon: any }> = [
    { to: '/user', name: t('user.dashboard'), icon: User }
  ]

  if (authStore.isSeller) {
    items.push({ to: '/seller', name: t('seller.dashboard'), icon: Store })
  }

  if (authStore.isAdmin) {
    items.push({ to: '/admin', name: t('admin.dashboard'), icon: Settings })
  }

  items.push(
    { to: '/user/settings', name: t('user.settings'), icon: Settings },
    { action: 'logout', name: t('nav.logout'), icon: LogOut }
  )

  return items
})

const handleLogout = async () => {
  authStore.logout()
  userMenuOpen.value = false
  router.push('/')
}

const closeMobileMenu = () => {
  mobileMenuOpen.value = false
}
</script>

<template>
  <div class="app-layout">
    <!-- Navigation -->
    <nav class="navbar">
      <div class="navbar-content">
        <!-- Logo -->
        <RouterLink to="/" class="navbar-brand">
          <div class="brand-logo">🃏</div>
          <span class="brand-text">Card Quest</span>
        </RouterLink>

        <!-- Desktop Nav Links -->
        <div class="navbar-links">
          <RouterLink
            v-for="link in navLinks"
            :key="link.name"
            :to="link.to"
            class="nav-link"
          >
            <component :is="link.icon" class="nav-icon" />
            <span>{{ t(`nav.${link.name}`) }}</span>
          </RouterLink>
        </div>

        <!-- Right Section -->
        <div class="navbar-right">
          <!-- Language Toggle -->
          <button class="lang-btn" @click="toggleLocale">
            <Globe class="icon" />
            <span>{{ locale === 'zh' ? 'EN' : '中' }}</span>
          </button>

          <!-- Auth Section -->
          <template v-if="!authStore.isAuthenticated">
            <RouterLink to="/login" class="btn btn-ghost btn-sm">
              {{ t('nav.login') }}
            </RouterLink>
            <RouterLink to="/register" class="btn btn-primary btn-sm">
              {{ t('nav.register') }}
            </RouterLink>
          </template>

          <template v-else>
            <!-- Notifications -->
            <button class="btn btn-icon btn-ghost">
              <Bell class="icon" />
            </button>

            <!-- User Menu -->
            <div class="user-menu" @click.stop>
              <button class="user-menu-trigger" @click="userMenuOpen = !userMenuOpen">
                <div class="user-avatar">
                  {{ authStore.user?.nickname?.charAt(0) || 'U' }}
                </div>
              </button>

              <Transition name="dropdown">
                <div v-if="userMenuOpen" class="user-menu-dropdown" @click.stop>
                  <div class="user-menu-header">
                    <div class="user-avatar-lg">
                      {{ authStore.user?.nickname?.charAt(0) || 'U' }}
                    </div>
                    <div class="user-info">
                      <span class="user-name">{{ authStore.user?.nickname }}</span>
                      <span class="user-email">{{ authStore.user?.email }}</span>
                    </div>
                  </div>

                  <div class="user-menu-items">
                    <template v-for="item in userMenuItems" :key="item.name">
                      <RouterLink
                        v-if="item.to"
                        :to="item.to"
                        class="user-menu-item"
                        @click="userMenuOpen = false"
                      >
                        <component :is="item.icon" class="icon" />
                        <span>{{ item.name }}</span>
                      </RouterLink>
                      <button
                        v-else-if="item.action === 'logout'"
                        class="user-menu-item"
                        @click="handleLogout"
                      >
                        <component :is="item.icon" class="icon" />
                        <span>{{ item.name }}</span>
                      </button>
                    </template>
                  </div>
                </div>
              </Transition>
            </div>
          </template>

          <!-- Mobile Menu Toggle -->
          <button class="mobile-menu-toggle" @click="mobileMenuOpen = !mobileMenuOpen">
            <X v-if="mobileMenuOpen" class="icon" />
            <Menu v-else class="icon" />
          </button>
        </div>
      </div>

      <!-- Mobile Menu -->
      <Transition name="slide">
        <div v-if="mobileMenuOpen" class="mobile-menu">
          <RouterLink
            v-for="link in navLinks"
            :key="link.name"
            :to="link.to"
            class="mobile-nav-link"
            @click="closeMobileMenu"
          >
            <component :is="link.icon" class="icon" />
            <span>{{ t(`nav.${link.name}`) }}</span>
          </RouterLink>

          <div class="mobile-menu-divider" />

          <template v-if="!authStore.isAuthenticated">
            <RouterLink to="/login" class="mobile-nav-link" @click="closeMobileMenu">
              {{ t('nav.login') }}
            </RouterLink>
            <RouterLink to="/register" class="mobile-nav-link" @click="closeMobileMenu">
              {{ t('nav.register') }}
            </RouterLink>
          </template>

          <template v-else>
            <RouterLink
              v-for="item in userMenuItems.filter(i => i.to)"
              :key="item.name"
              :to="item.to!"
              class="mobile-nav-link"
              @click="closeMobileMenu"
            >
              <component :is="item.icon" class="icon" />
              <span>{{ item.name }}</span>
            </RouterLink>
          </template>
        </div>
      </Transition>
    </nav>

    <!-- Main Content -->
    <main class="main-content">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="footer">
      <div class="container">
        <div class="footer-content">
          <div class="footer-brand">
            <span class="brand-text gradient-text">Card Quest</span>
            <p class="footer-tagline">{{ t('app.tagline') }}</p>
          </div>

          <div class="footer-links">
            <div class="footer-section">
              <h4>{{ t('nav.home') }}</h4>
              <RouterLink to="/marketplace">{{ t('nav.marketplace') }}</RouterLink>
              <RouterLink to="/auctions">{{ t('nav.auctions') }}</RouterLink>
            </div>

            <div class="footer-section">
              <h4>{{ t('nav.userCenter') }}</h4>
              <RouterLink to="/user/orders">{{ t('user.myOrders') }}</RouterLink>
              <RouterLink to="/user/wallet">{{ t('user.wallet') }}</RouterLink>
            </div>

            <div class="footer-section">
              <h4>{{ t('nav.sellerCenter') }}</h4>
              <RouterLink to="/seller">{{ t('seller.dashboard') }}</RouterLink>
              <RouterLink to="/seller/products">{{ t('seller.products') }}</RouterLink>
            </div>
          </div>
        </div>

        <div class="footer-bottom">
          <p>© 2026 Card Quest. All rights reserved.</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped lang="scss">
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

// Navbar
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: rgba(15, 15, 26, 0.9);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
  z-index: var(--z-sticky);

  &-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 100%;
    max-width: var(--container-max);
    margin: 0 auto;
    padding: 0 var(--space-6);
  }

  &-brand {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    text-decoration: none;
  }

  &-links {
    display: flex;
    align-items: center;
    gap: var(--space-1);

    @media (max-width: 768px) {
      display: none;
    }
  }

  &-right {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }
}

.brand-logo {
  width: 40px;
  height: 40px;
  background: var(--primary-gradient);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.brand-text {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 700;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-weight: 500;
  transition: all var(--transition-fast);
  text-decoration: none;

  &:hover,
  &.router-link-active {
    color: var(--text-primary);
    background: rgba(102, 126, 234, 0.1);
  }

  .nav-icon {
    width: 18px;
    height: 18px;
  }
}

.lang-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  color: var(--text-secondary);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    border-color: var(--primary);
    color: var(--primary);
  }

  .icon {
    width: 16px;
    height: 16px;
  }
}

.user-menu {
  position: relative;

  &-trigger {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
  }

  &-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 260px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    padding: var(--space-4);
    box-shadow: var(--shadow-xl);
  }

  &-header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding-bottom: var(--space-4);
    border-bottom: 1px solid var(--border);
    margin-bottom: var(--space-4);
  }

  &-items {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  &-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    text-decoration: none;
    font-size: var(--text-sm);
    transition: all var(--transition-fast);
    background: none;
    border: none;
    width: 100%;
    cursor: pointer;
    text-align: left;

    &:hover {
      background: rgba(102, 126, 234, 0.1);
      color: var(--primary);
    }

    .icon {
      width: 18px;
      height: 18px;
    }
  }
}

.user-avatar {
  width: 36px;
  height: 36px;
  background: var(--primary-gradient);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: white;
  font-size: var(--text-sm);

  &-lg {
    @extend .user-avatar;
    width: 48px;
    height: 48px;
    font-size: var(--text-lg);
  }
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: 600;
  color: var(--text-primary);
}

.user-email {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.mobile-menu-toggle {
  display: none;
  background: none;
  border: none;
  color: var(--text-primary);
  cursor: pointer;
  padding: var(--space-2);

  @media (max-width: 768px) {
    display: flex;
  }

  .icon {
    width: 24px;
    height: 24px;
  }
}

.mobile-menu {
  display: none;
  flex-direction: column;
  padding: var(--space-4);
  background: var(--bg-dark);
  border-bottom: 1px solid var(--border);

  @media (max-width: 768px) {
    display: flex;
  }
}

.mobile-nav-link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  text-decoration: none;
  transition: all var(--transition-fast);

  &:hover {
    background: rgba(102, 126, 234, 0.1);
    color: var(--primary);
  }

  .icon {
    width: 20px;
    height: 20px;
  }
}

.mobile-menu-divider {
  height: 1px;
  background: var(--border);
  margin: var(--space-3) 0;
}

// Main Content
.main-content {
  flex: 1;
  padding-top: 64px;
}

// Footer
.footer {
  background: var(--bg-card);
  border-top: 1px solid var(--border);
  padding: var(--space-16) 0 var(--space-8);

  &-content {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: var(--space-12);
    margin-bottom: var(--space-12);

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
      gap: var(--space-8);
    }
  }

  &-brand {
    .footer-tagline {
      margin-top: var(--space-3);
      font-size: var(--text-sm);
      color: var(--text-muted);
    }
  }

  &-links {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-8);

    @media (max-width: 640px) {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  &-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);

    h4 {
      font-size: var(--text-sm);
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: var(--space-2);
    }

    a {
      font-size: var(--text-sm);
      color: var(--text-muted);
      transition: color var(--transition-fast);

      &:hover {
        color: var(--primary);
      }
    }
  }

  &-bottom {
    padding-top: var(--space-8);
    border-top: 1px solid var(--border);
    text-align: center;

    p {
      font-size: var(--text-sm);
      color: var(--text-muted);
    }
  }
}

// Transitions
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
