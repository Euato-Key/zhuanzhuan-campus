<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, MoreFilled, Search } from '@element-plus/icons-vue'
import { useChatStore } from '@/stores/chat'
import { useUserStore } from '@/stores/user'
import { getOssUrl } from '@/utils/oss'
import { formatRelativeTime, formatDate } from '@/utils/format'
import type { MessageType,MessageItem } from '@/api/modules/chat'
import { useChatInfiniteScroll } from '@/composables/useChatInfiniteScroll'
import MessageBubble from '@/components/chat/MessageBubble.vue'
import ChatInput from '@/components/chat/ChatInput.vue'
import TypingIndicator from '@/components/chat/TypingIndicator.vue'
import BlockBanner from '@/components/chat/BlockBanner.vue'
import SearchPanel from '@/components/chat/SearchPanel.vue'
import QuickReplyPanel from '@/components/chat/QuickReplyPanel.vue'
import BlacklistDialog from '@/components/chat/BlacklistDialog.vue'

const route = useRoute()
const router = useRouter()
const chatStore = useChatStore()
const userStore = useUserStore()

const messageContainer = ref<HTMLElement | null>(null)
const { isLoadingMore, scrollToBottom, isNearBottom } = useChatInfiniteScroll(
  messageContainer,
  () => chatStore.loadMoreMessages()
)

const showSearch = ref(false)
const showQuickReplies = ref(false)
const showBlacklistDialog = ref(false)
const showNewMessage = ref(false)
const highlightMessageId = ref<string | null>(null)

const currentUserId = computed(() => userStore.user?.id)
const otherUser = computed(() => chatStore.currentConversation?.otherUser)
const otherUserAvatar = computed(() => {
  if (!otherUser.value?.avatar) return undefined
  return getOssUrl(otherUser.value.avatar)
})

const isInputDisabled = computed(() => {
  return chatStore.isBlockedByMe || chatStore.isBlockedByOther
})

// Group messages by date with pre-computed flags
const groupedMessages = computed(() => {
  const messages = chatStore.currentMessages
  const groups: Array<{ date: string; items: Array<MessageItem & { _showAvatar: boolean; _showTime: boolean }> }> = []
  let currentDate = ''

  for (const msg of messages) {
    const msgDate = formatDate(msg.createdAt, 'date')
    if (msgDate !== currentDate) {
      currentDate = msgDate
      groups.push({ date: msgDate, items: [] })
    }
    const group = groups[groups.length - 1]
    const prev = group.items.length > 0 ? group.items[group.items.length - 1] : null
    group.items.push({
      ...msg,
      _showAvatar: !prev || prev.senderId !== msg.senderId,
      _showTime: !prev || formatRelativeTime(msg.createdAt) !== formatRelativeTime(prev.createdAt),
    })
  }

  return groups
})

// Watch for new messages to auto-scroll
watch(() => chatStore.currentMessages.length, async () => {
  await nextTick()
  if (isNearBottom()) {
    scrollToBottom()
  } else {
    showNewMessage.value = true
  }
})

// Watch for typing indicator
watch(() => chatStore.isOtherTyping, async () => {
  if (chatStore.isOtherTyping) {
    await nextTick()
    if (isNearBottom()) scrollToBottom()
  }
})

async function initRoom() {
  const id = Number(route.params.id)
  if (!id || isNaN(id)) return
  await chatStore.selectConversation(id)
  await nextTick()
  scrollToBottom(false)
}

onMounted(initRoom)

watch(() => route.params.id, () => {
  if (route.name === 'ChatRoom') initRoom()
})

onUnmounted(() => {
  chatStore.clearCurrentConversation()
})

function goBack() {
  router.push({ name: 'Chat' })
}

function handleSend(type: MessageType, content: string) {
  chatStore.sendMessage(type, content)
  nextTick(() => scrollToBottom())
}

function handleTyping() {
  chatStore.emitTyping()
}

function handleStopTyping() {
  chatStore.emitStopTyping()
}

function handleSearch(keyword: string) {
  if (!chatStore.currentConversationId) return
  chatStore.searchInConversation(chatStore.currentConversationId, keyword)
}

function handleBlock() {
  if (!otherUser.value) return
  chatStore.blockOtherUser(otherUser.value.id)
}

function handleUnblock() {
  if (!otherUser.value) return
  chatStore.unblockOtherUser(otherUser.value.id)
}

function scrollToNewMessage() {
  showNewMessage.value = false
  scrollToBottom()
}

async function handleSelectSearchResult(messageId: string) {
  showSearch.value = false

  const messages = chatStore.currentMessages
  const targetIndex = messages.findIndex(m => m.id === messageId)

  if (targetIndex !== -1) {
    scrollToMessage(messageId)
  } else {
    // Load messages around the target message
    await chatStore.fetchMessages(chatStore.currentConversationId!, undefined, messageId)
    await nextTick()
    scrollToMessage(messageId)
  }
}

function scrollToMessage(messageId: string) {
  highlightMessageId.value = messageId
  nextTick(() => {
    const el = document.querySelector(`[data-message-id="${messageId}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    setTimeout(() => {
      highlightMessageId.value = null
    }, 2000)
  })
}
</script>

<template>
  <div class="chat-room-page">
    <div class="room-header">
      <div class="header-left">
        <el-button link class="back-btn" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
        <div class="other-user-info" v-if="otherUser" @click="router.push({ name: 'UserProfile', params: { id: otherUser.id } })">
          <el-avatar :size="36" :src="otherUserAvatar">
            {{ otherUser.username?.charAt(0) || '?' }}
          </el-avatar>
          <div class="user-meta">
            <span class="user-name">{{ otherUser.username }}</span>
            <el-tag v-if="otherUser.school" size="small" type="info" effect="plain">
              {{ otherUser.school }}
            </el-tag>
          </div>
        </div>
      </div>
      <div class="header-right">
        <el-button link @click="showSearch = !showSearch">
          <el-icon :size="20"><Search /></el-icon>
        </el-button>
        <el-dropdown trigger="click" @command="(cmd: string) => {
          if (cmd === 'block') handleBlock()
          else if (cmd === 'blacklist') showBlacklistDialog = true
        }">
          <el-button link>
            <el-icon :size="20"><MoreFilled /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item v-if="!chatStore.isBlockedByMe" command="block">拉黑该用户</el-dropdown-item>
              <el-dropdown-item command="blacklist">黑名单管理</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <SearchPanel
      v-if="showSearch"
      :results="chatStore.searchResults"
      :keyword="chatStore.searchKeyword"
      :loading="chatStore.searchLoading"
      @search="handleSearch"
      @close="showSearch = false; chatStore.clearSearch()"
      @select-result="handleSelectSearchResult"
    />

    <BlockBanner
      v-if="chatStore.isCurrentBlocked"
      :blocked-by-me="chatStore.isBlockedByMe"
      :blocked-by-other="chatStore.isBlockedByOther"
      @unblock="handleUnblock"
    />

    <div ref="messageContainer" class="messages-area" :class="{ 'has-banner': chatStore.isCurrentBlocked }">
      <div v-if="chatStore.messagesLoading" class="messages-loading" v-loading="true" />
      <template v-else>
        <div v-if="isLoadingMore" class="loading-more" v-loading="true" />
        <template v-for="group in groupedMessages" :key="group.date">
          <div class="date-divider">{{ group.date }}</div>
          <MessageBubble
            v-for="msg in group.items"
            :key="msg.id"
            :message="msg"
            :is-own="msg.senderId === currentUserId"
            :show-avatar="msg._showAvatar"
            :show-time="msg._showTime"
            :highlight="msg.id === highlightMessageId"
          />
        </template>
        <div v-if="!chatStore.currentMessages.length" class="no-messages">暂无消息，发送第一条消息吧</div>
      </template>

      <TypingIndicator :visible="chatStore.isOtherTyping" />

      <Transition name="fade">
        <el-button
          v-if="showNewMessage"
          class="new-message-btn"
          type="primary"
          size="small"
          round
          @click="scrollToNewMessage"
        >
          新消息
        </el-button>
      </Transition>
    </div>

    <QuickReplyPanel
      v-if="showQuickReplies"
      :replies="chatStore.quickReplies"
      :loading="false"
      @select="(content) => { handleSend('text', content); showQuickReplies = false }"
      @manage="showBlacklistDialog = true"
    />

    <ChatInput
      :disabled="isInputDisabled"
      :other-user-id="chatStore.currentConversation?.otherUser.id ?? 0"
      @send="handleSend"
      @typing="handleTyping"
      @stop-typing="handleStopTyping"
    />

    <BlacklistDialog v-model:visible="showBlacklistDialog" />
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;
@use '@/assets/styles/mixins' as *;

.chat-room-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: $color-bg-page;
}

.room-header {
  @include flex-between;
  padding: $spacing-sm $spacing-md;
  background: $color-bg-card;
  border-bottom: 1px solid $color-border-light;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.back-btn {
  color: $color-text-secondary;
  font-size: 20px;

  &:hover { color: $color-primary; }
}

.other-user-info {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  cursor: pointer;
  transition: opacity $transition-fast;

  &:hover {
    opacity: 0.8;
  }
}

.user-meta {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
}

.user-name {
  font-size: $font-size-body;
  font-weight: $font-weight-medium;
  color: $color-text-primary;
}

.header-right {
  display: flex;
  align-items: center;
  gap: $spacing-xs;

  .el-button {
    color: $color-text-secondary;
    &:hover { color: $color-primary; }
  }
}

.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: $spacing-md;
  position: relative;

  &.has-banner {
    padding-top: 0;
  }

  @include custom-scrollbar;
}

.messages-loading {
  height: 200px;
}

.loading-more {
  height: 40px;
}

.date-divider {
  text-align: center;
  font-size: $font-size-small;
  color: $color-text-placeholder;
  margin: $spacing-md 0;
  position: relative;

  &::before,
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    width: calc(50% - 40px);
    height: 1px;
    background: $color-border-light;
  }

  &::before { left: 0; }
  &::after { right: 0; }
}

.no-messages {
  @include flex-center;
  height: 200px;
  color: $color-text-placeholder;
  font-size: $font-size-body;
}

.new-message-btn {
  position: sticky;
  bottom: $spacing-md;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity $transition-fast;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>