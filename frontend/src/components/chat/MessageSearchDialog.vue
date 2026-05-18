<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Search, Document, Picture, Goods, Tickets } from '@element-plus/icons-vue'
import type { MessageItem, MessageType, ChatUser } from '@/api/modules/chat'
import { formatRelativeTime, formatDate } from '@/utils/format'
import { getOssUrl } from '@/utils/oss'

const props = defineProps<{
  visible: boolean
  conversationId: number | null
  currentUserId: number | undefined
  otherUser: ChatUser | null | undefined
}>()

const emit = defineEmits<{
  close: []
  selectResult: [messageId: string]
}>()

// Search state
const keyword = ref('')
const selectedType = ref<MessageType | ''>('')
const selectedSender = ref<'all' | 'me' | 'other'>('all')
const dateRange = ref<'all' | 'today' | 'week' | 'month' | 'custom'>('all')
const customStartDate = ref('')
const customEndDate = ref('')

// Results state
const results = ref<MessageItem[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = 10
const hasMore = computed(() => results.value.length < total.value)

// Search history
const searchHistory = ref<string[]>([])
const maxHistory = 5

// Load search history from localStorage
onMounted(() => {
  const saved = localStorage.getItem('chatSearchHistory')
  if (saved) {
    try {
      searchHistory.value = JSON.parse(saved)
    } catch {
      searchHistory.value = []
    }
  }
})

// Save search history
function saveToHistory(term: string) {
  if (!term.trim()) return
  const trimmed = term.trim()
  const idx = searchHistory.value.indexOf(trimmed)
  if (idx !== -1) {
    searchHistory.value.splice(idx, 1)
  }
  searchHistory.value.unshift(trimmed)
  if (searchHistory.value.length > maxHistory) {
    searchHistory.value.pop()
  }
  localStorage.setItem('chatSearchHistory', JSON.stringify(searchHistory.value))
}

// Clear history
function clearHistory() {
  searchHistory.value = []
  localStorage.removeItem('chatSearchHistory')
}

// Use history item
function useHistoryItem(item: string) {
  keyword.value = item
  doSearch()
}

// Date range helper
function getDateRange(): { startDate?: string; endDate?: string } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (dateRange.value) {
    case 'today':
      return { startDate: today.toISOString().split('T')[0] }
    case 'week': {
      const weekAgo = new Date(today)
      weekAgo.setDate(weekAgo.getDate() - 7)
      return { startDate: weekAgo.toISOString().split('T')[0] }
    }
    case 'month': {
      const monthAgo = new Date(today)
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      return { startDate: monthAgo.toISOString().split('T')[0] }
    }
    case 'custom':
      return {
        startDate: customStartDate.value || undefined,
        endDate: customEndDate.value || undefined,
      }
    default:
      return {}
  }
}

// Perform search
async function doSearch(resetPage = true) {
  if (!props.conversationId) return

  if (resetPage) {
    page.value = 1
    results.value = []
  }

  // Require at least one filter
  const hasKeyword = keyword.value.trim()
  const hasType = selectedType.value
  const hasSender = selectedSender.value !== 'all'
  const hasDate = dateRange.value !== 'all'

  if (!hasKeyword && !hasType && !hasSender && !hasDate) {
    return
  }

  loading.value = true

  try {
    const { searchMessages } = await import('@/api/modules/chat')
    const dateParams = getDateRange()

    const res = await searchMessages(props.conversationId, {
      keyword: keyword.value.trim() || undefined,
      type: selectedType.value || undefined,
      senderId:
        selectedSender.value === 'me'
          ? props.currentUserId
          : selectedSender.value === 'other'
            ? props.otherUser?.id
            : undefined,
      startDate: dateParams.startDate,
      endDate: dateParams.endDate,
      page: page.value,
      pageSize,
    })

    if (res.data.code === 200) {
      if (resetPage) {
        results.value = res.data.data.list
      } else {
        results.value.push(...res.data.data.list)
      }
      total.value = res.data.data.total

      if (hasKeyword) {
        saveToHistory(keyword.value)
      }
    }
  } catch (err) {
    console.error('Search failed:', err)
  } finally {
    loading.value = false
  }
}

// Load more results
async function loadMore() {
  if (!hasMore.value || loading.value) return
  page.value++
  await doSearch(false)
}

// Reset filters
function resetFilters() {
  keyword.value = ''
  selectedType.value = ''
  selectedSender.value = 'all'
  dateRange.value = 'all'
  customStartDate.value = ''
  customEndDate.value = ''
  results.value = []
  total.value = 0
}

// Handle result click
function handleResultClick(msg: MessageItem) {
  emit('selectResult', msg.id)
  emit('close')
}

// Get message preview
function getMessagePreview(msg: MessageItem): string {
  switch (msg.type) {
    case 'text':
      return msg.content
    case 'image':
      return '[图片]'
    case 'product':
      try {
        const data = JSON.parse(msg.content)
        return `商品: ${data.name}`
      } catch {
        return '[商品卡片]'
      }
    case 'order':
      try {
        const data = JSON.parse(msg.content)
        return `订单: ${data.orderNo}`
      } catch {
        return '[订单卡片]'
      }
    default:
      return '[消息]'
  }
}

// Get sender name
function getSenderName(msg: MessageItem): string {
  if (msg.senderId === props.currentUserId) return '我'
  return msg.sender?.username || '对方'
}

// Get sender avatar
function getSenderAvatar(msg: MessageItem): string | undefined {
  if (msg.sender?.avatar) {
    return getOssUrl(msg.sender.avatar)
  }
  return undefined
}

// Watch for visibility change
watch(
  () => props.visible,
  (val) => {
    if (!val) {
      // Optionally reset on close
    }
  }
)
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="搜索消息"
    width="560px"
    :close-on-click-modal="false"
    @update:model-value="$emit('close')"
  >
    <div class="search-dialog-content">
      <!-- Search Input -->
      <div class="search-input-row">
        <el-input
          v-model="keyword"
          placeholder="输入关键词搜索..."
          clearable
          @keyup.enter="doSearch()"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button type="primary" :loading="loading" @click="doSearch()">搜索</el-button>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <!-- Message Type -->
        <div class="filter-group">
          <span class="filter-label">消息类型</span>
          <el-radio-group v-model="selectedType" size="small" @change="doSearch()">
            <el-radio-button value="">全部</el-radio-button>
            <el-radio-button value="text">文字</el-radio-button>
            <el-radio-button value="image">图片</el-radio-button>
            <el-radio-button value="product">商品</el-radio-button>
            <el-radio-button value="order">订单</el-radio-button>
          </el-radio-group>
        </div>

        <!-- Sender -->
        <div class="filter-group">
          <span class="filter-label">发送者</span>
          <el-radio-group v-model="selectedSender" size="small" @change="doSearch()">
            <el-radio-button value="all">全部</el-radio-button>
            <el-radio-button value="me">我发送的</el-radio-button>
            <el-radio-button value="other">对方发送的</el-radio-button>
          </el-radio-group>
        </div>

        <!-- Date Range -->
        <div class="filter-group">
          <span class="filter-label">时间范围</span>
          <el-radio-group v-model="dateRange" size="small" @change="doSearch()">
            <el-radio-button value="all">全部</el-radio-button>
            <el-radio-button value="today">今天</el-radio-button>
            <el-radio-button value="week">近7天</el-radio-button>
            <el-radio-button value="month">近30天</el-radio-button>
            <el-radio-button value="custom">自定义</el-radio-button>
          </el-radio-group>
          <div v-if="dateRange === 'custom'" class="custom-date-range">
            <el-date-picker
              v-model="customStartDate"
              type="date"
              placeholder="开始日期"
              value-format="YYYY-MM-DD"
              size="small"
              @change="doSearch()"
            />
            <span class="date-separator">至</span>
            <el-date-picker
              v-model="customEndDate"
              type="date"
              placeholder="结束日期"
              value-format="YYYY-MM-DD"
              size="small"
              @change="doSearch()"
            />
          </div>
        </div>
      </div>

      <!-- Search History -->
      <div v-if="searchHistory.length > 0 && !results.length && !keyword" class="history-section">
        <div class="history-header">
          <span class="history-title">搜索历史</span>
          <el-button link type="danger" size="small" @click="clearHistory">清空</el-button>
        </div>
        <div class="history-tags">
          <el-tag
            v-for="item in searchHistory"
            :key="item"
            size="small"
            class="history-tag"
            @click="useHistoryItem(item)"
          >
            {{ item }}
          </el-tag>
        </div>
      </div>

      <!-- Results -->
      <div class="results-section">
        <div v-if="loading && !results.length" class="results-loading" v-loading="true" />
        <template v-else-if="results.length">
          <div class="results-header">
            <span>找到 {{ total }} 条消息</span>
            <el-button link size="small" @click="resetFilters">重置筛选</el-button>
          </div>
          <div class="results-list">
            <div
              v-for="msg in results"
              :key="msg.id"
              class="result-item"
              @click="handleResultClick(msg)"
            >
              <el-avatar :size="36" :src="getSenderAvatar(msg)" class="result-avatar">
                {{ getSenderName(msg).charAt(0) }}
              </el-avatar>
              <div class="result-content">
                <div class="result-header-row">
                  <span class="result-type-icon">
                    <Document v-if="msg.type === 'text'" />
                    <Picture v-else-if="msg.type === 'image'" />
                    <Goods v-else-if="msg.type === 'product'" />
                    <Tickets v-else-if="msg.type === 'order'" />
                  </span>
                  <span class="result-preview">{{ getMessagePreview(msg) }}</span>
                </div>
                <div class="result-meta">
                  <span class="result-sender">{{ getSenderName(msg) }}</span>
                  <span class="result-time">{{ formatRelativeTime(msg.createdAt) }}</span>
                </div>
              </div>
            </div>
          </div>
          <div v-if="hasMore" class="load-more">
            <el-button link :loading="loading" @click="loadMore">加载更多</el-button>
          </div>
        </template>
        <div v-else-if="keyword || selectedType || selectedSender !== 'all' || dateRange !== 'all'" class="results-empty">
          未找到符合条件的消息
        </div>
        <div v-else class="results-placeholder">
          输入关键词或选择筛选条件开始搜索
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;
@use '@/assets/styles/mixins' as *;

.search-dialog-content {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.search-input-row {
  display: flex;
  gap: $spacing-sm;

  .el-input {
    flex: 1;
  }
}

.filters-section {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  padding: $spacing-sm;
  background: $color-bg-page;
  border-radius: $radius-md;
}

.filter-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: $spacing-sm;
}

.filter-label {
  font-size: $font-size-small;
  color: $color-text-secondary;
  min-width: 60px;
}

.custom-date-range {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  margin-top: $spacing-xs;
  width: 100%;
}

.date-separator {
  color: $color-text-placeholder;
  font-size: $font-size-small;
}

.history-section {
  padding: $spacing-sm;
  background: $color-bg-page;
  border-radius: $radius-md;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-xs;
}

.history-title {
  font-size: $font-size-small;
  color: $color-text-secondary;
}

.history-tags {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-xs;
}

.history-tag {
  cursor: pointer;

  &:hover {
    opacity: 0.8;
  }
}

.results-section {
  min-height: 200px;
  max-height: 400px;
  overflow-y: auto;
}

.results-loading {
  height: 200px;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-xs 0;
  font-size: $font-size-small;
  color: $color-text-secondary;
}

.results-list {
  display: flex;
  flex-direction: column;
}

.result-item {
  display: flex;
  gap: $spacing-sm;
  padding: $spacing-sm;
  cursor: pointer;
  border-radius: $radius-md;
  transition: background $transition-fast;

  &:hover {
    background: $color-primary-pale;
  }
}

.result-avatar {
  flex-shrink: 0;
}

.result-content {
  flex: 1;
  min-width: 0;
}

.result-header-row {
  display: flex;
  align-items: flex-start;
  gap: $spacing-xs;
}

.result-type-icon {
  color: $color-text-secondary;
  font-size: 14px;
  flex-shrink: 0;
}

.result-preview {
  font-size: $font-size-body;
  color: $color-text-primary;
  @include text-ellipsis(2);
}

.result-meta {
  display: flex;
  gap: $spacing-sm;
  margin-top: $spacing-xs;
  font-size: $font-size-tiny;
  color: $color-text-placeholder;
}

.load-more {
  text-align: center;
  padding: $spacing-sm 0;
}

.results-empty,
.results-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: $color-text-placeholder;
  font-size: $font-size-body;
}
</style>
