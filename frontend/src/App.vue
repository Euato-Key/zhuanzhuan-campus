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

const userStore = useUserStore()
const chatStore = useChatStore()
const notificationStore = useNotificationStore()
const aiStore = useAiAssistantStore()

const isLoggedIn = computed(() => userStore.isLoggedIn)

function toggleAiPanel() {
  aiStore.visibleFAB()
}

watch(() => userStore.isLoggedIn, (val) => {
  if (val) {
    chatStore.init()
    notificationStore.init()
  } else {
    chatStore.cleanup()
    notificationStore.cleanup()
  }
}, { immediate: true })
</script>

<template>
  <RouterView />
  <AuthDialog />
  <AiAssistantPanel />
  <el-button 
    v-if="isLoggedIn" 
    class="ai-fab" 
    color="#fff"
    circle 
    size="large" 
    @click="toggleAiPanel"
  >
    <el-icon size="20"><ChatDotRound /></el-icon>
  </el-button>
</template>

<style>
#app {
  min-height: 100vh;
}
.ai-fab {
  position: fixed; bottom: 76px; right: 28px; z-index: 9997;
  width: 52px; height: 52px;
  border: none !important;
  background: linear-gradient(135deg, #7C3AED, #3B82F6) !important;
  color: #fff !important;
  box-shadow: 0 4px 20px rgba(124,58,237,0.4);
  transition: all 0.3s ease;
}
.ai-fab:hover {
  transform: scale(1.08);
  box-shadow: 0 6px 28px rgba(124,58,237,0.5);
}
.ai-fab:active { transform: scale(0.95); }
.ai-fab :deep(.el-icon) { font-size: 22px; }
</style>