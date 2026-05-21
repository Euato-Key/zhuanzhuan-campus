<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { createProduct } from '@/api/modules/product'
import { getOssUrl } from '@/utils/oss'
import type { RecognitionResult, RecognitionData, SuggestedSpec } from '@/api/modules/ai'

const props = defineProps<{
  result: RecognitionResult | null
  images?: string[]
}>()

const emit = defineEmits<{
  (e: 'edit', data: Partial<RecognitionData>): void
  (e: 'done'): void
}>()

const publishing = ref(false)
const suggestedValues = reactive<Record<string, string>>({})

const suggestedSpecs = computed<SuggestedSpec[]>(() => props.result?.suggestedSpecs || [])

const resultData = computed(() => props.result?.data)
const confidence = computed(() => props.result?.confidence ?? {})
const warnings = computed(() => props.result?.warnings ?? [])
const mcpUsed = computed(() => props.result?.phases?.mcpUsed ?? false)

function confidenceDot(value: number | undefined) {
  if (value == null) return 'confidence-low'
  if (value >= 0.8) return 'confidence-high'
  if (value >= 0.5) return 'confidence-medium'
  return 'confidence-low'
}

function confidenceLabel(value: number | undefined) {
  if (value == null) return '未知'
  if (value >= 0.8) return '高'
  if (value >= 0.5) return '中'
  return '低'
}

const conditionLabel: Record<string, string> = {
  'new': '全新',
  '99new': '99新',
  '95new': '95新',
  '90new': '9成新',
  '80new': '8成新',
}

async function handlePublish() {
  if (!props.result) return

  const data = props.result.data
  if (!data.name || data.currentPrice == null || !data.categoryId) {
    ElMessage.warning('识别信息不完整，建议手动完善后再发布')
    return
  }

  publishing.value = true
  try {
    const submitData: any = {
      name: data.name,
      description: data.description || '',
      categoryId: data.categoryId,
      currentPrice: data.currentPrice,
      originalPrice: data.originalPrice,
      bargain: data.bargain ?? false,
      deliveryType: data.deliveryType || 'both',
      itemCondition: data.itemCondition || '95new',
      brand: data.brand || '',
      tags: data.tags || [],
      specs: [
        ...(data.specs || []),
        ...Object.entries(suggestedValues)
          .filter(([, v]) => v.trim())
          .map(([name, value]) => ({ name, value })),
      ],
      images: props.images || [],
      stock: 1,
    }

    const res = await createProduct(submitData)
    if (res.data.code === 200) {
      ElMessage.success('发布成功，等待审核')
      emit('done')
    } else {
      ElMessage.error(res.data.message || '发布失败')
    }
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    ElMessage.error(err.response?.data?.message || '发布失败')
  } finally {
    publishing.value = false
  }
}

function handleEdit() {
  if (!props.result) return

  const data: Partial<RecognitionData> = {
    name: props.result.data.name,
    description: props.result.data.description,
    categoryId: props.result.data.categoryId,
    currentPrice: props.result.data.currentPrice,
    originalPrice: props.result.data.originalPrice,
    bargain: props.result.data.bargain,
    deliveryType: props.result.data.deliveryType,
    itemCondition: props.result.data.itemCondition,
    brand: props.result.data.brand,
    tags: props.result.data.tags,
    specs: props.result.data.specs,
  }

  emit('edit', data)
}
</script>

<template>
  <div v-if="resultData" class="ai-result-card">
    <div class="result-header">
      <div class="result-title">{{ resultData.name || '未识别到商品名称' }}</div>
      <div class="result-subtitle">
        <el-tag v-if="resultData.brand" size="small" type="success">{{ resultData.brand }}</el-tag>
        <el-tag v-if="resultData.categoryId" size="small" style="margin-left: 8px">分类ID: {{ resultData.categoryId }}</el-tag>
        <span v-if="mcpUsed" style="margin-left: 8px; font-size: 12px; color: #2196F3">搜索增强 ✓</span>
      </div>
    </div>

    <div class="result-body">
      <!-- 上传的图片预览 -->
      <div v-if="props.images && props.images.length" class="result-field">
        <span class="result-field-label">图片</span>
        <span class="result-field-value">
          <div class="result-images">
            <img v-for="(img, i) in props.images" :key="i" :src="getOssUrl(img)" class="result-thumb" />
          </div>
        </span>
      </div>

      <div class="result-field" v-if="resultData.description">
        <span class="result-field-label">描述</span>
        <span class="result-field-value">{{ resultData.description }}</span>
        <span :class="['confidence-dot', confidenceDot(confidence.description)]" :title="'置信度: ' + confidenceLabel(confidence.description)"></span>
      </div>

      <div class="result-field" v-if="resultData.itemCondition">
        <span class="result-field-label">成色</span>
        <span class="result-field-value">
          <el-tag :type="resultData.itemCondition === 'new' ? 'danger' : 'warning'" size="small">
            {{ conditionLabel[resultData.itemCondition] || resultData.itemCondition }}
          </el-tag>
        </span>
        <span :class="['confidence-dot', confidenceDot(confidence.itemCondition)]" :title="'置信度: ' + confidenceLabel(confidence.itemCondition)"></span>
      </div>

      <div class="result-field">
        <span class="result-field-label">价格</span>
        <span class="result-field-value">
          <span v-if="resultData.originalPrice" style="text-decoration: line-through; color: #9E9E9E; margin-right: 8px">¥{{ resultData.originalPrice }}</span>
          <span style="color: #F44336; font-size: 18px; font-weight: 700">¥{{ resultData.currentPrice }}</span>
          <el-tag v-if="resultData.bargain" size="small" type="warning" style="margin-left: 8px">可议价</el-tag>
        </span>
        <span :class="['confidence-dot', confidenceDot(confidence.currentPrice)]" :title="'置信度: ' + confidenceLabel(confidence.currentPrice)"></span>
      </div>

      <div class="result-field" v-if="resultData.specs && resultData.specs.length">
        <span class="result-field-label">规格</span>
        <span class="result-field-value">
          <div class="ai-specs-list">
            <div class="spec-row" v-for="(s, i) in resultData.specs" :key="i">
              <span class="spec-name">{{ s.name }}:</span>
              <span class="spec-value">{{ s.value }}</span>
            </div>
          </div>
        </span>
        <span :class="['confidence-dot', confidenceDot(confidence.specs)]" :title="'置信度: ' + confidenceLabel(confidence.specs)"></span>
      </div>

      <div class="result-field" v-if="resultData.tags && resultData.tags.length">
        <span class="result-field-label">标签</span>
        <span class="result-field-value">
          <el-tag v-for="(t, i) in resultData.tags" :key="i" size="small" style="margin-right: 4px">{{ t }}</el-tag>
        </span>
        <span :class="['confidence-dot', confidenceDot(confidence.tags)]" :title="'置信度: ' + confidenceLabel(confidence.tags)"></span>
      </div>

      <div class="result-field" v-if="resultData.deliveryType">
        <span class="result-field-label">配送</span>
        <span class="result-field-value">{{ resultData.deliveryType === 'self' ? '仅自提' : resultData.deliveryType === 'express' ? '仅快递' : '自提/快递' }}</span>
      </div>
    </div>

    <div v-if="warnings.length" class="ai-warnings">
      <div class="warning-title">注意事项</div>
      <div class="warning-item" v-for="(w, i) in warnings" :key="i">{{ w }}</div>
    </div>

    <div v-if="suggestedSpecs.length" class="ai-suggested-specs">
      <div class="suggested-title">建议补充以下参数</div>
      <div class="suggested-hint">以下信息无法从图片或网络自动确定，请手动填写</div>
      <div class="suggested-list">
        <div v-for="(spec, i) in suggestedSpecs" :key="i" class="suggested-item">
          <span class="suggested-label">{{ spec.name }}</span>
          <el-input
            v-model="suggestedValues[spec.name]"
            :placeholder="spec.hint || '请输入' + spec.name"
            size="small"
            style="flex: 1"
          />
        </div>
      </div>
    </div>

    <div class="result-footer">
      <el-button @click="handleEdit">手动完善</el-button>
      <el-button type="primary" :loading="publishing" @click="handlePublish">直接发布</el-button>
    </div>
  </div>

  <div v-else class="ai-result-empty">
    <el-empty description="未能识别到有效结果" />
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.result-images {
  display: flex; flex-wrap: wrap; gap: 8px;
  .result-thumb {
    width: 80px; height: 80px;
    border-radius: $radius-sm; border: 1px solid $color-border;
    object-fit: cover;
  }
}

.result-footer {
  display: flex;
  justify-content: flex-end;
  gap: $spacing-sm;
  padding: $spacing-md $spacing-lg;
  border-top: 1px solid $color-border;
}

.ai-result-empty {
  padding: $spacing-xl;
}

.ai-suggested-specs {
  margin-top: $spacing-md;
  padding: $spacing-md;
  background: #FFF8E1;
  border: 1px solid #FFE082;
  border-radius: $radius-md;

  .suggested-title {
    font-size: $font-size-body;
    font-weight: 600;
    color: #F57F17;
    margin-bottom: 2px;
  }

  .suggested-hint {
    font-size: $font-size-tiny;
    color: #F9A825;
    margin-bottom: $spacing-sm;
  }

  .suggested-list {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
  }

  .suggested-item {
    display: flex;
    align-items: center;
    gap: $spacing-sm;

    .suggested-label {
      font-size: $font-size-small;
      color: #E65100;
      min-width: 70px;
      font-weight: 500;
    }
  }
}
</style>
