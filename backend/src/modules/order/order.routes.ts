import { Router } from 'express';
import { OrderController } from './order.controller';
import { ReviewController } from '../review/review.controller';
import { authMiddleware } from '../../middlewares/auth';

const router = Router();

// 所有订单路由都需要登录
router.use(authMiddleware);

// 订单列表
router.get('/', OrderController.getMyOrders);

// 创建订单
router.post('/', OrderController.create);

// 订单评价状态
router.get('/:id/review-status', ReviewController.getOrderReviewStatus);

// 订单详情
router.get('/:id', OrderController.getById);

// 支付订单
router.post('/:id/pay', OrderController.pay);

// 取消订单
router.post('/:id/cancel', OrderController.cancel);

// 卖家发货
router.post('/:id/ship', OrderController.ship);

// 卖家确认买家取货（自提订单）
router.post('/:id/confirm-pickup', OrderController.confirmPickup);

// 买家确认收货
router.post('/:id/confirm-receive', OrderController.confirmReceive);

// 申请退货
router.post('/:id/return', OrderController.applyReturn);

// 卖家审核退货申请
router.post('/:id/return/review', OrderController.reviewReturn);

// 买家填写退货快递信息
router.post('/:id/return/express', OrderController.fillReturnExpress);

// 卖家确认收到退货
router.post('/:id/return/confirm', OrderController.confirmReturnReceived);

export default router;
