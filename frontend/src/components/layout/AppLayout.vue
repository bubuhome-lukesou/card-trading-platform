<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  Search,
  Bell,
  ShoppingCart,
  User,
  Menu,
  X,
  Globe,
  LogOut,
  Store,
  Settings,
  Package
} from 'lucide-vue-next'

const { t, locale } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const mobileMenuOpen = ref(false)
const userMenuOpen = ref(false)
const searchQuery = ref('')

const toggleLocale = () => {
  locale.value = locale.value === 'zh' ? 'en' : 'zh'
}

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    router.push(`/marketplace?search=${encodeURIComponent(searchQuery.value)}`)
  }
}

const handleLogout = () => {
  authStore.logout()
  userMenuOpen.value = false
  router.push('/')
}

const userMenuItems = computed(() => {
  const items: Array<{ to?: string; action?: string; name: string; icon: any }> = [
    { to: '/user', name: t('user.dashboard'), icon: User },
    { to: '/user/orders', name: t('user.myOrders'), icon: Package }
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
</script>

<template>
  <div class="app-layout">
    <!-- Header -->
    <header class="header">
      <div class="header-content">
        <!-- Logo -->
        <RouterLink to="/" class="logo">
          <div class="logo-icon">🃏</div>
          <span class="logo-text">Card Quest</span>
        </RouterLink>

        <!-- Search Bar -->
        <div class="search-bar">
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="t('home.search.placeholder')"
            class="search-input"
            @keyup.enter="handleSearch"
          />
          <button class="search-btn" @click="handleSearch">
            <Search class="icon" />
          </button>
        </div>

        <!-- Right Actions -->
        <div class="header-actions">
          <!-- Language -->
          <button class="action-btn lang-toggle" @click="toggleLocale">
            <Globe class="icon" />
            <span>{{ locale === 'zh' ? 'EN' : '中文' }}</span>
          </button>

          <!-- Auth -->
          <template v-if="!authStore.isAuthenticated">
            <RouterLink to="/login" class="btn btn-outline btn-sm">
              {{ t('nav.login') }}
            </RouterLink>
            <RouterLink to="/register" class="btn btn-primary btn-sm">
              {{ t('nav.register') }}
            </RouterLink>
          </template>

          <template v-else>
            <!-- Notifications -->
            <button class="action-btn">
              <Bell class="icon" />
            </button>

            <!-- Orders -->
            <RouterLink to="/user/orders" class="action-btn">
              <ShoppingCart class="icon" />
            </RouterLink>

            <!-- User Menu -->
            <div class="user-menu" @click.stop>
              <button class="user-avatar-btn" @click="userMenuOpen = !userMenuOpen">
                <div class="avatar">
                  {{ authStore.user?.nickname?.charAt(0) || 'U' }}
                </div>
              </button>

              <Transition name="dropdown">
                <div v-if="userMenuOpen" class="user-dropdown">
                  <div class="dropdown-header">
                    <div class="avatar avatar-lg">
                      {{ authStore.user?.nickname?.charAt(0) || 'U' }}
                    </div>
                    <div class="user-info">
                      <span class="user-name">{{ authStore.user?.nickname || 'User' }}</span>
                      <span class="user-email">{{ authStore.user?.email }}</span>
                    </div>
                  </div>
                  <div class="dropdown-items">
                    <RouterLink
                      v-for="item in userMenuItems.filter(i => i.to)"
                      :key="item.name"
                      :to="item.to!"
                      class="dropdown-item"
                      @click="userMenuOpen = false"
                    >
                      <component :is="item.icon" class="icon" />
                      <span>{{ item.name }}</span>
                    </RouterLink>
                    <button class="dropdown-item" @click="handleLogout">
                      <LogOut class="icon" />
                      <span>{{ t('nav.logout') }}</span>
                    </button>
                  </div>
                </div>
              </Transition>
            </div>
          </template>

          <!-- Mobile Menu Toggle -->
          <button class="mobile-toggle" @click="mobileMenuOpen = !mobileMenuOpen">
            <X v-if="mobileMenuOpen" class="icon" />
            <Menu v-else class="icon" />
          </button>
        </div>
      </div>

      <!-- Mobile Menu -->
      <Transition name="slide">
        <nav v-if="mobileMenuOpen" class="mobile-menu">
          <RouterLink to="/" class="mobile-link" @click="mobileMenuOpen = false">
            {{ t('nav.home') }}
          </RouterLink>
          <RouterLink to="/marketplace" class="mobile-link" @click="mobileMenuOpen = false">
            {{ t('nav.marketplace') }}
          </RouterLink>
          <RouterLink to="/auctions" class="mobile-link" @click="mobileMenuOpen = false">
            {{ t('nav.auctions') }}
          </RouterLink>
          <template v-if="!authStore.isAuthenticated">
            <RouterLink to="/login" class="mobile-link" @click="mobileMenuOpen = false">
              {{ t('nav.login') }}
            </RouterLink>
            <RouterLink to="/register" class="mobile-link" @click="mobileMenuOpen = false">
              {{ t('nav.register') }}
            </RouterLink>
          </template>
          <template v-else>
            <RouterLink to="/user" class="mobile-link" @click="mobileMenuOpen = false">
              {{ t('user.dashboard') }}
            </RouterLink>
            <RouterLink to="/user/orders" class="mobile-link" @click="mobileMenuOpen = false">
              {{ t('user.myOrders') }}
            </RouterLink>
          </template>
        </nav>
      </Transition>
    </header>

    <!-- Main Content -->
    <main class="main-content">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="footer">
      <div class="footer-content">
        <!-- Brand -->
        <div class="footer-brand">
          <div class="footer-logo">
            <span class="logo-icon">🃏</span>
            <span class="logo-text">Card Quest</span>
          </div>
          <p class="footer-desc">{{ t('app.description') }}</p>
          <div class="footer-social">
            <span>📘</span>
            <span>📸</span>
            <span>🐦</span>
          </div>
        </div>

        <!-- Links -->
        <div class="footer-links">
          <div class="footer-col">
            <h4>{{ t('footer.platform') }}</h4>
            <RouterLink to="/marketplace">{{ t('nav.marketplace') }}</RouterLink>
            <RouterLink to="/auctions">{{ t('nav.auctions') }}</RouterLink>
            <RouterLink to="/seller">{{ t('nav.becomeSeller') }}</RouterLink>
          </div>
          <div class="footer-col">
            <h4>{{ t('footer.support') }}</h4>
            <a href="#">{{ t('footer.helpCenter') }}</a>
            <a href="#">{{ t('footer.contactUs') }}</a>
            <a href="#">{{ t('footer.faq') }}</a>
          </div>
          <div class="footer-col">
            <h4>{{ t('footer.contact') }}</h4>
            <p>📧 support@cardquest.com</p>
            <p>📱 +853 1234 5678</p>
            <p>📍 {{ t('footer.location') }}</p>
          </div>
        </div>
      </div>

      <div class="footer-bottom">
        <p>© 2026 Card Quest. {{ t('footer.rights') }}</p>
      </div>
    </footer>
  </div>
</template>

<style scoped lang="scss">
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-dark);
}

// Header
.header {
  position: sticky;
  top: 0;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  z-index: 100;

  &-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--space-3) var(--space-6);
    display: flex;
    align-items: center;
    gap: var(--space-6);
  }
}

// Logo
.logo {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  text-decoration: none;
  flex-shrink: 0;

  .logo-icon {
    font-size: 28px;
  }

  .logo-text {
    font-family: var(--font-display);
    font-size: var(--text-xl);
    font-weight: 700;
    background: var(--primary-gradient);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
}

// Search Bar
.search-bar {
  flex: 1;
  max-width: 500px;
  display: flex;
  background: var(--bg-dark);
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  overflow: hidden;
  transition: border-color var(--transition-fast);

  &:focus-within {
    border-color: var(--primary);
  }

  .search-input {
    flex: 1;
    padding: var(--space-2) var(--space-4);
    background: transparent;
    border: none;
    color: var(--text-primary);
    font-size: var(--text-sm);

    &::placeholder {
      color: var(--text-muted);
    }

    &:focus {
      outline: none;
    }
  }

  .search-btn {
    padding: var(--space-2) var(--space-4);
    background: var(--primary-gradient);
    border: none;
    color: white;
    cursor: pointer;
    transition: opacity var(--transition-fast);

    &:hover {
      opacity: 0.9;
    }

    .icon {
      width: 18px;
      height: 18px;
    }
  }
}

// Header Actions
.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-shrink: 0;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2);
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);

  &:hover {
    color: var(--primary);
    background: rgba(102, 126, 234, 0.1);
  }

  .icon {
    width: 22px;
    height: 22px;
  }
}

.lang-toggle {
  padding: var(--space-1) var(--space-3);
  font-size: var(--text-sm);
  font-weight: 500;
}

// User Menu
.user-menu {
  position: relative;
}

.user-avatar-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

.avatar {
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
    width: 48px;
    height: 48px;
    font-size: var(--text-lg);
  }
}

.user-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 240px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  overflow: hidden;
}

.dropdown-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  border-bottom: 1px solid var(--border);
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

.dropdown-items {
  padding: var(--space-2);
}

.dropdown-item {
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

  &:hover {
    background: rgba(102, 126, 234, 0.1);
    color: var(--primary);
  }

  .icon {
    width: 18px;
    height: 18px;
  }
}

.mobile-toggle {
  display: none;
  padding: var(--space-2);
  background: none;
  border: none;
  color: var(--text-primary);
  cursor: pointer;

  .icon {
    width: 24px;
    height: 24px;
  }

  @media (max-width: 768px) {
    display: flex;
  }
}

.mobile-menu {
  display: none;
  flex-direction: column;
  padding: var(--space-4);
  background: var(--bg-dark);
  border-top: 1px solid var(--border);

  @media (max-width: 768px) {
    display: flex;
  }
}

.mobile-link {
  padding: var(--space-3) var(--space-4);
  color: var(--text-secondary);
  text-decoration: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);

  &:hover {
    background: rgba(102, 126, 234, 0.1);
    color: var(--primary);
  }
}

// Main Content
.main-content {
  flex: 1;
}

// Footer
.footer {
  background: var(--bg-card);
  border-top: 1px solid var(--border);
  padding: var(--space-16) 0 var(--space-8);
  margin-top: var(--space-16);
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-6);
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: var(--space-12);

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: var(--space-8);
  }
}

.footer-brand {
  .footer-logo {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-4);

    .logo-icon {
      font-size: 28px;
    }

    .logo-text {
      font-family: var(--font-display);
      font-size: var(--text-xl);
      font-weight: 700;
      background: var(--primary-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
  }

  .footer-desc {
    font-size: var(--text-sm);
    color: var(--text-muted);
    margin-bottom: var(--space-4);
    line-height: 1.6;
  }
}

.footer-social {
  display: flex;
  gap: var(--space-4);

  span {
    font-size: 24px;
    cursor: pointer;
    transition: transform var(--transition-fast);

    &:hover {
      transform: scale(1.1);
    }
  }
}

.footer-links {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-8);

  @media (max-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.footer-col {
  h4 {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--space-4);
  }

  a, p {
    display: block;
    font-size: var(--text-sm);
    color: var(--text-muted);
    margin-bottom: var(--space-2);
    transition: color var(--transition-fast);
  }

  a:hover {
    color: var(--primary);
  }
}

.footer-bottom {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-8) var(--space-6) 0;
  border-top: 1px solid var(--border);
  margin-top: var(--space-8);
  text-align: center;

  p {
    font-size: var(--text-sm);
    color: var(--text-muted);
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

// Buttons
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  border: none;

  &-primary {
    background: var(--primary-gradient);
    color: white;

    &:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }
  }

  &-outline {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-secondary);

    &:hover {
      border-color: var(--primary);
      color: var(--primary);
    }
  }

  &-sm {
    padding: var(--space-1) var(--space-3);
    font-size: var(--text-xs);
  }
}
</style>
