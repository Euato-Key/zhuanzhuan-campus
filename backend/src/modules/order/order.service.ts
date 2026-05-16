import crypto from 'crypto';
import { prisma } from '../../config/prisma';
import { Prisma, OrderStatus, OrderDeliveryType, PaymentMethod, ReturnStatus, ProductStatus } from '@prisma/client';
import { badRequest, notFound, forbidden, conflict } from '../../common/errors';
import { PaginationUtil } from '../../common/pagination';

// ============================================
// Types
// ============================================

export type { OrderStatus, OrderDeliveryType, PaymentMethod, ReturnStatus };

export interface AddressSnapshot {
  receiverName: string;
  receiverPhone: string;
  province: string;
  city: string;
  district: string;
  street?: string | null;
  detail: string;
}

export interface PickupInfo {
  address: string;
  time: string;
}

export interface CreateOrderData {
  productId: string;
  quantity: number;
  deliveryType: OrderDeliveryType;
  addressId?: number;
  pickupInfo?: PickupInfo;
}

export interface OrderQuery {
  page?: number;
  pageSize?: number;
  status?: OrderStatus;
  role?: 'buyer' | 'seller';
}

export interface ShipOrderData {
  expressCompany: string;
  expressNo: string;
}

export interface ApplyReturnData {
  reason: string;
}

export interface FillReturnExpressData {
  company: string;
  expressNo: string;
}

// ============================================
// Constants
// ============================================

// 订单状态流转映射
const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['cancelled'],
  pending_ship: ['cancelled'],
  pending_pickup: ['cancelled'],
  pending_receive: [],
  pending_confirm: ['completed', 'cancelled'],
  completed: ['returning'],
  cancelled: [],
  returning: ['refunded'],
  refunded: [],
};

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
};

// ============================================
// Helper Functions
// ============================================

/**
 * 生成订单编号
 * 格式: 年月日时分秒 + 6位随机数
 */
function generateOrderNo(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  const random = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  return `${year}${month}${day}${hour}${minute}${second}${random}`;
}

/**
 * 检查订单状态是否可以转换到目标状态
 */
function canTransitionTo(currentStatus: OrderStatus, targetStatus: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;
}

/**
 * 检查商品是否支持指定的交易方式
 */
function isDeliveryTypeSupported(productDeliveryType: string, orderDeliveryType: OrderDeliveryType): boolean {
  if (productDeliveryType === 'both') return true;
  return productDeliveryType === orderDeliveryType;
}

// ============================================
// Order Service
// ============================================

export const OrderService = {
  /**
   * 创建订单
   * 1. 验证商品状态和库存
   * 2. 验证交易方式
   * 3. 锁定库存
   * 4. 创建订单
   */
  async create(userId: number, data: CreateOrderData) {
    if (!/^\d+$/.test(data.productId)) {
      throw badRequest('商品ID格式不正确');
    }
    const productId = BigInt(data.productId);

    // 1. 获取商品信息
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        user: { select: { id: true } },
      },
    });

    if (!product) {
      throw notFound('商品不存在');
    }

    // 2. 验证商品状态
    if (product.status !== ProductStatus.active) {
      throw badRequest('商品已下架或不可购买');
    }

    // 3. 验证不能购买自己的商品
    if (product.userId === userId) {
      throw badRequest('不能购买自己的商品');
    }

    // 4. 验证库存
    if (product.stock < data.quantity) {
      throw badRequest('库存不足');
    }

    // 5. 验证交易方式
    if (!isDeliveryTypeSupported(product.deliveryType, data.deliveryType)) {
      throw badRequest('该商品不支持此交易方式');
    }

    // 6. 验证自提信息
    if (data.deliveryType === 'self') {
      if (!data.pickupInfo?.address) {
        throw badRequest('请选择自提地点');
      }
      // 验证自提地点是否在商品设置的自提地点范围内
      if (product.pickupAddress && !product.pickupAddress.includes(data.pickupInfo.address)) {
        throw badRequest('请选择商品支持的自提地点');
      }
    }

    // 7. 验证收货地址
    let addressSnapshot: AddressSnapshot | null = null;
    if (data.deliveryType === 'express') {
      if (!data.addressId) {
        throw badRequest('请选择收货地址');
      }
      const address = await prisma.address.findFirst({
        where: { id: data.addressId, userId },
      });
      if (!address) {
        throw notFound('收货地址不存在');
      }
      addressSnapshot = {
        receiverName: address.receiverName,
        receiverPhone: address.receiverPhone,
        province: address.province,
        city: address.city,
        district: address.district,
        street: address.street,
        detail: address.detail,
      };
    }

    // 8. 计算价格
    const price = Number(product.currentPrice);
    const totalPrice = price * data.quantity;

    // 9. 创建订单和锁定库存（事务）
    const orderNo = generateOrderNo();
    const order = await prisma.$transaction(async (tx) => {
      // 检查是否有足够的可用库存（总库存 - 已锁定库存）
      const locks = await tx.productLock.aggregate({
        where: { productId },
        _sum: { quantity: true },
      });
      const lockedQuantity = locks._sum.quantity || 0;
      const availableStock = product.stock - lockedQuantity;

      if (availableStock < data.quantity) {
        throw badRequest('库存不足，请稍后再试');
      }

      // 创建订单
      const newOrder = await tx.order.create({
        data: {
          orderNo,
          productId,
          buyerId: userId,
          sellerId: product.userId,
          quantity: data.quantity,
          price,
          totalPrice,
          deliveryType: data.deliveryType,
          addressId: data.addressId ?? null,
          addressSnapshot: addressSnapshot ? JSON.parse(JSON.stringify(addressSnapshot)) : Prisma.JsonNull,
          pickupInfo: data.pickupInfo ? JSON.parse(JSON.stringify(data.pickupInfo)) : Prisma.JsonNull,
          productName: product.name,
          productImage: (product.images as string[])?.[0] || null,
          productSpecs: product.specs ?? Prisma.JsonNull,
          status: OrderStatus.pending_payment,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              images: true,
              currentPrice: true,
            },
          },
          buyer: {
            select: { id: true, username: true, avatar: true },
          },
          seller: {
            select: { id: true, username: true, avatar: true },
          },
        },
      });

      // 创建库存锁（30分钟有效期）
      const lockExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
      await tx.productLock.create({
        data: {
          productId,
          orderId: newOrder.id,
          quantity: data.quantity,
          lockedUntil: lockExpiresAt,
        },
      });

      return newOrder;
    });

    return order;
  },

  /**
   * 获取订单详情
   */
  async getById(orderId: bigint, userId: number) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            images: true,
            currentPrice: true,
            status: true,
          },
        },
        buyer: {
          select: { id: true, username: true, avatar: true, school: true, campus: true },
        },
        seller: {
          select: { id: true, username: true, avatar: true, school: true, campus: true },
        },
        address: true,
      },
    });

    if (!order) {
      throw notFound('订单不存在');
    }

    // 验证权限：只有买家或卖家可以查看
    if (order.buyerId !== userId && order.sellerId !== userId) {
      throw forbidden('无权查看此订单');
    }

    return order;
  },

  /**
   * 获取用户订单列表
   */
  async getMyOrders(userId: number, query: OrderQuery) {
    const { skip, take, page, pageSize } = PaginationUtil.getPagination({
      page: query.page,
      pageSize: query.pageSize,
    });

    const where: Prisma.OrderWhereInput = {};

    // 根据角色筛选
    if (query.role === 'seller') {
      where.sellerId = userId;
    } else {
      where.buyerId = userId;
    }

    // 状态筛选
    if (query.status) {
      where.status = query.status;
    }

    const [total, list] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              images: true,
              status: true,
            },
          },
          buyer: {
            select: { id: true, username: true, avatar: true },
          },
          seller: {
            select: { id: true, username: true, avatar: true },
          },
        },
      }),
    ]);

    return PaginationUtil.buildResponse(list, total, page, pageSize);
  },

  /**
   * 支付订单（模拟支付）
   */
  async pay(userId: number, orderId: bigint, paymentMethod: PaymentMethod) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        product: true,
        locks: true,
      },
    });

    if (!order) {
      throw notFound('订单不存在');
    }

    if (order.buyerId !== userId) {
      throw forbidden('无权操作此订单');
    }

    if (order.status !== OrderStatus.pending_payment) {
      throw badRequest('订单状态不正确');
    }

    // 验证库存锁是否有效
    if (!order.locks || order.locks.length === 0) {
      throw badRequest('订单已过期，请重新下单');
    }

    // 检查库存锁是否过期
    const lock = order.locks[0];
    if (new Date() > lock.lockedUntil) {
      throw badRequest('订单已过期，请重新下单');
    }

    // 更新订单状态
    const newStatus = order.deliveryType === 'self'
      ? OrderStatus.pending_pickup
      : OrderStatus.pending_ship;

    const updated = await prisma.$transaction(async (tx) => {
      // 更新订单
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: newStatus,
          paymentMethod,
          payTime: new Date(),
        },
      });

      // 扣减库存
      await tx.product.update({
        where: { id: order.productId },
        data: {
          stock: { decrement: order.quantity },
        },
      });

      // 删除库存锁
      await tx.productLock.deleteMany({
        where: { orderId },
      });

      return updatedOrder;
    });

    return updated;
  },

  /**
   * 取消订单
   */
  async cancel(userId: number, orderId: bigint, reason?: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { locks: true },
    });

    if (!order) {
      throw notFound('订单不存在');
    }

    // 验证权限：买家或卖家都可以取消
    if (order.buyerId !== userId && order.sellerId !== userId) {
      throw forbidden('无权操作此订单');
    }

    // 验证状态：只有待支付、待发货、待自提状态可以取消
    const cancellableStatuses: OrderStatus[] = [
      OrderStatus.pending_payment,
      OrderStatus.pending_ship,
      OrderStatus.pending_pickup,
    ];

    if (!cancellableStatuses.includes(order.status)) {
      throw badRequest('当前订单状态不可取消');
    }

    // 如果是待支付状态，需要释放库存锁
    const shouldReleaseLock = order.status === OrderStatus.pending_payment && order.locks.length > 0;
    // 如果是已支付状态，需要恢复库存
    const shouldRestoreStock = order.status === OrderStatus.pending_ship || order.status === OrderStatus.pending_pickup;

    const updated = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.cancelled,
          cancelReason: reason || (userId === order.buyerId ? '买家取消' : '卖家取消'),
        },
      });

      // 释放库存锁
      if (shouldReleaseLock) {
        await tx.productLock.deleteMany({
          where: { orderId },
        });
      }

      // 恢复已扣减的库存
      if (shouldRestoreStock) {
        await tx.product.update({
          where: { id: order.productId },
          data: {
            stock: { increment: order.quantity },
          },
        });
      }

      return updatedOrder;
    });

    return updated;
  },

  /**
   * 卖家发货
   */
  async ship(userId: number, orderId: bigint, data: ShipOrderData) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw notFound('订单不存在');
    }

    if (order.sellerId !== userId) {
      throw forbidden('无权操作此订单');
    }

    if (order.status !== OrderStatus.pending_ship) {
      throw badRequest('订单状态不正确');
    }

    if (!data.expressCompany || !data.expressNo) {
      throw badRequest('请填写快递公司和快递单号');
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.pending_receive,
        expressCompany: data.expressCompany,
        expressNo: data.expressNo,
        shipTime: new Date(),
      },
    });

    return updated;
  },

  /**
   * 卖家确认买家取货（自提订单）
   */
  async confirmPickup(userId: number, orderId: bigint) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw notFound('订单不存在');
    }

    if (order.sellerId !== userId) {
      throw forbidden('无权操作此订单');
    }

    if (order.status !== OrderStatus.pending_pickup) {
      throw badRequest('订单状态不正确');
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.pending_confirm,
        confirmPickupTime: new Date(),
      },
    });

    return updated;
  },

  /**
   * 买家确认收货
   */
  async confirmReceive(userId: number, orderId: bigint) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw notFound('订单不存在');
    }

    if (order.buyerId !== userId) {
      throw forbidden('无权操作此订单');
    }

    // 待收货或待确认自提状态可以确认收货
    const confirmableStatuses: OrderStatus[] = [
      OrderStatus.pending_receive,
      OrderStatus.pending_confirm,
    ];

    if (!confirmableStatuses.includes(order.status)) {
      throw badRequest('订单状态不正确');
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.completed,
        receiveTime: new Date(),
        confirmTime: new Date(),
      },
    });

    return updated;
  },

  /**
   * 申请退货
   */
  async applyReturn(userId: number, orderId: bigint, data: ApplyReturnData) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw notFound('订单不存在');
    }

    if (order.buyerId !== userId) {
      throw forbidden('无权操作此订单');
    }

    if (order.status !== OrderStatus.completed) {
      throw badRequest('只有已完成的订单可以申请退货');
    }

    if (order.returnStatus === ReturnStatus.pending) {
      throw badRequest('已有待审核的退货申请');
    }

    if (order.returnStatus === ReturnStatus.approved) {
      throw badRequest('退货申请已通过，请填写快递信息');
    }

    // 检查退货申请次数
    if (order.returnApplyCount >= 3) {
      throw badRequest('退货申请次数已达上限');
    }

    // 检查是否在退货期限内（确认收货后14天内）
    if (order.confirmTime) {
      const daysSinceConfirm = Math.floor(
        (Date.now() - order.confirmTime.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceConfirm > 14) {
        throw badRequest('已超过退货期限（确认收货后14天内）');
      }
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        returnStatus: ReturnStatus.pending,
        returnReason: data.reason,
        returnApplyTime: new Date(),
        returnApplyCount: { increment: 1 },
      },
    });

    return updated;
  },

  /**
   * 卖家审核退货申请
   */
  async reviewReturn(userId: number, orderId: bigint, approved: boolean, rejectReason?: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw notFound('订单不存在');
    }

    if (order.sellerId !== userId) {
      throw forbidden('无权操作此订单');
    }

    if (order.returnStatus !== ReturnStatus.pending) {
      throw badRequest('当前退货状态不可审核');
    }

    if (approved) {
      // 同意退货
      const updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          returnStatus: ReturnStatus.approved,
          returnApprovedTime: new Date(),
          status: OrderStatus.returning,
        },
      });
      return updated;
    } else {
      // 拒绝退货
      if (!rejectReason) {
        throw badRequest('请填写拒绝原因');
      }
      const updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          returnStatus: ReturnStatus.rejected,
          returnRejectReason: rejectReason,
        },
      });
      return updated;
    }
  },

  /**
   * 买家填写退货快递信息
   */
  async fillReturnExpress(userId: number, orderId: bigint, data: FillReturnExpressData) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw notFound('订单不存在');
    }

    if (order.buyerId !== userId) {
      throw forbidden('无权操作此订单');
    }

    if (order.returnStatus !== ReturnStatus.approved) {
      throw badRequest('退货申请未通过，无法填写快递信息');
    }

    if (!data.company || !data.expressNo) {
      throw badRequest('请填写快递公司和快递单号');
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        returnCompany: data.company,
        returnExpressNo: data.expressNo,
      },
    });

    return updated;
  },

  /**
   * 卖家确认收到退货
   */
  async confirmReturnReceived(userId: number, orderId: bigint) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw notFound('订单不存在');
    }

    if (order.sellerId !== userId) {
      throw forbidden('无权操作此订单');
    }

    if (order.status !== OrderStatus.returning) {
      throw badRequest('订单状态不正确');
    }

    if (!order.returnCompany || !order.returnExpressNo) {
      throw badRequest('买家尚未填写退货快递信息');
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 更新订单状态
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.refunded,
          returnReceivedTime: new Date(),
        },
      });

      // 恢复库存
      await tx.product.update({
        where: { id: order.productId },
        data: {
          stock: { increment: order.quantity },
        },
      });

      return updatedOrder;
    });

    return updated;
  },

  /**
   * 清理过期的库存锁
   */
  async cleanExpiredLocks() {
    const now = new Date();
    const expiredLocks = await prisma.productLock.findMany({
      where: { lockedUntil: { lt: now } },
      include: { order: true },
    });

    for (const lock of expiredLocks) {
      // 如果订单还是待支付状态，取消订单
      if (lock.order.status === OrderStatus.pending_payment) {
        await prisma.order.update({
          where: { id: lock.orderId },
          data: {
            status: OrderStatus.cancelled,
            cancelReason: '支付超时自动取消',
          },
        });
      }
      // 删除锁
      await prisma.productLock.delete({
        where: { id: lock.id },
      });
    }

    return expiredLocks.length;
  },
};
