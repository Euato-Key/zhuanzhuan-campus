<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, Clock, Close } from '@element-plus/icons-vue'
import { useAiAssistantStore } from '@/stores/ai-assistant'
import AiChatView from './AiChatView.vue'
import AiHistoryView from './AiHistoryView.vue'
import AiWelcomeView from './AiWelcomeView.vue'

const store = useAiAssistantStore()
const inputText = ref('')
const activeTab = ref<'chat' | 'history'>('chat')

function handleSend() {
  const text = inputText.value.trim()
  if (!text || store.isLoading) return
  inputText.value = ''
  store.sendMessage(text)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
}

function handleNewChat() {
  store.newConversation()
  activeTab.value = 'chat'
}

onMounted(() => { if (!store.conversations.length) store.loadConversations() })
</script>

<template>
  <transition name="drawer-slide">
    <div v-if="store.panelVisible" class="ai-drawer">
      <div class="drawer-header">
        <span class="drawer-title">转转小助手</span>
        <div class="header-actions">
          <el-button text size="small" @click="handleNewChat"><el-icon><Plus /></el-icon></el-button>
          <el-button text size="small" :type="activeTab === 'history' ? 'primary' : ''" @click="activeTab = activeTab === 'history' ? 'chat' : 'history'">
            <el-icon><Clock /></el-icon>
          </el-button>
          <el-button text size="small" @click="store.close"><el-icon><Close /></el-icon></el-button>
        </div>
      </div>

      <div class="drawer-body">
        <AiWelcomeView v-if="activeTab === 'chat' && !store.messages.length" />
        <AiChatView v-else-if="activeTab === 'chat'" />
        <AiHistoryView v-else @select="activeTab = 'chat'" />
      </div>

      <div v-if="activeTab === 'chat'" class="drawer-input">
        <el-input v-model="inputText" placeholder="输入消息..." :disabled="store.isLoading"
                  @keydown="handleKeydown" size="default" :rows="1" type="textarea" resize="none" autosize />
        <button v-if="store.isLoading" class="send-btn stop-btn" @click="store.stopGeneration()">
          <svg viewBox="0 0 24 24" width="18" height="18"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>
        </button>
        <button v-else class="send-btn" :class="{ active: inputText.trim() }" @click="handleSend"
                :disabled="!inputText.trim()">
          <svg viewBox="0 0 24 24" width="18" height="18"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/></svg>
        </button>
      </div>
    </div>
  </transition>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.ai-drawer {
  position: fixed; top: 0; right: 0; width: 380px; height: 100vh;
  background: #fff; box-shadow: -4px 0 24px rgba(0, 0, 0, 0.12);
  display: flex; flex-direction: column; z-index: 2000;
}

.drawer-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: $spacing-sm $spacing-md; border-bottom: 1px solid $color-border-light;
  background: $color-primary; color: #fff;
}
.drawer-title { font-size: $font-size-body; font-weight: $font-weight-semibold; }
.header-actions { display: flex; gap: 2px; }
.header-actions .el-button { color: #fff !important; }

.drawer-body { flex: 1; overflow: hidden; display: flex; flex-direction: column; }

.drawer-input {
  display: flex; align-items: flex-end; gap: $spacing-sm; padding: $spacing-sm $spacing-md;
  border-top: 1px solid $color-border-light; background: $color-bg-card;
}
.drawer-input .el-textarea { flex: 1; }

.send-btn {
  width: 32px; height: 32px; border-radius: $radius-full; border: none;
  background: $color-border-light; color: #fff; cursor: default;
  display: flex; align-items: center; justify-content: center;
  transition: all $transition-fast; flex-shrink: 0;
  &.active {
    background: $color-primary; cursor: pointer;
    box-shadow: 0 2px 8px rgba($color-primary, 0.3);
    &:hover { transform: scale(1.1); }
    &:active { transform: scale(0.92); }
  }
}
.stop-btn {
  background: $color-error; cursor: pointer;
  animation: pulse-stop 1.5s ease-in-out infinite;
}

.drawer-slide-enter-active, .drawer-slide-leave-active { transition: transform 0.3s ease, opacity 0.2s ease; }
.drawer-slide-enter-from, .drawer-slide-leave-to { transform: translateX(100%); opacity: 0; }

@keyframes pulse-stop { 0%,100% { opacity: 1; } 50% { opacity: 0.7; } }

@media (max-width: 480px) {
  .ai-drawer { width: 100vw; }
}
</style>