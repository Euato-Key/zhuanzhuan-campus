<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useChatStore } from '@/stores/chat'
import ConversationItem from '@/components/chat/ConversationItem.vue'

const route = useRoute()
const chatStore = useChatStore()

const isDesktop = ref(window.innerWidth >= 768)

function handleResize() {
  isDesktop.value = window.innerWidth >= 768
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

const activeConversationId = computed(() => {
  if (route.name === 'ChatRoom') return Number(route.params.id)
  return null
})

function openConversation(id: number) {
  chatStore.selectConversation(id)
}
</script>

<template>
  <div class="chat-layout" :class="{ desktop: isDesktop }">
    <!-- Desktop: side-by-side layout -->
    <template v-if="isDesktop">
      <aside class="chat-sidebar">
        <div class="sidebar-header">
          <h3>消息</h3>
          <el-badge v-if="chatStore.totalUnreadCount > 0" :value="chatStore.totalUnreadCount" :max="99" />
        </div>
        <div class="sidebar-list">
          <div v-loading="chatStore.conversationsLoading">
            <ConversationItem
              v-for="conv in chatStore.conversations"
              :key="conv.id"
              :conversation="conv"
              :is-active="conv.id === activeConversationId"
              @click="openConversation(conv.id)"
            />
            <el-empty v-if="!chatStore.conversationsLoading && !chatStore.conversations.length" description="暂无消息" />
          </div>
        </div>
      </aside>
      <main class="chat-main">
        <router-view />
      </main>
    </template>

    <!-- Mobile: full-width router-view -->
    <template v-else>
      <router-view />
    </template>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;
@use '@/assets/styles/mixins' as *;

.chat-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;

  &.desktop {
    flex-direction: row;
  }
}

.chat-sidebar {
  width: 320px;
  border-right: 1px solid $color-border-light;
  background: $color-bg-card;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  @include flex-between;
  padding: $spacing-md $spacing-lg;
  border-bottom: 1px solid $color-border-light;

  h3 {
    font-size: $font-size-h3;
    font-weight: $font-weight-semibold;
    color: $color-text-primary;
    margin: 0;
  }
}

.sidebar-list {
  flex: 1;
  overflow-y: auto;

  @include custom-scrollbar;
}

.chat-main {
  flex: 1;
  min-width: 0;
  background: $color-bg-page;
}
</style>