<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, type FormInstance } from 'element-plus'
import {
  createProduct,
  updateProduct,
  getCategoryTree,
  type Category,
  type CreateProductData,
  type ProductDetail,
  ITEM_CONDITION_LABELS,
  ITEM_CONDITION_MAP,
  type ProductSpec,
} from '@/api/modules/product'
import { uploadImage } from '@/api/modules/upload'
import { getOssUrl } from '@/utils/oss'
import { useUserStore } from '@/stores/user'
import { useAuthDialog } from '@/composables/useAuthDialog'

const userStore = useUserStore()

const props = defineProps<{
  modelValue: boolean
  product?: ProductDetail
  aiData?: Partial<CreateProductData>
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'success'): void
  (e: 'back'): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const isEdit = computed(() => !!props.product)
const isAiAssist = computed(() => !!props.aiData && !props.product)
const dialogTitle = computed(() => isEdit.value ? '编辑商品' : isAiAssist.value ? 'AI 辅助完善' : '发布商品')

const showAiWarning = ref(false)

// 表单
const formRef = ref<FormInstance>()
const loading = ref(false)
const categories = ref<Category[]>([])
const uploadLoading = ref(false)

const formData = ref<CreateProductData>({
  name: '',
  description: '',
  categoryId: undefined as unknown as number,
  tags: [],
  images: [],
  detailImages: [],
  originalPrice: undefined,
  currentPrice: 0,
  bargain: false,
  deliveryType: 'both',
  pickupAddress: '',
  pickupTime: '',
  itemCondition: '95new',
  stock: 1,
  brand: '',
  specs: [],
  shippingAddress: '',
  validDays: 30,
})

// 有效期选项映射
const VALID_DAYS_OPTIONS = [
  { label: '7天', value: 7 },
  { label: '15天', value: 15 },
  { label: '30天', value: 30 },
  { label: '永久有效', value: 0 },
]

// 标签输入
const tagInput = ref('')
const tags = ref<string[]>([])

// 规格输入
const specs = ref<ProductSpec[]>([])
const newSpecName = ref('')
const newSpecValue = ref('')

// 分类选项（扁平化）
const flatCategories = computed(() => {
  const result: { id: number; name: string; level: number }[] = []
  const flatten = (cats: Category[], level = 0) => {
    cats.forEach(cat => {
      result.push({ id: cat.id, name: cat.name, level })
      if (cat.children?.length) {
        flatten(cat.children, level + 1)
      }
    })
  }
  flatten(categories.value)
  return result
})

// 是否需要自提信息
const needPickupInfo = computed(() => {
  return formData.value.deliveryType === 'self' || formData.value.deliveryType === 'both'
})

// 表单规则
const rules = {
  name: [
    { required: true, message: '请输入商品名称', trigger: 'blur' },
    { max: 100, message: '商品名称不能超过100个字符', trigger: 'blur' },
  ],
  categoryId: [{ required: true, message: '请选择商品分类', trigger: 'change' }],
  images: [{ required: true, message: '请上传商品主图', trigger: 'change' }],
  currentPrice: [{ required: true, message: '请输入商品价格', trigger: 'blur' }],
  itemCondition: [{ required: true, message: '请选择新旧程度', trigger: 'change' }],
  deliveryType: [{ required: true, message: '请选择交易方式', trigger: 'change' }],
  pickupAddress: [
    {
      validator: () => {
        if (needPickupInfo.value && !formData.value.pickupAddress) {
          return new Error('自提商品需填写自提地点')
        }
        return true
      },
      trigger: 'blur',
    },
  ],
}

// 获取分类
async function fetchCategories() {
  try {
    const res = await getCategoryTree()
    if (res.data.code === 200) {
      categories.value = res.data.data
    }
  } catch (err) {
    console.error('获取分类失败', err)
  }
}

// 上传图片
async function handleUploadImage(file: File, type: 'main' | 'detail') {
  uploadLoading.value = true
  try {
    const res = await uploadImage(file, 'product')
    if (res.data.code === 200) {
      const ossPath = res.data.data.ossPath
      if (type === 'main') {
        formData.value.images.push(ossPath)
      } else {
        formData.value.detailImages?.push(ossPath)
      }
    }
  } catch (err) {
    ElMessage.error('上传失败')
  } finally {
    uploadLoading.value = false
  }
}

// 主图上传前验证
function beforeMainUpload(file: File) {
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
  if (formData.value.images.length >= 9) {
    ElMessage.error('最多上传9张主图')
    return false
  }
  handleUploadImage(file, 'main')
  return false // 阻止默认上传
}

// 详情图上传前验证
function beforeDetailUpload(file: File) {
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
  handleUploadImage(file, 'detail')
  return false
}

// 删除图片
function removeMainImage(index: number) {
  formData.value.images.splice(index, 1)
}

function removeDetailImage(index: number) {
  formData.value.detailImages?.splice(index, 1)
}

// 添加标签
function addTag() {
  const tag = tagInput.value.trim()
  if (tag && !tags.value.includes(tag) && tags.value.length < 5) {
    tags.value.push(tag)
    formData.value.tags = tags.value
    tagInput.value = ''
  }
}

function removeTag(index: number) {
  tags.value.splice(index, 1)
  formData.value.tags = tags.value
}

// 添加规格
function addSpec() {
  const name = newSpecName.value.trim()
  const value = newSpecValue.value.trim()
  if (name && value) {
    specs.value.push({ name, value })
    formData.value.specs = specs.value
    newSpecName.value = ''
    newSpecValue.value = ''
  }
}

function removeSpec(index: number) {
  specs.value.splice(index, 1)
  formData.value.specs = specs.value
}

// 提交表单
async function handleSubmit() {
  if (!useUserStore().isLoggedIn) {
    useAuthDialog().open('login')
    return
  }

  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const submitData = {
      ...formData.value,
      tags: tags.value,
      specs: specs.value,
      validDays: formData.value.validDays === 0 ? undefined : formData.value.validDays,
    }
    if (isEdit.value && props.product) {
      const res = await updateProduct(props.product.id, submitData)
      if (res.data.code === 200) {
        ElMessage.success('更新成功')
        visible.value = false
        emit('success')
      }
    } else {
      const res = await createProduct(submitData)
      if (res.data.code === 200) {
        ElMessage.success('发布成功，等待审核')
        visible.value = false
        emit('success')
      }
    }
  } catch (err: unknown) {
    const error = err as { response?: { data?: { message?: string } } }
    ElMessage.error(error.response?.data?.message || '操作失败')
  } finally {
    loading.value = false
  }
}

// 初始化编辑数据
function initEditData() {
  if (props.product) {
    formData.value = {
      name: props.product.name,
      description: props.product.description || '',
      categoryId: props.product.categoryId,
      tags: props.product.tags || [],
      images: props.product.images,
      detailImages: props.product.detailImages || [],
      originalPrice: props.product.originalPrice ?? undefined,
      currentPrice: props.product.currentPrice,
      bargain: props.product.bargain,
      deliveryType: props.product.deliveryType,
      pickupAddress: props.product.pickupAddress || '',
      pickupTime: props.product.pickupTime || '',
      itemCondition: (ITEM_CONDITION_MAP as Record<string, string>)[props.product.itemCondition] || props.product.itemCondition,
      stock: props.product.stock,
      brand: props.product.brand || '',
      specs: props.product.specs || [],
      shippingAddress: props.product.shippingAddress || '',
      validDays: props.product.validDays || 0,
    }
    tags.value = props.product.tags || []
    specs.value = props.product.specs || []
  }
}

function initAiData() {
  if (props.aiData) {
    const ai = props.aiData

    if (ai.name) formData.value.name = ai.name
    if (ai.description) formData.value.description = ai.description
    if (ai.currentPrice != null) formData.value.currentPrice = ai.currentPrice
    if (ai.originalPrice != null) formData.value.originalPrice = ai.originalPrice
    if (ai.bargain != null) formData.value.bargain = ai.bargain
    if (ai.deliveryType) formData.value.deliveryType = ai.deliveryType
    if (ai.itemCondition) formData.value.itemCondition = (ITEM_CONDITION_MAP as Record<string, string>)[ai.itemCondition] || ai.itemCondition
    if (ai.brand) formData.value.brand = ai.brand

    // AI上传的图片：第一张作为主图，所有图片作为详情图
    if (ai.images?.length) {
      formData.value.images = ai.images
    }
    if (ai.detailImages?.length) {
      formData.value.detailImages = ai.detailImages
    }

    if (ai.tags?.length) {
      tags.value = ai.tags
      formData.value.tags = ai.tags
    }

    if (ai.specs?.length) {
      specs.value = ai.specs
      formData.value.specs = ai.specs
    }

    if (ai.categoryId != null) {
      const found = flatCategories.value.find(c => c.id === ai.categoryId)
      if (found) {
        formData.value.categoryId = ai.categoryId
        showAiWarning.value = false
      } else {
        showAiWarning.value = true
      }
    }

    if (ai.validDays != null) {
      formData.value.validDays = ai.validDays
    }

    // 自提地点：AI数据优先，否则从用户校园信息自动填充
    if (ai.pickupAddress) {
      formData.value.pickupAddress = ai.pickupAddress
    } else {
      const user = userStore.user
      if (user?.school && user?.campus) {
        const needPickup = ai.deliveryType === 'self' || ai.deliveryType === 'both'
          || (!ai.deliveryType && formData.value.deliveryType !== 'express')
        if (needPickup && !formData.value.pickupAddress) {
          formData.value.pickupAddress = `${user.school}${user.campus}`
        }
      }
    }
  }
}

// 重置表单
function resetForm() {
  formData.value = {
    name: '',
    description: '',
    categoryId: undefined as unknown as number,
    tags: [],
    images: [],
    detailImages: [],
    originalPrice: undefined,
    currentPrice: 0,
    bargain: false,
    deliveryType: 'both',
    pickupAddress: '',
    pickupTime: '',
    itemCondition: '95new',
    stock: 1,
    brand: '',
    specs: [],
    shippingAddress: '',
    validDays: 30,
  }
  tags.value = []
  specs.value = []
  formRef.value?.resetFields()
}

// 监听弹窗打开
watch(visible, (val) => {
  if (val) {
    fetchCategories().then(() => {
      if (isEdit.value) {
        initEditData()
      } else if (isAiAssist.value) {
        resetForm()
        initAiData()
      } else {
        resetForm()
      }
    })
  }
})
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="80%"
    top="5vh"
    :close-on-click-modal="false"
    destroy-on-close
    class="publish-dialog"
  >
    <div class="form-scroll-container">
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="100px"
        label-position="left"
      >
      <!-- 基本信息 -->
      <el-form-item label="商品名称" prop="name">
        <el-input
          v-model="formData.name"
          placeholder="请输入商品名称"
          maxlength="100"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="商品描述">
        <el-input
          v-model="formData.description"
          type="textarea"
          placeholder="请描述商品详情、使用情况等"
          :rows="4"
          maxlength="2000"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="商品分类" prop="categoryId">
        <el-select v-model="formData.categoryId" placeholder="请选择分类" style="width: 100%">
          <el-option
            v-for="cat in flatCategories"
            :key="cat.id"
            :label="cat.name"
            :value="cat.id"
            :style="{ paddingLeft: cat.level * 20 + 'px' }"
          />
        </el-select>
        <el-alert
          v-if="showAiWarning"
          title="AI 返回的分类ID在当前系统中不存在，请手动选择分类"
          type="warning"
          :closable="false"
          show-icon
          style="margin-top: 8px"
        />
      </el-form-item>

      <!-- 商品图片 -->
      <el-form-item label="商品主图" prop="images">
        <div class="image-upload-area">
          <div class="image-list">
            <div v-for="(img, index) in formData.images" :key="index" class="image-item">
              <img :src="getOssUrl(img)" alt="商品图片" />
              <div class="remove-btn" @click="removeMainImage(index)">×</div>
            </div>
          </div>
          <el-upload
            :show-file-list="false"
            :before-upload="beforeMainUpload"
            accept="image/*"
            :disabled="formData.images.length >= 9"
          >
            <div class="upload-btn" :class="{ disabled: formData.images.length >= 9 }">
              <el-icon><Plus /></el-icon>
              <span>{{ formData.images.length >= 9 ? '已达上限' : '上传图片' }}</span>
            </div>
          </el-upload>
          <div class="upload-tip">最多9张，建议第一张为商品主图</div>
        </div>
      </el-form-item>

      <el-form-item label="详情图片">
        <div class="image-upload-area">
          <div class="image-list">
            <div v-for="(img, index) in formData.detailImages" :key="index" class="image-item">
              <img :src="getOssUrl(img)" alt="详情图片" />
              <div class="remove-btn" @click="removeDetailImage(index)">×</div>
            </div>
          </div>
          <el-upload
            :show-file-list="false"
            :before-upload="beforeDetailUpload"
            accept="image/*"
          >
            <div class="upload-btn">
              <el-icon><Plus /></el-icon>
              <span>上传详情图</span>
            </div>
          </el-upload>
          <div class="upload-tip">展示商品细节、使用痕迹等</div>
        </div>
      </el-form-item>

      <!-- 价格信息 -->
      <el-form-item label="原价">
        <el-input-number
          v-model="formData.originalPrice"
          :min="0"
          :precision="2"
          :step="10"
          placeholder="可选"
          controls-position="right"
        />
      </el-form-item>

      <el-form-item label="现价" prop="currentPrice">
        <el-input-number
          v-model="formData.currentPrice"
          :min="0"
          :precision="2"
          :step="10"
          controls-position="right"
        />
      </el-form-item>

      <el-form-item label="支持议价">
        <el-switch v-model="formData.bargain" />
      </el-form-item>

      <!-- 商品属性 -->
      <el-form-item label="新旧程度" prop="itemCondition">
        <el-select v-model="formData.itemCondition" placeholder="请选择" style="width: 100%">
          <el-option
            v-for="(label, value) in ITEM_CONDITION_LABELS"
            :key="value"
            :label="label"
            :value="value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="库存数量">
        <el-input-number v-model="formData.stock" :min="1" :max="999" controls-position="right" />
      </el-form-item>

      <el-form-item label="品牌">
        <el-input v-model="formData.brand" placeholder="可选，如 Apple、Nike" maxlength="100" />
      </el-form-item>

      <!-- 商品规格 -->
      <el-form-item label="商品规格">
        <div class="specs-area">
          <div v-for="(spec, index) in specs" :key="index" class="spec-item">
            <span>{{ spec.name }}: {{ spec.value }}</span>
            <el-button type="danger" link size="small" @click="removeSpec(index)">删除</el-button>
          </div>
          <div class="spec-input">
            <el-input v-model="newSpecName" placeholder="规格名" style="width: 120px" />
            <el-input v-model="newSpecValue" placeholder="规格值" style="width: 120px" />
            <el-button type="primary" size="small" @click="addSpec">添加</el-button>
          </div>
          <div class="upload-tip">如：颜色-黑色、容量-256GB</div>
        </div>
      </el-form-item>

      <!-- 商品标签 -->
      <el-form-item label="商品标签">
        <div class="tags-area">
          <el-tag
            v-for="(tag, index) in tags"
            :key="index"
            closable
            @close="removeTag(index)"
          >
            {{ tag }}
          </el-tag>
          <el-input
            v-model="tagInput"
            placeholder="输入标签"
            style="width: 120px"
            @keyup.enter="addTag"
          />
          <el-button type="primary" size="small" @click="addTag">添加</el-button>
        </div>
        <div class="upload-tip">最多5个标签，用于搜索优化</div>
      </el-form-item>

      <!-- 交易方式 -->
      <el-form-item label="交易方式" prop="deliveryType">
        <el-radio-group v-model="formData.deliveryType">
          <el-radio :value="'self'">仅自提</el-radio>
          <el-radio :value="'express'">仅快递</el-radio>
          <el-radio :value="'both'">自提/快递</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item v-if="needPickupInfo" label="自提地点" prop="pickupAddress">
        <el-input v-model="formData.pickupAddress" placeholder="如：北京大学东门" maxlength="255" />
      </el-form-item>

      <el-form-item v-if="needPickupInfo" label="自提时间">
        <el-input
          v-model="formData.pickupTime"
          placeholder="如：工作日18:00-21:00"
          maxlength="255"
        />
      </el-form-item>

      <el-form-item label="发货地址">
        <el-input v-model="formData.shippingAddress" placeholder="可选" maxlength="255" />
      </el-form-item>

      <!-- 有效期 -->
      <el-form-item label="有效期">
        <el-radio-group v-model="formData.validDays">
          <el-radio
            v-for="opt in VALID_DAYS_OPTIONS"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    </div>

    <template #footer>
      <el-button v-if="isAiAssist" @click="emit('back')">返回AI识别</el-button>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">
        {{ isEdit ? '保存' : '发布' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.image-upload-area {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.image-list {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-sm;
}

.image-item {
  position: relative;
  width: 80px;
  height: 80px;
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

.upload-btn {
  width: 80px;
  height: 80px;
  border: 1px dashed $color-border;
  border-radius: $radius-md;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: $color-text-secondary;
  transition: border-color $transition-fast;

  &:hover:not(.disabled) {
    border-color: $color-primary;
    color: $color-primary;
  }

  &.disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .el-icon {
    font-size: 24px;
    margin-bottom: 4px;
  }

  span {
    font-size: $font-size-small;
  }
}

.upload-tip {
  font-size: $font-size-small;
  color: $color-text-placeholder;
}

.specs-area,
.tags-area {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: $spacing-sm;
}

.spec-item {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-xs $spacing-sm;
  background: $color-primary-pale;
  border-radius: $radius-sm;
  font-size: $font-size-small;
}

.spec-input {
  display: flex;
  gap: $spacing-xs;
}

.publish-dialog {
  :deep(.el-dialog) {
    max-width: 900px;
    max-height: 90vh;
    margin-top: 5vh !important;
    display: flex;
    flex-direction: column;
  }

  :deep(.el-dialog__body) {
    padding: 0;
    overflow: hidden;
    flex: 1;
    min-height: 0;
  }
}

.form-scroll-container {
  padding: $spacing-md $spacing-lg;
  max-height: calc(90vh - 54px - 70px); // 90vh - 标题栏 - 底部按钮
  overflow-y: auto;
  overflow-x: hidden;
}
</style>