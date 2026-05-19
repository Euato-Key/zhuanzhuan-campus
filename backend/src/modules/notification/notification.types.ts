import type { NotificationType, RelatedType } from '@prisma/client';

export interface NotificationQuery {
  type?: NotificationType;
  page?: number;
  pageSize?: number;
}

export interface CreateNotificationParams {
  userId: number;
  type: NotificationType;
  title: string;
  content?: string;
  relatedId?: number | bigint;
  relatedType?: RelatedType;
}

export interface UnreadCountResult {
  total: number;
  byType: Partial<Record<NotificationType, number>>;
}
