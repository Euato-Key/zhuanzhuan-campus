<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getOssUrl } from '@/utils/oss'
import AvatarUpload from '@/components/AvatarUpload.vue'
import { ElMessage } from 'element-plus'
import { EditPen } from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()

const editingAvatar = ref(false)
const avatarTempPath = ref<string | null>(null)
const avatarSaving = ref(false)

async function handleAvatarSuccess(tempPath: string) {
  avatarTempPath.value = tempPath
}

async function saveAvatar() {
  if (!avatarTempPath.value) return

  avatarSaving.value = true
  try {
    await userStore.updateAvatar(avatarTempPath.value)
    avatarTempPath.value = null
    editingAvatar.value = false
    ElMessage.success('头像已保存')
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '保存头像失败')
  } finally {
    avatarSaving.value = false
  }
}

function cancelEditAvatar() {
  avatarTempPath.value = null
  editingAvatar.value = false
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>

<template>
  <div class="profile-card">
    <!-- Avatar section -->
    <div class="avatar-section">
      <div v-if="!editingAvatar" class="avatar-wrap" @click="editingAvatar = true">
        <img
          :src="getOssUrl(userStore.user?.avatar)"
          class="avatar-img"
          alt="用户头像"
        />
        <div class="avatar-edit-btn">
          <el-icon><EditPen /></el-icon>
        </div>
      </div>
      <template v-else>
        <AvatarUpload
          :model-value="avatarTempPath || userStore.user?.avatar"
          @success="handleAvatarSuccess"
        />
        <div v-if="avatarTempPath" class="save-avatar">
          <el-button type="primary" size="small" :loading="avatarSaving" @click="saveAvatar">
            保存
          </el-button>
          <el-button size="small" @click="cancelEditAvatar">取消</el-button>
        </div>
        <div v-else class="save-avatar">
          <el-button size="small" @click="cancelEditAvatar">取消</el-button>
        </div>
      </template>
    </div>

    <!-- User info -->
    <div class="user-info">
      <h1 class="user-name">{{ userStore.user?.username }}</h1>
      <p class="user-email">{{ userStore.user?.email }}</p>

      <div class="user-stats">
        <div class="stat-item">
          <span class="stat-value">{{ userStore.user?.creditScore || 100 }}</span>
          <span class="stat-label">信用分</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-value">{{ formatDate(userStore.user?.createdAt) }}</span>
          <span class="stat-label">加入时间</span>
        </div>
      </div>

      <div class="profile-actions">
        <el-button type="primary" plain size="small" @click="router.push('/reviews')">查看我的评价</el-button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.profile-card {
  background: #fff;
  border-radius: $radius-lg;
  padding: 32px;
  box-shadow: $shadow-sm;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 32px;
}

.avatar-section {
  flex-shrink: 0;
}

.avatar-wrap {
  position: relative;
  width: 120px;
  height: 120px;
  cursor: pointer;
}

.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: $radius-full;
  object-fit: cover;
  background: $color-bg-page;
}

.avatar-edit-btn {
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 32px;
  height: 32px;
  background: $color-primary;
  color: #fff;
  border-radius: $radius-full;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity $transition-fast;

  .avatar-wrap:hover & {
    opacity: 1;
  }
}

.save-avatar {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  justify-content: center;
}

.user-info {
  flex: 1;
}

.user-name {
  font-size: 28px;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
  margin-bottom: 4px;
}

.user-email {
  font-size: 14px;
  color: $color-text-secondary;
  margin-bottom: 20px;
}

.user-stats {
  display: flex;
  align-items: center;
  gap: 24px;
}

.stat-item {
  text-align: center;

  .stat-value {
    display: block;
    font-size: 18px;
    font-weight: $font-weight-semibold;
    color: $color-text-primary;
  }

  .stat-label {
    font-size: 12px;
    color: $color-text-placeholder;
  }
}

.stat-divider {
  width: 1px;
  height: 32px;
  background: $color-border;
}

.profile-actions {
  margin-top: $spacing-md;
}

@media (max-width: 768px) {
  .profile-card {
    flex-direction: column;
    text-align: center;
  }

  .user-stats {
    justify-content: center;
  }
}
</style>