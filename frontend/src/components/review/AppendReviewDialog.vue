<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Close } from '@element-plus/icons-vue'
import { appendReview } from '@/api/modules/review'
import { uploadImage } from '@/api/modules/upload'
import { getOssUrl } from '@/utils/oss'

const props = defineProps<{
  modelValue: boolean
  reviewId: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: []
}>()

const loading = ref(false)
const form = reactive({
  appendContent: '',
  appendImages: [] as string[],
})

const uploading = ref(false)

async function handleUpload(file: File) {
  uploading.value = true
  try {
    const res = await uploadImage(file, 'community')
    if (res.data.code === 200) {
      form.appendImages.push(res.data.data.url)
    } else {
      ElMessage.error('图片上传失败')
    }
  } catch {
    ElMessage.error('图片上传失败')
  } finally {
    uploading.value = false
  }
}

function handleRemove(index: number) {
  form.appendImages.splice(index, 1)
}

async function handleSubmit() {
  if (!form.appendContent.trim()) {
    ElMessage.warning('请输入追评内容')
    return
  }

  loading.value = true
  try {
    const res = await appendReview(props.reviewId, {
      appendContent: form.appendContent.trim(),
      appendImages: form.appendImages.length > 0 ? form.appendImages : undefined,
    })
    if (res.data.code === 200) {
      ElMessage.success('追评成功')
      emit('update:modelValue', false)
      resetForm()
      emit('success')
    } else {
      ElMessage.error(res.data.message || '追评失败')
    }
  } catch (err: any) {
    const msg = err.response?.data?.message || '追评失败'
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}

function resetForm() {
  form.appendContent = ''
  form.appendImages = []
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    title="追加评价"
    width="500px"
  >
    <el-form label-position="top">
      <el-form-item label="追评内容">
        <el-input
          v-model="form.appendContent"
          type="textarea"
          :rows="4"
          placeholder="补充您的评价..."
          maxlength="300"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="上传图片">
        <div class="image-upload-area">
          <div v-for="(img, index) in form.appendImages" :key="index" class="image-item">
            <el-image :src="getOssUrl(img)" fit="cover" class="uploaded-image" />
            <div class="remove-btn" @click="handleRemove(index)">
              <el-icon :size="12"><Close /></el-icon>
            </div>
          </div>
          <el-upload
            v-if="form.appendImages.length < 9"
            :show-file-list="false"
            :before-upload="(file: File) => { handleUpload(file); return false }"
            accept="image/*"
          >
            <div class="upload-trigger" v-loading="uploading">
              <el-icon :size="24"><Plus /></el-icon>
              <span>上传图片</span>
            </div>
          </el-upload>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">提交追评</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.image-upload-area {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-sm;
}

.image-item {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: $radius-sm;
  overflow: hidden;
}

.uploaded-image {
  width: 100%;
  height: 100%;
}

.remove-btn {
  position: absolute;
  top: 0;
  right: 0;
  width: 20px;
  height: 20px;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
}

.upload-trigger {
  width: 80px;
  height: 80px;
  border: 1px dashed $color-border;
  border-radius: $radius-sm;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $spacing-xs;
  cursor: pointer;
  color: $color-text-placeholder;
  transition: border-color $transition-fast;

  &:hover {
    border-color: $color-primary;
    color: $color-primary;
  }

  span {
    font-size: $font-size-tiny;
  }
}
</style>