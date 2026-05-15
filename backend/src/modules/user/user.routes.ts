import { Router } from 'express';
import { UserController } from './user.controller';
import { authMiddleware } from '../../middlewares/auth';

const router = Router();

router.put('/profile', authMiddleware, UserController.updateProfile);
router.put('/password', authMiddleware, UserController.changePassword);
router.put('/email', authMiddleware, UserController.changeEmail);
router.put('/avatar', authMiddleware, UserController.updateAvatar);
router.get('/:id', UserController.getPublicProfile);

export default router;