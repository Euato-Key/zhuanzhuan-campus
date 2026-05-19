<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Plus, Loading } from '@element-plus/icons-vue'
import { ElMessage, type FormInstance } from 'element-plus'
import {
  createWantBuy,
  updateWantBuy,
  getCategoryTree,
  type Category,
  type CreateWantBuyData,
  type WantBuyListItem,
  VALID_DAYS_OPTIONS,
} from '@/api/modules/want-buy'
import { uploadImage } from '@/api/modules/upload'

const props = defineProps<{
  modelValue: boolean
  wantBuy?: WantBuyListItem // 编辑时传入
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'success'): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const isEdit = computed(() => !!props.wantBuy)
const dialogTitle = computed(() => (isEdit.value ? '编辑求购' : '发布求购'))

// 表单
const formRef = ref<FormInstance>()
const loading = ref(false)
const categories = ref<Category[]>([])
const uploadLoading = ref(false)

const formData = ref<CreateWantBuyData>({
  name: '',
  categoryId: undefined,
  description: '',
  tags: [],
  budgetMin: undefined,
  budgetMax: undefined,
  quantity: 1,
  images: [],
  validDays: 30,
})

// 标签输入
const tagInput = ref('')
const tags = ref<string[]>([])

// 分类选项（扁平化）
const flatCategories = computed(() => {
  const result: { id: number; name: string; level: number }[] = []
  const flatten = (cats: Category[], level = 0) => {
    cats.forEach((cat) => {
      result.push({ id: cat.id, name: cat.name, level })
      if (cat.children?.length) {
        flatten(cat.children, level + 1)
      }
    })
  }
  flatten(categories.value)
  return result
})

// 表单规则
const rules = {
  name: [
    { required: true, message: '请输入商品名称', trigger: 'blur' },
    { max: 100, message: '商品名称不能超过100个字符', trigger: 'blur' },
  ],
  quantity: [
    { type: 'number', min: 1, message: '求购数量至少为1', trigger: 'blur' },
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
async function handleUploadImage(file: File) {
  uploadLoading.value = true
  try {
    const res = await uploadImage(file, 'product')
    if (res.data.code === 200) {
      formData.value.images?.push(res.data.data.url)
    }
  } catch {
    ElMessage.error('上传失败')
  } finally {
    uploadLoading.value = false
  }
}

// 图片上传前验证
function beforeUpload(file: File) {
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
  if ((formData.value.images?.length || 0) >= 9) {
    ElMessage.error('最多上传9张图片')
    return false
  }
  handleUploadImage(file)
  return false // 阻止默认上传
}

// 删除图片
function removeImage(index: number) {
  formData.value.images?.splice(index, 1)
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

// 提交表单
async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  // 验证预算
  if (formData.value.budgetMin !== undefined && formData.value.budgetMax !== undefined) {
    if (formData.value.budgetMin > formData.value.budgetMax) {
      ElMessage.error('预算最低价不能大于最高价')
      return
    }
  }

  loading.value = true
  try {
    // 确保 tags 同步到 formData
    formData.value.tags = tags.value

    const submitData = {
      ...formData.value,
      tags: tags.value.length > 0 ? tags.value : undefined,
      images: formData.value.images?.length ? formData.value.images : undefined,
    }

    if (isEdit.value && props.wantBuy) {
      const res = await updateWantBuy(props.wantBuy.id, submitData)
      if (res.data.code === 200) {
        ElMessage.success('更新成功')
        visible.value = false
        emit('success')
      }
    } else {
      const res = await createWantBuy(submitData)
      if (res.data.code === 200) {
        ElMessage.success('发布成功')
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
  if (props.wantBuy) {
    formData.value = {
      name: props.wantBuy.name,
      categoryId: props.wantBuy.categoryId ?? undefined,
      description: props.wantBuy.description || '',
      tags: props.wantBuy.tags || [],
      budgetMin: props.wantBuy.budgetMin ?? undefined,
      budgetMax: props.wantBuy.budgetMax ?? undefined,
      quantity: props.wantBuy.quantity,
      images: props.wantBuy.images || [],
      validDays: (props.wantBuy.validDays as 7 | 15 | 30) || 30,
    }
    tags.value = props.wantBuy.tags || []
  }
}

// 重置表单
function resetForm() {
  formData.value = {
    name: '',
    categoryId: undefined,
    description: '',
    tags: [],
    budgetMin: undefined,
    budgetMax: undefined,
    quantity: 1,
    images: [],
    validDays: 30,
  }
  tags.value = []
  formRef.value?.resetFields()
}

// 监听弹窗打开
watch(visible, (val) => {
  if (val) {
    fetchCategories()
    if (isEdit.value) {
      initEditData()
    } else {
      resetForm()
    }
  }
})
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="600px"
    :close-on-click-modal="false"
    destroy-on-close
    class="publish-want-buy-dialog"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="100px"
      label-position="left"
    >
      <!-- 商品名称 -->
      <el-form-item label="商品名称" prop="name">
        <el-input
          v-model="formData.name"
          placeholder="想买什么？"
          maxlength="100"
          show-word-limit
        />
      </el-form-item>

      <!-- 商品分类 -->
      <el-form-item label="商品分类">
        <el-select v-model="formData.categoryId" placeholder="选择分类（可选）" style="width: 100%" clearable>
          <el-option
            v-for="cat in flatCategories"
            :key="cat.id"
            :label="cat.name"
            :value="cat.id"
            :style="{ paddingLeft: cat.level * 20 + 'px' }"
          />
        </el-select>
      </el-form-item>

      <!-- 商品描述 -->
      <el-form-item label="商品描述">
        <el-input
          v-model="formData.description"
          type="textarea"
          placeholder="描述你想要的商品特征、成色要求等"
          :rows="4"
          maxlength="2000"
          show-word-limit
        />
      </el-form-item>

      <!-- 商品图片 -->
      <el-form-item label="参考图片">
        <div class="image-upload-area">
          <div class="image-header">
            <span class="image-count">已上传 {{ formData.images?.length || 0 }}/9 张</span>
            <span class="image-optional">（可选）</span>
          </div>
          <div class="image-list">
            <div v-for="(img, index) in formData.images" :key="index" class="image-item">
              <img :src="img" alt="参考图片" />
              <div class="remove-btn" @click="removeImage(index)">×</div>
            </div>
            <el-upload
              v-if="(formData.images?.length || 0) < 9"
              :show-file-list="false"
              :before-upload="beforeUpload"
              accept="image/*"
            >
              <div class="upload-btn" :class="{ uploading: uploadLoading }">
                <el-icon v-if="!uploadLoading"><Plus /></el-icon>
                <el-icon v-else class="is-loading"><Loading /></el-icon>
                <span>{{ uploadLoading ? '上传中...' : '添加图片' }}</span>
              </div>
            </el-upload>
          </div>
          <div class="upload-tip">支持 jpg、png 格式，单张不超过 5MB</div>
        </div>
      </el-form-item>

      <!-- 预算范围 -->
      <el-form-item label="预算范围">
        <div class="budget-inputs">
          <el-input-number
            v-model="formData.budgetMin"
            :min="0"
            :precision="2"
            :step="10"
            placeholder="最低"
            controls-position="right"
          />
          <span class="separator">~</span>
          <el-input-number
            v-model="formData.budgetMax"
            :min="0"
            :precision="2"
            :step="10"
            placeholder="最高"
            controls-position="right"
          />
          <span class="unit">元</span>
        </div>
      </el-form-item>

      <!-- 求购数量 -->
      <el-form-item label="求购数量" prop="quantity">
        <el-input-number v-model="formData.quantity" :min="1" :max="99" controls-position="right" />
        <span class="unit">件</span>
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
        <div class="upload-tip">最多5个标签，输入后按回车或点击添加按钮</div>
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

    <template #footer>
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

.image-header {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
}

.image-count {
  font-size: $font-size-body;
  font-weight: $font-weight-medium;
  color: $color-text-primary;
}

.image-optional {
  font-size: $font-size-small;
  color: $color-text-placeholder;
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
    transition: transform $transition-fast;

    &:hover {
      transform: scale(1.1);
    }
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
  transition: border-color $transition-fast, color $transition-fast;

  &:hover:not(.uploading) {
    border-color: $color-primary;
    color: $color-primary;
  }

  &.uploading {
    cursor: wait;
    border-color: $color-primary;
    color: $color-primary;
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

.budget-inputs {
  display: flex;
  align-items: center;
  gap: $spacing-sm;

  .separator {
    color: $color-text-secondary;
  }

  .unit {
    font-size: $font-size-small;
    color: $color-text-secondary;
  }
}

.tags-area {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: $spacing-sm;
}

.publish-want-buy-dialog {
  :deep(.el-dialog) {
    max-width: 600px;
  }
}
</style>
