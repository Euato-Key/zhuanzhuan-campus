import { Router } from 'express';
import { AIController } from './ai.controller';
import { authMiddleware } from '../../middlewares/auth';
import { adminMiddleware } from '../../middlewares/admin';

const router = Router();

router.post('/recognize', authMiddleware, AIController.recognizeProduct);
router.post('/recognize-stream', authMiddleware, AIController.recognizeProductStream);

// AI审核路由（管理员手动触发）
router.post('/audit/:productId', authMiddleware, adminMiddleware, AIController.auditProduct);
router.get('/audit/:productId/status', authMiddleware, adminMiddleware, AIController.getAuditStatus);

router.post('/assistant/chat', authMiddleware, AIController.assistantChat);
router.get('/assistant/conversations', authMiddleware, AIController.assistantConversations);
router.delete('/assistant/conversations/:id', authMiddleware, AIController.assistantDeleteConversation);

export default router;
