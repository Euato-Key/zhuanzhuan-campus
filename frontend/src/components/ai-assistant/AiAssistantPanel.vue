<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { useAiAssistantStore } from '@/stores/ai-assistant'
import { ChatDotRound, Delete, Plus, Close } from '@element-plus/icons-vue'
import AiMessageBubble from './AiMessageBubble.vue'
import AiQuickQuestions from './AiQuickQuestions.vue'

const store = useAiAssistantStore()
const inputText = ref('')
const msgListRef = ref<HTMLElement>()

async function handleSend() {
  if (!inputText.value.trim() || store.isLoading) return
  const text = inputText.value
  inputText.value = ''
  await store.sendMessage(text)
  await nextTick()
  scrollToBottom()
}

function handleQuickAsk(q: string) {
  store.sendMessage(q)
  nextTick(() => scrollToBottom())
}

function scrollToBottom() {
  if (msgListRef.value) {
    msgListRef.value.scrollTop = msgListRef.value.scrollHeight
  }
}

function handleNewChat() { store.newConversation() }
function handleDeleteConv(id: number) { store.deleteConversation(id) }
function handleKeydown(e: KeyboardEvent) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }

watch(() => store.messages.length, () => nextTick(() => scrollToBottom()))
</script>

<template>
  <Teleport to="body">
    <!-- 遮罩 -->
    <div v-if="store.panelVisible" class="ai-overlay" @click="store.close()" />
    
    <!-- 面板 -->
    <div :class="['ai-panel', { visible: store.panelVisible }]">
      <div class="panel-header">
        <el-icon :size="18"><ChatDotRound /></el-icon>
        <span class="panel-title">转转小助手</span>
        <span class="context-hint">记忆{{ store.messages.length }}条</span>
        <el-button :icon="Plus" size="small" text @click="handleNewChat" />
        <el-button :icon="Close" size="small" text @click="store.close()" />
      </div>

      <div class="panel-body" ref="msgListRef">
        <el-empty v-if="store.messages.length === 0" description="你好！我是转转小助手" :image-size="80" />
        
        <AiQuickQuestions v-if="store.messages.length === 0" @ask="handleQuickAsk" />

        <div v-for="msg in store.messages" :key="msg.id">
          <AiMessageBubble :msg="msg" />
        </div>
      </div>

      <div class="panel-footer">
        <el-input
          v-model="inputText"
          placeholder="输入问题，按Enter发送..."
          :disabled="store.isLoading"
          :maxlength="500"
          show-word-limit
          @keydown="handleKeydown"
        >
          <template #append>
            <el-button 
              :loading="store.isLoading" 
              :icon="store.isLoading ? undefined : ChatDotRound"
              @click="store.isLoading ? store.stopGeneration() : handleSend()"
            >
              {{ store.isLoading ? '停止' : '发送' }}
            </el-button>
          </template>
        </el-input>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.ai-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 9998;
  transition: opacity 0.3s;
}
.ai-panel {
  position: fixed; top: 0; right: 0; width: 420px; height: 100vh;
  background: #fff; box-shadow: -4px 0 24px rgba(0,0,0,0.12);
  z-index: 9999; display: flex; flex-direction: column;
  transform: translateX(100%); transition: transform 0.3s ease;
}
.ai-panel.visible { transform: translateX(0); }
.panel-header {
  display: flex; align-items: center; gap: 8px;
  padding: 14px 16px; border-bottom: 1px solid #f0f0f0;
  background: #fafafa; flex-shrink: 0;
}
.panel-title { font-size: 16px; font-weight: 600; flex: 1; }
.context-hint { font-size: 11px; color: #bbb; }
.panel-body { flex: 1; overflow-y: auto; padding: 16px; }
.panel-footer { padding: 12px 16px; border-top: 1px solid #f0f0f0; flex-shrink: 0; }
</style>
