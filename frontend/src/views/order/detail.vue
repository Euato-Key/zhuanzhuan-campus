<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, ChatDotRound, Van, Location, Clock } from '@element-plus/icons-vue'
import type { OrderDetail } from '@/api/modules/order'
import {
  getOrderDetail,
  payOrder,
  cancelOrder,
  shipOrder,
  confirmPickup,
  confirmReceive,
  applyReturn,
  reviewReturn,
  fillReturnExpress,
  confirmReturnReceived,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TAG_TYPE,
} from '@/api/modules/order'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import { showError, showSuccess } from '@/utils/error'
import { formatDate } from '@/utils/format'
import { getOssUrl } from '@/utils/oss'
import AppLayout from '@/components/layout/AppLayout.vue'
import PaymentDialog from '@/components/order/PaymentDialog.vue'
import ReviewFormDialog from '@/components/review/ReviewFormDialog.vue'
import AppendReviewDialog from '@/components/review/AppendReviewDialog.vue'
import ReviewCard from '@/components/review/ReviewCard.vue'
import { getOrderReviewStatus, deleteReview, deleteAppend, type OrderReviewStatus, type ReviewType } from '@/api/modules/review'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const chatStore = useChatStore()

const loading = ref(true)
const order = ref<OrderDetail | null>(null)

const paymentDialogVisible = ref(false)
const shipDialogVisible = ref(false)
const returnDialogVisible = ref(false)
const returnExpressDialogVisible = ref(false)

const shipForm = ref({ expressCompany: '', expressNo: '' })
const returnReason = ref('')
const returnExpressForm = ref({ company: '', expressNo: '' })
const returnApproved = ref(true)
const returnRejectReason = ref('')

const isBuyer = computed(() => order.value?.buyerId === userStore.user?.id)
const isSeller = computed(() => order.value?.sellerId === userStore.user?.id)

// 评价相关
const reviewStatus = ref<OrderReviewStatus | null>(null)
const reviewDialogVisible = ref(false)
const appendReviewDialogVisible = ref(false)
const currentAppendReviewId = ref(0)
const reviewType = ref<ReviewType>('buyer_to_seller')

const canPay = computed(() => isBuyer.value && order.value?.status === 'pending_payment')
const canCancel = computed(() => {
  if (!order.value) return false
  const status = order.value.status
  return (isBuyer.value || isSeller.value) &&
    ['pending_payment', 'pending_ship', 'pending_pickup'].includes(status)
})
const canShip = computed(() => isSeller.value && order.value?.status === 'pending_ship')
const canConfirmPickup = computed(() => isSeller.value && order.value?.status === 'pending_pickup')
const canConfirmReceive = computed(() =>
  isBuyer.value && ['pending_receive', 'pending_confirm'].includes(order.value?.status || '')
)
const canApplyReturn = computed(() =>
  isBuyer.value && order.value?.status === 'completed' && order.value.returnStatus === 'none'
)
const canReviewReturn = computed(() => isSeller.value && order.value?.returnStatus === 'pending')
const canFillReturnExpress = computed(() =>
  isBuyer.value && order.value?.returnStatus === 'approved' && !order.value?.returnCompany
)
const canConfirmReturnReceived = computed(() =>
  isSeller.value && order.value?.status === 'returning' &&
  order.value?.returnCompany && order.value?.returnExpressNo
)

// 当前主要操作按钮
const primaryAction = computed(() => {
  if (canPay.value) return { label: '立即支付', action: handlePay }
  if (canShip.value) return { label: '去发货', action: () => { shipDialogVisible.value = true } }
  if (canConfirmPickup.value) return { label: '确认取货', action: handleConfirmPickup }
  if (canConfirmReceive.value) return { label: '确认收货', action: handleConfirmReceive }
  if (canConfirmReturnReceived.value) return { label: '确认收到退货', action: handleConfirmReturnReceived }
  return null
})

// 状态描述
const statusDescription = computed(() => {
  if (!order.value) return ''
  const status = order.value.status
  if (isBuyer.value) {
    switch (status) {
      case 'pending_payment': return '请尽快完成支付，超时订单将自动取消'
      case 'pending_ship': return '卖家正在准备发货，请耐心等待'
      case 'pending_pickup': return '请按约定时间前往自提地点取货'
      case 'pending_receive': return '商品正在配送中，收到后请确认收货'
      case 'pending_confirm': return '卖家已确认您取货，请确认收货'
      case 'completed': return '交易已完成'
      case 'cancelled': return '订单已取消'
      case 'returning': return '退货处理中'
      case 'refunded': return '退款已完成'
    }
  } else {
    switch (status) {
      case 'pending_payment': return '等待买家支付'
      case 'pending_ship': return '买家已支付，请尽快发货'
      case 'pending_pickup': return '等待买家自提'
      case 'pending_receive': return '商品已发出，等待买家确认收货'
      case 'pending_confirm': return '等待买家确认收货'
      case 'completed': return '交易已完成'
      case 'cancelled': return '订单已取消'
      case 'returning': return '买家正在退货中'
      case 'refunded': return '退款已完成'
    }
  }
  return ''
})

async function fetchOrder() {
  const orderId = route.params.id as string
  loading.value = true
  try {
    const res = await getOrderDetail(orderId)
    if (res.data.code === 200) {
      order.value = res.data.data
      fetchReviewStatus()
    }
  } catch (err) {
    showError(err, '获取订单详情失败')
    router.push({ name: 'Orders' })
  } finally {
    loading.value = false
  }
}

async function fetchReviewStatus() {
  if (!order.value) return
  try {
    const res = await getOrderReviewStatus(order.value.id)
    if (res.data.code === 200) {
      reviewStatus.value = res.data.data
    }
  } catch {
    // 评价状态获取失败不影响页面
  }
}

function openReviewDialog(type: ReviewType) {
  reviewType.value = type
  reviewDialogVisible.value = true
}

function openAppendDialog(reviewId: number) {
  currentAppendReviewId.value = reviewId
  appendReviewDialogVisible.value = true
}

function handleReviewSuccess() {
  fetchReviewStatus()
}

async function handleDeleteReview(reviewId: number) {
  try {
    await ElMessageBox.confirm('确定要删除该评价吗？删除后不可恢复', '提示', { type: 'warning' })
    const res = await deleteReview(reviewId)
    if (res.data.code === 200) {
      showSuccess('评价已删除')
      fetchReviewStatus()
    } else {
      ElMessage.error(res.data.message || '删除失败')
    }
  } catch (err) {
    if (err !== 'cancel') showError(err, '删除失败')
  }
}

async function handleDeleteAppend(reviewId: number) {
  try {
    await ElMessageBox.confirm('确定要删除追评吗？', '提示', { type: 'warning' })
    const res = await deleteAppend(reviewId)
    if (res.data.code === 200) {
      showSuccess('追评已删除')
      fetchReviewStatus()
    } else {
      ElMessage.error(res.data.message || '删除失败')
    }
  } catch (err) {
    if (err !== 'cancel') showError(err, '删除失败')
  }
}

function handlePay() {
  paymentDialogVisible.value = true
}

async function handlePaymentSuccess() {
  if (!order.value) return
  try {
    const res = await payOrder(order.value.id, 'wechat')
    if (res.data.code === 200) {
      showSuccess('支付成功')
      fetchOrder()
    }
  } catch (err) {
    showError(err, '支付失败')
  }
}

async function handleCancel() {
  if (!order.value) return
  try {
    await ElMessageBox.confirm('确定要取消这个订单吗？', '取消订单', { type: 'warning' })
    const res = await cancelOrder(order.value.id)
    if (res.data.code === 200) {
      showSuccess('订单已取消')
      fetchOrder()
    }
  } catch (err) {
    if (err !== 'cancel') showError(err, '取消订单失败')
  }
}

async function handleShip() {
  if (!order.value) return
  if (!shipForm.value.expressCompany || !shipForm.value.expressNo) {
    ElMessage.warning('请填写快递信息')
    return
  }
  try {
    const res = await shipOrder(order.value.id, shipForm.value)
    if (res.data.code === 200) {
      showSuccess('发货成功')
      shipDialogVisible.value = false
      fetchOrder()
    }
  } catch (err) {
    showError(err, '发货失败')
  }
}

async function handleConfirmPickup() {
  if (!order.value) return
  try {
    await ElMessageBox.confirm('确认买家已取货？', '确认取货')
    const res = await confirmPickup(order.value.id)
    if (res.data.code === 200) {
      showSuccess('已确认买家取货')
      fetchOrder()
    }
  } catch (err) {
    if (err !== 'cancel') showError(err, '操作失败')
  }
}

async function handleConfirmReceive() {
  if (!order.value) return
  try {
    await ElMessageBox.confirm('确认收货？', '确认收货')
    const res = await confirmReceive(order.value.id)
    if (res.data.code === 200) {
      showSuccess('确认收货成功')
      fetchOrder()
    }
  } catch (err) {
    if (err !== 'cancel') showError(err, '操作失败')
  }
}

async function handleApplyReturn() {
  if (!order.value) return
  if (!returnReason.value.trim()) {
    ElMessage.warning('请填写退货原因')
    return
  }
  try {
    const res = await applyReturn(order.value.id, { reason: returnReason.value })
    if (res.data.code === 200) {
      showSuccess('退货申请已提交')
      returnDialogVisible.value = false
      fetchOrder()
    }
  } catch (err) {
    showError(err, '申请退货失败')
  }
}

async function handleReviewReturn() {
  if (!order.value) return
  if (!returnApproved.value && !returnRejectReason.value.trim()) {
    ElMessage.warning('请填写拒绝原因')
    return
  }
  try {
    const res = await reviewReturn(order.value.id, {
      approved: returnApproved.value,
      rejectReason: returnRejectReason.value,
    })
    if (res.data.code === 200) {
      showSuccess(returnApproved.value ? '已同意退货' : '已拒绝退货')
      fetchOrder()
    }
  } catch (err) {
    showError(err, '操作失败')
  }
}

async function handleFillReturnExpress() {
  if (!order.value) return
  if (!returnExpressForm.value.company || !returnExpressForm.value.expressNo) {
    ElMessage.warning('请填写快递信息')
    return
  }
  try {
    const res = await fillReturnExpress(order.value.id, returnExpressForm.value)
    if (res.data.code === 200) {
      showSuccess('快递信息已提交')
      returnExpressDialogVisible.value = false
      fetchOrder()
    }
  } catch (err) {
    showError(err, '提交失败')
  }
}

async function handleConfirmReturnReceived() {
  if (!order.value) return
  try {
    await ElMessageBox.confirm('确认收到退货商品？退款将自动处理。', '确认收到退货')
    const res = await confirmReturnReceived(order.value.id)
    if (res.data.code === 200) {
      showSuccess('已确认收到退货，退款已完成')
      fetchOrder()
    }
  } catch (err) {
    if (err !== 'cancel') showError(err, '操作失败')
  }
}

async function goToChat() {
  if (!order.value) return
  const targetUserId = isBuyer.value ? order.value.sellerId : order.value.buyerId
  const conversationId = await chatStore.openConversation(targetUserId)
  if (conversationId) {
    router.push({ name: 'ChatRoom', params: { id: conversationId } })
  }
}

function goToProduct() {
  if (!order.value) return
  router.push({ name: 'ProductDetail', params: { id: order.value.productId } })
}

onMounted(() => {
  if (!userStore.user) userStore.fetchUser()
  fetchOrder()
})

watch(() => route.params.id, () => {
  fetchOrder()
})
</script>

<template>
  <AppLayout>
    <div class="order-detail-page" v-loading="loading">
      <template v-if="order">
        <!-- 页面头部 -->
        <div class="page-header">
          <el-button link class="back-btn" @click="router.back()">
            <el-icon><ArrowLeft /></el-icon>
            返回
          </el-button>
          <h1 class="page-title">订单详情</h1>
          <el-button @click="goToChat" class="chat-btn">
            <el-icon><ChatDotRound /></el-icon>
            联系{{ isBuyer ? '卖家' : '买家' }}
          </el-button>
        </div>

        <!-- 状态卡片 -->
        <div class="status-card" :class="order.status">
          <div class="status-top">
            <el-tag :type="ORDER_STATUS_TAG_TYPE[order.status]" size="large" effect="dark">
              {{ ORDER_STATUS_LABELS[order.status] }}
            </el-tag>
            <span class="order-no">{{ order.orderNo }}</span>
          </div>
          <p class="status-desc">{{ statusDescription }}</p>
          <div class="status-actions" v-if="primaryAction || canCancel">
            <el-button v-if="primaryAction" type="primary" size="large" @click="primaryAction.action">
              {{ primaryAction.label }}
            </el-button>
            <el-button v-if="canCancel" size="large" @click="handleCancel">取消订单</el-button>
          </div>
        </div>

        <!-- 退货审核卡片 -->
        <div class="section-card" v-if="canReviewReturn">
          <h3 class="section-title">退货申请</h3>
          <div class="return-info">
            <p><strong>退货原因:</strong> {{ order.returnReason }}</p>
            <p><strong>申请时间:</strong> {{ formatDate(order.returnApplyTime!, 'full') }}</p>
          </div>
          <el-divider />
          <el-radio-group v-model="returnApproved">
            <el-radio :value="true">同意退货</el-radio>
            <el-radio :value="false">拒绝退货</el-radio>
          </el-radio-group>
          <el-input
            v-if="!returnApproved"
            v-model="returnRejectReason"
            placeholder="请输入拒绝原因"
            class="mt-sm"
          />
          <el-button type="primary" @click="handleReviewReturn" class="mt-sm">提交审核</el-button>
        </div>

        <!-- 退货快递填写 -->
        <div class="section-card" v-if="canFillReturnExpress">
          <h3 class="section-title">填写退货快递</h3>
          <p class="hint">退货已通过审核，请填写退货快递信息</p>
          <el-button type="primary" @click="returnExpressDialogVisible = true">填写快递信息</el-button>
        </div>

        <!-- 商品信息 -->
        <div class="section-card">
          <h3 class="section-title">商品信息</h3>
          <div class="product-row" @click="goToProduct">
            <img
              :src="order.productImage || order.product?.images?.[0] || '/placeholder.png'"
              alt="商品图片"
              class="product-image"
            />
            <div class="product-detail">
              <h4 class="product-name">{{ order.productName || order.product?.name }}</h4>
              <div class="product-meta">
                <span class="price">¥{{ order.price }}</span>
                <span class="quantity">× {{ order.quantity }}</span>
              </div>
            </div>
            <div class="product-total">
              <span class="total-label">实付款</span>
              <span class="total-price">¥{{ order.totalPrice }}</span>
            </div>
          </div>
        </div>

        <!-- 订单信息 -->
        <div class="section-card">
          <h3 class="section-title">订单信息</h3>
          <div class="info-list">
            <div class="info-item">
              <span class="label">订单编号</span>
              <span class="value mono">{{ order.orderNo }}</span>
            </div>
            <div class="info-item">
              <span class="label">创建时间</span>
              <span class="value">{{ formatDate(order.createdAt, 'full') }}</span>
            </div>
            <div class="info-item" v-if="order.payTime">
              <span class="label">支付时间</span>
              <span class="value">{{ formatDate(order.payTime, 'full') }}</span>
            </div>
            <div class="info-item" v-if="order.paymentMethod">
              <span class="label">支付方式</span>
              <span class="value">{{ order.paymentMethod === 'wechat' ? '微信支付' : '支付宝' }}</span>
            </div>
            <div class="info-item">
              <span class="label">交易方式</span>
              <span class="value">{{ order.deliveryType === 'express' ? '快递配送' : '线下自提' }}</span>
            </div>
          </div>
        </div>

        <!-- 收货地址 -->
        <div class="section-card" v-if="order.deliveryType === 'express' && order.addressSnapshot">
          <h3 class="section-title">
            <el-icon><Location /></el-icon> 收货地址
          </h3>
          <div class="address-info">
            <div class="receiver-row">
              <span class="receiver-name">{{ order.addressSnapshot.receiverName }}</span>
              <span class="receiver-phone">{{ order.addressSnapshot.receiverPhone }}</span>
            </div>
            <div class="address-text">
              {{ order.addressSnapshot.province }}{{ order.addressSnapshot.city }}{{ order.addressSnapshot.district }}{{ order.addressSnapshot.street || '' }}{{ order.addressSnapshot.detail }}
            </div>
          </div>
        </div>

        <!-- 自提信息 -->
        <div class="section-card" v-if="order.deliveryType === 'self' && order.pickupInfo">
          <h3 class="section-title">
            <el-icon><Location /></el-icon> 自提信息
          </h3>
          <div class="info-list">
            <div class="info-item">
              <span class="label">自提地点</span>
              <span class="value">{{ order.pickupInfo.address }}</span>
            </div>
            <div class="info-item" v-if="order.pickupInfo.time">
              <span class="label">自提时间</span>
              <span class="value">{{ order.pickupInfo.time }}</span>
            </div>
          </div>
        </div>

        <!-- 物流信息 -->
        <div class="section-card" v-if="order.expressCompany && order.expressNo">
          <h3 class="section-title">
            <el-icon><Van /></el-icon> 物流信息
          </h3>
          <div class="info-list">
            <div class="info-item">
              <span class="label">快递公司</span>
              <span class="value">{{ order.expressCompany }}</span>
            </div>
            <div class="info-item">
              <span class="label">快递单号</span>
              <span class="value mono">{{ order.expressNo }}</span>
            </div>
            <div class="info-item" v-if="order.shipTime">
              <span class="label">发货时间</span>
              <span class="value">{{ formatDate(order.shipTime, 'full') }}</span>
            </div>
          </div>
        </div>

        <!-- 退货物流 -->
        <div class="section-card" v-if="order.returnCompany && order.returnExpressNo">
          <h3 class="section-title">
            <el-icon><Van /></el-icon> 退货物流
          </h3>
          <div class="info-list">
            <div class="info-item">
              <span class="label">快递公司</span>
              <span class="value">{{ order.returnCompany }}</span>
            </div>
            <div class="info-item">
              <span class="label">快递单号</span>
              <span class="value mono">{{ order.returnExpressNo }}</span>
            </div>
          </div>
        </div>

        <!-- 交易双方 -->
        <div class="section-card">
          <h3 class="section-title">交易双方</h3>
          <div class="users-row">
            <div class="user-item" @click="router.push({ name: 'UserProfile', params: { id: order.buyer?.id } })">
              <el-tag size="small" type="primary" effect="plain">买家</el-tag>
              <el-avatar :size="32" :src="getOssUrl(order.buyer?.avatar)">
                {{ order.buyer?.username?.charAt(0) || '?' }}
              </el-avatar>
              <span class="username">{{ order.buyer?.username }}</span>
              <span class="school" v-if="order.buyer?.school">{{ order.buyer.school }}</span>
            </div>
            <div class="user-item" @click="router.push({ name: 'UserProfile', params: { id: order.seller?.id } })">
              <el-tag size="small" type="warning" effect="plain">卖家</el-tag>
              <el-avatar :size="32" :src="getOssUrl(order.seller?.avatar)">
                {{ order.seller?.username?.charAt(0) || '?' }}
              </el-avatar>
              <span class="username">{{ order.seller?.username }}</span>
              <span class="school" v-if="order.seller?.school">{{ order.seller.school }}</span>
            </div>
          </div>
        </div>

        <!-- 退货信息（已申请） -->
        <div class="section-card" v-if="order.returnStatus !== 'none' && !canReviewReturn">
          <h3 class="section-title">退货信息</h3>
          <div class="info-list">
            <div class="info-item">
              <span class="label">退货状态</span>
              <span class="value">
                <el-tag
                  :type="order.returnStatus === 'approved' ? 'success' : order.returnStatus === 'rejected' ? 'danger' : 'warning'"
                  size="small"
                >
                  {{ order.returnStatus === 'pending' ? '待审核' : order.returnStatus === 'approved' ? '已同意' : '已拒绝' }}
                </el-tag>
              </span>
            </div>
            <div class="info-item" v-if="order.returnReason">
              <span class="label">退货原因</span>
              <span class="value">{{ order.returnReason }}</span>
            </div>
            <div class="info-item" v-if="order.returnApplyTime">
              <span class="label">申请时间</span>
              <span class="value">{{ formatDate(order.returnApplyTime, 'full') }}</span>
            </div>
            <div class="info-item" v-if="order.returnRejectReason">
              <span class="label">拒绝原因</span>
              <span class="value">{{ order.returnRejectReason }}</span>
            </div>
          </div>
          <div class="action-row" v-if="canApplyReturn">
            <el-button type="warning" @click="returnDialogVisible = true">申请退货</el-button>
          </div>
        </div>

        <!-- 评价区域 -->
        <div class="section-card" v-if="order.status === 'completed' && reviewStatus">
          <h3 class="section-title">订单评价</h3>
          <div class="review-status-info">
            <div class="review-row">
              <span class="review-label">买家评价</span>
              <template v-if="reviewStatus.buyerReviewed && reviewStatus.buyerReview">
                <el-tag type="success" size="small">已评价</el-tag>
              </template>
              <template v-else-if="isBuyer && reviewStatus.canReview">
                <el-button size="small" type="primary" @click="openReviewDialog('buyer_to_seller')">评价卖家</el-button>
              </template>
              <template v-else>
                <el-tag type="info" size="small">未评价</el-tag>
              </template>
            </div>
            <div class="review-row">
              <span class="review-label">卖家评价</span>
              <template v-if="reviewStatus.sellerReviewed && reviewStatus.sellerReview">
                <el-tag type="success" size="small">已评价</el-tag>
              </template>
              <template v-else-if="isSeller && reviewStatus.canReview">
                <el-button size="small" type="primary" @click="openReviewDialog('seller_to_buyer')">评价买家</el-button>
              </template>
              <template v-else>
                <el-tag type="info" size="small">未评价</el-tag>
              </template>
            </div>
          </div>

          <!-- 已有评价展示 -->
          <div v-if="reviewStatus.buyerReviewed && reviewStatus.buyerReview" class="existing-review">
            <ReviewCard
              :review="reviewStatus.buyerReview"
              :show-append-btn="isBuyer && reviewStatus.canAppend"
              :show-delete-btn="isBuyer && reviewStatus.buyerReview.status !== 'deleted'"
              @append="openAppendDialog"
              @delete="handleDeleteReview"
              @delete-append="handleDeleteAppend"
            />
          </div>
          <div v-if="reviewStatus.sellerReviewed && reviewStatus.sellerReview" class="existing-review">
            <ReviewCard
              :review="reviewStatus.sellerReview"
              :show-append-btn="isSeller && reviewStatus.canAppend"
              :show-delete-btn="isSeller && reviewStatus.sellerReview.status !== 'deleted'"
              @append="openAppendDialog"
              @delete="handleDeleteReview"
              @delete-append="handleDeleteAppend"
            />
          </div>
        </div>
      </template>
    </div>

    <!-- 支付弹窗 -->
    <PaymentDialog
      v-model="paymentDialogVisible"
      :order-info="order ? {
        orderNo: order.orderNo,
        productName: order.productName || '',
        productImage: order.productImage,
        totalPrice: order.totalPrice
      } : undefined"
      @success="handlePaymentSuccess"
    />

    <!-- 发货弹窗 -->
    <el-dialog v-model="shipDialogVisible" title="填写快递信息" width="400px">
      <el-form label-width="80px">
        <el-form-item label="快递公司">
          <el-input v-model="shipForm.expressCompany" placeholder="如: 顺丰速运" />
        </el-form-item>
        <el-form-item label="快递单号">
          <el-input v-model="shipForm.expressNo" placeholder="请输入快递单号" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="shipDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleShip">确认发货</el-button>
      </template>
    </el-dialog>

    <!-- 申请退货弹窗 -->
    <el-dialog v-model="returnDialogVisible" title="申请退货" width="400px">
      <el-form>
        <el-form-item label="退货原因">
          <el-input v-model="returnReason" type="textarea" :rows="3" placeholder="请输入退货原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="returnDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleApplyReturn">提交申请</el-button>
      </template>
    </el-dialog>

    <!-- 填写退货快递弹窗 -->
    <el-dialog v-model="returnExpressDialogVisible" title="填写退货快递信息" width="400px">
      <el-form label-width="80px">
        <el-form-item label="快递公司">
          <el-input v-model="returnExpressForm.company" placeholder="如: 中通快递" />
        </el-form-item>
        <el-form-item label="快递单号">
          <el-input v-model="returnExpressForm.expressNo" placeholder="请输入快递单号" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="returnExpressDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleFillReturnExpress">提交</el-button>
      </template>
    </el-dialog>

    <!-- 评价弹窗 -->
    <ReviewFormDialog
      v-model="reviewDialogVisible"
      :order-id="order?.id || ''"
      :order-info="order ? {
        productName: order.productName || order.product?.name || '',
        productImage: order.productImage || order.product?.images?.[0] || null,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
      } : undefined"
      :type="reviewType"
      @success="handleReviewSuccess"
    />

    <!-- 追评弹窗 -->
    <AppendReviewDialog
      v-model="appendReviewDialogVisible"
      :review-id="currentAppendReviewId"
      @success="handleReviewSuccess"
    />
  </AppLayout>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.order-detail-page {
  max-width: 800px;
  margin: 0 auto;
  padding: $spacing-lg;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $spacing-xl;
  background: $color-bg-card;
  border-radius: $radius-lg;
  padding: $spacing-md $spacing-lg;
  box-shadow: $shadow-sm;

  .back-btn {
    color: $color-text-secondary;
    font-size: $font-size-body;

    &:hover {
      color: $color-primary;
    }

    .el-icon {
      margin-right: $spacing-xs;
    }
  }

  .page-title {
    font-size: $font-size-h2;
    font-weight: $font-weight-semibold;
    margin: 0;
  }

  .chat-btn {
    font-size: $font-size-body;
  }
}

// 状态卡片
.status-card {
  background: $color-bg-card;
  border-radius: $radius-lg;
  padding: $spacing-xl;
  box-shadow: $shadow-sm;
  margin-bottom: $spacing-lg;

  &.pending_payment {
    background: linear-gradient(135deg, rgba($color-warning, 0.05) 0%, $color-bg-card 100%);
  }

  &.pending_ship, &.pending_pickup {
    background: linear-gradient(135deg, rgba($color-primary, 0.05) 0%, $color-bg-card 100%);
  }

  &.completed {
    background: linear-gradient(135deg, rgba($color-success, 0.05) 0%, $color-bg-card 100%);
  }

  &.cancelled {
    background: linear-gradient(135deg, rgba($color-error, 0.05) 0%, $color-bg-card 100%);
  }
}

.status-top {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  margin-bottom: $spacing-sm;
}

.order-no {
  font-size: $font-size-body;
  color: $color-text-secondary;
  font-family: $font-family-mono;
}

.status-desc {
  font-size: $font-size-body;
  color: $color-text-secondary;
  margin: 0 0 $spacing-lg;
}

.status-actions {
  display: flex;
  gap: $spacing-sm;
}

// 通用 section 卡片
.section-card {
  background: $color-bg-card;
  border-radius: $radius-lg;
  padding: $spacing-lg;
  box-shadow: $shadow-sm;
  margin-bottom: $spacing-md;
}

.section-title {
  font-size: $font-size-h3;
  font-weight: $font-weight-medium;
  color: $color-text-primary;
  margin: 0 0 $spacing-md;
  padding-bottom: $spacing-sm;
  border-bottom: 1px solid $color-border-light;
  display: flex;
  align-items: center;
  gap: $spacing-xs;

  .el-icon {
    color: $color-primary;
  }
}

// 退货审核
.return-info {
  p {
    margin: $spacing-sm 0;
    font-size: $font-size-body;
    color: $color-text-primary;
  }
}

.mt-sm {
  margin-top: $spacing-sm;
}

.hint {
  font-size: $font-size-body;
  color: $color-text-secondary;
  margin: 0 0 $spacing-md;
}

// 商品信息
.product-row {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  cursor: pointer;

  &:hover .product-name {
    color: $color-primary;
  }
}

.product-image {
  width: 100px;
  height: 100px;
  border-radius: $radius-md;
  object-fit: cover;
  flex-shrink: 0;
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
  transition: color $transition-fast;
}

.product-meta {
  display: flex;
  gap: $spacing-md;

  .price {
    font-size: $font-size-h3;
    font-weight: $font-weight-bold;
    color: $color-error;
  }

  .quantity {
    font-size: $font-size-body;
    color: $color-text-secondary;
  }
}

.product-total {
  text-align: right;
  flex-shrink: 0;

  .total-label {
    font-size: $font-size-small;
    color: $color-text-secondary;
  }

  .total-price {
    font-size: $font-size-h2;
    font-weight: $font-weight-bold;
    color: $color-error;
  }
}

// 信息列表
.info-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.info-item {
  display: flex;
  align-items: baseline;

  .label {
    font-size: $font-size-body;
    color: $color-text-placeholder;
    width: 80px;
    flex-shrink: 0;
  }

  .value {
    font-size: $font-size-body;
    color: $color-text-primary;
  }

  .mono {
    font-family: $font-family-mono;
  }
}

// 收货地址
.address-info {
  .receiver-row {
    display: flex;
    gap: $spacing-md;
    margin-bottom: $spacing-xs;
  }

  .receiver-name {
    font-weight: $font-weight-semibold;
  }

  .receiver-phone {
    color: $color-text-secondary;
    font-family: $font-family-mono;
  }

  .address-text {
    font-size: $font-size-body;
    color: $color-text-secondary;
    line-height: $line-height-relaxed;
  }
}

// 交易双方
.users-row {
  display: flex;
  gap: $spacing-xl;
}

.user-item {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  cursor: pointer;
  padding: $spacing-sm;
  border-radius: $radius-md;
  transition: background $transition-fast;

  &:hover {
    background: $color-bg-page;
  }

  .username {
    font-size: $font-size-body;
    font-weight: $font-weight-medium;
    color: $color-text-primary;
  }

  .school {
    font-size: $font-size-small;
    color: $color-text-placeholder;
  }
}

.action-row {
  margin-top: $spacing-md;
  display: flex;
  gap: $spacing-sm;
}

// 评价区域
.review-status-info {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.review-row {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.review-label {
  font-size: $font-size-body;
  color: $color-text-secondary;
  width: 80px;
}

.existing-review {
  margin-top: $spacing-md;
}

@media (max-width: $breakpoint-sm) {
  .product-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .product-image {
    width: 100%;
    height: 150px;
  }

  .product-total {
    width: 100%;
    text-align: left;
    margin-top: $spacing-sm;
  }

  .info-list {
    grid-template-columns: 1fr;
  }

  .users-row {
    flex-direction: column;
    gap: $spacing-md;
  }

  .status-actions {
    flex-direction: column;
  }
}
</style>