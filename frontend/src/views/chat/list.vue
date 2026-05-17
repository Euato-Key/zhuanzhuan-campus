<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useChatStore } from '@/stores/chat'
import AppLayout from '@/components/layout/AppLayout.vue'
import ConversationItem from '@/components/chat/ConversationItem.vue'

const router = useRouter()
const chatStore = useChatStore()

const loadingMore = ref(false)

onMounted(() => {
  if (!chatStore.conversations.length) {
    chatStore.fetchConversations()
  }
})

async function loadMore() {
  if (loadingMore.value || chatStore.conversationsLoading) return
  loadingMore.value = true
  await chatStore.fetchConversations(chatStore.conversationsPage + 1)
  loadingMore.value = false
}

function openConversation(id: number) {
  router.push({ name: 'ChatRoom', params: { id } })
}
</script>

<template>
  <AppLayout>
    <div class="chat-list-page">
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
          <div v-if="chatStore.conversations.length < chatStore.conversationsTotal" class="load-more">
            <el-button link :loading="loadingMore" @click="loadMore">加载更多</el-button>
          </div>
        </template>
        <el-empty v-else description="暂无消息" />
      </div>
    </div>
  </AppLayout>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;
@use '@/assets/styles/mixins' as *;

.chat-list-page {
  max-width: $container-md;
  margin: 0 auto;
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

.load-more {
  text-align: center;
  padding: $spacing-md;
}
</style>