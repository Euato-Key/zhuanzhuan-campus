import { Router } from 'express';
import recognitionRoutes from './recognition.routes';
import auditRoutes from './audit.routes';
import assistantRoutes from './assistant.routes';

const router = Router();
router.use(recognitionRoutes);
router.use(auditRoutes);
router.use(assistantRoutes);

export default router;