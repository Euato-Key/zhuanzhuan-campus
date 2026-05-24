import { Router } from 'express';
import { UserController } from './user.controller';
import { authMiddleware } from '../../middlewares/auth';
import { adminMiddleware, superAdminMiddleware } from '../../middlewares/admin';

const router = Router();

router.put('/profile', authMiddleware, UserController.updateProfile);
router.put('/password', authMiddleware, UserController.changePassword);
router.put('/email', authMiddleware, UserController.changeEmail);
router.put('/avatar', authMiddleware, UserController.updateAvatar);

// Admin routes (must be before /:id)
router.get('/admin/list', authMiddleware, adminMiddleware, UserController.adminList);
router.put('/admin/:id/ban', authMiddleware, adminMiddleware, UserController.adminBan);
router.put('/admin/:id/unban', authMiddleware, adminMiddleware, UserController.adminUnban);
router.put('/admin/:id/role', authMiddleware, superAdminMiddleware, UserController.adminSetRole);

router.get('/:id', UserController.getPublicProfile);

export default router;