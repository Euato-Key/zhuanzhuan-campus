import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useAuthDialog } from '@/composables/useAuthDialog'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: () => import('@/views/home/index.vue'),
      meta: { title: '首页' }
    },
    {
      path: '/products',
      name: 'Products',
      component: () => import('@/views/product/list.vue'),
      meta: { title: '商品列表' }
    },
    {
      path: '/want-buy',
      name: 'WantBuy',
      component: () => import('@/views/home/wantBuyList.vue'),
      meta: { title: '求购列表' }
    },
    {
      path: '/products/:id',
      name: 'ProductDetail',
      component: () => import('@/views/product/detail.vue'),
      meta: { title: '商品详情' }
    },
    {
      path: '/profile',
      name: 'Profile',
      component: () => import('@/views/user/profile.vue'),
      meta: { title: '个人主页', auth: true }
    },
    {
      path: '/user/:id',
      name: 'UserProfile',
      component: () => import('@/views/user/userProfile.vue'),
      meta: { title: '用户主页' }
    },
    {
      path: '/addresses',
      name: 'Addresses',
      component: () => import('@/views/user/addresses.vue'),
      meta: { title: '收货地址', auth: true }
    },
    {
      path: '/favorites',
      name: 'Favorites',
      component: () => import('@/views/user/favorites.vue'),
      meta: { title: '我的收藏', auth: true }
    },
    {
      path: '/my-products',
      name: 'MyProducts',
      component: () => import('@/views/user/myProducts.vue'),
      meta: { title: '我的商品', auth: true }
    },
    {
      path: '/orders',
      name: 'Orders',
      component: () => import('@/views/order/list.vue'),
      meta: { title: '我的订单', auth: true }
    },
    {
      path: '/orders/:id',
      name: 'OrderDetail',
      component: () => import('@/views/order/detail.vue'),
      meta: { title: '订单详情', auth: true }
    },
    {
      path: '/chat',
      name: 'Chat',
      component: () => import('@/views/chat/list.vue'),
      meta: { title: '消息', auth: true }
    },
    {
      path: '/notifications',
      name: 'Notifications',
      component: () => import('@/views/user/notifications.vue'),
      meta: { title: '通知中心', auth: true }
    },
    // Admin routes (hidden)
    {
      path: '/admin',
      name: 'AdminDashboard',
      component: () => import('@/views/admin/index.vue'),
      meta: { title: '仪表盘', auth: true, admin: true }
    },
    {
      path: '/admin/users',
      name: 'AdminUsers',
      component: () => import('@/views/admin/users.vue'),
      meta: { title: '用户管理', auth: true, admin: true }
    },
    {
      path: '/admin/products',
      name: 'AdminProducts',
      component: () => import('@/views/admin/products.vue'),
      meta: { title: '商品管理', auth: true, admin: true }
    },
    {
      path: '/admin/categories',
      name: 'AdminCategories',
      component: () => import('@/views/admin/categories.vue'),
      meta: { title: '分类管理', auth: true, admin: true }
    },
    {
      path: '/admin/orders',
      name: 'AdminOrders',
      component: () => import('@/views/admin/orders.vue'),
      meta: { title: '订单管理', auth: true, admin: true }
    },
    {
      path: '/admin/reports',
      name: 'AdminReports',
      component: () => import('@/views/admin/reports.vue'),
      meta: { title: '举报管理', auth: true, admin: true }
    },
    {
      path: '/admin/banners',
      name: 'AdminBanners',
      component: () => import('@/views/admin/banners.vue'),
      meta: { title: 'Banner管理', auth: true, admin: true }
    },
    {
      path: '/admin/settings',
      name: 'AdminSettings',
      component: () => import('@/views/admin/settings.vue'),
      meta: { title: '系统设置', auth: true, admin: true, superAdmin: true }
    }
  ]
})

router.beforeEach(async (to, _from, next) => {
  document.title = `${to.meta.title || '转转校园'} - 转转校园`

  const userStore = useUserStore()

  // Try to fetch user if we have a token but no user data
  if (userStore.accessToken && !userStore.user) {
    try {
      await userStore.fetchUser()
    } catch {
      // Token invalid, clearAuth has been called by interceptor
      // Continue navigation - user is not logged in
    }
  }

  // Auth required but not logged in → open auth dialog instead of redirect
  if (to.meta.auth && !userStore.isLoggedIn) {
    const authDialog = useAuthDialog()
    authDialog.open('login')
    next({ name: 'Home' })
    return
  }

  // Admin route - check admin permission
  if (to.meta.admin && userStore.user) {
    const isAdmin = userStore.user.role === 'admin' || userStore.user.role === 'super_admin'
    if (!isAdmin) {
      next({ name: 'Home' })
      return
    }

    // Super admin only routes
    if (to.meta.superAdmin && userStore.user.role !== 'super_admin') {
      next({ name: 'AdminDashboard' })
      return
    }
  }

  next()
})

export default router