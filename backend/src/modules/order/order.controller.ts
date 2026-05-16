import { Request, Response } from 'express';
import { OrderService, OrderQuery, OrderDeliveryType, PaymentMethod, OrderStatus } from './order.service';
import { success, fail } from '../../utils/response';
import { asyncHandler } from '../../common/asyncHandler';
import { ValidationUtil } from '../../common/validation';
import { badRequest } from '../../common/errors';

function parseOrderId(req: Request): bigint {
  return ValidationUtil.parseBigIntParam(req.params.id, '订单ID');
}

function parseOrderQuery(req: Request): OrderQuery {
  return {
    page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
    pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined,
    status: req.query.status as OrderStatus | undefined,
    role: req.query.role as 'buyer' | 'seller' | undefined,
  };
}

export const OrderController = {
  /**
   * 创建订单
   * POST /orders
   */
  create: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const { productId, quantity, deliveryType, addressId, pickupInfo, remark } = req.body;

    if (!productId) {
      return fail(res, '请选择商品', 400);
    }

    if (!quantity || quantity < 1) {
      return fail(res, '购买数量至少为1', 400);
    }

    if (!deliveryType) {
      return fail(res, '请选择交易方式', 400);
    }

    if (!['self', 'express'].includes(deliveryType)) {
      return fail(res, '交易方式不正确', 400);
    }

    const order = await OrderService.create(userId, {
      productId,
      quantity,
      deliveryType,
      addressId,
      pickupInfo,
      remark,
    });

    return success(res, order, '订单创建成功', 201);
  }),

  /**
   * 获取订单详情
   * GET /orders/:id
   */
  getById: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const orderId = parseOrderId(req);
    const order = await OrderService.getById(orderId, userId);
    return success(res, order);
  }),

  /**
   * 获取我的订单列表
   * GET /orders
   */
  getMyOrders: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const query = parseOrderQuery(req);
    const result = await OrderService.getMyOrders(userId, query);
    return success(res, result);
  }),

  /**
   * 支付订单
   * POST /orders/:id/pay
   */
  pay: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const orderId = parseOrderId(req);
    const { paymentMethod } = req.body;

    if (!paymentMethod || !['wechat', 'alipay'].includes(paymentMethod)) {
      return fail(res, '请选择支付方式', 400);
    }

    const order = await OrderService.pay(userId, orderId, paymentMethod as PaymentMethod);
    return success(res, order, '支付成功');
  }),

  /**
   * 取消订单
   * POST /orders/:id/cancel
   */
  cancel: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const orderId = parseOrderId(req);
    const { reason } = req.body;

    const order = await OrderService.cancel(userId, orderId, reason);
    return success(res, order, '订单已取消');
  }),

  /**
   * 卖家发货
   * POST /orders/:id/ship
   */
  ship: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const orderId = parseOrderId(req);
    const { expressCompany, expressNo } = req.body;

    const order = await OrderService.ship(userId, orderId, { expressCompany, expressNo });
    return success(res, order, '发货成功');
  }),

  /**
   * 卖家确认买家取货（自提订单）
   * POST /orders/:id/confirm-pickup
   */
  confirmPickup: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const orderId = parseOrderId(req);

    const order = await OrderService.confirmPickup(userId, orderId);
    return success(res, order, '已确认买家取货');
  }),

  /**
   * 买家确认收货
   * POST /orders/:id/confirm-receive
   */
  confirmReceive: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const orderId = parseOrderId(req);

    const order = await OrderService.confirmReceive(userId, orderId);
    return success(res, order, '确认收货成功');
  }),

  /**
   * 申请退货
   * POST /orders/:id/return
   */
  applyReturn: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const orderId = parseOrderId(req);
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return fail(res, '请填写退货原因', 400);
    }

    const order = await OrderService.applyReturn(userId, orderId, { reason });
    return success(res, order, '退货申请已提交');
  }),

  /**
   * 卖家审核退货申请
   * POST /orders/:id/return/review
   */
  reviewReturn: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const orderId = parseOrderId(req);
    const { approved, rejectReason } = req.body;

    if (typeof approved !== 'boolean') {
      return fail(res, '请选择是否同意退货', 400);
    }

    const order = await OrderService.reviewReturn(userId, orderId, approved, rejectReason);
    return success(res, order, approved ? '已同意退货' : '已拒绝退货');
  }),

  /**
   * 买家填写退货快递信息
   * POST /orders/:id/return/express
   */
  fillReturnExpress: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const orderId = parseOrderId(req);
    const { company, expressNo } = req.body;

    const order = await OrderService.fillReturnExpress(userId, orderId, { company, expressNo });
    return success(res, order, '快递信息已提交');
  }),

  /**
   * 卖家确认收到退货
   * POST /orders/:id/return/confirm
   */
  confirmReturnReceived: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const orderId = parseOrderId(req);

    const order = await OrderService.confirmReturnReceived(userId, orderId);
    return success(res, order, '已确认收到退货，退款已完成');
  }),
};
