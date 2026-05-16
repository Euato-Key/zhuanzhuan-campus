import { Router } from 'express';
import { ProductController } from './product.controller';
import { optionalAuth } from '../../middlewares/optionalAuth';
import { authMiddleware } from '../../middlewares/auth';
import { adminMiddleware } from '../../middlewares/admin';

const router = Router();

// 公开路由
router.get('/', ProductController.getList);
router.get('/user/:userId', ProductController.getUserProducts);

// 需要登录的路由 - 必须在 /:id 之前，否则 Express 会将 'my' 匹配为 ID
router.get('/my/list', authMiddleware, ProductController.getMyProducts);
router.get('/my/favorites', authMiddleware, ProductController.getFavorites);
router.post('/', authMiddleware, ProductController.create);
router.put('/:id', authMiddleware, ProductController.update);
router.put('/:id/offline', authMiddleware, ProductController.offline);
router.put('/:id/relist', authMiddleware, ProductController.relist);
router.post('/:id/favorite', authMiddleware, ProductController.addFavorite);
router.delete('/:id/favorite', authMiddleware, ProductController.removeFavorite);
router.delete('/:id', authMiddleware, ProductController.delete);

// 公开路由 - 放在参数化路由之后，但需要可选认证来获取收藏状态
router.get('/:id', optionalAuth, ProductController.getById);

// 管理员路由
router.get('/admin/list', authMiddleware, adminMiddleware, ProductController.getAdminList);
router.put('/admin/:id/approve', authMiddleware, adminMiddleware, ProductController.approve);
router.put('/admin/:id/reject', authMiddleware, adminMiddleware, ProductController.reject);
router.put('/admin/:id/ban', authMiddleware, adminMiddleware, ProductController.ban);
router.put('/admin/:id/unban', authMiddleware, adminMiddleware, ProductController.unban);
router.put('/admin/:id/force-offline', authMiddleware, adminMiddleware, ProductController.forceOffline);

export default router;
