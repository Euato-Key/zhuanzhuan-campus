<script setup lang="ts">
import { watch, computed } from 'vue'
import { RouterView } from 'vue-router'
import { ChatDotRound } from '@element-plus/icons-vue'
import AuthDialog from '@/components/AuthDialog.vue'
import AiAssistantPanel from '@/components/ai-assistant/AiAssistantPanel.vue'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import { useNotificationStore } from '@/stores/notification'
import { useAiAssistantStore } from '@/stores/ai-assistant'

// ============================================
// Store 实例获取
// ============================================

/** 用户状态管理 */
const userStore = useUserStore()
/** 聊天状态管理（WebSocket 连接） */
const chatStore = useChatStore()
/** 通知状态管理 */
const notificationStore = useNotificationStore()
/** AI 助手状态管理 */
const aiStore = useAiAssistantStore()

// ============================================
// 计算属性
// ============================================

/** 用户是否已登录 */
const isLoggedIn = computed(() => userStore.isLoggedIn)

// ============================================
// 方法
// ============================================

/**
 * 切换 AI 助手面板显示/隐藏
 * 点击右下角的悬浮按钮触发
 */
function toggleAiPanel() {
  aiStore.visibleFAB()
}

// ============================================
// 副作用 - 监听登录状态变化
// ============================================

/**
 * 监听用户登录状态变化
 * - 登录后：初始化聊天和通知的实时连接
 * - 登出后：清理聊天和通知的连接资源
 * 
 * immediate: true 确保页面刷新时立即执行一次
 * 避免用户已登录但实时功能未初始化的问题
 */
watch(() => userStore.isLoggedIn, (val) => {
  if (val) {
    // 用户登录：初始化实时功能
    chatStore.init()
    notificationStore.init()
  } else {
    // 用户登出：清理资源，防止内存泄漏
    chatStore.cleanup()
    notificationStore.cleanup()
  }
}, { immediate: true })
</script>

<template>
  <!-- 路由视图：渲染当前匹配的路由页面 -->
  <RouterView />
  
  <!-- 全局登录弹窗：任何页面都可以触发显示 -->
  <AuthDialog />
  
  <!-- AI 助手面板：全局悬浮窗 -->
  <AiAssistantPanel />
  
  <!-- 
    AI 助手悬浮按钮
    - 仅登录用户显示（v-if="isLoggedIn"）
    - 固定在右下角
    - 点击打开 AI 助手面板
  -->
  <el-tooltip content="AI 助手" placement="left" v-if="isLoggedIn">
    <el-button 
      class="ai-fab" 
      circle 
      size="large" 
      @click="toggleAiPanel"
    >
      <el-icon size="22"><ChatDotRound /></el-icon>
    </el-button>
  </el-tooltip>
</template>

<style>
/* 应用根容器：确保至少占满视口高度 */
#app {
  min-height: 100vh;
}

/* ============================================
   AI 助手悬浮按钮样式
   ============================================ */
.ai-fab {
  /* 定位：固定在右下角 */
  position: fixed;
  bottom: 76px;
  right: 28px;
  z-index: 9997;
  
  /* 尺寸 */
  width: 56px !important;
  height: 56px !important;
  
  /* 外观 */
  border: none !important;
  background: linear-gradient(135deg, #7C3AED, #3B82F6) !important;
  color: #fff !important;
  box-shadow: 0 4px 20px rgba(124,58,237,0.4);
  
  /* 动画 */
  transition: all 0.3s ease;
}

/* 悬停效果：放大 + 阴影增强 */
.ai-fab:hover {
  transform: scale(1.08);
  box-shadow: 0 6px 28px rgba(124,58,237,0.5);
}

/* 点击效果：缩小 */
.ai-fab:active {
  transform: scale(0.95);
}

/* 图标大小 */
.ai-fab :deep(.el-icon) {
  font-size: 22px;
}
</style>
