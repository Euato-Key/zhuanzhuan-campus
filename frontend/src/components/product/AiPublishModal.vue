<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, type UploadFile } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useAiRecognition } from '@/composables/useAiRecognition'
import AiRecognitionProgress from './AiRecognitionProgress.vue'
import AiRecognitionResult from './AiRecognitionResult.vue'
import PublishProductDialog from './PublishProductDialog.vue'
import type { RecognitionData } from '@/api/modules/ai'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'success'): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const currentStep = ref(1)
const aiName = ref('')
const aiBrand = ref('')

const {
  status,
  phases,
  phaseDetails,
  result,
  error,
  uploadedImages,
  uploadedOssPaths,
  hasResult,
  mcpEnabled,
  getPhaseStatus,
  uploadImages,
  recognizeStream,
  reset: resetRecognition,
  removeImage,
  streamThinkingContent,
  streamSearchKeywords,
  streamFetchUrls,
  streamSearchCount,
  streamPagesOk,
  streamPhase2Results,
  streamPhase3Results,
} = useAiRecognition()

const recognizing = computed(() => status.value === 'uploading' || status.value === 'recognizing')

const canRecognize = computed(() => uploadedImages.value.length > 0 && !recognizing.value)

const showEditDialog = ref(false)
const editAiData = ref<Partial<RecognitionData>>({})

const stepTitles = ['上传商品图片', 'AI 智能识别中', '识别结果']

async function handleFileChange(file: File) {
  const isImage = file.type.startsWith('image/')
  const isLt5M = file.size / 1024 / 1024 < 5

  if (!isImage) {
    ElMessage.error('只能上传图片文件')
    return false
  }
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过5MB')
    return false
  }
  if (uploadedImages.value.length >= 9) {
    ElMessage.error('最多上传9张图片')
    return false
  }

  await uploadImages([file])
  return false
}

async function handleStartRecognition() {
  if (uploadedImages.value.length === 0) {
    ElMessage.warning('请先上传商品图片')
    return
  }

  currentStep.value = 2
  await recognizeStream(uploadedOssPaths.value, aiName.value || undefined, aiBrand.value || undefined)

  if (status.value === 'success') {
    currentStep.value = 3
  }
}

function handleRetry() {
  currentStep.value = 1
  resetRecognition()
}

const canGoToStep2 = computed(() =>
  status.value === 'recognizing' || status.value === 'success' || status.value === 'error',
)
const canGoToStep3 = computed(() => hasResult.value)

function goToStep(stepIndex: number) {
  const target = stepIndex + 1
  if (target === 1) { currentStep.value = 1 }
  else if (target === 2 && canGoToStep2.value) { currentStep.value = 2 }
  else if (target === 3 && canGoToStep3.value) { currentStep.value = 3 }
}

function handleEdit(data: Partial<RecognitionData>) {
  editAiData.value = data
  visible.value = false
  showEditDialog.value = true
}

function handlePublishDone() {
  emit('success')
  handleClose()
}

function handleEditDialogClose() {
  showEditDialog.value = false
}

function handleEditDialogSuccess() {
  showEditDialog.value = false
  emit('success')
}

function handleClose() {
  visible.value = false
  resetRecognition()
  currentStep.value = 1
  aiName.value = ''
  aiBrand.value = ''
}

watch(visible, (val) => {
  if (!val) {
    handleClose()
  }
})
</script>

<template>
  <el-dialog
    v-model="visible"
    title="AI 智能发布"
    width="700px"
    :close-on-click-modal="false"
    destroy-on-close
  >
    <div class="ai-publish-modal">
      <div class="custom-steps">
        <div v-for="(t, i) in stepTitles" :key="i"
          :class="['custom-step', {
            'is-active': i === currentStep - 1,
            'is-done': (i === 0 && currentStep > 1) || (i === 1 && canGoToStep2) || (i === 2 && canGoToStep3),
            'is-clickable': i === 0 || (i === 1 && canGoToStep2) || (i === 2 && canGoToStep3),
          }]"
          @click="goToStep(i)">
          <span class="step-dot">{{ (i === 0 && currentStep > 1) || (i === 1 && canGoToStep2) || (i === 2 && canGoToStep3) ? '✓' : i + 1 }}</span>
          <span class="step-label">{{ t }}</span>
        </div>
      </div>

      <!-- Step 1: 上传图片 -->
      <div v-if="currentStep === 1" class="step-content">
        <div class="upload-section">
          <div class="image-preview-list" v-if="uploadedImages.length">
            <div class="image-preview-item" v-for="(img, i) in uploadedImages" :key="i">
              <img :src="img" alt="预览" />
              <div class="remove-btn" @click="removeImage(i)">×</div>
            </div>
          </div>

          <el-upload
            :show-file-list="false"
            :before-upload="handleFileChange as any"
            accept="image/*"
            :disabled="uploadedImages.length >= 9"
            drag
            class="upload-dragger"
          >
            <el-icon class="el-icon--upload"><Plus /></el-icon>
            <div class="el-upload__text">
              将图片拖到此处或<em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                支持 1-9 张，单张不超过 5MB，建议拍摄清晰的商品正面照
              </div>
            </template>
          </el-upload>
        </div>

        <div class="hint-inputs">
          <el-input
            v-model="aiName"
            placeholder="商品名称提示（可选）"
            maxlength="100"
            clearable
          />
          <el-input
            v-model="aiBrand"
            placeholder="品牌提示（可选）"
            maxlength="50"
            clearable
          />
        </div>

        <div v-if="error" class="error-message">
          <el-alert :title="error" type="error" show-icon :closable="false" />
        </div>
      </div>

      <!-- Step 2: 识别进度 -->
      <div v-if="currentStep === 2" class="step-content">
        <AiRecognitionProgress
          :phases="phases"
          :phaseDetails="phaseDetails"
          :getPhaseStatus="getPhaseStatus"
          :streamThinkingContent="streamThinkingContent"
          :streamSearchKeywords="streamSearchKeywords"
          :streamFetchUrls="streamFetchUrls"
          :streamSearchCount="streamSearchCount"
          :streamPagesOk="streamPagesOk"
          :streamPhase2Results="streamPhase2Results"
          :streamPhase3Results="streamPhase3Results"
        />

        <div v-if="status === 'error'" class="error-actions">
          <el-button @click="handleRetry">重试</el-button>
          <el-button type="primary" @click="handleClose">关闭</el-button>
        </div>
      </div>

      <!-- Step 3: 结果确认 -->
      <div v-if="currentStep === 3" class="step-content">
        <AiRecognitionResult
          :result="result"
          :images="uploadedOssPaths"
          @edit="handleEdit"
          @done="handlePublishDone"
        />
      </div>
    </div>

    <template #footer>
      <div v-if="currentStep === 1">
        <el-button @click="handleClose" :disabled="recognizing">取消</el-button>
        <el-button
          type="primary"
          @click="handleStartRecognition"
          :loading="recognizing"
          :disabled="!canRecognize"
        >
          开始识别
        </el-button>
      </div>
      <div v-else-if="currentStep === 2 && status !== 'error'">
        <span v-if="status === 'recognizing'" style="color: #9E9E9E; font-size: 12px">AI 识别中，请稍候...</span>
        <span v-else style="color: #9E9E9E; font-size: 12px">识别已完成，点击步骤可切换查看</span>
      </div>
      <div v-else-if="currentStep === 2 && status === 'error'">
        <el-button @click="handleRetry">重试</el-button>
        <el-button type="primary" @click="handleClose">关闭</el-button>
      </div>
      <div v-else-if="currentStep === 3">
        <el-button @click="handleRetry">重新识别</el-button>
        <el-button type="primary" @click="handleClose">完成</el-button>
      </div>
    </template>
  </el-dialog>

  <PublishProductDialog
    v-model="showEditDialog"
    :ai-data="editAiData"
    @success="handleEditDialogSuccess"
    @update:model-value="handleEditDialogClose"
  />
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.ai-publish-modal {
  min-height: 300px;
}

.custom-steps {
  display: flex; justify-content: center; gap: 32px;
  margin-bottom: 24px; padding: 12px 0;
  border-bottom: 1px solid $color-border;
}

.custom-step {
  display: flex; align-items: center; gap: 8px;
  color: $color-text-placeholder; font-size: $font-size-body;
  transition: color 0.2s; user-select: none;

  &.is-clickable { cursor: pointer; &:hover { color: $color-primary; } }
  &.is-active { color: $color-primary; font-weight: 600; }
  &.is-done { color: $color-success; }

  .step-dot {
    display: inline-flex; align-items: center; justify-content: center;
    width: 22px; height: 22px; border-radius: 50%;
    font-size: 12px; border: 2px solid currentColor; flex-shrink: 0;
  }

  &.is-active .step-dot { background: $color-primary; border-color: $color-primary; color: #fff; }
  &.is-done .step-dot { background: $color-success; border-color: $color-success; color: #fff; }
}

.step-content {
  min-height: 250px;
}

.upload-section {
  .image-preview-list {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-sm;
    margin-bottom: $spacing-md;
  }

  .image-preview-item {
    position: relative;
    width: 100px;
    height: 100px;
    border-radius: $radius-md;
    overflow: hidden;
    border: 1px solid $color-border;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .remove-btn {
      position: absolute;
      top: -4px;
      right: -4px;
      width: 20px;
      height: 20px;
      background: $color-error;
      color: #fff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 14px;
      line-height: 1;
    }
  }
}

.upload-dragger {
  :deep(.el-upload-dragger) {
    padding: $spacing-lg;
  }
}

.hint-inputs {
  display: flex;
  gap: $spacing-sm;
  margin-top: $spacing-md;
}

.error-message {
  margin-top: $spacing-md;
}

.error-actions {
  display: flex;
  justify-content: center;
  gap: $spacing-sm;
  margin-top: $spacing-lg;
}
</style>