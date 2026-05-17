import { Request, Response } from 'express';
import { ChatService } from './chat.service';
import { success } from '../../utils/response';
import { asyncHandler } from '../../common/asyncHandler';
import { ValidationUtil } from '../../common/validation';
import { badRequest } from '../../common/errors';
import type { MessageType, ConversationQuery, MessageQuery, SendMessageData } from './chat.types';

function parseConversationId(req: Request): number {
  return ValidationUtil.parseIdParam(req.params.id, '会话ID');
}

function parseBlockedUserId(req: Request): number {
  return ValidationUtil.parseIdParam(req.params.blockedUserId, '用户ID');
}

function parseQuickReplyId(req: Request): number {
  return ValidationUtil.parseIdParam(req.params.id, '快捷回复ID');
}

export const ChatController = {
  // Conversations
  listConversations: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const query: ConversationQuery = {
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined,
    };
    const result = await ChatService.conversation.list(userId, query);
    return success(res, result);
  }),

  createConversation: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const { targetUserId } = req.body;
    if (!targetUserId || typeof targetUserId !== 'number' || targetUserId <= 0) {
      throw badRequest('请选择有效的聊天对象');
    }
    const result = await ChatService.conversation.createOrGet(userId, targetUserId);
    return success(res, result);
  }),

  getConversation: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const conversationId = parseConversationId(req);
    const result = await ChatService.conversation.getById(conversationId, userId);
    return success(res, result);
  }),

  // Messages
  listMessages: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const conversationId = parseConversationId(req);
    const query: MessageQuery = {
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined,
      before: req.query.before as string | undefined,
    };
    const result = await ChatService.message.list(conversationId, userId, query);
    return success(res, result);
  }),

  sendMessage: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const conversationId = parseConversationId(req);
    const { type, content } = req.body;

    if (!type) throw badRequest('请选择消息类型');
    if (!['text', 'image', 'product', 'order'].includes(type)) throw badRequest('消息类型不正确');
    if (typeof content !== 'string' || !content) throw badRequest('消息内容不能为空');

    const data: SendMessageData = { type: type as MessageType, content };
    const result = await ChatService.message.send(conversationId, userId, data);
    return success(res, result, '消息发送成功');
  }),

  markAsRead: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const conversationId = parseConversationId(req);
    const result = await ChatService.message.markAsRead(conversationId, userId);
    return success(res, result);
  }),

  searchMessages: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const conversationId = parseConversationId(req);
    const keyword = typeof req.query.keyword === 'string' ? req.query.keyword : '';
    const result = await ChatService.message.search(conversationId, userId, {
      keyword,
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined,
    });
    return success(res, result);
  }),

  // Blacklist
  listBlacklist: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const query: ConversationQuery = {
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined,
    };
    const result = await ChatService.blacklist.list(userId, query);
    return success(res, result);
  }),

  blockUser: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const { blockedUserId } = req.body;
    if (!blockedUserId || typeof blockedUserId !== 'number' || blockedUserId <= 0) {
      throw badRequest('请选择有效的用户');
    }
    const result = await ChatService.blacklist.block(userId, blockedUserId);
    return success(res, result, '已拉黑该用户');
  }),

  unblockUser: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const blockedUserId = parseBlockedUserId(req);
    const result = await ChatService.blacklist.unblock(userId, blockedUserId);
    return success(res, result);
  }),

  checkBlockStatus: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const otherUserId = req.query.userId;
    if (!otherUserId) throw badRequest('请提供用户ID');
    const otherId = parseInt(otherUserId as string, 10);
    if (isNaN(otherId) || otherId <= 0) throw badRequest('用户ID格式不正确');
    const result = await ChatService.blacklist.isBlocked(userId, otherId);
    return success(res, result);
  }),

  // Quick replies
  listQuickReplies: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const result = await ChatService.quickReply.list(userId);
    return success(res, result);
  }),

  createQuickReply: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const { content, sort } = req.body;
    if (typeof content !== 'string') throw badRequest('快捷回复内容格式不正确');
    const result = await ChatService.quickReply.create(userId, content, sort);
    return success(res, result, '创建成功', 201);
  }),

  updateQuickReply: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const id = parseQuickReplyId(req);
    const { content, sort } = req.body;
    const result = await ChatService.quickReply.update(id, userId, { content, sort });
    return success(res, result);
  }),

  deleteQuickReply: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const id = parseQuickReplyId(req);
    await ChatService.quickReply.delete(id, userId);
    return success(res, null, '删除成功');
  }),

  batchUpdateSort: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const { items } = req.body;
    if (!items || !Array.isArray(items)) throw badRequest('请提供排序数据');
    const result = await ChatService.quickReply.batchUpdateSort(userId, items);
    return success(res, result);
  }),

  // Bargain template
  getBargainTemplate: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const productId = ValidationUtil.parseBigIntParam(req.params.productId, '商品ID');
    const result = await ChatService.bargain.getTemplate(productId, userId);
    return success(res, result);
  }),
};