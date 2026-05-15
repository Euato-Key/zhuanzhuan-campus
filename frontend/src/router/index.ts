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
      // Token invalid, will be handled by interceptor
    }
  }

  // Auth required but not logged in → open auth dialog instead of redirect
  if (to.meta.auth && !userStore.isLoggedIn) {
    const authDialog = useAuthDialog()
    authDialog.open('login')
    next({ name: 'Home' })
    return
  }

  next()
})

export default router