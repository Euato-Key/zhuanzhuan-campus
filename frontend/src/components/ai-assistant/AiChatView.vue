<script setup lang="ts">
import AiMessageBubble from './AiMessageBubble.vue'
import { Loading } from '@element-plus/icons-vue'
import { useAiAssistantStore } from '@/stores/ai-assistant'
import { ref, watch, nextTick } from 'vue'

const store = useAiAssistantStore()
const msgList = ref<HTMLElement>()

watch(() => store.messages.length, async () => {
  await nextTick()
  if (msgList.value) msgList.value.scrollTop = msgList.value.scrollHeight
})
</script>

<template>
  <div class="chat-view">
    <div class="msg-list" ref="msgList">
      <AiMessageBubble v-for="msg in store.messages" :key="msg.id" :msg="msg" />
      <div v-if="store.statusMessage" class="status-indicator">
        <el-icon class="loading-icon"><Loading /></el-icon>
        <span>{{ store.statusMessage }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;
.chat-view { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
.msg-list { flex: 1; overflow-y: auto; padding: $spacing-md; display: flex; flex-direction: column; gap: $spacing-md; }
.status-indicator {
  display: flex; align-items: center; gap: 6px; padding: 6px 12px;
  color: $color-text-placeholder; font-size: $font-size-small;
}
.loading-icon { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>