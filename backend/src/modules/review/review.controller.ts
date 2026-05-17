import { Request, Response } from 'express';
import { ReviewService, ReviewType, ReviewStatus } from './review.service';
import { asyncHandler } from '../../common/asyncHandler';
import { ValidationUtil } from '../../common/validation';
import { success } from '../../utils/response';

// ============================================
// Helper Functions
// ============================================

function parseCreateData(req: Request) {
  const { orderId, rating, content, images, isAnonymous } = req.body;
  if (!orderId) throw new Error('orderId is required');
  if (rating === undefined || rating === null) throw new Error('rating is required');
  return {
    orderId: String(orderId),
    rating: Number(rating),
    content: content || undefined,
    images: images || undefined,
    isAnonymous: isAnonymous || false,
  };
}

function parseAppendData(req: Request) {
  const { appendContent, appendImages } = req.body;
  if (!appendContent) throw new Error('appendContent is required');
  return {
    appendContent: String(appendContent),
    appendImages: appendImages || undefined,
  };
}

function parseProductReviewQuery(req: Request) {
  const { rating, hasImage, sortBy, sortOrder, page, pageSize } = req.query;
  return {
    rating: rating ? Number(rating) : undefined,
    hasImage: hasImage === 'true' || hasImage === '1' ? true : undefined,
    sortBy: (sortBy === 'rating' ? 'rating' : 'time') as 'time' | 'rating',
    sortOrder: (sortOrder === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc',
    page: page ? Number(page) : undefined,
    pageSize: pageSize ? Number(pageSize) : undefined,
  };
}

function parseReceivedReviewQuery(req: Request) {
  const { type, rating, page, pageSize } = req.query;
  return {
    type: typeof type === 'string' ? type as ReviewType : undefined,
    rating: rating ? Number(rating) : undefined,
    page: page ? Number(page) : undefined,
    pageSize: pageSize ? Number(pageSize) : undefined,
  };
}

function parseSentReviewQuery(req: Request) {
  const { status, page, pageSize } = req.query;
  return {
    status: typeof status === 'string' ? status as ReviewStatus : undefined,
    page: page ? Number(page) : undefined,
    pageSize: pageSize ? Number(pageSize) : undefined,
  };
}

function parseAdminReviewQuery(req: Request) {
  const { status, type, rating, page, pageSize } = req.query;
  return {
    status: typeof status === 'string' ? status as ReviewStatus : undefined,
    type: typeof type === 'string' ? type as ReviewType : undefined,
    rating: rating ? Number(rating) : undefined,
    page: page ? Number(page) : undefined,
    pageSize: pageSize ? Number(pageSize) : undefined,
  };
}

// ============================================
// Controller
// ============================================

export const ReviewController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const data = parseCreateData(req);
    const review = await ReviewService.create(userId, data);
    return success(res, review, '评价成功', 201);
  }),

  append: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const reviewId = ValidationUtil.parseIdParam(req.params.id, '评价ID');
    const data = parseAppendData(req);
    const review = await ReviewService.append(userId, reviewId, data);
    return success(res, review, '追评成功');
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const reviewId = ValidationUtil.parseIdParam(req.params.id, '评价ID');
    const result = await ReviewService.delete(userId, reviewId);
    return success(res, result);
  }),

  removeAppend: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const reviewId = ValidationUtil.parseIdParam(req.params.id, '评价ID');
    const result = await ReviewService.deleteAppend(userId, reviewId);
    return success(res, result);
  }),

  getProductReviews: asyncHandler(async (req: Request, res: Response) => {
    const productId = String(req.params.productId);
    const query = parseProductReviewQuery(req);
    const result = await ReviewService.getProductReviews(productId, query);
    return success(res, result);
  }),

  getReceived: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const query = parseReceivedReviewQuery(req);
    const result = await ReviewService.getReceivedReviews(userId, query);
    return success(res, result);
  }),

  getSent: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const query = parseSentReviewQuery(req);
    const result = await ReviewService.getSentReviews(userId, query);
    return success(res, result);
  }),

  getOrderReviewStatus: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const orderId = ValidationUtil.parseBigIntParam(req.params.id, '订单ID');
    const result = await ReviewService.getOrderReviewStatus(userId, orderId);
    return success(res, result);
  }),

  // Admin
  adminList: asyncHandler(async (req: Request, res: Response) => {
    const query = parseAdminReviewQuery(req);
    const result = await ReviewService.getAdminReviews(query);
    return success(res, result);
  }),

  adminApprove: asyncHandler(async (req: Request, res: Response) => {
    const reviewId = ValidationUtil.parseIdParam(req.params.id, '评价ID');
    const result = await ReviewService.approveReview(reviewId);
    return success(res, result);
  }),

  adminReject: asyncHandler(async (req: Request, res: Response) => {
    const reviewId = ValidationUtil.parseIdParam(req.params.id, '评价ID');
    const { rejectReason, rejectAppend } = req.body;
    const result = await ReviewService.rejectReview(
      reviewId,
      rejectReason || '',
      rejectAppend === true,
    );
    return success(res, result);
  }),
};