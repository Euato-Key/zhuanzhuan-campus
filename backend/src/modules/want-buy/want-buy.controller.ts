import { Request, Response } from 'express';
import { WantBuyService, WantBuyQuery, CreateWantBuyData, UpdateWantBuyData, WantBuyStatus } from './want-buy.service';
import { success } from '../../utils/response';
import { asyncHandler } from '../../common/asyncHandler';
import { ValidationUtil } from '../../common/validation';
import { badRequest } from '../../common/errors';

function parseWantBuyQuery(req: Request): WantBuyQuery {
  return {
    page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
    pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined,
    keyword: req.query.keyword as string,
    categoryId: req.query.categoryId ? parseInt(req.query.categoryId as string, 10) : undefined,
    status: req.query.status as WantBuyStatus,
    userId: req.query.userId ? parseInt(req.query.userId as string, 10) : undefined,
    sortBy: req.query.sortBy as WantBuyQuery['sortBy'],
    sortOrder: req.query.sortOrder as WantBuyQuery['sortOrder'],
  };
}

export const WantBuyController = {
  // ==================== 求购贴相关 ====================

  create: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const data: CreateWantBuyData = req.body;

    if (!data.name || !data.name.trim()) {
      throw badRequest('商品名称不能为空');
    }

    const wantBuy = await WantBuyService.create(userId, data);
    return success(res, wantBuy, '发布成功', 201);
  }),

  getList: asyncHandler(async (req: Request, res: Response) => {
    const query = parseWantBuyQuery(req);
    const result = await WantBuyService.getList(query);
    return success(res, result);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const id = ValidationUtil.parseIdParam(req.params.id, '求购贴ID');
    const userId = req.user?.userId;
    const wantBuy = await WantBuyService.getById(id, userId);
    return success(res, wantBuy);
  }),

  getMyList: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const query = parseWantBuyQuery(req);
    const result = await WantBuyService.getMyList(userId, query);
    return success(res, result);
  }),

  getUserList: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.parseIdParam(req.params.userId, '用户ID');
    const query = parseWantBuyQuery(req);
    const result = await WantBuyService.getUserList(userId, query);
    return success(res, result);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const id = ValidationUtil.parseIdParam(req.params.id, '求购贴ID');
    const data: UpdateWantBuyData = req.body;

    const wantBuy = await WantBuyService.update(userId, id, data);
    return success(res, wantBuy, '更新成功');
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const id = ValidationUtil.parseIdParam(req.params.id, '求购贴ID');
    const result = await WantBuyService.delete(userId, id);
    return success(res, null, result.message);
  }),

  markFound: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const id = ValidationUtil.parseIdParam(req.params.id, '求购贴ID');
    const wantBuy = await WantBuyService.markFound(userId, id);
    return success(res, wantBuy, '已标记为找到');
  }),

  close: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const id = ValidationUtil.parseIdParam(req.params.id, '求购贴ID');
    const wantBuy = await WantBuyService.close(userId, id);
    return success(res, wantBuy, '已关闭');
  }),

  reopen: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const id = ValidationUtil.parseIdParam(req.params.id, '求购贴ID');
    const wantBuy = await WantBuyService.reopen(userId, id);
    return success(res, wantBuy, '已重新开启');
  }),

  // ==================== 评论相关 ====================

  getComments: asyncHandler(async (req: Request, res: Response) => {
    const wantBuyId = ValidationUtil.parseIdParam(req.params.id, '求购贴ID');
    const userId = req.user?.userId;
    const query = {
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined,
    };
    const result = await WantBuyService.getComments(wantBuyId, query, userId);
    return success(res, result);
  }),

  createComment: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const wantBuyId = ValidationUtil.parseIdParam(req.params.id, '求购贴ID');
    const { content, parentId, replyToId } = req.body;

    if (!content || !content.trim()) {
      throw badRequest('评论内容不能为空');
    }

    const comment = await WantBuyService.createComment(userId, wantBuyId, {
      content,
      parentId: parentId ? parseInt(String(parentId), 10) : undefined,
      replyToId: replyToId ? parseInt(String(replyToId), 10) : undefined,
    });
    return success(res, comment, '评论成功', 201);
  }),

  updateComment: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const commentId = ValidationUtil.parseIdParam(req.params.commentId, '评论ID');
    const { content } = req.body;

    if (!content || !content.trim()) {
      throw badRequest('评论内容不能为空');
    }

    const comment = await WantBuyService.updateComment(userId, commentId, content);
    return success(res, comment, '更新成功');
  }),

  deleteComment: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const commentId = ValidationUtil.parseIdParam(req.params.commentId, '评论ID');
    const result = await WantBuyService.deleteComment(userId, commentId);
    return success(res, null, result.message);
  }),

  likeComment: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const commentId = ValidationUtil.parseIdParam(req.params.commentId, '评论ID');
    const result = await WantBuyService.likeComment(userId, commentId);
    return success(res, result, '点赞成功');
  }),

  unlikeComment: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const commentId = ValidationUtil.parseIdParam(req.params.commentId, '评论ID');
    const result = await WantBuyService.unlikeComment(userId, commentId);
    return success(res, result, '已取消点赞');
  }),

  // ==================== 管理员相关 ====================

  getAdminList: asyncHandler(async (req: Request, res: Response) => {
    const query = parseWantBuyQuery(req);
    const result = await WantBuyService.getAdminList(query);
    return success(res, result);
  }),

  adminDelete: asyncHandler(async (req: Request, res: Response) => {
    const adminId = ValidationUtil.requireUserId(req);
    const id = ValidationUtil.parseIdParam(req.params.id, '求购贴ID');
    const result = await WantBuyService.adminDelete(adminId, id);
    return success(res, null, result.message);
  }),

  adminDeleteComment: asyncHandler(async (req: Request, res: Response) => {
    const adminId = ValidationUtil.requireUserId(req);
    const commentId = ValidationUtil.parseIdParam(req.params.commentId, '评论ID');
    const result = await WantBuyService.adminDeleteComment(adminId, commentId);
    return success(res, null, result.message);
  }),
};
