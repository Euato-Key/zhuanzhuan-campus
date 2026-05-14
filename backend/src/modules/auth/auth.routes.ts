import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authMiddleware } from '../../middlewares/auth';

const router = Router();

router.post('/send-code', AuthController.sendCode);
router.post('/register', AuthController.register);
router.post('/login/password', AuthController.loginByEmailPassword);
router.post('/login/code', AuthController.loginByEmailCode);
router.post('/refresh-token', AuthController.refreshToken);
router.post('/logout', authMiddleware, AuthController.logout);
router.post('/reset-password', AuthController.resetPassword);
router.get('/profile', authMiddleware, AuthController.getProfile);

export default router;
