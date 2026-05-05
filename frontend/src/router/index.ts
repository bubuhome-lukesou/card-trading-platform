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
    path: '/:type(help|contact|faq)',
    name: 'Page',
    component: () => import('@/views/public/PageView.vue')
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
    component: () => import('@/views/user/layout/UserLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'UserDashboard',
        component: () => import('@/views/user/DashboardView.vue')
      },
      {
        path: 'cart',
        name: 'cart',
        component: () => import('@/views/user/CartView.vue')
      },
      {
        path: 'orders',
        name: 'UserOrders',
        component: () => import('@/views/user/OrdersView.vue')
      },
      {
        path: 'favorites',
        name: 'UserFavorites',
        component: () => import('@/views/user/FavoritesView.vue')
      },
      {
        path: 'wallet',
        name: 'UserWallet',
        component: () => import('@/views/user/WalletView.vue')
      },
      {
        path: 'settings',
        name: 'UserSettings',
        component: () => import('@/views/user/SettingsView.vue')
      }
    ]
  }
]

// Seller routes
const sellerRoutes: RouteRecordRaw[] = [
  {
    path: '/seller/apply',
    name: 'SellerApply',
    component: () => import('@/views/public/SellerApplyView.vue'),
  },
  {
    path: '/seller/login',
    name: 'SellerLogin',
    component: () => import('@/views/seller/SellerLoginView.vue'),
    meta: { guest: true }
  },
  {
    path: '/seller',
    component: () => import('@/views/seller/layout/SellerLayout.vue'),
    meta: { requiresAuth: true, requiresSeller: true },
    children: [
      {
        path: '',
        name: 'SellerDashboard',
        component: () => import('@/views/seller/DashboardView.vue')
      },
      {
        path: 'products',
        name: 'SellerProducts',
        component: () => import('@/views/seller/ProductsView.vue')
      },
      {
        path: 'auctions',
        name: 'SellerAuctions',
        component: () => import('@/views/seller/AuctionsView.vue')
      },
      {
        path: 'orders',
        name: 'SellerOrders',
        component: () => import('@/views/seller/OrdersView.vue')
      },
      {
        path: 'earnings',
        name: 'SellerEarnings',
        component: () => import('@/views/seller/EarningsView.vue')
      },
      {
        path: 'settings',
        name: 'SellerSettings',
        component: () => import('@/views/seller/SettingsView.vue')
      }
    ]
  }
]

// Admin routes
const adminRoutes: RouteRecordRaw[] = [
  {
    path: '/admin/login',
    name: 'AdminLogin',
    component: () => import('@/views/admin/AdminLoginView.vue'),
    meta: { guest: true }
  },
  {
    path: '/admin',
    component: () => import('@/views/admin/layout/AdminLayout.vue'),
    meta: { requiresAdmin: true },
    children: [
      { path: '', name: 'AdminDashboard', component: () => import('@/views/admin/DashboardView.vue') },
      { path: 'users', name: 'AdminUsers', component: () => import('@/views/admin/UsersView.vue') },
      { path: 'sellers', name: 'AdminSellers', component: () => import('@/views/admin/SellersView.vue') },
      { path: 'seller-applications', name: 'AdminSellerApplications', component: () => import('@/views/admin/SellerApplicationsView.vue') },
      { path: 'products', name: 'AdminProducts', component: () => import('@/views/admin/ProductsView.vue') },
      { path: 'auctions', name: 'AdminAuctions', component: () => import('@/views/admin/AuctionsView.vue') },
      { path: 'settings', name: 'AdminSettings', component: () => import('@/views/admin/SettingsView.vue') },
      { path: 'pages', name: 'AdminPages', component: () => import('@/views/admin/PagesEditorView.vue') }
    ]
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
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  // Admin routes - special handling
  if (to.path.startsWith('/admin') && !to.path.startsWith('/admin/login')) {
    if (!authStore.isAuthenticated) {
      next({ name: 'AdminLogin', query: { redirect: to.fullPath } })
      return
    }
    if (!authStore.isAdmin) {
      next({ name: 'Home' })
      return
    }
  }

  // Check if route requires authentication
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
    return
  }

  // If already logged in as admin/seller, redirect away from public pages
  if (authStore.isAuthenticated && (authStore.isAdmin || authStore.isSeller)) {
    // If trying to access a public page (no requiresAuth, no requiresSeller, no requiresAdmin)
    if (!to.meta.requiresAuth && !to.meta.requiresSeller && !to.meta.requiresAdmin) {
      if (authStore.isAdmin) {
        next({ name: 'AdminDashboard' })
        return
      }
      if (authStore.isSeller) {
        next({ name: 'SellerDashboard' })
        return
      }
    }
  }

  // Check if route is for guests only (login/register)
  if (to.meta.guest && authStore.isAuthenticated) {
    // Admins and sellers must use their dedicated login pages
    if (authStore.isAdmin) {
      next({ name: 'AdminDashboard' })
      return
    }
    if (authStore.isSeller) {
      next({ name: 'SellerDashboard' })
      return
    }
    next({ name: 'Home' })
    return
  }

  // Check seller role
  if (to.meta.requiresSeller) {
    // If user not loaded yet but we have token, wait for fetchUser to complete
    if (!authStore.user && authStore.token) {
      await authStore.fetchUser()
    }
    if (!authStore.isSeller) {
      next({ name: 'Home' })
      return
    }
  }

  // Check admin role
  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    next({ name: 'AdminLogin' })
    return
  }

  next()
})

export default router
