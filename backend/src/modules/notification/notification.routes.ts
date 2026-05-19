import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth';
import { NotificationController } from './notification.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', NotificationController.getList);
router.get('/unread-count', NotificationController.getUnreadCount);
router.put('/read-all', NotificationController.markAllAsRead);
router.get('/:id', NotificationController.getById);
router.put('/:id/read', NotificationController.markAsRead);
router.delete('/:id', NotificationController.deleteNotification);

export const notificationRoutes = router;