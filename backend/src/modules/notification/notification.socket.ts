import type { Socket } from 'socket.io';
import { NotificationService } from './notification.service';

export function registerNotificationSocket(socket: Socket) {
  const userId = socket.data?.user?.userId;
  if (!userId) return;
  NotificationService.getUnreadCount(userId).then(count => {
    socket.emit('notification:unread_count', count);
  }).catch(() => {});
}
