<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { REPORT_REASON_LABELS, REPORT_TARGET_TYPE_LABELS, createReport, type ReportReason, type ReportTargetType } from '@/api/modules/report'

const props = defineProps<{
  modelValue: boolean
  targetType: ReportTargetType
  targetId: string | number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'success'): void
}>()

const reason = ref<ReportReason | ''>('')
const detail = ref('')
const submitting = ref(false)

const targetLabel = computed(() => {
  return REPORT_TARGET_TYPE_LABELS[props.targetType] || props.targetType
})

const reasonOptions = computed(() => {
  return Object.entries(REPORT_REASON_LABELS).map(([value, label]) => ({
    value,
    label,
  }))
})

async function handleSubmit() {
  if (!reason.value) {
    ElMessage.warning('请选择举报原因')
    return
  }
  submitting.value = true
  try {
    const res = await createReport({
      targetType: props.targetType,
      targetId: props.targetId,
      reason: reason.value,
      detail: detail.value || undefined,
    })
    if (res.data.code === 200) {
      ElMessage.success('举报提交成功')
      emit('success')
      handleClose()
    } else {
      ElMessage.error(res.data.message || '举报提交失败')
    }
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '举报提交失败')
  } finally {
    submitting.value = false
  }
}

function handleClose() {
  emit('update:modelValue', false)
  resetForm()
}

function resetForm() {
  reason.value = ''
  detail.value = ''
}

const visible = computed({
  get: () => props.modelValue,
  set: (val: boolean) => {
    if (!val) resetForm()
    emit('update:modelValue', val)
  },
})
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="`举报${targetLabel}`"
    width="480px"
    :close-on-click-modal="false"
    destroy-on-close
  >
    <div class="report-form">
      <div class="form-item">
        <label class="form-label">举报原因</label>
        <el-radio-group v-model="reason" class="reason-group">
          <el-radio
            v-for="option in reasonOptions"
            :key="option.value"
            :value="option.value"
            class="reason-radio"
          >
            {{ option.label }}
          </el-radio>
        </el-radio-group>
      </div>

      <div class="form-item">
        <label class="form-label">补充说明（选填）</label>
        <el-input
          v-model="detail"
          type="textarea"
          :rows="3"
          maxlength="500"
          show-word-limit
          placeholder="请详细描述举报原因..."
        />
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        提交举报
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.report-form {
  .form-item {
    margin-bottom: $spacing-lg;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .form-label {
    display: block;
    font-size: $font-size-body;
    font-weight: $font-weight-medium;
    color: $color-text-primary;
    margin-bottom: $spacing-sm;
  }
}

.reason-group {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.reason-radio {
  width: 100%;
  margin-right: 0;
}
</style>
