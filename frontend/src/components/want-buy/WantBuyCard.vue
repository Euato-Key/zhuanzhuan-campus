<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  type WantBuyListItem,
  WANT_BUY_STATUS_LABELS,
  WANT_BUY_STATUS_TAG_TYPE,
} from '@/api/modules/want-buy'
import { getOssUrl } from '@/utils/oss'
import { formatRelativeTime } from '@/utils/format'

const props = defineProps<{
  wantBuy: WantBuyListItem
  showActions?: boolean
}>()

const emit = defineEmits<{
  (e: 'click', id: number): void
  (e: 'edit', id: number): void
  (e: 'delete', id: number): void
}>()

const router = useRouter()

// 第一张图片
const coverImage = computed(() => {
  if (props.wantBuy.images?.length) {
    return props.wantBuy.images[0]
  }
  return null
})

// 用户头像
const userAvatar = computed(() => {
  if (!props.wantBuy.user?.avatar) return undefined
  return getOssUrl(props.wantBuy.user.avatar)
})

// 用户名首字母
const userInitial = computed(() => {
  return props.wantBuy.user?.username?.charAt(0) || '?'
})

// 预算显示
const budgetText = computed(() => {
  const { budgetMin, budgetMax } = props.wantBuy
  if (budgetMin !== null && budgetMax !== null) {
    return `¥${budgetMin} ~ ¥${budgetMax}`
  } else if (budgetMin !== null) {
    return `¥${budgetMin}起`
  } else if (budgetMax !== null) {
    return `¥${budgetMax}以内`
  }
  return '面议'
})

// 剩余时间
const remainingText = computed(() => {
  if (props.wantBuy.status !== 'active' || !props.wantBuy.expireTime) {
    return null
  }
  const expireTime = new Date(props.wantBuy.expireTime).getTime()
  const now = Date.now()
  const diff = expireTime - now
  if (diff <= 0) return '已过期'
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (days <= 3) return `剩余${days}天`
  return null
})

// 状态标签类型
const statusTagType = computed(() => {
  return WANT_BUY_STATUS_TAG_TYPE[props.wantBuy.status]
})

// 状态标签文本
const statusLabel = computed(() => {
  return WANT_BUY_STATUS_LABELS[props.wantBuy.status]
})

// 点击卡片
function handleClick() {
  emit('click', props.wantBuy.id)
}

// 编辑
function handleEdit(e: Event) {
  e.stopPropagation()
  emit('edit', props.wantBuy.id)
}

// 删除
function handleDelete(e: Event) {
  e.stopPropagation()
  emit('delete', props.wantBuy.id)
}

// 查看用户主页
function viewUser(e: Event) {
  e.stopPropagation()
  router.push({ name: 'UserProfile', params: { id: props.wantBuy.userId } })
}
</script>

<template>
  <div class="want-buy-card" @click="handleClick">
    <!-- 状态标签 -->
    <div class="status-badge">
      <el-tag :type="statusTagType" size="small" effect="dark">
        {{ statusLabel }}
      </el-tag>
      <el-tag v-if="remainingText" type="warning" size="small" effect="plain">
        {{ remainingText }}
      </el-tag>
    </div>

    <!-- 图片区域 -->
    <div class="image-area">
      <img v-if="coverImage" :src="coverImage" alt="商品图片" />
      <div v-else class="placeholder">
        <el-icon size="32"><i class="el-icon-shopping-cart-2" /></el-icon>
        <span>求购</span>
      </div>
    </div>

    <!-- 信息区域 -->
    <div class="info-area">
      <h3 class="name">{{ wantBuy.name }}</h3>

      <div class="budget-row">
        <span class="budget-label">预算:</span>
        <span class="budget-value">{{ budgetText }}</span>
      </div>

      <div class="quantity-row">
        <span>求购数量: {{ wantBuy.quantity }}件</span>
      </div>

      <!-- 标签 -->
      <div v-if="wantBuy.tags?.length" class="tags-row">
        <el-tag
          v-for="tag in wantBuy.tags.slice(0, 3)"
          :key="tag"
          size="small"
          type="info"
          effect="plain"
        >
          {{ tag }}
        </el-tag>
        <span v-if="wantBuy.tags.length > 3" class="more-tags">+{{ wantBuy.tags.length - 3 }}</span>
      </div>

      <!-- 底部 -->
      <div class="footer">
        <div class="user-info" @click="viewUser">
          <el-avatar :size="20" :src="userAvatar">
            {{ userInitial }}
          </el-avatar>
          <span class="username">{{ wantBuy.user?.username || '匿名用户' }}</span>
        </div>
        <div class="stats">
          <span>{{ wantBuy.viewCount }}浏览</span>
          <span>{{ wantBuy.commentCount }}评论</span>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div v-if="showActions" class="actions" @click.stop>
        <el-button size="small" type="primary" link @click="handleEdit">编辑</el-button>
        <el-button size="small" type="danger" link @click="handleDelete">删除</el-button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.want-buy-card {
  background: $color-bg-card;
  border-radius: $radius-lg;
  overflow: hidden;
  cursor: pointer;
  transition: transform $transition-fast, box-shadow $transition-fast;
  box-shadow: $shadow-sm;
  position: relative;

  &:hover {
    transform: translateY(-4px);
    box-shadow: $shadow-hover;
  }
}

.status-badge {
  position: absolute;
  top: $spacing-sm;
  right: $spacing-sm;
  display: flex;
  gap: $spacing-xs;
  z-index: 1;
}

.image-area {
  aspect-ratio: 1;
  background: $color-bg-page;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $spacing-xs;
    color: $color-text-placeholder;

    span {
      font-size: $font-size-small;
    }
  }
}

.info-area {
  padding: $spacing-md;
}

.name {
  font-size: $font-size-body;
  font-weight: $font-weight-medium;
  color: $color-text-primary;
  margin: 0 0 $spacing-sm;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.budget-row {
  display: flex;
  align-items: baseline;
  gap: $spacing-xs;
  margin-bottom: $spacing-xs;
}

.budget-label {
  font-size: $font-size-small;
  color: $color-text-secondary;
}

.budget-value {
  font-size: $font-size-body;
  font-weight: $font-weight-bold;
  color: $color-primary;
}

.quantity-row {
  font-size: $font-size-small;
  color: $color-text-secondary;
  margin-bottom: $spacing-sm;
}

.tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-xs;
  margin-bottom: $spacing-sm;

  .more-tags {
    font-size: $font-size-tiny;
    color: $color-text-placeholder;
    align-self: center;
  }
}

.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: $spacing-sm;
  border-top: 1px solid $color-border;
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
  font-size: $font-size-small;
  color: $color-text-secondary;
}

.stats {
  font-size: $font-size-tiny;
  color: $color-text-placeholder;
  display: flex;
  gap: $spacing-sm;
}

.actions {
  display: flex;
  gap: $spacing-sm;
  margin-top: $spacing-sm;
  padding-top: $spacing-sm;
  border-top: 1px solid $color-border;
}
</style>
