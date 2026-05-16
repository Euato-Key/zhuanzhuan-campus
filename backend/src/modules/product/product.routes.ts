import { Router } from 'express';
import { ProductController } from './product.controller';
import { authMiddleware } from '../../middlewares/auth';
import { adminMiddleware } from '../../middlewares/admin';

const router = Router();

// 公开路由
router.get('/', ProductController.getList);
router.get('/user/:userId', ProductController.getUserProducts);

// 需要登录的路由 - 必须在 /:id 之前，否则 Express 会将 'my' 匹配为 ID
router.get('/my/list', authMiddleware, ProductController.getMyProducts);
router.post('/', authMiddleware, ProductController.create);
router.put('/:id', authMiddleware, ProductController.update);
router.put('/:id/offline', authMiddleware, ProductController.offline);
router.put('/:id/relist', authMiddleware, ProductController.relist);
router.delete('/:id', authMiddleware, ProductController.delete);

// 公开路由 - 放在参数化路由之后
router.get('/:id', ProductController.getById);

// 管理员路由
router.get('/admin/list', authMiddleware, adminMiddleware, ProductController.getAdminList);
router.put('/admin/:id/approve', authMiddleware, adminMiddleware, ProductController.approve);
router.put('/admin/:id/reject', authMiddleware, adminMiddleware, ProductController.reject);
router.put('/admin/:id/ban', authMiddleware, adminMiddleware, ProductController.ban);
router.put('/admin/:id/unban', authMiddleware, adminMiddleware, ProductController.unban);
router.put('/admin/:id/force-offline', authMiddleware, adminMiddleware, ProductController.forceOffline);

export default router;
