<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Back } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppLayout from '@/components/layout/AppLayout.vue'
import PublishWantBuyDialog from '@/components/want-buy/PublishWantBuyDialog.vue'
import WantBuyCommentList from '@/components/want-buy/WantBuyCommentList.vue'
import {
  getWantBuyById,
  deleteWantBuy,
  markWantBuyFound,
  closeWantBuy,
  reopenWantBuy,
  type WantBuyDetail,
  WANT_BUY_STATUS_LABELS,
  WANT_BUY_STATUS_TAG_TYPE,
} from '@/api/modules/want-buy'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import { useAuthDialog } from '@/composables/useAuthDialog'
import { getOssUrl } from '@/utils/oss'
import { showError, showSuccess } from '@/utils/error'
import { formatRelativeTime, formatDate } from '@/utils/format'
import ReportDialog from '@/components/report/ReportDialog.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const chatStore = useChatStore()
const authDialog = useAuthDialog()

const loading = ref(true)
const wantBuy = ref<WantBuyDetail | null>(null)

// 编辑弹窗
const editDialogVisible = ref(false)

// 是否是发布者
const isOwner = computed(() => {
  return userStore.user && wantBuy.value && userStore.user.id === wantBuy.value.userId
})

const reportDialogVisible = ref(false)

// 是否可以编辑
const canEdit = computed(() => {
  return isOwner.value && wantBuy.value?.status === 'active'
})

// 是否可以删除
const canDelete = computed(() => {
  return isOwner.value
})

// 是否可以标记找到
const canMarkFound = computed(() => {
  return isOwner.value && wantBuy.value?.status === 'active'
})

// 是否可以关闭
const canClose = computed(() => {
  return isOwner.value && wantBuy.value?.status === 'active'
})

// 是否可以重新开启
const canReopen = computed(() => {
  return isOwner.value && ['found', 'closed', 'expired'].includes(wantBuy.value?.status || '')
})

// 用户头像
const userAvatar = computed(() => {
  if (!wantBuy.value?.user?.avatar) return undefined
  return getOssUrl(wantBuy.value.user.avatar)
})

// 用户名首字母
const userInitial = computed(() => {
  return wantBuy.value?.user?.username?.charAt(0) || '?'
})

// 预算显示
const budgetText = computed(() => {
  if (!wantBuy.value) return ''
  const { budgetMin, budgetMax } = wantBuy.value
  if (budgetMin !== null && budgetMax !== null) {
    return `¥${budgetMin} ~ ¥${budgetMax}`
  } else if (budgetMin !== null) {
    return `¥${budgetMin}起`
  } else if (budgetMax !== null) {
    return `¥${budgetMax}以内`
  }
  return '面议'
})

// 状态标签类型
const statusTagType = computed(() => {
  if (!wantBuy.value) return 'info'
  return WANT_BUY_STATUS_TAG_TYPE[wantBuy.value.status]
})

// 状态标签文本
const statusLabel = computed(() => {
  if (!wantBuy.value) return ''
  return WANT_BUY_STATUS_LABELS[wantBuy.value.status]
})

// 剩余时间
const remainingText = computed(() => {
  if (!wantBuy.value || wantBuy.value.status !== 'active' || !wantBuy.value.expireTime) {
    return null
  }
  const expireTime = new Date(wantBuy.value.expireTime).getTime()
  const now = Date.now()
  const diff = expireTime - now
  if (diff <= 0) return '已过期'
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  return `剩余${days}天`
})

// 获取详情
async function fetchWantBuy() {
  loading.value = true
  try {
    const id = route.params.id as string
    const res = await getWantBuyById(parseInt(id, 10))
    if (res.data.code === 200) {
      wantBuy.value = res.data.data
    } else {
      ElMessage.error('求购信息不存在')
      router.push({ name: 'WantBuy' })
    }
  } catch (err) {
    console.error('获取求购详情失败', err)
    ElMessage.error('获取求购详情失败')
    router.push({ name: 'WantBuy' })
  } finally {
    loading.value = false
  }
}

// 联系发布者
async function contactUser() {
  if (!userStore.isLoggedIn) {
    authDialog.open('login')
    return
  }
  if (!wantBuy.value) return
  const conversationId = await chatStore.openConversation(wantBuy.value.userId)
  if (conversationId) {
    router.push({ name: 'ChatRoom', params: { id: conversationId } })
  }
}

// 查看用户主页
function viewUserProfile() {
  if (!wantBuy.value) return
  router.push({ name: 'UserProfile', params: { id: wantBuy.value.userId } })
}

// 编辑
function handleEdit() {
  editDialogVisible.value = true
}

// 删除
async function handleDelete() {
  if (!wantBuy.value) return
  try {
    await ElMessageBox.confirm('确定要删除这条求购吗？删除后无法恢复', '警告', { type: 'warning' })
    const res = await deleteWantBuy(wantBuy.value.id)
    if (res.data.code === 200) {
      showSuccess('删除成功')
      router.push({ name: 'WantBuy' })
    }
  } catch (err) {
    if (err !== 'cancel') showError(err, '删除失败')
  }
}

// 标记找到
async function handleMarkFound() {
  if (!wantBuy.value) return
  try {
    await ElMessageBox.confirm('确定标记为已找到吗？', '提示', { type: 'info' })
    const res = await markWantBuyFound(wantBuy.value.id)
    if (res.data.code === 200) {
      showSuccess('已标记为找到')
      fetchWantBuy()
    }
  } catch (err) {
    if (err !== 'cancel') showError(err, '操作失败')
  }
}

// 关闭
async function handleClose() {
  if (!wantBuy.value) return
  try {
    await ElMessageBox.confirm('确定要关闭这条求购吗？', '提示', { type: 'warning' })
    const res = await closeWantBuy(wantBuy.value.id)
    if (res.data.code === 200) {
      showSuccess('已关闭')
      fetchWantBuy()
    }
  } catch (err) {
    if (err !== 'cancel') showError(err, '操作失败')
  }
}

// 重新开启
async function handleReopen() {
  if (!wantBuy.value) return
  try {
    await ElMessageBox.confirm('确定要重新开启这条求购吗？', '提示', { type: 'info' })
    const res = await reopenWantBuy(wantBuy.value.id)
    if (res.data.code === 200) {
      showSuccess('已重新开启')
      fetchWantBuy()
    }
  } catch (err) {
    if (err !== 'cancel') showError(err, '操作失败')
  }
}

// 返回
function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push({ name: 'WantBuy' })
  }
}

onMounted(fetchWantBuy)
</script>

<template>
  <AppLayout>
    <div class="want-buy-detail-page" v-loading="loading">
      <template v-if="wantBuy">
        <!-- 返回按钮 -->
        <div class="back-nav">
          <el-button link class="back-btn" @click="goBack">
            <el-icon><Back /></el-icon>
            返回
          </el-button>
        </div>

        <!-- 发布者信息卡片 -->
        <div class="user-card">
          <div class="user-avatar" @click="viewUserProfile">
            <el-avatar :size="48" :src="userAvatar">
              {{ userInitial }}
            </el-avatar>
          </div>
          <div class="user-details">
            <div class="user-name-row">
              <span class="user-name">{{ wantBuy.user?.username || '匿名用户' }}</span>
              <el-tag v-if="wantBuy.user?.school" size="small" type="info">
                {{ wantBuy.user.school }}
              </el-tag>
            </div>
            <div class="user-meta">
              <span v-if="wantBuy.user?.campus">{{ wantBuy.user.campus }}</span>
              <span>{{ formatRelativeTime(wantBuy.createdAt) }}发布</span>
            </div>
          </div>
          <div class="user-actions">
            <el-button v-if="!isOwner" type="primary" @click="contactUser">联系TA</el-button>
            <el-button @click="viewUserProfile">查看主页</el-button>
          </div>
        </div>

        <div class="detail-container">
          <!-- 左侧：图片区 -->
          <div class="image-section">
            <div class="main-image">
              <el-image
                v-if="wantBuy.images?.length"
                :src="getOssUrl(wantBuy.images[0])"
                :preview-src-list="wantBuy.images.map(getOssUrl)"
                fit="cover"
              />
              <div v-else class="placeholder-image">
                <el-icon size="64"><i class="el-icon-shopping-cart-2" /></el-icon>
                <span>求购商品</span>
              </div>
            </div>
            <div v-if="wantBuy.images && wantBuy.images.length > 1" class="thumbnail-list">
              <div
                v-for="(img, index) in wantBuy.images"
                :key="index"
                class="thumbnail-item"
              >
                <img :src="img" :alt="`图片${index + 1}`" />
              </div>
            </div>
          </div>

          <!-- 右侧：信息区 -->
          <div class="info-section">
            <!-- 状态标签 -->
            <div class="status-row">
              <el-tag :type="statusTagType" size="large">
                {{ statusLabel }}
              </el-tag>
              <el-tag v-if="remainingText" type="warning" size="large">
                {{ remainingText }}
              </el-tag>
            </div>

            <h1 class="name">{{ wantBuy.name }}</h1>

            <!-- 分类 -->
            <div v-if="wantBuy.category" class="category-row">
              <el-tag effect="plain">{{ wantBuy.category.name }}</el-tag>
            </div>

            <!-- 预算 -->
            <div class="budget-row">
              <span class="budget-label">预算:</span>
              <span class="budget-value">{{ budgetText }}</span>
            </div>

            <!-- 数量 -->
            <div class="quantity-row">
              <span class="label">求购数量:</span>
              <span class="value">{{ wantBuy.quantity }}件</span>
            </div>

            <!-- 标签 -->
            <div v-if="wantBuy.tags?.length" class="tags-row">
              <el-tag
                v-for="tag in wantBuy.tags"
                :key="tag"
                size="small"
                type="info"
                effect="plain"
              >
                {{ tag }}
              </el-tag>
            </div>

            <!-- 描述 -->
            <div class="description-section">
              <h3>商品描述</h3>
              <p class="description-text">{{ wantBuy.description || '暂无描述' }}</p>
            </div>

            <!-- 有效期 -->
            <div class="expire-row">
              <span class="label">有效期:</span>
              <span class="value">{{ wantBuy.validDays }}天</span>
              <span v-if="wantBuy.expireTime" class="expire-time">
                (截止 {{ formatDate(wantBuy.expireTime) }})
              </span>
            </div>

            <!-- 统计 -->
            <div class="stats-row">
              <span>{{ wantBuy.viewCount }} 浏览</span>
              <span>{{ wantBuy.commentCount }} 评论</span>
            </div>

            <!-- 操作按钮 -->
            <div class="action-row">
              <template v-if="isOwner">
                <el-button v-if="canEdit" @click="handleEdit">编辑</el-button>
                <el-button v-if="canMarkFound" type="success" @click="handleMarkFound">
                  标记找到
                </el-button>
                <el-button v-if="canClose" type="warning" @click="handleClose">关闭</el-button>
                <el-button v-if="canReopen" type="primary" @click="handleReopen">
                  重新开启
                </el-button>
                <el-button v-if="canDelete" type="danger" @click="handleDelete">删除</el-button>
              </template>
              <template v-else>
                <el-button type="primary" @click="contactUser">联系发布者</el-button>
                <el-button type="warning" plain @click="reportDialogVisible = true">举报</el-button>
              </template>
            </div>
          </div>
        </div>

        <!-- 评论区域 -->
        <div class="comment-container">
          <WantBuyCommentList :want-buy-id="wantBuy.id" />
        </div>

        <!-- 编辑弹窗 -->
        <PublishWantBuyDialog
          v-model="editDialogVisible"
          :want-buy="wantBuy"
          @success="fetchWantBuy"
        />
      </template>
      <ReportDialog v-if="wantBuy" v-model="reportDialogVisible" target-type="want_buy" :target-id="wantBuy.id" />
    </div>
  </AppLayout>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.want-buy-detail-page {
  max-width: $container-xl;
  margin: 0 auto;
  padding: $spacing-lg;
}

.back-nav {
  margin-bottom: $spacing-md;

  .back-btn {
    color: $color-text-secondary;
    font-size: $font-size-body;

    &:hover {
      color: $color-primary;
    }

    .el-icon {
      margin-right: $spacing-xs;
    }
  }
}

.user-card {
  display: flex;
  align-items: center;
  gap: $spacing-lg;
  background: $color-bg-card;
  border-radius: $radius-lg;
  padding: $spacing-md $spacing-lg;
  margin-bottom: $spacing-lg;
  box-shadow: $shadow-sm;
}

.user-avatar {
  cursor: pointer;
  transition: transform $transition-fast;

  &:hover {
    transform: scale(1.05);
  }
}

.user-details {
  flex: 1;
}

.user-name-row {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin-bottom: $spacing-xs;
}

.user-name {
  font-size: $font-size-h4;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
}

.user-meta {
  display: flex;
  gap: $spacing-md;
  font-size: $font-size-small;
  color: $color-text-secondary;
}

.user-actions {
  display: flex;
  gap: $spacing-sm;
}

.detail-container {
  display: flex;
  gap: $spacing-xl;
  margin-bottom: $spacing-xl;
}

.image-section {
  flex-shrink: 0;
  width: 400px;
}

.main-image {
  width: 100%;
  aspect-ratio: 1;
  border-radius: $radius-lg;
  overflow: hidden;
  background: $color-bg-page;

  :deep(.el-image) {
    width: 100%;
    height: 100%;
  }

  .placeholder-image {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: $spacing-md;
    color: $color-text-placeholder;
  }
}

.thumbnail-list {
  display: flex;
  gap: $spacing-sm;
  margin-top: $spacing-md;
  overflow-x: auto;
}

.thumbnail-item {
  width: 60px;
  height: 60px;
  border-radius: $radius-md;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color $transition-fast;

  &:hover {
    border-color: $color-primary;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.info-section {
  flex: 1;
  min-width: 0;
}

.status-row {
  display: flex;
  gap: $spacing-sm;
  margin-bottom: $spacing-md;
}

.name {
  font-size: $font-size-h2;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
  margin: 0 0 $spacing-sm;
  line-height: $line-height-tight;
}

.category-row {
  margin-bottom: $spacing-md;
}

.budget-row {
  display: flex;
  align-items: baseline;
  gap: $spacing-sm;
  margin-bottom: $spacing-md;
}

.budget-label {
  font-size: $font-size-body;
  color: $color-text-secondary;
}

.budget-value {
  font-size: $font-size-h3;
  font-weight: $font-weight-bold;
  color: $color-primary;
}

.quantity-row {
  margin-bottom: $spacing-md;
  font-size: $font-size-body;
  color: $color-text-secondary;

  .label {
    margin-right: $spacing-xs;
  }
}

.tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-xs;
  margin-bottom: $spacing-lg;
}

.description-section {
  background: $color-bg-page;
  border-radius: $radius-md;
  padding: $spacing-md;
  margin-bottom: $spacing-lg;

  h3 {
    font-size: $font-size-body;
    font-weight: $font-weight-medium;
    color: $color-text-primary;
    margin: 0 0 $spacing-sm;
  }
}

.description-text {
  font-size: $font-size-body;
  color: $color-text-primary;
  line-height: $line-height-relaxed;
  white-space: pre-wrap;
  margin: 0;
}

.expire-row {
  font-size: $font-size-small;
  color: $color-text-secondary;
  margin-bottom: $spacing-md;

  .expire-time {
    color: $color-text-placeholder;
  }
}

.stats-row {
  display: flex;
  gap: $spacing-lg;
  color: $color-text-secondary;
  font-size: $font-size-small;
  margin-bottom: $spacing-lg;
}

.action-row {
  display: flex;
  gap: $spacing-md;
  flex-wrap: wrap;
}

.comment-container {
  background: $color-bg-card;
  border-radius: $radius-lg;
  padding: $spacing-lg;
  box-shadow: $shadow-sm;
}

@media (max-width: $breakpoint-md) {
  .user-card {
    flex-wrap: wrap;
    text-align: center;

    .user-details {
      width: 100%;
    }

    .user-actions {
      width: 100%;
      justify-content: center;
      margin-top: $spacing-sm;
    }
  }

  .detail-container {
    flex-direction: column;
  }

  .image-section {
    width: 100%;
  }

  .action-row {
    flex-wrap: wrap;
  }
}
</style>