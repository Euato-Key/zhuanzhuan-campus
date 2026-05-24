import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authMiddleware } from '../../middlewares/auth';
import { adminMiddleware } from '../../middlewares/admin';

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/dashboard', AdminController.getDashboard);
router.get('/dashboard/charts', AdminController.getChartStats);

export default router;
