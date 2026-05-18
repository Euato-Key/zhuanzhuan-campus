<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getWantBuyComments,
  createWantBuyComment,
  type WantBuyComment,
} from '@/api/modules/want-buy'
import { useUserStore } from '@/stores/user'
import { useAuthDialog } from '@/composables/useAuthDialog'
import { showError } from '@/utils/error'
import WantBuyCommentItem from './WantBuyCommentItem.vue'

const props = defineProps<{
  wantBuyId: number
}>()

const userStore = useUserStore()
const authDialog = useAuthDialog()

// 评论列表
const comments = ref<WantBuyComment[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

// 新评论输入
const newCommentContent = ref('')
const submitLoading = ref(false)

// 回复状态
const replyingTo = ref<WantBuyComment | null>(null)
const replyingToParent = ref<number | null>(null) // 一级评论的ID（用于提交回复时）
const replyContent = ref('')
const replyLoading = ref(false)

// 获取评论列表
async function fetchComments() {
  loading.value = true
  try {
    const res = await getWantBuyComments(props.wantBuyId, {
      page: page.value,
      pageSize: pageSize.value,
    })
    if (res.data.code === 200) {
      comments.value = res.data.data.list
      total.value = res.data.data.total
    }
  } catch (err) {
    showError(err, '获取评论失败')
  } finally {
    loading.value = false
  }
}

// 发表评论
async function submitComment() {
  if (!userStore.isLoggedIn) {
    authDialog.open('login')
    return
  }
  if (!newCommentContent.value.trim()) {
    ElMessage.warning('请输入评论内容')
    return
  }
  submitLoading.value = true
  try {
    const res = await createWantBuyComment(props.wantBuyId, {
      content: newCommentContent.value.trim(),
    })
    if (res.data.code === 200) {
      // 添加到列表开头
      comments.value.unshift(res.data.data)
      total.value += 1
      newCommentContent.value = ''
      ElMessage.success('评论成功')
    }
  } catch (err) {
    showError(err, '评论失败')
  } finally {
    submitLoading.value = false
  }
}

// 开始回复
function startReply(comment: WantBuyComment) {
  replyingTo.value = comment
  replyContent.value = ''

  // 如果回复的是二级评论，找到它的一级父评论ID
  if (comment.parentId) {
    replyingToParent.value = comment.parentId
  } else {
    // 如果回复的是一级评论，父评论就是它自己
    replyingToParent.value = comment.id
  }
}

// 取消回复
function cancelReply() {
  replyingTo.value = null
  replyingToParent.value = null
  replyContent.value = ''
}

// 提交回复
async function submitReply() {
  if (!userStore.isLoggedIn) {
    authDialog.open('login')
    return
  }
  if (!replyContent.value.trim()) {
    ElMessage.warning('请输入回复内容')
    return
  }
  if (!replyingToParent.value) {
    ElMessage.error('回复目标不存在')
    return
  }

  replyLoading.value = true
  try {
    // 只有当回复的是二级评论时才传 replyToId
    // 回复一级评论时，replyToId 为 undefined
    const replyToId = replyingTo.value?.parentId ? replyingTo.value?.id : undefined

    const res = await createWantBuyComment(props.wantBuyId, {
      content: replyContent.value.trim(),
      parentId: replyingToParent.value, // 一级评论ID
      replyToId, // 只有回复二级评论时才传递
    })
    if (res.data.code === 200) {
      // 找到一级父评论，添加回复
      const parent = comments.value.find((c) => c.id === replyingToParent.value)
      if (parent) {
        if (!parent.replies) {
          parent.replies = []
        }
        parent.replies.push(res.data.data)
      }
      replyContent.value = ''
      replyingTo.value = null
      replyingToParent.value = null
      ElMessage.success('回复成功')
    }
  } catch (err) {
    showError(err, '回复失败')
  } finally {
    replyLoading.value = false
  }
}

// 评论被删除
function handleCommentDeleted() {
  fetchComments()
}

// 分页变化
function handlePageChange(newPage: number) {
  page.value = newPage
  fetchComments()
}

// 监听wantBuyId变化
watch(
  () => props.wantBuyId,
  () => {
    page.value = 1
    fetchComments()
  }
)

onMounted(fetchComments)
</script>

<template>
  <div class="comment-section">
    <h3 class="section-title">评论 ({{ total }})</h3>

    <!-- 发表评论 -->
    <div class="comment-input-area">
      <el-input
        v-model="newCommentContent"
        type="textarea"
        :rows="3"
        placeholder="写下你的评论..."
        maxlength="500"
        show-word-limit
      />
      <div class="submit-row">
        <el-button type="primary" :loading="submitLoading" @click="submitComment">
          发表评论
        </el-button>
      </div>
    </div>

    <!-- 评论列表 -->
    <div class="comment-list" v-loading="loading">
      <template v-for="comment in comments" :key="comment.id">
        <!-- 一级评论 -->
        <WantBuyCommentItem
          :comment="comment"
          :want-buy-id="wantBuyId"
          @reply="startReply"
          @deleted="handleCommentDeleted"
        />

        <!-- 回复输入框（在一级评论下方） -->
        <div v-if="replyingToParent === comment.id" class="reply-input-area">
          <div class="reply-header">
            <span v-if="replyingTo">
              回复 <span class="reply-to-name">@{{ replyingTo.user?.username }}</span>
            </span>
          </div>
          <el-input
            v-model="replyContent"
            type="textarea"
            :rows="2"
            placeholder="写下你的回复..."
            maxlength="500"
            show-word-limit
          />
          <div class="reply-actions">
            <el-button size="small" @click="cancelReply">取消</el-button>
            <el-button size="small" type="primary" :loading="replyLoading" @click="submitReply">
              回复
            </el-button>
          </div>
        </div>

        <!-- 二级评论列表 -->
        <div v-if="comment.replies?.length" class="replies-container">
          <WantBuyCommentItem
            v-for="reply in comment.replies"
            :key="reply.id"
            :comment="reply"
            :want-buy-id="wantBuyId"
            is-reply
            @reply="startReply"
            @deleted="handleCommentDeleted"
          />
        </div>
      </template>

      <el-empty v-if="!loading && comments.length === 0" description="暂无评论，快来抢沙发吧！" />
    </div>

    <!-- 分页 -->
    <div v-if="total > pageSize" class="pagination-container">
      <el-pagination
        :current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next"
        @current-change="handlePageChange"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.comment-section {
  margin-top: $spacing-xl;
}

.section-title {
  font-size: $font-size-h4;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
  margin: 0 0 $spacing-lg;
}

.comment-input-area {
  margin-bottom: $spacing-lg;
}

.submit-row {
  display: flex;
  justify-content: flex-end;
  margin-top: $spacing-sm;
}

.comment-list {
  min-height: 100px;
}

.reply-input-area {
  margin-left: 48px;
  margin-bottom: $spacing-md;
  padding: $spacing-sm $spacing-md;
  background: $color-bg-page;
  border-radius: $radius-md;
}

.reply-header {
  font-size: $font-size-small;
  color: $color-text-secondary;
  margin-bottom: $spacing-sm;
}

.reply-to-name {
  color: $color-primary;
}

.reply-actions {
  display: flex;
  justify-content: flex-end;
  gap: $spacing-sm;
  margin-top: $spacing-sm;
}

.replies-container {
  margin-left: 48px;
  padding-left: $spacing-sm;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: $spacing-lg;
}
</style>