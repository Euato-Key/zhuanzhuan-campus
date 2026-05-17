<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { ProductDetail } from '@/api/modules/product'
import type { OrderDeliveryType, PickupInfo } from '@/api/modules/order'
import { createOrder } from '@/api/modules/order'
import { getAddresses, type Address } from '@/api/modules/address'
import { showError } from '@/utils/error'
import PaymentDialog from './PaymentDialog.vue'

const props = defineProps<{
  modelValue: boolean
  product: ProductDetail
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'success', orderId: string): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

// 状态
const loading = ref(false)
const addresses = ref<Address[]>([])
const addressesLoading = ref(false)

// 表单数据
const formData = reactive({
  quantity: 1,
  deliveryType: props.product.deliveryType === 'express' ? 'express' as OrderDeliveryType :
                props.product.deliveryType === 'self' ? 'self' as OrderDeliveryType :
                'express' as OrderDeliveryType,
  addressId: undefined as number | undefined,
  pickupAddress: '',
  pickupTime: '',
})

// 支付弹窗
const paymentDialogVisible = ref(false)
const createdOrderInfo = ref<{
  orderId: string
  orderNo: string
  productName: string
  productImage: string | null
  totalPrice: number
} | undefined>(undefined)

// 计算属性
const maxQuantity = computed(() => props.product.stock || 1)
const totalPrice = computed(() => (props.product.currentPrice || 0) * formData.quantity)

// 是否支持快递
const supportExpress = computed(() =>
  props.product.deliveryType === 'express' || props.product.deliveryType === 'both'
)

// 是否支持自提
const supportSelf = computed(() =>
  props.product.deliveryType === 'self' || props.product.deliveryType === 'both'
)

// 默认地址
const defaultAddress = computed(() =>
  addresses.value.find(a => a.isDefault) || addresses.value[0]
)

// 表单验证
const canSubmit = computed(() => {
  if (formData.quantity < 1 || formData.quantity > maxQuantity.value) return false

  if (formData.deliveryType === 'express') {
    if (!formData.addressId) return false
  } else {
    if (!formData.pickupAddress) return false
  }

  return true
})

// 获取地址列表
async function fetchAddresses() {
  if (!supportExpress.value) return

  addressesLoading.value = true
  try {
    const res = await getAddresses()
    if (res.data.code === 200) {
      addresses.value = res.data.data
      // 自动选择默认地址
      if (defaultAddress.value && !formData.addressId) {
        formData.addressId = defaultAddress.value.id
      }
    }
  } catch (err) {
    showError(err, '获取地址列表失败')
  } finally {
    addressesLoading.value = false
  }
}

// 监听交易方式变化
watch(() => formData.deliveryType, (type) => {
  if (type === 'express') {
    fetchAddresses()
  }
})

// 初始化
onMounted(() => {
  if (supportExpress.value) {
    fetchAddresses()
  }
  // 初始化自提信息
  if (props.product.pickupAddress) {
    formData.pickupAddress = props.product.pickupAddress
  }
  if (props.product.pickupTime) {
    formData.pickupTime = props.product.pickupTime
  }
})

// 提交订单
async function handleSubmit() {
  if (!canSubmit.value) return

  loading.value = true
  try {
    const pickupInfo: PickupInfo | undefined = formData.deliveryType === 'self' ? {
      address: formData.pickupAddress,
      time: formData.pickupTime,
    } : undefined

    const res = await createOrder({
      productId: props.product.id,
      quantity: formData.quantity,
      deliveryType: formData.deliveryType,
      addressId: formData.deliveryType === 'express' ? formData.addressId : undefined,
      pickupInfo,
    })

    if (res.data.code === 200) {
      const order = res.data.data
      createdOrderInfo.value = {
        orderId: order.id,
        orderNo: order.orderNo,
        productName: order.productName,
        productImage: order.productImage,
        totalPrice: order.totalPrice,
      }
      paymentDialogVisible.value = true
    }
  } catch (err) {
    showError(err, '创建订单失败')
  } finally {
    loading.value = false
  }
}

// 支付成功
function handlePaymentSuccess() {
  if (createdOrderInfo.value) {
    ElMessage.success('支付成功')
    emit('success', createdOrderInfo.value.orderId)
    visible.value = false
  }
}

// 关闭弹窗
function handleClose() {
  if (loading.value) return
  visible.value = false
}

// 前往地址管理
function goToAddresses() {
  visible.value = false
  window.location.href = '/addresses'
}
</script>

<template>
  <el-dialog
    v-model="visible"
    title="确认订单"
    width="500px"
    :close-on-click-modal="!loading"
    @close="handleClose"
  >
    <!-- 商品信息 -->
    <div class="product-info">
      <img :src="product.images?.[0] || '/placeholder.png'" alt="商品图片" class="product-image" />
      <div class="product-detail">
        <h3 class="product-name">{{ product.name }}</h3>
        <div class="product-meta">
          <span class="price">¥{{ product.currentPrice }}</span>
          <span class="stock">库存: {{ product.stock }}</span>
        </div>
      </div>
    </div>

    <!-- 数量选择 -->
    <div class="form-section">
      <div class="section-label">购买数量</div>
      <el-input-number
        v-model="formData.quantity"
        :min="1"
        :max="maxQuantity"
        :disabled="loading"
      />
    </div>

    <!-- 交易方式选择 -->
    <div class="form-section">
      <div class="section-label">交易方式</div>
      <el-radio-group v-model="formData.deliveryType" :disabled="loading">
        <el-radio-button value="express" v-if="supportExpress">
          快递配送
        </el-radio-button>
        <el-radio-button value="self" v-if="supportSelf">
          线下自提
        </el-radio-button>
      </el-radio-group>
    </div>

    <!-- 快递配送 - 选择地址 -->
    <div class="form-section" v-if="formData.deliveryType === 'express'">
      <div class="section-label">收货地址</div>
      <div class="address-select" v-loading="addressesLoading">
        <el-select
          v-model="formData.addressId"
          placeholder="请选择收货地址"
          style="width: 100%"
          :disabled="loading"
        >
          <el-option
            v-for="addr in addresses"
            :key="addr.id"
            :value="addr.id"
            :label="`${addr.receiverName} ${addr.receiverPhone} - ${addr.province}${addr.city}${addr.district}${addr.detail}`"
          />
        </el-select>

        <el-button
          v-if="addresses.length === 0"
          type="primary"
          link
          @click="goToAddresses"
          style="margin-top: 8px"
        >
          暂无地址，点击添加
        </el-button>
        <el-button
          v-else
          type="primary"
          link
          @click="goToAddresses"
          style="margin-top: 8px"
        >
          管理地址
        </el-button>
      </div>
    </div>

    <!-- 线下自提 - 选择地点 -->
    <div class="form-section" v-if="formData.deliveryType === 'self'">
      <div class="section-label">自提信息</div>
      <el-form label-width="80px">
        <el-form-item label="自提地点">
          <el-input
            v-model="formData.pickupAddress"
            placeholder="请输入或选择自提地点"
            :disabled="loading"
          />
        </el-form-item>
        <el-form-item label="自提时间">
          <el-input
            v-model="formData.pickupTime"
            placeholder="例如: 工作日 18:00-21:00"
            :disabled="loading"
          />
        </el-form-item>
      </el-form>
      <div class="pickup-tip" v-if="product.pickupAddress">
        <el-text type="info" size="small">
          卖家设置的自提地点: {{ product.pickupAddress }}
          <template v-if="product.pickupTime">
            ，时间段: {{ product.pickupTime }}
          </template>
        </el-text>
      </div>
    </div>

    <!-- 价格汇总 -->
    <div class="price-summary">
      <div class="summary-row">
        <span class="label">商品金额</span>
        <span class="value">¥{{ (product.currentPrice || 0).toFixed(2) }} × {{ formData.quantity }}</span>
      </div>
      <div class="summary-row total">
        <span class="label">合计</span>
        <span class="value">¥{{ totalPrice.toFixed(2) }}</span>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose" :disabled="loading">取消</el-button>
        <el-button
          type="primary"
          :disabled="!canSubmit"
          :loading="loading"
          @click="handleSubmit"
        >
          提交订单
        </el-button>
      </div>
    </template>

    <!-- 支付弹窗 -->
    <PaymentDialog
      v-model="paymentDialogVisible"
      :order-info="createdOrderInfo"
      @success="handlePaymentSuccess"
    />
  </el-dialog>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.product-info {
  display: flex;
  gap: $spacing-md;
  padding: $spacing-md;
  background: $color-bg-page;
  border-radius: $radius-md;
  margin-bottom: $spacing-lg;
}

.product-image {
  width: 80px;
  height: 80px;
  border-radius: $radius-sm;
  object-fit: cover;
}

.product-detail {
  flex: 1;
  min-width: 0;
}

.product-name {
  font-size: $font-size-body;
  font-weight: $font-weight-medium;
  color: $color-text-primary;
  margin: 0 0 $spacing-sm;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-meta {
  display: flex;
  gap: $spacing-md;
}

.price {
  font-size: $font-size-h3;
  font-weight: $font-weight-bold;
  color: $color-error;
}

.stock {
  font-size: $font-size-small;
  color: $color-text-secondary;
}

.form-section {
  margin-bottom: $spacing-lg;

  .section-label {
    font-size: $font-size-body;
    font-weight: $font-weight-medium;
    color: $color-text-primary;
    margin-bottom: $spacing-sm;
  }
}

.address-select {
  min-height: 40px;
}

.pickup-tip {
  margin-top: $spacing-sm;
  padding: $spacing-sm;
  background: rgba($color-primary, 0.05);
  border-radius: $radius-sm;
}

.price-summary {
  padding: $spacing-md;
  background: $color-bg-page;
  border-radius: $radius-md;
  margin-top: $spacing-lg;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-sm;

  &:last-child {
    margin-bottom: 0;
  }

  .label {
    font-size: $font-size-body;
    color: $color-text-secondary;
  }

  .value {
    font-size: $font-size-body;
    color: $color-text-primary;
  }

  &.total {
    padding-top: $spacing-sm;
    border-top: 1px solid $color-border;

    .label {
      font-weight: $font-weight-medium;
    }

    .value {
      font-size: $font-size-h2;
      font-weight: $font-weight-bold;
      color: $color-error;
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: $spacing-sm;
}
</style>