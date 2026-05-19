import { Router } from 'express';
import { AIController } from './ai.controller';
import { authMiddleware } from '../../middlewares/auth';

const router = Router();

router.post('/recognize', authMiddleware, AIController.recognizeProduct);

export default router;