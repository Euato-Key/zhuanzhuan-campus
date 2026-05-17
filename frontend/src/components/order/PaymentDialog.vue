<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PaymentMethod } from '@/api/modules/order'

const props = defineProps<{
  modelValue: boolean
  orderInfo?: {
    orderNo: string
    productName: string
    productImage: string | null
    totalPrice: number
  }
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'success', method: PaymentMethod): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const selectedMethod = ref<PaymentMethod | null>(null)
const processing = ref(false)
const countdown = ref(0)

// 选择支付方式
function selectMethod(method: PaymentMethod) {
  selectedMethod.value = method
}

// 确认支付
async function handleConfirm() {
  if (!selectedMethod.value) return

  processing.value = true
  countdown.value = 3

  // 模拟支付过程
  const timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer)
      processing.value = false
      emit('success', selectedMethod.value!)
      visible.value = false
    }
  }, 1000)
}

// 关闭弹窗
function handleClose() {
  if (processing.value) return
  selectedMethod.value = null
  visible.value = false
}
</script>

<template>
  <el-dialog
    v-model="visible"
    title="选择支付方式"
    width="420px"
    :close-on-click-modal="!processing"
    :close-on-press-escape="!processing"
    :show-close="!processing"
    @close="handleClose"
  >
    <!-- 订单信息 -->
    <div class="order-info" v-if="orderInfo">
      <div class="product-preview">
        <img :src="orderInfo.productImage || '/placeholder.png'" alt="商品图片" />
        <div class="product-detail">
          <div class="product-name">{{ orderInfo.productName }}</div>
          <div class="order-no">订单号: {{ orderInfo.orderNo }}</div>
        </div>
      </div>
      <div class="price-info">
        <span class="label">支付金额</span>
        <span class="price">¥{{ orderInfo.totalPrice.toFixed(2) }}</span>
      </div>
    </div>

    <!-- 支付方式选择 -->
    <div class="payment-methods">
      <div class="section-title">选择支付方式</div>
      <div class="method-list">
        <div
          class="method-item"
          :class="{ active: selectedMethod === 'wechat', disabled: processing }"
          @click="!processing && selectMethod('wechat')"
        >
          <img src="/WechatPay.svg" alt="微信支付" class="method-icon" />
          <span class="method-name">微信支付</span>
          <el-icon v-if="selectedMethod === 'wechat'" class="check-icon"><Check /></el-icon>
        </div>
        <div
          class="method-item"
          :class="{ active: selectedMethod === 'alipay', disabled: processing }"
          @click="!processing && selectMethod('alipay')"
        >
          <img src="/Alipay.svg" alt="支付宝" class="method-icon" />
          <span class="method-name">支付宝</span>
          <el-icon v-if="selectedMethod === 'alipay'" class="check-icon"><Check /></el-icon>
        </div>
      </div>
    </div>

    <!-- 支付中状态 -->
    <div class="processing-overlay" v-if="processing">
      <div class="processing-content">
        <el-icon class="loading-icon" :size="48"><Loading /></el-icon>
        <div class="processing-text">
          正在跳转{{ selectedMethod === 'wechat' ? '微信' : '支付宝' }}支付...
        </div>
        <div class="countdown">{{ countdown }}秒后自动完成</div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose" :disabled="processing">取消</el-button>
        <el-button
          type="primary"
          :disabled="!selectedMethod || processing"
          :loading="processing"
          @click="handleConfirm"
        >
          {{ processing ? '支付中...' : '确认支付' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.order-info {
  background: $color-bg-page;
  border-radius: $radius-md;
  padding: $spacing-md;
  margin-bottom: $spacing-lg;
}

.product-preview {
  display: flex;
  gap: $spacing-md;
  margin-bottom: $spacing-md;
  padding-bottom: $spacing-md;
  border-bottom: 1px solid $color-border;

  img {
    width: 60px;
    height: 60px;
    border-radius: $radius-sm;
    object-fit: cover;
  }
}

.product-detail {
  flex: 1;
  min-width: 0;
}

.product-name {
  font-size: $font-size-body;
  font-weight: $font-weight-medium;
  color: $color-text-primary;
  margin-bottom: $spacing-xs;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-no {
  font-size: $font-size-small;
  color: $color-text-placeholder;
}

.price-info {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .label {
    font-size: $font-size-body;
    color: $color-text-secondary;
  }

  .price {
    font-size: $font-size-h2;
    font-weight: $font-weight-bold;
    color: $color-error;
  }
}

.payment-methods {
  .section-title {
    font-size: $font-size-body;
    font-weight: $font-weight-medium;
    color: $color-text-primary;
    margin-bottom: $spacing-md;
  }
}

.method-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.method-item {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-md;
  border: 2px solid $color-border;
  border-radius: $radius-md;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover:not(.disabled) {
    border-color: $color-primary-light;
    background: rgba($color-primary, 0.02);
  }

  &.active {
    border-color: $color-primary;
    background: rgba($color-primary, 0.05);
  }

  &.disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
}

.method-icon {
  width: 36px;
  height: 36px;
}

.method-name {
  flex: 1;
  font-size: $font-size-body;
  font-weight: $font-weight-medium;
  color: $color-text-primary;
}

.check-icon {
  color: $color-primary;
  font-size: 20px;
}

.processing-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-lg;
  z-index: 10;
}

.processing-content {
  text-align: center;
}

.loading-icon {
  color: $color-primary;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.processing-text {
  margin-top: $spacing-md;
  font-size: $font-size-body;
  color: $color-text-primary;
}

.countdown {
  margin-top: $spacing-sm;
  font-size: $font-size-small;
  color: $color-text-secondary;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: $spacing-sm;
}
</style>
