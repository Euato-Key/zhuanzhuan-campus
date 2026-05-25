import { Router } from 'express';
import { AdminController } from './admin.controller';
import { BannerController } from '../banner/banner.controller';
import { authMiddleware } from '../../middlewares/auth';
import { adminMiddleware } from '../../middlewares/admin';

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/dashboard', AdminController.getDashboard);
router.get('/dashboard/charts', AdminController.getChartStats);

// Banner 管理
router.get('/banners', BannerController.getList);
router.post('/banners', BannerController.create);
router.put('/banners/:id', BannerController.update);
router.delete('/banners/:id', BannerController.delete);
router.put('/banners/:id/status', BannerController.toggleStatus);

export default router;
