import { Router } from 'express';
import { UploadController } from './upload.controller';
import { authMiddleware } from '../../middlewares/auth';

const router = Router();

router.post('/sts-token', authMiddleware, UploadController.getSTSToken);
router.post('/signed-url', authMiddleware, UploadController.getSignedUrl);

export default router;