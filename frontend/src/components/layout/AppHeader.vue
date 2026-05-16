<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useAuthDialog } from '@/composables/useAuthDialog'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User, SwitchButton, Star, Bell, ChatDotRound, ShoppingBag, Location, Setting, Goods } from '@element-plus/icons-vue'
import { getOssUrl } from '@/utils/oss'

const router = useRouter()
const userStore = useUserStore()
const authDialog = useAuthDialog()

async function handleLogout() {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await userStore.logout()
    ElMessage.success('已退出登录')
    router.push('/')
  } catch {
    // cancelled
  }
}
</script>

<template>
  <header class="header">
    <div class="container">
      <div class="header-content">
        <RouterLink to="/" class="logo">
          <span class="logo-icon">🎓</span>
          <span class="logo-text">转转校园</span>
        </RouterLink>
        <nav class="nav">
          <RouterLink to="/" class="nav-link">首页</RouterLink>
          <RouterLink to="/products" class="nav-link">商品</RouterLink>
          <RouterLink to="/want-buy" class="nav-link">求购</RouterLink>
        </nav>

        <!-- Logged in -->
        <div v-if="userStore.isLoggedIn" class="user-actions logged-in">
          <RouterLink to="/chat" class="action-icon" title="消息">
            <el-icon :size="20"><ChatDotRound /></el-icon>
          </RouterLink>
          <RouterLink to="/notifications" class="action-icon" title="通知">
            <el-icon :size="20"><Bell /></el-icon>
          </RouterLink>
          <el-dropdown trigger="click" @command="(cmd: string) => {
            if (cmd === 'profile') router.push('/profile')
            else if (cmd === 'myProducts') router.push('/my-products')
            else if (cmd === 'orders') router.push('/orders')
            else if (cmd === 'favorites') router.push('/favorites')
            else if (cmd === 'addresses') router.push('/addresses')
            else if (cmd === 'admin') router.push('/admin')
            else if (cmd === 'logout') handleLogout()
          }">
            <div class="user-avatar-wrap">
              <el-avatar :size="32" :src="getOssUrl(userStore.user?.avatar)">
                <el-icon :size="18"><User /></el-icon>
              </el-avatar>
              <span class="user-name">{{ userStore.user?.username }}</span>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon>个人主页
                </el-dropdown-item>
                <el-dropdown-item command="myProducts">
                  <el-icon><Goods /></el-icon>我的商品
                </el-dropdown-item>
                <el-dropdown-item command="orders">
                  <el-icon><ShoppingBag /></el-icon>我的订单
                </el-dropdown-item>
                <el-dropdown-item command="favorites">
                  <el-icon><Star /></el-icon>我的收藏
                </el-dropdown-item>
                <el-dropdown-item command="addresses">
                  <el-icon><Location /></el-icon>收货地址
                </el-dropdown-item>
                <el-dropdown-item v-if="userStore.isAdmin" divided command="admin">
                  <el-icon><Setting /></el-icon>管理后台
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">
                  <el-icon><SwitchButton /></el-icon>退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>

        <!-- Not logged in -->
        <div v-else class="user-actions">
          <a class="btn-text" @click="authDialog.open('login')">登录</a>
          <a class="btn btn-primary" @click="authDialog.open('register')">注册</a>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.header {
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 600;
  color: $color-primary;

  .logo-icon { font-size: 24px; }
}

.nav {
  display: flex;
  gap: 32px;

  .nav-link {
    font-size: 15px;
    color: $color-text-secondary;
    padding: 8px 0;
    position: relative;
    transition: color 0.2s ease;

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      width: 0;
      height: 2px;
      background: $color-primary;
      transition: width 0.2s ease;
    }

    &:hover, &.router-link-active {
      color: $color-primary;
      &::after { width: 100%; }
    }
  }
}

.user-actions {
  display: flex;
  align-items: center;
  gap: 16px;

  &.logged-in { gap: 12px; }
}

.action-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: $radius-md;
  color: $color-text-secondary;
  transition: all $transition-fast;

  &:hover {
    color: $color-primary;
    background: $color-primary-pale;
  }
}

.user-avatar-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: $radius-full;
  transition: background $transition-fast;

  &:hover { background: $color-primary-pale; }

  .user-name {
    font-size: $font-size-body;
    color: $color-text-primary;
    font-weight: $font-weight-medium;
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &-primary {
    background: $color-primary;
    color: #fff;
    &:hover { background: $color-primary-dark; }
  }
}

.btn-text {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  color: $color-text-secondary;
  background: transparent;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(76, 175, 80, 0.08);
    color: $color-primary;
  }
}
</style>
