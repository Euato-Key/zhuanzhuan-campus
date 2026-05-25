<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getCreditLevel } from '@/utils/credit'
import { formatDate } from '@/utils/format'
import { getOssUrl } from '@/utils/oss'
import { uploadImage } from '@/api/modules/upload'
import { ElMessage } from 'element-plus'
import { Camera } from '@element-plus/icons-vue'
import { VueCropper } from 'vue-cropper/next'
import 'vue-cropper/next/dist/index.css'

const router = useRouter()
const userStore = useUserStore()

const fileInput = ref<HTMLInputElement | null>(null)
const cropping = ref(false)
const cropImg = ref('')
const uploading = ref(false)

function triggerFileInput() {
  fileInput.value?.click()
}

function handleFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
    ElMessage.error('仅支持 JPG、PNG、GIF、WebP 格式')
    input.value = ''
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.error('文件大小不能超过 2MB')
    input.value = ''
    return
  }

  const reader = new FileReader()
  reader.onload = async (ev) => {
    cropImg.value = ev.target?.result as string
    cropping.value = true
    await nextTick()
  }
  reader.readAsDataURL(file)
  input.value = ''
}

const cropperRef = ref<InstanceType<typeof VueCropper> | null>(null)

async function confirmCrop() {
  if (!cropperRef.value) return

  uploading.value = true
  try {
    const base64 = await new Promise<string>((resolve, reject) => {
      cropperRef.value!.getCropData((data: string) => {
        if (data) resolve(data)
        else reject(new Error('裁剪失败'))
      })
    })

    const res = await fetch(base64)
    const blob = await res.blob()
    const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
    const uploadRes = await uploadImage(file, 'avatar')
    const ossPath = uploadRes.data.data.ossPath

    await userStore.updateAvatar(ossPath)
    cropping.value = false
    ElMessage.success('头像已更新')
  } catch (error: any) {
    ElMessage.error(error?.message || '头像更新失败')
  } finally {
    uploading.value = false
  }
}

function cancelCrop() {
  cropping.value = false
  cropImg.value = ''
}
</script>

<template>
  <div class="profile-card">
    <div class="avatar-section">
      <div class="avatar-wrap" @click="triggerFileInput">
        <el-avatar :size="120" :src="userStore.user?.avatar ? getOssUrl(userStore.user.avatar) : undefined" class="avatar-img">
          {{ userStore.user?.username?.charAt(0) || '?' }}
        </el-avatar>
        <div class="avatar-overlay">
          <el-icon :size="24"><Camera /></el-icon>
          <span>更换头像</span>
        </div>
        <input
          ref="fileInput"
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          class="file-input"
          @change="handleFileChange"
        />
      </div>
    </div>

    <div class="user-info">
      <h1 class="user-name">{{ userStore.user?.username }}</h1>
      <p class="user-email">{{ userStore.user?.email }}</p>

      <div class="user-stats">
        <div class="stat-item">
          <span class="stat-value">{{ userStore.user?.creditScore ?? 100 }}</span>
          <el-tag v-if="userStore.user?.creditScore != null" size="small" :color="getCreditLevel(userStore.user.creditScore).color" effect="dark" class="credit-tag">{{ getCreditLevel(userStore.user.creditScore).label }}</el-tag>
          <span class="stat-label">信用分</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-value">{{ formatDate(userStore.user?.createdAt, 'date') }}</span>
          <span class="stat-label">加入时间</span>
        </div>
      </div>

      <div class="profile-actions">
        <el-button type="primary" plain size="small" @click="router.push('/reviews')">查看我的评价</el-button>
      </div>
    </div>

    <!-- 裁剪弹窗 -->
    <el-dialog v-model="cropping" title="裁剪头像" width="400px" :close-on-click-modal="false" @close="cancelCrop">
      <div class="cropper-container">
        <VueCropper
          ref="cropperRef"
          :img="cropImg"
          :output-size="1"
          :output-type="'jpeg'"
          :info="true"
          :can-scale="true"
          :auto-crop="true"
          :auto-crop-width="200"
          :auto-crop-height="200"
          :fixed="true"
          :fixed-number="[1, 1]"
          :full="false"
          :can-move="true"
          :can-move-box="true"
          :fixed-box="false"
          :center-box="true"
          mode="cover"
        />
      </div>
      <template #footer>
        <el-button @click="cancelCrop">取消</el-button>
        <el-button type="primary" :loading="uploading" @click="confirmCrop">确认上传</el-button>
      </template>
    </el-dialog>
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
  border-radius: $radius-full;
  overflow: hidden;

  .avatar-img {
    width: 100%;
    height: 100%;
    font-size: 40px;
    background: $color-bg-page;
  }
}

.avatar-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  border-radius: $radius-full;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: #fff;
  font-size: 12px;
  opacity: 0;
  transition: opacity $transition-fast;

  .avatar-wrap:hover & {
    opacity: 1;
  }
}

.file-input {
  display: none;
}

.cropper-container {
  width: 100%;
  height: 350px;
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

  .credit-tag {
    border: none;
    font-size: 11px;
    margin-top: 2px;
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
