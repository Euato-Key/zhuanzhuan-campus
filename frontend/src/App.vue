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
    type="primary" 
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
  position: fixed; bottom: 80px; right: 24px; z-index: 9997;
  width: 52px; height: 52px;
  box-shadow: 0 4px 16px rgba(24,144,255,0.4);
}
</style>