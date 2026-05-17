<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { Camera, Goods, List, Promotion } from '@element-plus/icons-vue'
import { uploadImage } from '@/api/modules/upload'
import { getOssUrl } from '@/utils/oss'
import type { MessageType } from '@/api/modules/chat'
import { showError } from '@/utils/error'
import ProductPickerDialog from './ProductPickerDialog.vue'
import OrderPickerDialog from './OrderPickerDialog.vue'

const props = defineProps<{
  disabled: boolean
  otherUserId: number
}>()

const emit = defineEmits<{
  send: [type: MessageType, content: string]
  typing: []
  stopTyping: []
}>()

const inputText = ref('')
const imageUploading = ref(false)
const showQuickReplies = ref(false)
const showProductPicker = ref(false)
const showOrderPicker = ref(false)

function handleInput() {
  emit('typing')
}

function handleSend() {
  const text = inputText.value.trim()
  if (!text || props.disabled) return
  emit('send', 'text', text)
  inputText.value = ''
  emit('stopTyping')
  nextTick(() => {
    const textarea = document.querySelector('.chat-input-area textarea') as HTMLTextAreaElement
    textarea?.focus()
  })
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

async function handleImageUpload(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  input.value = ''

  if (!file.type.startsWith('image/')) {
    showError('请选择图片文件')
    return
  }

  imageUploading.value = true
  try {
    const res = await uploadImage(file, 'chat')
    if (res.data.code === 200) {
      emit('send', 'image', getOssUrl(res.data.data.ossPath))
    }
  } catch (err) {
    showError(err, '图片上传失败')
  } finally {
    imageUploading.value = false
  }
}

function handleProductSelect(productId: string) {
  emit('send', 'product', JSON.stringify({ productId }))
}

function handleOrderSelect(orderId: string) {
  emit('send', 'order', JSON.stringify({ orderId }))
}

function handleBlur() {
  emit('stopTyping')
}
</script>

<template>
  <div class="chat-input-area" :class="{ disabled }">
    <div class="input-toolbar">
      <el-tooltip content="发送图片" placement="top">
        <label class="toolbar-btn" :class="{ loading: imageUploading }">
          <input type="file" accept="image/*" hidden @change="handleImageUpload" :disabled="disabled || imageUploading" />
          <el-icon :size="20"><Camera /></el-icon>
        </label>
      </el-tooltip>
      <el-tooltip content="商品卡片" placement="top">
        <button class="toolbar-btn" :disabled="disabled" @click="showProductPicker = true">
          <el-icon :size="20"><Goods /></el-icon>
        </button>
      </el-tooltip>
      <el-tooltip content="订单卡片" placement="top">
        <button class="toolbar-btn" :disabled="disabled" @click="showOrderPicker = true">
          <el-icon :size="20"><List /></el-icon>
        </button>
      </el-tooltip>
      <el-tooltip content="快捷回复" placement="top">
        <button class="toolbar-btn" :disabled="disabled" @click="showQuickReplies = !showQuickReplies">
          <el-icon :size="20"><Promotion /></el-icon>
        </button>
      </el-tooltip>
    </div>
    <div class="input-row">
      <el-input
        v-model="inputText"
        type="textarea"
        :autosize="{ minRows: 1, maxRows: 4 }"
        placeholder="输入消息..."
        :disabled="disabled"
        @input="handleInput"
        @keydown="handleKeydown"
        @blur="handleBlur"
      />
      <el-button type="primary" :disabled="disabled || !inputText.trim()" @click="handleSend">
        发送
      </el-button>
    </div>
    <ProductPickerDialog v-model:visible="showProductPicker" :other-user-id="otherUserId" @select="handleProductSelect" />
    <OrderPickerDialog v-model:visible="showOrderPicker" :other-user-id="otherUserId" @select="handleOrderSelect" />
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.chat-input-area {
  border-top: 1px solid $color-border-light;
  background: $color-bg-card;
  padding: $spacing-sm $spacing-md;

  &.disabled {
    opacity: 0.6;
    pointer-events: none;
  }
}

.input-toolbar {
  display: flex;
  gap: $spacing-sm;
  margin-bottom: $spacing-sm;
}

.toolbar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: $radius-sm;
  border: none;
  background: transparent;
  color: $color-text-secondary;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover:not(:disabled) {
    background: $color-primary-pale;
    color: $color-primary;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  &.loading {
    opacity: 0.5;
    cursor: wait;
  }
}

.input-row {
  display: flex;
  gap: $spacing-sm;
  align-items: flex-end;

  .el-input {
    flex: 1;
  }

  :deep(.el-textarea__inner) {
    resize: none;
    border-radius: $radius-md;
  }

  .el-button {
    flex-shrink: 0;
    height: 36px;
  }
}
</style>