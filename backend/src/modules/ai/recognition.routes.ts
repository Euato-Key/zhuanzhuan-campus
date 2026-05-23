import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth';
import { RecognitionController } from './recognition.controller';

const router = Router();

router.post('/recognize', authMiddleware, RecognitionController.recognizeProduct);
router.post('/recognize-stream', authMiddleware, RecognitionController.recognizeProductStream);

export default router;