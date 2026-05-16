import { Request, Response } from 'express';
import { OrderService, OrderQuery, OrderDeliveryType, PaymentMethod, OrderStatus } from './order.service';
import { success } from '../../utils/response';
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
  create: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const { productId, quantity, deliveryType, addressId, pickupInfo } = req.body;

    if (!productId) throw badRequest('请选择商品');
    if (!quantity || quantity < 1) throw badRequest('购买数量至少为1');
    if (!deliveryType) throw badRequest('请选择交易方式');
    if (!['self', 'express'].includes(deliveryType)) throw badRequest('交易方式不正确');

    const order = await OrderService.create(userId, {
      productId,
      quantity,
      deliveryType,
      addressId,
      pickupInfo,
    });

    return success(res, order, '订单创建成功', 201);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const orderId = parseOrderId(req);
    const order = await OrderService.getById(orderId, userId);
    return success(res, order);
  }),

  getMyOrders: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const query = parseOrderQuery(req);
    const result = await OrderService.getMyOrders(userId, query);
    return success(res, result);
  }),

  pay: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const orderId = parseOrderId(req);
    const { paymentMethod } = req.body;

    if (!paymentMethod || !['wechat', 'alipay'].includes(paymentMethod)) {
      throw badRequest('请选择支付方式');
    }

    const order = await OrderService.pay(userId, orderId, paymentMethod as PaymentMethod);
    return success(res, order, '支付成功');
  }),

  cancel: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const orderId = parseOrderId(req);
    const { reason } = req.body;

    const order = await OrderService.cancel(userId, orderId, reason);
    return success(res, order, '订单已取消');
  }),

  ship: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const orderId = parseOrderId(req);
    const { expressCompany, expressNo } = req.body;

    const order = await OrderService.ship(userId, orderId, { expressCompany, expressNo });
    return success(res, order, '发货成功');
  }),

  confirmPickup: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const orderId = parseOrderId(req);

    const order = await OrderService.confirmPickup(userId, orderId);
    return success(res, order, '已确认买家取货');
  }),

  confirmReceive: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const orderId = parseOrderId(req);

    const order = await OrderService.confirmReceive(userId, orderId);
    return success(res, order, '确认收货成功');
  }),

  applyReturn: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const orderId = parseOrderId(req);
    const { reason } = req.body;

    if (!reason || !reason.trim()) throw badRequest('请填写退货原因');

    const order = await OrderService.applyReturn(userId, orderId, { reason });
    return success(res, order, '退货申请已提交');
  }),

  reviewReturn: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const orderId = parseOrderId(req);
    const { approved, rejectReason } = req.body;

    if (typeof approved !== 'boolean') throw badRequest('请选择是否同意退货');

    const order = await OrderService.reviewReturn(userId, orderId, approved, rejectReason);
    return success(res, order, approved ? '已同意退货' : '已拒绝退货');
  }),

  fillReturnExpress: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const orderId = parseOrderId(req);
    const { company, expressNo } = req.body;

    const order = await OrderService.fillReturnExpress(userId, orderId, { company, expressNo });
    return success(res, order, '快递信息已提交');
  }),

  confirmReturnReceived: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const orderId = parseOrderId(req);

    const order = await OrderService.confirmReturnReceived(userId, orderId);
    return success(res, order, '已确认收到退货，退款已完成');
  }),
};