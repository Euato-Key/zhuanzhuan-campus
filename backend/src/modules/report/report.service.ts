import { prisma } from '../../config/prisma';
import { Prisma, ReportTargetType, ReportReason, ReportStatus } from '@prisma/client';
import { badRequest, notFound, conflict } from '../../common/errors';
import { PaginationUtil } from '../../common/pagination';
import { NotificationService } from '../notification/notification.service';
import { adjustCredit } from '../../common/credit';
import { REVIEW_USER_SELECT } from '../../common/selects';

// ============================================
// Types
// ============================================

export type { ReportTargetType, ReportReason, ReportStatus };

export interface CreateReportData {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  detail?: string;
  images?: string[];
}

export interface AdminHandleData {
  status: 'dismissed' | 'warning' | 'banned' | 'resolved';
  handlerNote: string;
}

export interface ReportQuery {
  page?: number;
  pageSize?: number;
}

export interface AdminReportQuery {
  page?: number;
  pageSize?: number;
  targetType?: ReportTargetType;
  reason?: ReportReason;
  status?: ReportStatus;
  keyword?: string;
}

// ============================================
// Constants
// ============================================

export const VALID_TARGET_TYPES: ReportTargetType[] = [
  'product',
  'user',
  'review',
  'want_buy',
  'comment',
];

export const VALID_REASONS: ReportReason[] = [
  'fraud',
  'prohibited',
  'inappropriate',
  'spam',
  'other',
];

export const VALID_HANDLE_STATUSES: string[] = [
  'dismissed',
  'warning',
  'banned',
  'resolved',
];

export const TARGET_TYPE_LABELS: Record<ReportTargetType, string> = {
  product: '商品',
  user: '用户',
  review: '评价',
  want_buy: '求购贴',
  comment: '评论',
};

export const STATUS_LABELS: Record<ReportStatus, string> = {
  pending: '待处理',
  dismissed: '已驳回',
  warning: '已警告',
  banned: '已封禁',
  resolved: '已解决',
};

export const REASON_LABELS: Record<ReportReason, string> = {
  fraud: '欺诈行为',
  prohibited: '违禁品',
  inappropriate: '内容不当',
  spam: '垃圾广告',
  other: '其他',
};

export const REPORTER_SELECT = {
  id: true,
  username: true,
  avatar: true,
} as const;

// ============================================
// Helper Functions
// ============================================

async function resolveReportedUserId(
  targetType: ReportTargetType,
  targetId: bigint
): Promise<number | null> {
  switch (targetType) {
    case 'product': {
      const product = await prisma.product.findUnique({
        where: { id: targetId },
        select: { userId: true },
      });
      if (!product) throw notFound('商品不存在');
      return product.userId;
    }
    case 'user':
      return Number(targetId);
    case 'review': {
      const review = await prisma.review.findUnique({
        where: { id: Number(targetId) },
        select: { reviewerId: true },
      });
      if (!review) throw notFound('评价不存在');
      return review.reviewerId;
    }
    case 'want_buy': {
      const wantBuy = await prisma.wantBuy.findUnique({
        where: { id: Number(targetId) },
        select: { userId: true },
      });
      if (!wantBuy) throw notFound('求购贴不存在');
      return wantBuy.userId;
    }
    case 'comment': {
      const comment = await prisma.wantBuyComment.findUnique({
        where: { id: Number(targetId) },
        select: { userId: true },
      });
      if (!comment) throw notFound('评论不存在');
      return comment.userId;
    }
    default:
      return null;
  }
}

// ============================================
// Report Service
// ============================================

export const ReportService = {
  async create(reporterId: number, data: CreateReportData) {
    if (!VALID_TARGET_TYPES.includes(data.targetType)) {
      throw badRequest('无效的举报类型');
    }

    if (!VALID_REASONS.includes(data.reason)) {
      throw badRequest('无效的举报原因');
    }

    let targetId: bigint;
    try {
      targetId = BigInt(data.targetId);
      if (targetId <= 0) throw new Error();
    } catch {
      throw badRequest('无效的目标ID');
    }

    // Check for duplicate pending report
    const existing = await prisma.report.findFirst({
      where: {
        reporterId,
        targetType: data.targetType,
        targetId,
        status: 'pending',
      },
    });

    if (existing) {
      throw conflict('您已举报过该目标，请等待处理');
    }

    const report = await prisma.report.create({
      data: {
        reporterId,
        targetType: data.targetType,
        targetId,
        reason: data.reason,
        detail: data.detail || null,
        images: data.images || undefined,
        status: 'pending',
      },
      include: {
        reporter: { select: REPORTER_SELECT },
      },
    });

    return report;
  },

  async getMyReports(userId: number, query: ReportQuery) {
    const { skip, take, page, pageSize } = PaginationUtil.getPagination({
      page: query.page,
      pageSize: query.pageSize,
    });

    const where = { reporterId: userId };

    const [total, list] = await Promise.all([
      prisma.report.count({ where }),
      prisma.report.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: { select: REPORTER_SELECT },
        },
      }),
    ]);

    return PaginationUtil.buildResponse(list, total, page, pageSize);
  },

  async getAdminList(query: AdminReportQuery) {
    const { skip, take, page, pageSize } = PaginationUtil.getPagination({
      page: query.page,
      pageSize: query.pageSize,
    });

    const where: Prisma.ReportWhereInput = {};

    if (query.targetType) where.targetType = query.targetType;
    if (query.reason) where.reason = query.reason;
    if (query.status) where.status = query.status;

    if (query.keyword) {
      where.OR = [
        { detail: { contains: query.keyword } },
        { reporter: { username: { contains: query.keyword } } },
      ] as Prisma.ReportWhereInput[];
    }

    const [total, list] = await Promise.all([
      prisma.report.count({ where }),
      prisma.report.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: { select: REPORTER_SELECT },
          handler: { select: REPORTER_SELECT },
        },
      }),
    ]);

    return PaginationUtil.buildResponse(list, total, page, pageSize);
  },

  async getAdminDetail(id: number) {
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        reporter: { select: REPORTER_SELECT },
        handler: { select: REPORTER_SELECT },
      },
    });

    if (!report) throw notFound('举报不存在');
    return report;
  },

  async getMyReportDetail(reportId: number, userId: number) {
    const report = await prisma.report.findFirst({
      where: { id: reportId, reporterId: userId },
      include: {
        handler: { select: REPORTER_SELECT },
      },
    });
    if (!report) { throw notFound('举报不存在'); }
    return report;
  },

  async handle(id: number, handlerId: number, data: AdminHandleData) {
    if (!VALID_HANDLE_STATUSES.includes(data.status)) {
      throw badRequest('无效的处理状态');
    }

    // handlerNote is required for warning/banned/resolved, optional for dismissed
    if (data.status !== 'dismissed' && !data.handlerNote?.trim()) {
      throw badRequest('请填写处理说明');
    }

    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        reporter: { select: REPORTER_SELECT },
      },
    });

    if (!report) throw notFound('举报不存在');

    const result = await prisma.report.updateMany({
      where: { id, status: 'pending' as ReportStatus },
      data: { status: data.status as ReportStatus, handlerId, handlerNote: data.handlerNote.trim(), handledAt: new Date() },
    });

    if (result.count === 0) {
      throw badRequest('该举报已被处理');
    }

    const updated = await prisma.report.findUnique({ where: { id } });

    // Notify reporter about the handling result
    const statusText = STATUS_LABELS[data.status as ReportStatus];
    await NotificationService.create({
      userId: report.reporterId,
      type: 'report',
      title: '举报处理通知',
      content: `您举报的${TARGET_TYPE_LABELS[report.targetType]}已被处理，处理结果：${statusText}`,
      relatedId: report.id,
      relatedType: 'user',
    });

    // If warning or banned, also notify the reported user
    if (data.status === 'warning' || data.status === 'banned') {
      const reportedUserId = await resolveReportedUserId(
        report.targetType,
        report.targetId
      );

      if (reportedUserId && reportedUserId !== report.reporterId) {
        const actionText = data.status === 'warning' ? '警告' : '封禁';
        await NotificationService.create({
          userId: reportedUserId,
          type: 'report',
          title: `${actionText}通知`,
          content: `您的${TARGET_TYPE_LABELS[report.targetType]}因违规被${actionText}，原因：${data.handlerNote.trim()}`,
          relatedId: report.id,
          relatedType: 'user',
        });

        // 信用分扣减
        await adjustCredit(reportedUserId, data.status === 'warning' ? 'report_warning' : 'report_banned', report.id);
      }
    }

    return updated;
  },
};
