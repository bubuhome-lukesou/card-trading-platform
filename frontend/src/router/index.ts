import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Public routes
const publicRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/public/HomeView.vue')
  },
  {
    path: '/marketplace',
    name: 'Marketplace',
    component: () => import('@/views/public/MarketplaceView.vue')
  },
  {
    path: '/product/:id',
    name: 'ProductDetail',
    component: () => import('@/views/public/ProductDetailView.vue')
  },
  {
    path: '/auctions',
    name: 'Auctions',
    component: () => import('@/views/public/AuctionsView.vue')
  },
  {
    path: '/auction/:id',
    name: 'AuctionDetail',
    component: () => import('@/views/public/AuctionDetailView.vue')
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/public/LoginView.vue'),
    meta: { guest: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/public/RegisterView.vue'),
    meta: { guest: true }
  }
]

// User routes
const userRoutes: RouteRecordRaw[] = [
  {
    path: '/user',
    name: 'UserDashboard',
    component: () => import('@/views/user/DashboardView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/user/orders',
    name: 'UserOrders',
    component: () => import('@/views/user/OrdersView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/user/favorites',
    name: 'UserFavorites',
    component: () => import('@/views/user/FavoritesView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/user/wallet',
    name: 'UserWallet',
    component: () => import('@/views/user/WalletView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/user/settings',
    name: 'UserSettings',
    component: () => import('@/views/user/SettingsView.vue'),
    meta: { requiresAuth: true }
  }
]

// Seller routes
const sellerRoutes: RouteRecordRaw[] = [
  {
    path: '/seller',
    name: 'SellerDashboard',
    component: () => import('@/views/seller/DashboardView.vue'),
    meta: { requiresAuth: true, requiresSeller: true }
  },
  {
    path: '/seller/products',
    name: 'SellerProducts',
    component: () => import('@/views/seller/ProductsView.vue'),
    meta: { requiresAuth: true, requiresSeller: true }
  },
  {
    path: '/seller/auctions',
    name: 'SellerAuctions',
    component: () => import('@/views/seller/AuctionsView.vue'),
    meta: { requiresAuth: true, requiresSeller: true }
  },
  {
    path: '/seller/orders',
    name: 'SellerOrders',
    component: () => import('@/views/seller/OrdersView.vue'),
    meta: { requiresAuth: true, requiresSeller: true }
  },
  {
    path: '/seller/earnings',
    name: 'SellerEarnings',
    component: () => import('@/views/seller/EarningsView.vue'),
    meta: { requiresAuth: true, requiresSeller: true }
  }
]

// Admin routes
const adminRoutes: RouteRecordRaw[] = [
  {
    path: '/admin',
    name: 'AdminDashboard',
    component: () => import('@/views/admin/DashboardView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/admin/users',
    name: 'AdminUsers',
    component: () => import('@/views/admin/UsersView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/admin/sellers',
    name: 'AdminSellers',
    component: () => import('@/views/admin/SellersView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/admin/products',
    name: 'AdminProducts',
    component: () => import('@/views/admin/ProductsView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/admin/settings',
    name: 'AdminSettings',
    component: () => import('@/views/admin/SettingsView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  }
]

const routes: RouteRecordRaw[] = [
  ...publicRoutes,
  ...userRoutes,
  ...sellerRoutes,
  ...adminRoutes,
  // Catch-all 404
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/public/NotFoundView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    return { top: 0 }
  }
})

// Navigation guards
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()

  // Check if route requires authentication
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
    return
  }

  // Check if route is for guests only (login/register)
  if (to.meta.guest && authStore.isAuthenticated) {
    next({ name: 'Home' })
    return
  }

  // Check seller role
  if (to.meta.requiresSeller && !authStore.isSeller) {
    next({ name: 'Home' })
    return
  }

  // Check admin role
  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    next({ name: 'Home' })
    return
  }

  next()
})

export default router
