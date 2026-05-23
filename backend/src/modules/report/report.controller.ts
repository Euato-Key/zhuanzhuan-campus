import { Request, Response, NextFunction } from 'express';
import { ReportService, ReportTargetType, ReportReason, ReportStatus } from './report.service';
import { asyncHandler } from '../../common/asyncHandler';
import { ValidationUtil } from '../../common/validation';
import { success } from '../../utils/response';

// ============================================
// Helper Functions
// ============================================

function parseCreateData(req: Request) {
  const { targetType, targetId, reason, detail, images } = req.body;
  if (!targetType) throw new Error('targetType is required');
  if (!targetId) throw new Error('targetId is required');
  if (!reason) throw new Error('reason is required');
  return {
    targetType: targetType as ReportTargetType,
    targetId: String(targetId),
    reason: reason as ReportReason,
    detail: detail || undefined,
    images: images || undefined,
  };
}

function parseReportQuery(req: Request) {
  const { page, pageSize } = req.query;
  return {
    page: page ? Number(page) : undefined,
    pageSize: pageSize ? Number(pageSize) : undefined,
  };
}

function parseAdminQuery(req: Request) {
  const { targetType, reason, status, keyword, page, pageSize } = req.query;
  return {
    targetType: typeof targetType === 'string' ? targetType as ReportTargetType : undefined,
    reason: typeof reason === 'string' ? reason as ReportReason : undefined,
    status: typeof status === 'string' ? status as ReportStatus : undefined,
    keyword: typeof keyword === 'string' ? keyword : undefined,
    page: page ? Number(page) : undefined,
    pageSize: pageSize ? Number(pageSize) : undefined,
  };
}

function parseHandleData(req: Request) {
  const { status, handlerNote } = req.body;
  if (!status) throw new Error('status is required');
  if (!handlerNote) throw new Error('handlerNote is required');
  return {
    status: status as 'dismissed' | 'warning' | 'banned' | 'resolved',
    handlerNote: String(handlerNote),
  };
}

// ============================================
// Controller
// ============================================

export const ReportController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const data = parseCreateData(req);
    const report = await ReportService.create(userId, data);
    return success(res, report, '举报成功', 201);
  }),

  getMyReports: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const query = parseReportQuery(req);
    const result = await ReportService.getMyReports(userId, query);
    return success(res, result);
  }),

  adminList: asyncHandler(async (req: Request, res: Response) => {
    const query = parseAdminQuery(req);
    const result = await ReportService.getAdminList(query);
    return success(res, result);
  }),

  adminDetail: asyncHandler(async (req: Request, res: Response) => {
    const id = ValidationUtil.parseIdParam(req.params.id, '举报ID');
    const result = await ReportService.getAdminDetail(id);
    return success(res, result);
  }),

  adminHandle: asyncHandler(async (req: Request, res: Response) => {
    const handlerId = ValidationUtil.requireUserId(req);
    const id = ValidationUtil.parseIdParam(req.params.id, '举报ID');
    const data = parseHandleData(req);
    const result = await ReportService.handle(id, handlerId, data);
    return success(res, result, '处理成功');
  }),

  getMyReportDetail: asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const id = ValidationUtil.parseIdParam(req.params.id, '举报ID');
    const userId = ValidationUtil.requireUserId(req);
    const result = await ReportService.getMyReportDetail(id, userId);
    success(res, result, '获取举报详情成功');
  }),
};
