import { Router } from 'express';
import { ReviewController } from './review.controller';
import { authMiddleware } from '../../middlewares/auth';
import { optionalAuth } from '../../middlewares/optionalAuth';
import { adminMiddleware } from '../../middlewares/admin';

const router = Router();

// 评价相关接口需要登录
router.use(authMiddleware);

// 创建评价
router.post('/', ReviewController.create);

// 追加评价
router.post('/:id/append', ReviewController.append);

// 删除评价
router.delete('/:id', ReviewController.remove);
router.delete('/:id/append', ReviewController.removeAppend);

// 我收到的评价
router.get('/received', ReviewController.getReceived);

// 我发出的评价
router.get('/sent', ReviewController.getSent);

// 管理员评价审核列表
router.get('/admin/list', adminMiddleware, ReviewController.adminList);

// 管理员审核通过
router.put('/admin/:id/approve', adminMiddleware, ReviewController.adminApprove);

// 管理员审核拒绝
router.put('/admin/:id/reject', adminMiddleware, ReviewController.adminReject);

// 商品评价列表（公开，可选登录）
router.get('/products/:productId', optionalAuth, ReviewController.getProductReviews);

export default router;