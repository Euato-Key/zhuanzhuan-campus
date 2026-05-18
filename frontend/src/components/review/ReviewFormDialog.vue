<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Close } from '@element-plus/icons-vue'
import { createReview, type ReviewType } from '@/api/modules/review'
import { uploadImage } from '@/api/modules/upload'
import { getOssUrl } from '@/utils/oss'

const props = defineProps<{
  modelValue: boolean
  orderId: string
  orderInfo?: {
    productName: string
    productImage: string | null
    buyerId: number
    sellerId: number
  }
  type: ReviewType
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: []
}>()

const loading = ref(false)
const form = reactive({
  rating: 5,
  content: '',
  images: [] as string[],
  isAnonymous: false,
})

// 图片上传状态：记录正在上传的图片数量
const uploadingCount = ref(0)
const isUploading = computed(() => uploadingCount.value > 0)

const isBuyerReview = computed(() => props.type === 'buyer_to_seller')

async function handleUpload(file: File) {
  uploadingCount.value++
  try {
    const res = await uploadImage(file, 'community')
    if (res.data.code === 200) {
      form.images.push(res.data.data.url)
    } else {
      ElMessage.error('图片上传失败')
    }
  } catch {
    ElMessage.error('图片上传失败')
  } finally {
    uploadingCount.value--
  }
}

function handleRemove(index: number) {
  form.images.splice(index, 1)
}

async function handleSubmit() {
  if (isUploading.value) {
    ElMessage.warning('图片正在上传中，请等待上传完成后再提交')
    return
  }

  if (isBuyerReview.value && form.rating < 1) {
    ElMessage.warning('请选择评分')
    return
  }

  if (!form.content.trim()) {
    ElMessage.warning('请填写评价内容')
    return
  }

  loading.value = true
  try {
    const res = await createReview({
      orderId: props.orderId,
      rating: isBuyerReview.value ? form.rating : 5,
      content: form.content || undefined,
      images: form.images.length > 0 ? form.images : undefined,
      isAnonymous: form.isAnonymous,
    })
    if (res.data.code === 200) {
      ElMessage.success('评价成功')
      emit('update:modelValue', false)
      resetForm()
      emit('success')
    } else {
      ElMessage.error(res.data.message || '评价失败')
    }
  } catch (err: any) {
    const msg = err.response?.data?.message || '评价失败'
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}

function resetForm() {
  form.rating = 5
  form.content = ''
  form.images = []
  form.isAnonymous = false
}

function handleClose() {
  emit('update:modelValue', false)
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    :title="isBuyerReview ? '评价卖家' : '评价买家'"
    width="500px"
    @close="handleClose"
  >
    <!-- 商品信息 -->
    <div class="order-info" v-if="orderInfo">
      <img
        :src="orderInfo.productImage ? getOssUrl(orderInfo.productImage) : '/placeholder.png'"
        alt="商品图片"
        class="product-image"
      />
      <span class="product-name">{{ orderInfo.productName }}</span>
    </div>

    <el-form label-position="top" class="review-form">
      <!-- 买家评价才显示星级评分 -->
      <el-form-item v-if="isBuyerReview" label="评分">
        <el-rate v-model="form.rating" :colors="['#F7BA2A', '#F7BA2A', '#F7BA2A']" show-text :texts="['很差', '较差', '一般', '较好', '很好']" />
      </el-form-item>

      <el-form-item :label="isBuyerReview ? '评价内容' : '评价买家'">
        <el-input
          v-model="form.content"
          type="textarea"
          :rows="4"
          :placeholder="isBuyerReview ? '分享您的购物体验...' : '评价买家的交易行为...'"
          maxlength="500"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="上传图片">
        <div class="image-upload-area">
          <div v-for="(img, index) in form.images" :key="index" class="image-item">
            <el-image :src="getOssUrl(img)" fit="cover" class="uploaded-image" />
            <div class="remove-btn" @click="handleRemove(index)">
              <el-icon :size="12"><Close /></el-icon>
            </div>
          </div>
          <el-upload
            v-if="form.images.length < 9"
            :show-file-list="false"
            :before-upload="(file: File) => { handleUpload(file); return false }"
            accept="image/*"
          >
            <div class="upload-trigger" v-loading="isUploading">
              <el-icon :size="24"><Plus /></el-icon>
              <span>{{ isUploading ? '上传中...' : '上传图片' }}</span>
            </div>
          </el-upload>
        </div>
      </el-form-item>

      <el-form-item v-if="isBuyerReview">
        <el-switch v-model="form.isAnonymous" active-text="匿名评价" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="loading || isUploading" :disabled="isUploading" @click="handleSubmit">
        {{ isUploading ? '等待图片上传...' : '提交评价' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;
@use '@/assets/styles/mixins' as *;

.order-info {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-sm;
  background: $color-bg-page;
  border-radius: $radius-md;
  margin-bottom: $spacing-md;
}

.product-image {
  width: 48px;
  height: 48px;
  border-radius: $radius-sm;
  object-fit: cover;
  flex-shrink: 0;
}

.product-name {
  font-size: $font-size-body;
  color: $color-text-primary;
  @include text-ellipsis(1);
}

.review-form {
  :deep(.el-form-item__label) {
    font-weight: $font-weight-medium;
  }
}

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