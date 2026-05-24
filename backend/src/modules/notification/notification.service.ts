import type { NotificationType, RelatedType } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { PaginationUtil } from '../../common/pagination';
import { notFound, forbidden, badRequest } from '../../common/errors';
import { getIO } from '../../config/socket';
import { serializeData } from '../../utils/response';
import type { NotificationQuery, CreateNotificationParams, UnreadCountResult } from './notification.types';

function emitUnreadCount(userId: number) {
  try {
    const io = getIO();
    NotificationService.getUnreadCount(userId)
      .then(count => io.to(`user_${userId}`).emit('notification:unread_count', count))
      .catch(() => {});
  } catch {}
}

function emitNewNotification(userId: number, notification: unknown) {
  try {
    const io = getIO();
    io.to(`user_${userId}`).emit('notification:new', serializeData(notification));
  } catch {}
}

export const NotificationService = {
  async create(params: CreateNotificationParams) {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        content: params.content ?? null,
        relatedId: params.relatedId != null ? (typeof params.relatedId === 'bigint' ? params.relatedId : BigInt(params.relatedId)) : null,
        relatedType: params.relatedType ?? null,
      },
    });

    emitNewNotification(params.userId, notification);
    emitUnreadCount(params.userId);

    return notification;
  },

  async getList(userId: number, query: NotificationQuery) {
    const { skip, take, page, pageSize } = PaginationUtil.getPagination({
      page: query.page,
      pageSize: query.pageSize,
    });

    const where: { userId: number; type?: NotificationType } = { userId };
    if (query.type) where.type = query.type;

    const [total, list] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return PaginationUtil.buildResponse(list, total, page, pageSize);
  },

  async getById(userId: number, notificationId: number) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) throw notFound('通知不存在');
    if (notification.userId !== userId) throw forbidden('无权查看此通知');

    if (!notification.isRead) {
      const updated = await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });
      emitUnreadCount(userId);
      return updated;
    }

    return notification;
  },

  async getUnreadCount(userId: number): Promise<UnreadCountResult> {
    const byTypeRows = await prisma.notification.groupBy({
      by: ['type'],
      where: { userId, isRead: false },
      _count: { type: true },
    });

    const byType: Partial<Record<NotificationType, number>> = {};
    let total = 0;
    for (const row of byTypeRows) {
      byType[row.type] = row._count.type;
      total += row._count.type;
    }

    return { total, byType };
  },

  async markAsRead(userId: number, notificationId: number) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) throw notFound('通知不存在');
    if (notification.userId !== userId) throw forbidden('无权操作此通知');
    if (notification.isRead) return notification;

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    emitUnreadCount(userId);
    return updated;
  },

  async markAllAsRead(userId: number, type?: NotificationType) {
    const where: { userId: number; isRead: boolean; type?: NotificationType } = {
      userId,
      isRead: false,
    };
    if (type) where.type = type;

    const result = await prisma.notification.updateMany({
      where,
      data: { isRead: true },
    });

    if (result.count > 0) {
      emitUnreadCount(userId);
    }

    return { count: result.count };
  },

  async delete(userId: number, notificationId: number) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) throw notFound('通知不存在');
    if (notification.userId !== userId) throw forbidden('无权删除此通知');
    if (!notification.isRead) throw badRequest('未读通知不可删除，请先标记为已读');

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    return { message: '通知已删除' };
  },
};
