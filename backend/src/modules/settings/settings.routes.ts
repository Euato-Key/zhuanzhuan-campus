import { Router } from 'express';
import { SettingsController } from './settings.controller';
import { authMiddleware } from '../../middlewares/auth';
import { adminMiddleware, superAdminMiddleware } from '../../middlewares/admin';

const router = Router();

// 管理员可查看配置
router.get('/', authMiddleware, adminMiddleware, SettingsController.getSettings);

// 超级管理员可修改配置
router.put('/', authMiddleware, superAdminMiddleware, SettingsController.updateSettings);

export default router;
