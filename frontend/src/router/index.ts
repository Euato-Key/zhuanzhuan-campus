import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/user/login.vue'),
      meta: { title: '登录', guest: true }
    },
    {
      path: '/register',
      name: 'Register',
      component: () => import('@/views/user/register.vue'),
      meta: { title: '注册', guest: true }
    },
    {
      path: '/forgot-password',
      name: 'ForgotPassword',
      component: () => import('@/views/user/forgotPassword.vue'),
      meta: { title: '找回密码', guest: true }
    },
    {
      path: '/',
      name: 'Home',
      component: () => import('@/views/home/index.vue'),
      meta: { title: '首页' }
    }
  ]
})

router.beforeEach((to, _from, next) => {
  document.title = `${to.meta.title || '转转校园'} - 转转校园`
  next()
})

export default router