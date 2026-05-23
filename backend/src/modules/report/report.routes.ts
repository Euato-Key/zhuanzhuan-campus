import { Router } from 'express';
import { ReportController } from './report.controller';
import { authMiddleware } from '../../middlewares/auth';
import { adminMiddleware } from '../../middlewares/admin';

const router = Router();
router.use(authMiddleware);
router.post('/', ReportController.create);
router.get('/my', ReportController.getMyReports);
router.get('/my/:id', ReportController.getMyReportDetail);
router.get('/admin/list', adminMiddleware, ReportController.adminList);
router.get('/admin/:id', adminMiddleware, ReportController.adminDetail);
router.put('/admin/:id/handle', adminMiddleware, ReportController.adminHandle);
export default router;
