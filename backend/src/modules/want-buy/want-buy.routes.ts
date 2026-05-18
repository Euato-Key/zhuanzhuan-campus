import { Router } from 'express';
import { WantBuyController } from './want-buy.controller';
import { optionalAuth } from '../../middlewares/optionalAuth';
import { authMiddleware } from '../../middlewares/auth';
import { adminMiddleware } from '../../middlewares/admin';

const router = Router();

// ==================== 公开路由 ====================

// 获取求购贴列表
router.get('/', WantBuyController.getList);

// 获取用户发布的求购贴
router.get('/user/:userId', WantBuyController.getUserList);

// ==================== 需要登录的路由（必须在 /:id 之前）====================

// 获取我的求购贴列表
router.get('/my/list', authMiddleware, WantBuyController.getMyList);

// 发布求购贴
router.post('/', authMiddleware, WantBuyController.create);

// ==================== 管理员路由（必须在 /:id 之前）====================

router.get('/admin/list', authMiddleware, adminMiddleware, WantBuyController.getAdminList);
router.delete('/admin/:id', authMiddleware, adminMiddleware, WantBuyController.adminDelete);
router.delete('/admin/comments/:commentId', authMiddleware, adminMiddleware, WantBuyController.adminDeleteComment);

// ==================== 求购贴详情（公开，可选登录）====================

router.get('/:id', optionalAuth, WantBuyController.getById);

// ==================== 求购贴操作（需要登录）====================

router.put('/:id', authMiddleware, WantBuyController.update);
router.delete('/:id', authMiddleware, WantBuyController.delete);
router.put('/:id/found', authMiddleware, WantBuyController.markFound);
router.put('/:id/close', authMiddleware, WantBuyController.close);
router.put('/:id/reopen', authMiddleware, WantBuyController.reopen);

// ==================== 评论相关 ====================

// 获取评论列表（公开，可选登录）
router.get('/:id/comments', optionalAuth, WantBuyController.getComments);

// 发表评论（需要登录）
router.post('/:id/comments', authMiddleware, WantBuyController.createComment);

// 评论操作（需要登录）
router.put('/comments/:commentId', authMiddleware, WantBuyController.updateComment);
router.delete('/comments/:commentId', authMiddleware, WantBuyController.deleteComment);
router.post('/comments/:commentId/like', authMiddleware, WantBuyController.likeComment);
router.delete('/comments/:commentId/like', authMiddleware, WantBuyController.unlikeComment);

export default router;
