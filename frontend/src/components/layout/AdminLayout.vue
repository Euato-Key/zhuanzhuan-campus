<script setup lang="ts">
import { computed, markRaw } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  User, SwitchButton, DataBoard, Goods, UserFilled,
  ChatDotRound, Bell, Setting, Document, Star
} from '@element-plus/icons-vue'
import { getOssUrl } from '@/utils/oss'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// Use markRaw to avoid reactive overhead on component references
const menuItems = [
  { path: '/admin', icon: markRaw(DataBoard), title: '仪表盘', exact: true },
  { path: '/admin/users', icon: markRaw(UserFilled), title: '用户管理' },
  { path: '/admin/products', icon: markRaw(Goods), title: '商品管理' },
  { path: '/admin/categories', icon: markRaw(Star), title: '分类管理' },
  { path: '/admin/orders', icon: markRaw(Document), title: '订单管理' },
  { path: '/admin/reports', icon: markRaw(ChatDotRound), title: '举报管理' },
  { path: '/admin/banners', icon: markRaw(Bell), title: 'Banner管理' },
  { path: '/admin/settings', icon: markRaw(Setting), title: '系统设置' },
]

// 检查管理员权限（用于模板显示）
const isAdminRole = computed(() =>
  userStore.user?.role === 'admin' || userStore.user?.role === 'super_admin'
)

// 验证管理员状态
void isAdminRole // 避免未使用警告

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
  <div class="admin-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <span class="logo-icon">🎓</span>
        <span class="logo-text">转转校园</span>
        <span class="admin-badge">管理后台</span>
      </div>

      <nav class="sidebar-nav">
        <RouterLink
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: item.exact ? route.path === item.path : route.path.startsWith(item.path) }"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.title }}</span>
        </RouterLink>
      </nav>
    </aside>

    <!-- Main Content -->
    <div class="main-wrapper">
      <!-- Header -->
      <header class="admin-header">
        <div class="header-left">
          <h1 class="page-title">{{ route.meta.title || '管理后台' }}</h1>
        </div>

        <div class="header-right">
          <!-- Back to site -->
          <el-button text @click="router.push('/')">
            <el-icon><Goods /></el-icon>
            返回前台
          </el-button>

          <!-- User dropdown -->
          <el-dropdown trigger="click" @command="(cmd: string) => {
            if (cmd === 'profile') router.push('/profile')
            else if (cmd === 'logout') handleLogout()
          }">
            <div class="user-avatar-wrap">
              <el-avatar :size="32" :src="getOssUrl(userStore.user?.avatar)">
                <el-icon :size="18"><User /></el-icon>
              </el-avatar>
              <span class="user-name">{{ userStore.user?.username }}</span>
              <span class="role-tag">{{ userStore.user?.role === 'super_admin' ? '超级管理员' : '管理员' }}</span>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon>个人主页
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">
                  <el-icon><SwitchButton /></el-icon>退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <!-- Content -->
      <main class="admin-content">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.admin-layout {
  display: flex;
  min-height: 100vh;
  background: $color-bg-page;
}

// Sidebar
.sidebar {
  width: 240px;
  background: #1a1f36;
  color: #fff;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  .logo-icon { font-size: 24px; }
  .logo-text {
    font-size: 18px;
    font-weight: 600;
  }
  .admin-badge {
    font-size: 12px;
    padding: 2px 8px;
    background: $color-primary;
    border-radius: $radius-sm;
    margin-left: auto;
  }
}

.sidebar-nav {
  flex: 1;
  padding: 16px 0;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  transition: all 0.2s ease;

  &:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.05);
  }

  &.active {
    color: #fff;
    background: $color-primary;
  }

  .el-icon { font-size: 18px; }
}

// Main wrapper
.main-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

// Header
.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 64px;
  background: #fff;
  border-bottom: 1px solid $color-border;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: $color-text-primary;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-avatar-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 12px;
  border-radius: $radius-full;
  transition: background $transition-fast;

  &:hover { background: $color-bg-page; }

  .user-name {
    font-size: 14px;
    color: $color-text-primary;
    font-weight: 500;
  }

  .role-tag {
    font-size: 12px;
    padding: 2px 8px;
    background: $color-primary-pale;
    color: $color-primary;
    border-radius: $radius-sm;
  }
}

// Content
.admin-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}
</style>
