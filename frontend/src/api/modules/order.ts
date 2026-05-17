import api from '../index'

// 订单状态枚举
export type OrderStatus =
  | 'pending_payment'
  | 'pending_ship'
  | 'pending_pickup'
  | 'pending_receive'
  | 'pending_confirm'
  | 'completed'
  | 'cancelled'
  | 'returning'
  | 'refunded'

export type OrderDeliveryType = 'self' | 'express'
export type PaymentMethod = 'wechat' | 'alipay'
export type ReturnStatus = 'none' | 'pending' | 'approved' | 'rejected'

// 订单状态显示文本
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: '待支付',
  pending_ship: '待发货',
  pending_pickup: '待自提',
  pending_receive: '待收货',
  pending_confirm: '待确认自提',
  completed: '已完成',
  cancelled: '已取消',
  returning: '退货中',
  refunded: '已退款',
}

// 订单状态标签类型
export const ORDER_STATUS_TAG_TYPE: Record<OrderStatus, 'warning' | 'primary' | 'info' | 'success' | 'danger'> = {
  pending_payment: 'warning',
  pending_ship: 'primary',
  pending_pickup: 'primary',
  pending_receive: 'info',
  pending_confirm: 'info',
  completed: 'success',
  cancelled: 'danger',
  returning: 'warning',
  refunded: 'info',
}

// 收货地址快照
export interface AddressSnapshot {
  receiverName: string
  receiverPhone: string
  province: string
  city: string
  district: string
  street?: string | null
  detail: string
}

// 自提信息
export interface PickupInfo {
  address: string
  time: string
}

// 商品快照
export interface ProductSnapshot {
  id: string
  name: string
  images: string[]
  currentPrice: number
  status: string
}

// 用户信息
export interface OrderUser {
  id: number
  username: string
  avatar: string | null
  school?: string | null
  campus?: string | null
}

// 订单列表项
export interface OrderListItem {
  id: string
  orderNo: string
  productId: string
  buyerId: number
  sellerId: number
  quantity: number
  price: number
  totalPrice: number
  deliveryType: OrderDeliveryType
  status: OrderStatus
  productName: string
  productImage: string | null
  createdAt: string
  product: ProductSnapshot
  buyer: OrderUser
  seller: OrderUser
}

// 订单详情
export interface OrderDetail extends OrderListItem {
  addressSnapshot: AddressSnapshot | null
  pickupInfo: PickupInfo | null
  paymentMethod: PaymentMethod | null
  payTime: string | null
  shipTime: string | null
  receiveTime: string | null
  confirmPickupTime: string | null
  confirmTime: string | null
  expressCompany: string | null
  expressNo: string | null
  productSpecs: Record<string, string> | null
  cancelReason: string | null
  returnStatus: ReturnStatus
  returnReason: string | null
  returnRejectReason: string | null
  returnApplyTime: string | null
  returnApprovedTime: string | null
  returnReceivedTime: string | null
  returnCompany: string | null
  returnExpressNo: string | null
  returnApplyCount: number
  address?: {
    id: number
    receiverName: string
    receiverPhone: string
    province: string
    city: string
    district: string
    detail: string
  } | null
}

// 创建订单请求
export interface CreateOrderRequest {
  productId: string
  quantity: number
  deliveryType: OrderDeliveryType
  addressId?: number
  pickupInfo?: PickupInfo
}

// 发货请求
export interface ShipOrderRequest {
  expressCompany: string
  expressNo: string
}

// 退货申请请求
export interface ApplyReturnRequest {
  reason: string
}

// 退货审核请求
export interface ReviewReturnRequest {
  approved: boolean
  rejectReason?: string
}

// 填写退货快递请求
export interface FillReturnExpressRequest {
  company: string
  expressNo: string
}

// ============================================
// API Functions
// ============================================

// 获取我的订单列表
export function getMyOrders(params: {
  page?: number
  pageSize?: number
  status?: OrderStatus
  role?: 'buyer' | 'seller'
}) {
  return api.get<{ code: number; data: { list: OrderListItem[]; total: number; page: number; pageSize: number; totalPages: number }; message: string }>('/orders', { params })
}

// 获取订单详情
export function getOrderDetail(orderId: string) {
  return api.get<{ code: number; data: OrderDetail; message: string }>(`/orders/${orderId}`)
}

// 创建订单
export function createOrder(data: CreateOrderRequest) {
  return api.post<{ code: number; data: OrderDetail; message: string }>('/orders', data)
}

// 支付订单
export function payOrder(orderId: string, paymentMethod: PaymentMethod) {
  return api.post<{ code: number; data: OrderDetail; message: string }>(`/orders/${orderId}/pay`, { paymentMethod })
}

// 取消订单
export function cancelOrder(orderId: string, reason?: string) {
  return api.post<{ code: number; data: OrderDetail; message: string }>(`/orders/${orderId}/cancel`, { reason })
}

// 卖家发货
export function shipOrder(orderId: string, data: ShipOrderRequest) {
  return api.post<{ code: number; data: OrderDetail; message: string }>(`/orders/${orderId}/ship`, data)
}

// 卖家确认买家取货
export function confirmPickup(orderId: string) {
  return api.post<{ code: number; data: OrderDetail; message: string }>(`/orders/${orderId}/confirm-pickup`)
}

// 买家确认收货
export function confirmReceive(orderId: string) {
  return api.post<{ code: number; data: OrderDetail; message: string }>(`/orders/${orderId}/confirm-receive`)
}

// 申请退货
export function applyReturn(orderId: string, data: ApplyReturnRequest) {
  return api.post<{ code: number; data: OrderDetail; message: string }>(`/orders/${orderId}/return`, data)
}

// 卖家审核退货
export function reviewReturn(orderId: string, data: ReviewReturnRequest) {
  return api.post<{ code: number; data: OrderDetail; message: string }>(`/orders/${orderId}/return/review`, data)
}

// 买家填写退货快递
export function fillReturnExpress(orderId: string, data: FillReturnExpressRequest) {
  return api.post<{ code: number; data: OrderDetail; message: string }>(`/orders/${orderId}/return/express`, data)
}

// 卖家确认收到退货
export function confirmReturnReceived(orderId: string) {
  return api.post<{ code: number; data: OrderDetail; message: string }>(`/orders/${orderId}/return/confirm`)
}