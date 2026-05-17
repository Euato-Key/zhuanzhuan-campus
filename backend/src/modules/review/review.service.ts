import { prisma } from '../../config/prisma';
import { Prisma, ReviewType, ReviewStatus, AppendStatus, OrderStatus } from '@prisma/client';
import { badRequest, notFound, forbidden, conflict } from '../../common/errors';
import { PaginationUtil } from '../../common/pagination';
import { REVIEW_USER_SELECT, REVIEW_ORDER_SELECT } from '../../common/selects';

// ============================================
// Types
// ============================================

export type { ReviewType, ReviewStatus, AppendStatus };

export interface CreateReviewData {
  orderId: string;
  rating: number;
  content?: string;
  images?: string[];
  isAnonymous?: boolean;
}

export interface AppendReviewData {
  appendContent: string;
  appendImages?: string[];
}

export interface ReviewQuery {
  page?: number;
  pageSize?: number;
  rating?: number;
  hasImage?: boolean;
  sortBy?: 'time' | 'rating';
  sortOrder?: 'asc' | 'desc';
}

export interface ReceivedReviewQuery {
  page?: number;
  pageSize?: number;
  type?: ReviewType;
  rating?: number;
}

export interface SentReviewQuery {
  page?: number;
  pageSize?: number;
  status?: ReviewStatus;
}

export interface AdminReviewQuery {
  page?: number;
  pageSize?: number;
  status?: ReviewStatus;
  type?: ReviewType;
  rating?: number;
}

export interface ReviewSummary {
  totalCount: number;
  avgRating: number;
  ratingDistribution: Record<number, number>;
}

export interface OrderReviewStatusResult {
  buyerReviewed: boolean;
  sellerReviewed: boolean;
  canReview: boolean;
  canAppend: boolean;
  buyerReview: any;
  sellerReview: any;
}

// ============================================
// Constants
// ============================================

export const REVIEW_TYPE_LABELS: Record<ReviewType, string> = {
  buyer_to_seller: '买家评卖家',
  seller_to_buyer: '卖家评买家',
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
  deleted: '已删除',
};

const REVIEW_DEADLINE_DAYS = 14;
const APPEND_DEADLINE_DAYS = 7;
const MAX_AUDIT_COUNT = 3;

// ============================================
// Helper Functions
// ============================================

function findReviewOrThrow(id: number) {
  return prisma.review.findUnique({
    where: { id },
    include: {
      reviewer: { select: REVIEW_USER_SELECT },
      order: { select: REVIEW_ORDER_SELECT },
    },
  }).then(review => {
    if (!review) throw notFound('评价不存在');
    return review;
  });
}

function findOrderOrThrow(id: bigint) {
  return prisma.order.findUnique({
    where: { id },
  }).then(order => {
    if (!order) throw notFound('订单不存在');
    return order;
  });
}

function isWithinDays(date: Date | null, days: number): boolean {
  if (!date) return false;
  const now = Date.now();
  const diff = now - date.getTime();
  return diff <= days * 24 * 60 * 60 * 1000;
}

function maskAnonymousReviewer(reviewer: { id: number; username: string; avatar: string | null } | null, isAnonymous: boolean) {
  if (!reviewer) return null;
  if (isAnonymous) {
    return { id: 0, username: '匿名用户', avatar: null };
  }
  return reviewer;
}

// ============================================
// Review Service
// ============================================

export const ReviewService = {
  async create(userId: number, data: CreateReviewData) {
    if (!/^\d+$/.test(data.orderId)) {
      throw badRequest('订单ID格式不正确');
    }
    const orderId = BigInt(data.orderId);

    if (data.rating < 1 || data.rating > 5) {
      throw badRequest('评分必须在1-5之间');
    }

    const order = await findOrderOrThrow(orderId);

    if (order.status !== OrderStatus.completed) {
      throw badRequest('只有已完成的订单可以评价');
    }

    if (order.buyerId !== userId && order.sellerId !== userId) {
      throw forbidden('无权评价此订单');
    }

    if (!isWithinDays(order.confirmTime, REVIEW_DEADLINE_DAYS)) {
      throw badRequest(`已超过评价期限（确认收货后${REVIEW_DEADLINE_DAYS}天内）`);
    }

    const type: ReviewType = order.buyerId === userId ? 'buyer_to_seller' : 'seller_to_buyer';
    const reviewedId = order.buyerId === userId ? order.sellerId : order.buyerId;

    const existing = await prisma.review.findFirst({
      where: {
        orderId,
        reviewerId: userId,
        type,
        status: { not: ReviewStatus.deleted },
      },
    });

    if (existing) {
      throw conflict('您已评价过此订单');
    }

    const review = await prisma.review.create({
      data: {
        orderId,
        reviewerId: userId,
        reviewedId,
        type,
        rating: data.rating,
        content: data.content || null,
        images: data.images ? data.images as any : Prisma.JsonNull,
        isAnonymous: data.isAnonymous || false,
        status: ReviewStatus.approved,
        auditCount: 0,
      },
      include: {
        reviewer: { select: REVIEW_USER_SELECT },
        order: { select: REVIEW_ORDER_SELECT },
      },
    });

    return review;
  },

  async append(userId: number, reviewId: number, data: AppendReviewData) {
    if (!data.appendContent?.trim()) {
      throw badRequest('追评内容不能为空');
    }

    const review = await findReviewOrThrow(reviewId);

    if (review.reviewerId !== userId) {
      throw forbidden('只能追评自己的评价');
    }

    if (review.status !== ReviewStatus.approved) {
      throw badRequest('只有已通过的评价可以追评');
    }

    if (review.isAppend) {
      throw conflict('已追评，不可重复追评');
    }

    if (!isWithinDays(review.createdAt, APPEND_DEADLINE_DAYS)) {
      throw badRequest(`已超过追评期限（评价后${APPEND_DEADLINE_DAYS}天内）`);
    }

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: {
        isAppend: true,
        appendContent: data.appendContent.trim(),
        appendImages: data.appendImages ? data.appendImages as any : Prisma.JsonNull,
        appendStatus: AppendStatus.approved,
        appendAt: new Date(),
        appendAuditCount: 0,
      },
      include: {
        reviewer: { select: REVIEW_USER_SELECT },
        order: { select: REVIEW_ORDER_SELECT },
      },
    });

    return updated;
  },

  async delete(userId: number, reviewId: number) {
    const review = await findReviewOrThrow(reviewId);

    if (review.reviewerId !== userId) {
      throw forbidden('只能删除自己的评价');
    }

    if (review.status === ReviewStatus.deleted) {
      throw badRequest('评价已删除');
    }

    await prisma.review.update({
      where: { id: reviewId },
      data: { status: ReviewStatus.deleted },
    });

    return { message: '评价已删除' };
  },

  async deleteAppend(userId: number, reviewId: number) {
    const review = await findReviewOrThrow(reviewId);

    if (review.reviewerId !== userId) {
      throw forbidden('只能删除自己的追评');
    }

    if (!review.isAppend) {
      throw badRequest('该评价没有追评');
    }

    await prisma.review.update({
      where: { id: reviewId },
      data: {
        isAppend: false,
        appendContent: null,
        appendImages: Prisma.JsonNull,
        appendStatus: null,
        appendAt: null,
        appendAuditCount: 0,
      },
    });

    return { message: '追评已删除' };
  },

  async getProductReviews(productId: string, query: ReviewQuery) {
    if (!/^\d+$/.test(productId)) {
      throw badRequest('商品ID格式不正确');
    }
    const pid = BigInt(productId);

    const product = await prisma.product.findUnique({ where: { id: pid } });
    if (!product) throw notFound('商品不存在');

    const { skip, take, page, pageSize } = PaginationUtil.getPagination({
      page: query.page,
      pageSize: query.pageSize,
    });

    const where: Prisma.ReviewWhereInput = {
      status: ReviewStatus.approved,
      order: { productId: pid },
    };

    if (query.rating) {
      where.rating = query.rating;
    }

    if (query.hasImage) {
      where.images = { isEmpty: false } as any;
    }

    const orderBy: Prisma.ReviewOrderByWithRelationInput =
      query.sortBy === 'rating'
        ? { rating: query.sortOrder === 'asc' ? 'asc' : 'desc' }
        : { createdAt: query.sortOrder === 'asc' ? 'asc' : 'desc' };

    const [total, list] = await Promise.all([
      prisma.review.count({ where }),
      prisma.review.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          reviewer: { select: REVIEW_USER_SELECT },
          order: { select: REVIEW_ORDER_SELECT },
        },
      }),
    ]);

    const summary = await this.getProductReviewSummary(pid);

    const items = list.map(r => ({
      ...r,
      reviewer: maskAnonymousReviewer(r.reviewer as any, r.isAnonymous),
    }));

    return {
      ...PaginationUtil.buildResponse(items, total, page, pageSize),
      summary,
    };
  },

  async getProductReviewSummary(productId: bigint): Promise<ReviewSummary> {
    const reviews = await prisma.review.findMany({
      where: {
        status: ReviewStatus.approved,
        order: { productId },
      },
      select: { rating: true },
    });

    const totalCount = reviews.length;
    const avgRating = totalCount > 0
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / totalCount) * 10) / 10
      : 0;

    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of reviews) {
      ratingDistribution[r.rating] = (ratingDistribution[r.rating] || 0) + 1;
    }

    return { totalCount, avgRating, ratingDistribution };
  },

  async getReceivedReviews(userId: number, query: ReceivedReviewQuery) {
    const { skip, take, page, pageSize } = PaginationUtil.getPagination({
      page: query.page,
      pageSize: query.pageSize,
    });

    const where: Prisma.ReviewWhereInput = {
      reviewedId: userId,
      status: ReviewStatus.approved,
    };

    if (query.type) where.type = query.type;
    if (query.rating) where.rating = query.rating;

    const [total, list] = await Promise.all([
      prisma.review.count({ where }),
      prisma.review.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          reviewer: { select: REVIEW_USER_SELECT },
          order: { select: REVIEW_ORDER_SELECT },
        },
      }),
    ]);

    const items = list.map(r => ({
      ...r,
      reviewer: maskAnonymousReviewer(r.reviewer as any, r.isAnonymous),
    }));

    return PaginationUtil.buildResponse(items, total, page, pageSize);
  },

  async getSentReviews(userId: number, query: SentReviewQuery) {
    const { skip, take, page, pageSize } = PaginationUtil.getPagination({
      page: query.page,
      pageSize: query.pageSize,
    });

    const where: Prisma.ReviewWhereInput = {
      reviewerId: userId,
    };

    if (query.status) where.status = query.status;

    const [total, list] = await Promise.all([
      prisma.review.count({ where }),
      prisma.review.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          reviewer: { select: REVIEW_USER_SELECT },
          order: { select: REVIEW_ORDER_SELECT },
        },
      }),
    ]);

    return PaginationUtil.buildResponse(list, total, page, pageSize);
  },

  async getOrderReviewStatus(userId: number, orderId: bigint): Promise<OrderReviewStatusResult> {
    const order = await findOrderOrThrow(orderId);

    if (order.buyerId !== userId && order.sellerId !== userId) {
      throw forbidden('无权查看此订单评价状态');
    }

    const reviews = await prisma.review.findMany({
      where: { orderId, status: { not: ReviewStatus.deleted } },
      include: {
        reviewer: { select: REVIEW_USER_SELECT },
        order: { select: REVIEW_ORDER_SELECT },
      },
    });

    const buyerReview = reviews.find(r => r.type === 'buyer_to_seller') || null;
    const sellerReview = reviews.find(r => r.type === 'seller_to_buyer') || null;

    const canReview = order.status === OrderStatus.completed
      && isWithinDays(order.confirmTime, REVIEW_DEADLINE_DAYS);

    const userReview = order.buyerId === userId ? buyerReview : sellerReview;
    const canAppend = userReview
      && userReview.status === ReviewStatus.approved
      && !userReview.isAppend
      && isWithinDays(userReview.createdAt, APPEND_DEADLINE_DAYS);

    return {
      buyerReviewed: !!buyerReview,
      sellerReviewed: !!sellerReview,
      canReview,
      canAppend: !!canAppend,
      buyerReview,
      sellerReview,
    };
  },

  // ============================================
  // Admin
  // ============================================

  async getAdminReviews(query: AdminReviewQuery) {
    const { skip, take, page, pageSize } = PaginationUtil.getPagination({
      page: query.page,
      pageSize: query.pageSize,
    });

    const where: Prisma.ReviewWhereInput = {};

    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    if (query.rating) where.rating = query.rating;

    const [total, list] = await Promise.all([
      prisma.review.count({ where }),
      prisma.review.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          reviewer: { select: REVIEW_USER_SELECT },
          reviewed: { select: REVIEW_USER_SELECT },
          order: { select: REVIEW_ORDER_SELECT },
        },
      }),
    ]);

    return PaginationUtil.buildResponse(list, total, page, pageSize);
  },

  async approveReview(reviewId: number) {
    const review = await findReviewOrThrow(reviewId);

    if (review.status !== ReviewStatus.pending) {
      throw badRequest('只有待审核的评价可以审核通过');
    }

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: { status: ReviewStatus.approved },
      include: {
        reviewer: { select: REVIEW_USER_SELECT },
        reviewed: { select: REVIEW_USER_SELECT },
        order: { select: REVIEW_ORDER_SELECT },
      },
    });

    return updated;
  },

  async rejectReview(reviewId: number, rejectReason: string, rejectAppend: boolean) {
    if (!rejectReason?.trim()) {
      throw badRequest('请填写拒绝原因');
    }

    const review = await findReviewOrThrow(reviewId);

    if (rejectAppend) {
      if (review.appendStatus !== AppendStatus.pending) {
        throw badRequest('追评不在待审核状态');
      }
      const appendAuditCount = (review.appendAuditCount || 0) + 1;
      await prisma.review.update({
        where: { id: reviewId },
        data: {
          appendStatus: AppendStatus.rejected,
          appendAuditCount,
        },
      });
      return { message: '追评已拒绝' };
    }

    if (review.status !== ReviewStatus.pending) {
      throw badRequest('只有待审核的评价可以拒绝');
    }

    const auditCount = review.auditCount + 1;
    const finalStatus = auditCount >= MAX_AUDIT_COUNT
      ? ReviewStatus.rejected
      : ReviewStatus.rejected;

    await prisma.review.update({
      where: { id: reviewId },
      data: {
        status: finalStatus,
        rejectReason: rejectReason.trim(),
        auditCount,
      },
    });

    return { message: auditCount >= MAX_AUDIT_COUNT ? '评价已拒绝，审核次数已达上限' : '评价已拒绝' };
  },
};