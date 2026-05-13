import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/home/index.vue')
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/user/login.vue')
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/user/register.vue')
  },
  {
    path: '/product/:id',
    name: 'ProductDetail',
    component: () => import('@/views/product/detail.vue')
  },
  {
    path: '/products',
    name: 'ProductList',
    component: () => import('@/views/product/list.vue')
  },
  {
    path: '/orders',
    name: 'OrderList',
    component: () => import('@/views/order/list.vue')
  },
  {
    path: '/order/:id',
    name: 'OrderDetail',
    component: () => import('@/views/order/detail.vue')
  },
  {
    path: '/chat',
    name: 'ChatList',
    component: () => import('@/views/chat/list.vue')
  },
  {
    path: '/chat/:userId',
    name: 'ChatRoom',
    component: () => import('@/views/chat/room.vue')
  },
  {
    path: '/want-buy',
    name: 'WantBuyList',
    component: () => import('@/views/home/wantBuyList.vue')
  },
  {
    path: '/user/profile',
    name: 'UserProfile',
    component: () => import('@/views/user/profile.vue')
  },
  {
    path: '/user/favorites',
    name: 'UserFavorites',
    component: () => import('@/views/user/favorites.vue')
  },
  {
    path: '/user/addresses',
    name: 'UserAddresses',
    component: () => import('@/views/user/addresses.vue')
  },
  {
    path: '/user/notifications',
    name: 'UserNotifications',
    component: () => import('@/views/user/notifications.vue')
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/views/admin/index.vue'),
    meta: { requiresAdmin: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('access_token')
  if (to.meta.requiresAdmin && !token) {
    next('/login')
  } else {
    next()
  }
})

export default router