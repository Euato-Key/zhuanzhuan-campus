import { Router } from 'express';
import { CategoryController } from './category.controller';
import { authMiddleware } from '../../middlewares/auth';
import { adminMiddleware } from '../../middlewares/admin';

const router = Router();

// 公开接口 - 获取分类树（用于商品筛选、发布选择分类等）
router.get('/tree', CategoryController.getTree);

// 公开接口 - 获取分类列表（扁平列表）
router.get('/list', CategoryController.getList);

// 公开接口 - 获取单个分类详情
router.get('/:id', CategoryController.getById);

// 管理员接口 - 创建分类
router.post('/', authMiddleware, adminMiddleware, CategoryController.create);

// 管理员接口 - 更新分类
router.put('/:id', authMiddleware, adminMiddleware, CategoryController.update);

// 管理员接口 - 删除分类
router.delete('/:id', authMiddleware, adminMiddleware, CategoryController.delete);

export default router;