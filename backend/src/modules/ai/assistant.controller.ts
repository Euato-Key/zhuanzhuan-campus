import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../../common/asyncHandler';
import { ValidationUtil } from '../../common/validation';
import { AssistantService } from './assistant.service';
import { success, fail } from '../../utils/response';
import { notFound } from '../../common/errors';
import { prisma } from '../../config/prisma';

export const AssistantController = {
  assistantChat: asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const userId = ValidationUtil.requireUserId(req);
    let { conversationId, message } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return fail(res, '消息不能为空', 400);
    }

    if (conversationId !== undefined && conversationId !== null) {
      conversationId = Number(conversationId);
      if (!Number.isInteger(conversationId) || conversationId <= 0) conversationId = undefined;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    try {
      if (conversationId) {
        // Verify conversation ownership before using it
        const conv = await prisma.aIConversation.findFirst({ where: { id: conversationId, userId } });
        if (!conv) {
          res.write(`data: ${JSON.stringify({ type: 'error', message: '会话不存在或无权访问' })}\n\n`);
          res.write('data: [DONE]\n\n');
          res.end();
          return;
        }
      } else {
        const conv = await prisma.aIConversation.create({
          data: { userId, title: message.slice(0, 20) },
        });
        conversationId = conv.id;
      }

      res.write(`data: ${JSON.stringify({ type: 'meta', conversationId })}\n\n`);

      for await (const event of AssistantService.chatStream(userId, conversationId, message)) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'AI服务异常';
      res.write(`data: ${JSON.stringify({ type: 'error', message: msg })}\n\n`);
    } finally {
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }),

  assistantConversations: asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const userId = ValidationUtil.requireUserId(req);
    const conversations = await prisma.aIConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    success(res, conversations, '获取成功');
  }),

  assistantConversationMessages: asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const userId = ValidationUtil.requireUserId(req);
    const id = ValidationUtil.parseIdParam(req.params.id, '会话ID');
    const conv = await prisma.aIConversation.findFirst({ where: { id, userId } });
    if (!conv) throw notFound('会话不存在');
    const messages = await prisma.aIMessage.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
    });
    success(res, messages, '获取成功');
  }),

  assistantDeleteConversation: asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const userId = ValidationUtil.requireUserId(req);
    const id = ValidationUtil.parseIdParam(req.params.id, '会话ID');
    await prisma.aIConversation.deleteMany({ where: { id, userId } });
    success(res, null, '删除成功');
  }),
};