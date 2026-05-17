<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { getSTSToken, type UploadType } from '@/api/modules/upload'
import { getOssUrl } from '@/utils/oss'
import { ElMessage } from 'element-plus'
import { Plus, Loading } from '@element-plus/icons-vue'
import OSS from 'ali-oss'

const props = defineProps<{
  modelValue?: string | null
  type?: UploadType
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'success', ossPath: string): void
}>()

const uploadType = computed(() => props.type || 'avatar')
const uploading = ref(false)
const previewUrl = ref<string | null>(null)

// Watch modelValue changes to update preview
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      previewUrl.value = getOssUrl(newVal)
    }
  },
  { immediate: true }
)

// Validate file before upload
function validateFile(file: File): boolean {
  const allowedMime = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  const maxSize = uploadType.value === 'avatar' ? 2 * 1024 * 1024 : 5 * 1024 * 1024

  if (!allowedMime.includes(file.type)) {
    ElMessage.error('仅支持 JPG、PNG、GIF、WebP 格式')
    return false
  }

  if (file.size > maxSize) {
    const maxMB = maxSize / 1024 / 1024
    ElMessage.error(`文件大小不能超过 ${maxMB}MB`)
    return false
  }

  return true
}

// Upload file to OSS using STS credentials
async function handleUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!validateFile(file)) {
    input.value = ''
    return
  }

  uploading.value = true

  try {
    // 1. Get STS credentials
    const res = await getSTSToken(uploadType.value)
    const stsData = res.data.data

    // 2. Create OSS client
    const client = new OSS({
      region: stsData.region,
      accessKeyId: stsData.accessKeyId,
      accessKeySecret: stsData.accessKeySecret,
      stsToken: stsData.securityToken,
      bucket: stsData.bucket,
      secure: true,
    })

    // 3. Generate file path
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const ossPath = `${stsData.uploadPath}${timestamp}_${random}.${ext}`

    // 4. Upload to OSS
    await client.put(ossPath, file)

    // 5. Update preview
    previewUrl.value = getOssUrl(ossPath)

    // 6. Emit the temp path (relative)
    emit('update:modelValue', ossPath)
    emit('success', ossPath)

    ElMessage.success('上传成功')
  } catch (error: any) {
    console.error('Upload failed:', error)
    ElMessage.error(error.message || '上传失败，请重试')
  } finally {
    uploading.value = false
    input.value = ''
  }
}

// Clear avatar
function handleClear() {
  previewUrl.value = null
  emit('update:modelValue', '')
}
</script>

<template>
  <div class="avatar-upload">
    <div class="upload-area" :class="{ uploading }">
      <!-- Preview -->
      <template v-if="previewUrl">
        <img :src="previewUrl" class="preview-image" alt="头像预览" />
        <div class="upload-overlay">
          <span class="clear-btn" @click="handleClear">更换</span>
        </div>
      </template>

      <!-- Upload trigger -->
      <template v-else>
        <input
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          class="upload-input"
          @change="handleUpload"
          :disabled="uploading"
        />
        <div class="upload-trigger">
          <el-icon v-if="uploading" :size="24" class="is-loading"><Loading /></el-icon>
          <el-icon v-else :size="24"><Plus /></el-icon>
          <span class="upload-text">{{ uploading ? '上传中...' : '上传头像' }}</span>
        </div>
      </template>
    </div>

    <p class="upload-tip">支持 JPG、PNG、GIF、WebP，最大 2MB</p>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.avatar-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.upload-area {
  width: 120px;
  height: 120px;
  border-radius: $radius-full;
  border: 2px dashed $color-border;
  background: $color-bg-page;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover:not(.uploading) {
    border-color: $color-primary;
    background: $color-primary-pale;
  }

  &.uploading {
    cursor: not-allowed;
    opacity: 0.7;
  }
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.upload-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity $transition-fast;

  &:hover { opacity: 1; }

  .clear-btn {
    color: #fff;
    font-size: 14px;
    padding: 6px 12px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: $radius-sm;
  }
}

.upload-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  z-index: 1;
}

.upload-trigger {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: $color-text-placeholder;

  .el-icon {
    color: $color-text-secondary;
  }

  .upload-text {
    font-size: 12px;
  }
}

.upload-tip {
  margin-top: 8px;
  font-size: 12px;
  color: $color-text-placeholder;
}
</style>