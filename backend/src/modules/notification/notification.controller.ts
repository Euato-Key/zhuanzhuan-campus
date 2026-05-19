import type { Request, Response } from 'express';
import { NotificationService } from './notification.service';
import { asyncHandler } from '../../common/asyncHandler';
import { success } from '../../utils/response';
import { badRequest } from '../../common/errors';
import { NotificationType } from '@prisma/client';
import type { JwtPayload } from '../../middlewares/auth';

const VALID_NOTIFICATION_TYPES = new Set<string>(Object.values(NotificationType));

function getUserId(req: Request): number {
  return (req.user as JwtPayload).userId;
}

function parseNotificationId(req: Request): number {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw badRequest('通知ID格式不正确');
  }
  return id;
}

function parseNotificationType(value: unknown): NotificationType | undefined {
  if (!value || typeof value !== 'string') return undefined;
  if (!VALID_NOTIFICATION_TYPES.has(value)) {
    throw badRequest(`无效的通知类型: ${value}`);
  }
  return value as NotificationType;
}

export const NotificationController = {
  getList: asyncHandler(async (req: Request, res: Response) => {
    const { type, page, pageSize } = req.query;

    const result = await NotificationService.getList(getUserId(req), {
      type: parseNotificationType(type),
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });

    return success(res, result);
  }),

  getUnreadCount: asyncHandler(async (req: Request, res: Response) => {
    const result = await NotificationService.getUnreadCount(getUserId(req));
    return success(res, result);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const result = await NotificationService.getById(getUserId(req), parseNotificationId(req));
    return success(res, result);
  }),

  markAsRead: asyncHandler(async (req: Request, res: Response) => {
    const result = await NotificationService.markAsRead(getUserId(req), parseNotificationId(req));
    return success(res, result);
  }),

  markAllAsRead: asyncHandler(async (req: Request, res: Response) => {
    const { type } = req.body;
    const result = await NotificationService.markAllAsRead(getUserId(req), parseNotificationType(type));
    return success(res, result);
  }),

  deleteNotification: asyncHandler(async (req: Request, res: Response) => {
    const result = await NotificationService.delete(getUserId(req), parseNotificationId(req));
    return success(res, result);
  }),
};
