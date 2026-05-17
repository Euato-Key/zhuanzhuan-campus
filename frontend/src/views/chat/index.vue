<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useChatStore } from '@/stores/chat'
import AppHeader from '@/components/layout/AppHeader.vue'
import ConversationItem from '@/components/chat/ConversationItem.vue'

const route = useRoute()
const router = useRouter()
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
  router.push({ name: 'ChatRoom', params: { id } })
}
</script>

<template>
  <div class="chat-layout" :class="{ desktop: isDesktop }">
    <AppHeader />
    <div class="chat-body" :class="{ desktop: isDesktop }">
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
          <router-view v-if="route.name === 'ChatRoom'" />
          <div v-else class="chat-empty">
            <div class="empty-content">
              <div class="empty-icon">💬</div>
              <h2 class="empty-title">开始聊天</h2>
              <p class="empty-desc">从左侧选择一个对话，或浏览商品发起咨询</p>
              <el-button type="primary" round @click="router.push({ name: 'Products' })">去看看商品</el-button>
            </div>
          </div>
        </main>
      </template>

      <template v-else>
        <router-view v-if="route.name === 'ChatRoom'" />
        <div v-else class="mobile-chat-list">
          <div class="list-header">
            <h2>消息</h2>
            <el-badge v-if="chatStore.totalUnreadCount > 0" :value="chatStore.totalUnreadCount" :max="99" />
          </div>
          <div v-loading="chatStore.conversationsLoading" class="conversation-list">
            <template v-if="chatStore.conversations.length">
              <ConversationItem
                v-for="conv in chatStore.conversations"
                :key="conv.id"
                :conversation="conv"
                :is-active="false"
                @click="openConversation(conv.id)"
              />
            </template>
            <el-empty v-else description="暂无消息" />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;
@use '@/assets/styles/mixins' as *;

.chat-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.chat-body {
  flex: 1;
  min-height: 0;
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

.chat-empty {
  @include flex-center;
  height: 100%;
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-md;
}

.empty-icon {
  font-size: 64px;
  line-height: 1;
}

.empty-title {
  font-size: $font-size-h2;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
  margin: 0;
}

.empty-desc {
  font-size: $font-size-body;
  color: $color-text-secondary;
  margin: 0;
}

.mobile-chat-list {
  flex: 1;
  overflow-y: auto;
  padding: $spacing-lg;
}

.list-header {
  @include flex-between;
  margin-bottom: $spacing-md;

  h2 {
    font-size: $font-size-h2;
    font-weight: $font-weight-semibold;
    color: $color-text-primary;
    margin: 0;
  }
}

.conversation-list {
  background: $color-bg-card;
  border-radius: $radius-lg;
  box-shadow: $shadow-sm;
  overflow: hidden;
}
</style>