import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth';
import { adminMiddleware } from '../../middlewares/admin';
import { AuditController } from './audit.controller';

const router = Router();

router.post('/audit/:productId', authMiddleware, adminMiddleware, AuditController.auditProduct);
router.get('/audit/:productId/status', authMiddleware, adminMiddleware, AuditController.getAuditStatus);

export default router;