<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Star } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  type WantBuyComment,
  updateWantBuyComment,
  deleteWantBuyComment,
  likeWantBuyComment,
  unlikeWantBuyComment,
} from '@/api/modules/want-buy'
import { getOssUrl } from '@/utils/oss'
import { formatRelativeTime } from '@/utils/format'
import { useUserStore } from '@/stores/user'
import { showError } from '@/utils/error'
import ReportDialog from '@/components/report/ReportDialog.vue'

const props = defineProps<{
  comment: WantBuyComment
  wantBuyId: number
  isReply?: boolean
}>()

const emit = defineEmits<{
  (e: 'reply', comment: WantBuyComment): void
  (e: 'deleted'): void
}>()

const router = useRouter()
const userStore = useUserStore()

// 是否是自己的评论
const isOwner = computed(() => {
  return userStore.user?.id === props.comment.userId
})

const reportDialogVisible = ref(false)

// 用户头像
const userAvatar = computed(() => {
  if (!props.comment.user?.avatar) return undefined
  return getOssUrl(props.comment.user.avatar)
})

// 用户名首字母
const userInitial = computed(() => {
  return props.comment.user?.username?.charAt(0) || '?'
})

// 回复目标用户（从 replyTo 字段获取）
const replyToUser = computed(() => {
  // 如果有 replyTo 字段且包含 user 信息，返回它
  if (props.comment.replyTo?.user) {
    return props.comment.replyTo.user
  }
  return null
})

// 是否显示"回复@用户名"（二级评论且有回复目标时显示）
const showReplyTo = computed(() => {
  return props.isReply && props.comment.replyToId && replyToUser.value
})

// 是否已点赞
const isLiked = ref(props.comment.isLiked)
const likeCount = ref(props.comment.likeCount)
const likeLoading = ref(false)

// 编辑状态
const isEditing = ref(false)
const editContent = ref('')
const editLoading = ref(false)

// 点赞/取消点赞
async function handleLike() {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    return
  }
  likeLoading.value = true
  try {
    if (isLiked.value) {
      const res = await unlikeWantBuyComment(props.comment.id)
      if (res.data.code === 200) {
        isLiked.value = false
        likeCount.value = res.data.data.likeCount
      }
    } else {
      const res = await likeWantBuyComment(props.comment.id)
      if (res.data.code === 200) {
        isLiked.value = true
        likeCount.value = res.data.data.likeCount
      }
    }
  } catch (err) {
    showError(err, '操作失败')
  } finally {
    likeLoading.value = false
  }
}

// 回复
function handleReply() {
  emit('reply', props.comment)
}

// 编辑
function startEdit() {
  isEditing.value = true
  editContent.value = props.comment.content
}

async function saveEdit() {
  if (!editContent.value.trim()) {
    ElMessage.warning('评论内容不能为空')
    return
  }
  editLoading.value = true
  try {
    const res = await updateWantBuyComment(props.comment.id, editContent.value.trim())
    if (res.data.code === 200) {
      props.comment.content = editContent.value.trim()
      isEditing.value = false
      ElMessage.success('修改成功')
    }
  } catch (err) {
    showError(err, '修改失败')
  } finally {
    editLoading.value = false
  }
}

function cancelEdit() {
  isEditing.value = false
  editContent.value = ''
}

// 删除
async function handleDelete() {
  try {
    await ElMessageBox.confirm('确定要删除这条评论吗？', '提示', { type: 'warning' })
    const res = await deleteWantBuyComment(props.comment.id)
    if (res.data.code === 200) {
      ElMessage.success('删除成功')
      emit('deleted')
    }
  } catch (err) {
    if (err !== 'cancel') showError(err, '删除失败')
  }
}

// 查看用户主页
function viewUser() {
  router.push({ name: 'UserProfile', params: { id: props.comment.userId } })
}

// 查看被回复用户的主页
function viewReplyToUser() {
  if (replyToUser.value?.id) {
    router.push({ name: 'UserProfile', params: { id: replyToUser.value.id } })
  }
}
</script>

<template>
  <div class="comment-item" :class="{ isReply }">
    <!-- 评论头部 -->
    <div class="comment-header">
      <div class="user-info" @click="viewUser">
        <el-avatar :size="isReply ? 28 : 36" :src="userAvatar">
          {{ userInitial }}
        </el-avatar>
        <span class="username">{{ comment.user?.username || '匿名用户' }}</span>
      </div>
      <span class="time">{{ formatRelativeTime(comment.createdAt) }}</span>
    </div>

    <!-- 评论内容 -->
    <div class="comment-content">
      <template v-if="isEditing">
        <el-input
          v-model="editContent"
          type="textarea"
          :rows="2"
          maxlength="500"
          show-word-limit
        />
        <div class="edit-actions">
          <el-button size="small" @click="cancelEdit">取消</el-button>
          <el-button size="small" type="primary" :loading="editLoading" @click="saveEdit">
            保存
          </el-button>
        </div>
      </template>
      <template v-else>
        <!-- 二级评论显示"回复@用户名" -->
        <span v-if="showReplyTo" class="reply-to">
          回复 <span class="reply-to-name" @click.stop="viewReplyToUser">@{{ replyToUser?.username }}</span>：
        </span>
        {{ comment.content }}
      </template>
    </div>

    <!-- 评论操作 -->
    <div v-if="!isEditing" class="comment-actions">
      <el-button
        :type="isLiked ? 'warning' : 'default'"
        size="small"
        link
        :loading="likeLoading"
        @click="handleLike"
      >
        <el-icon :class="{ 'is-liked': isLiked }"><Star /></el-icon>
        {{ likeCount }}
      </el-button>
      <el-button size="small" link @click="handleReply">回复</el-button>
      <el-button v-if="!isOwner" size="small" type="warning" link @click="reportDialogVisible = true">举报</el-button>
      <el-button v-if="isOwner" size="small" link @click="startEdit">编辑</el-button>
      <el-button v-if="isOwner" size="small" type="danger" link @click="handleDelete">
        删除
      </el-button>
    </div>
    <ReportDialog v-model="reportDialogVisible" target-type="comment" :target-id="comment.id" />
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.comment-item {
  padding: $spacing-md 0;
  border-bottom: 1px solid $color-border;

  &:last-child {
    border-bottom: none;
  }

  &.isReply {
    padding: $spacing-sm $spacing-md;
    background: $color-bg-page;
    border-radius: $radius-md;
    margin-top: $spacing-sm;
    border-bottom: none;
  }
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-xs;
}

.user-info {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  cursor: pointer;

  &:hover {
    opacity: 0.8;
  }
}

.username {
  font-size: $font-size-body;
  font-weight: $font-weight-medium;
  color: $color-text-primary;
}

.time {
  font-size: $font-size-small;
  color: $color-text-placeholder;
}

.comment-content {
  font-size: $font-size-body;
  color: $color-text-primary;
  line-height: $line-height-normal;
  white-space: pre-wrap;
  margin-bottom: $spacing-xs;
}

.reply-to {
  color: $color-text-secondary;
  font-size: $font-size-body;
}

.reply-to-name {
  color: $color-primary;
  cursor: pointer;
  transition: opacity $transition-fast;

  &:hover {
    opacity: 0.8;
    text-decoration: underline;
  }
}

.edit-actions {
  display: flex;
  gap: $spacing-sm;
  margin-top: $spacing-sm;
}

.comment-actions {
  display: flex;
  gap: $spacing-sm;
}

.is-liked {
  color: $color-warning;
}
</style>