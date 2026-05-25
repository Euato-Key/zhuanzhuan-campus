import { prisma } from '../../config/prisma';
import { AIMessageType } from '@prisma/client';
import { notFound, forbidden } from '../../common/errors';

export const ConversationService = {
  async create(userId: number, title?: string) {
    return prisma.aIConversation.create({
      data: { userId, title: title || '新对话' },
    });
  },

  async getUserConversations(userId: number) {
    return prisma.aIConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  },

  async delete(conversationId: number, userId: number) {
    const conv = await prisma.aIConversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (!conv) throw notFound('会话不存在');
    return prisma.aIConversation.delete({ where: { id: conversationId } });
  },

  async saveMessage(conversationId: number, role: string, content: string, msgType?: string, extraData?: any) {
    return prisma.aIMessage.create({
      data: {
        conversationId,
        role,
        content,
        msgType: (msgType || AIMessageType.text) as AIMessageType,
        extraData: extraData || undefined,
      },
    });
  },

  async getRecentMessages(conversationId: number, limit: number) {
    return prisma.aIMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },
};
