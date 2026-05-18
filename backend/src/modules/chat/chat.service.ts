import { prisma } from '../../config/prisma';
import { Prisma, MessageType } from '@prisma/client';
import { badRequest, notFound, forbidden, conflict } from '../../common/errors';
import { PaginationUtil } from '../../common/pagination';
import { CHAT_USER_SELECT } from '../../common/selects';
import { getIO } from '../../config/socket';
import type { ConversationQuery, MessageQuery, MessageSearchQuery, SendMessageData, ProductCardContent, OrderCardContent } from './chat.types';

const CONTENT_MAX_LENGTH = 2000;
const IMAGE_URL_MAX_LENGTH = 500;

function serializeBigInt(obj: unknown): unknown {
  if (typeof obj === 'bigint') return obj.toString();
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeBigInt(value);
    }
    return result;
  }
  return obj;
}

function getOtherUserId(conversation: { user1Id: number; user2Id: number }, userId: number): number {
  return conversation.user1Id === userId ? conversation.user2Id : conversation.user1Id;
}

export const ChatService = {
  conversation: {
    async list(userId: number, query: ConversationQuery) {
      const { skip, take, page, pageSize } = PaginationUtil.getPagination(query);

      const where: Prisma.ConversationWhereInput = {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      };

      const [total, conversations] = await Promise.all([
        prisma.conversation.count({ where }),
        prisma.conversation.findMany({
          where,
          skip,
          take,
          orderBy: { updatedAt: 'desc' },
          include: {
            user1: { select: CHAT_USER_SELECT },
            user2: { select: CHAT_USER_SELECT },
            messages: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              select: { id: true, type: true, content: true, senderId: true, createdAt: true },
            },
          },
        }),
      ]);

      // Compute unread counts
      const conversationIds = conversations.map(c => c.id);
      const unreadCounts = conversationIds.length > 0
        ? await prisma.message.groupBy({
            by: ['conversationId'],
            where: {
              conversationId: { in: conversationIds },
              senderId: { not: userId },
              readAt: null,
            },
            _count: { id: true },
          })
        : [];

      const unreadMap = new Map<number, number>();
      for (const item of unreadCounts) {
        unreadMap.set(item.conversationId, item._count.id);
      }

      const list = conversations.map(c => {
        const otherUserId = getOtherUserId(c, userId);
        const otherUser = c.user1Id === userId ? c.user2 : c.user1;
        const lastMessage = c.messages[0] || null;

        return {
          id: c.id,
          otherUser,
          lastMessage: lastMessage ? serializeBigInt(lastMessage) : null,
          unreadCount: unreadMap.get(c.id) || 0,
          updatedAt: c.updatedAt,
        };
      });

      return PaginationUtil.buildResponse(list, total, page, pageSize);
    },

    async createOrGet(userId: number, targetUserId: number) {
      if (userId === targetUserId) {
        throw badRequest('不能和自己聊天');
      }

      // Check target user exists
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: CHAT_USER_SELECT,
      });
      if (!targetUser) {
        throw notFound('用户不存在');
      }

      // Check block status (both directions)
      const blockCount = await prisma.blacklist.count({
        where: {
          OR: [
            { userId, blockedUserId: targetUserId },
            { userId: targetUserId, blockedUserId: userId },
          ],
        },
      });
      if (blockCount > 0) {
        throw forbidden('存在拉黑关系，无法创建会话');
      }

      // Normalize: smaller ID is always user1Id
      const [smallerId, largerId] = userId < targetUserId ? [userId, targetUserId] : [targetUserId, userId];

      // Try find existing, then create (handle race condition)
      let conversation = await prisma.conversation.findUnique({
        where: { user1Id_user2Id: { user1Id: smallerId, user2Id: largerId } },
      });

      if (!conversation) {
        try {
          conversation = await prisma.conversation.create({
            data: { user1Id: smallerId, user2Id: largerId },
          });
        } catch (err) {
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            conversation = await prisma.conversation.findUniqueOrThrow({
              where: { user1Id_user2Id: { user1Id: smallerId, user2Id: largerId } },
            });
          } else {
            throw err;
          }
        }
      }

      // Get unread count
      const unreadCount = await prisma.message.count({
        where: {
          conversationId: conversation.id,
          senderId: { not: userId },
          readAt: null,
        },
      });

      // Get last message
      const lastMessage = await prisma.message.findFirst({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: 'desc' },
        select: { id: true, type: true, content: true, senderId: true, createdAt: true },
      });

      return {
        id: conversation.id,
        otherUser: targetUser,
        lastMessage: lastMessage ? serializeBigInt(lastMessage) : null,
        unreadCount,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      };
    },

    async getById(conversationId: number, userId: number) {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          user1: { select: CHAT_USER_SELECT },
          user2: { select: CHAT_USER_SELECT },
        },
      });

      if (!conversation) {
        throw notFound('会话不存在');
      }

      if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
        throw forbidden('无权查看此会话');
      }

      const otherUserId = getOtherUserId(conversation, userId);
      const otherUser = conversation.user1Id === userId ? conversation.user2 : conversation.user1;

      const unreadCount = await prisma.message.count({
        where: {
          conversationId,
          senderId: { not: userId },
          readAt: null,
        },
      });

      const lastMessage = await prisma.message.findFirst({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, type: true, content: true, senderId: true, createdAt: true },
      });

      return {
        id: conversation.id,
        otherUser,
        lastMessage: lastMessage ? serializeBigInt(lastMessage) : null,
        unreadCount,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      };
    },
  },

  message: {
    async list(conversationId: number, userId: number, query: MessageQuery) {
      // Verify user is participant
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });
      if (!conversation) {
        throw notFound('会话不存在');
      }
      if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
        throw forbidden('无权查看此会话消息');
      }

      const where: Prisma.MessageWhereInput = { conversationId };

      // Handle 'around' parameter - load messages around a specific message
      if (query.around) {
        try {
          const aroundId = BigInt(query.around);
          if (aroundId > 0n) {
            // Get the target message to find its position
            const targetMsg = await prisma.message.findUnique({
              where: { id: aroundId },
              select: { createdAt: true },
            });
            if (targetMsg) {
              // Load messages around the target (15 before + 15 after = 31 total)
              const messages = await prisma.message.findMany({
                where: { conversationId },
                orderBy: { createdAt: 'asc' },
                take: 31,
                skip: Math.max(0, await prisma.message.count({
                  where: {
                    conversationId,
                    createdAt: { lt: targetMsg.createdAt },
                  },
                }) - 15),
                include: {
                  sender: { select: CHAT_USER_SELECT },
                },
              });
              const list = messages.map(m => serializeBigInt({
                id: m.id,
                conversationId: m.conversationId,
                senderId: m.senderId,
                type: m.type,
                content: m.content,
                readAt: m.readAt,
                createdAt: m.createdAt,
                sender: m.sender,
              }));
              const total = await prisma.message.count({ where: { conversationId } });
              return {
                list,
                total,
                page: 1,
                pageSize: 31,
                totalPages: Math.ceil(total / 31),
              };
            }
          }
        } catch {
          throw badRequest('无效的around参数');
        }
      }

      // Cursor-based pagination for infinite scroll
      if (query.before) {
        try {
          const beforeId = BigInt(query.before);
          if (beforeId > 0n) {
            where.id = { lt: beforeId };
          }
        } catch {
          throw badRequest('无效的before参数');
        }
      }

      const { skip, take, page, pageSize } = PaginationUtil.getPagination(query);

      const [total, messages] = await Promise.all([
        prisma.message.count({ where }),
        prisma.message.findMany({
          where,
          skip: query.before ? 0 : skip,
          take,
          orderBy: query.before ? { createdAt: 'desc' } : { createdAt: 'asc' },
          include: {
            sender: { select: CHAT_USER_SELECT },
          },
        }),
      ]);

      const list = messages.map(m => serializeBigInt({
        id: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        type: m.type,
        content: m.content,
        readAt: m.readAt,
        createdAt: m.createdAt,
        sender: m.sender,
      }));

      return PaginationUtil.buildResponse(list, total, page, pageSize);
    },

    async send(conversationId: number, senderId: number, data: SendMessageData) {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });
      if (!conversation) {
        throw notFound('会话不存在');
      }
      if (conversation.user1Id !== senderId && conversation.user2Id !== senderId) {
        throw forbidden('无权在此会话发送消息');
      }

      // Check block status
      const otherUserId = getOtherUserId(conversation, senderId);
      const blockCount = await prisma.blacklist.count({
        where: {
          OR: [
            { userId: senderId, blockedUserId: otherUserId },
            { userId: otherUserId, blockedUserId: senderId },
          ],
        },
      });
      if (blockCount > 0) {
        throw forbidden('存在拉黑关系，无法发送消息');
      }

      // Validate content based on type
      const enrichedContent = await validateAndEnrichContent(data.type, data.content, senderId, otherUserId);

      // Create message and update conversation
      const message = await prisma.$transaction(async (tx) => {
        const newMessage = await tx.message.create({
          data: {
            conversationId,
            senderId,
            type: data.type,
            content: enrichedContent,
          },
          include: {
            sender: { select: CHAT_USER_SELECT },
          },
        });

        await tx.conversation.update({
          where: { id: conversationId },
          data: { lastMessageId: newMessage.id },
        });

        return newMessage;
      });

      const serializedMessage = serializeBigInt({
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        type: message.type,
        content: message.content,
        readAt: message.readAt,
        createdAt: message.createdAt,
        sender: message.sender,
      });

      // Emit Socket.io events
      try {
        const io = getIO();
        // Emit to both users' personal rooms (handles both in-conversation and background cases)
        io.to(`user_${senderId}`).emit('chat:new_message', serializedMessage);
        io.to(`user_${otherUserId}`).emit('chat:new_message', serializedMessage);

        // Update conversation list for both users — each sees the OTHER user
        // Fetch other user info for each participant
        const [user1Info, user2Info] = await Promise.all([
          prisma.user.findUnique({ where: { id: conversation.user1Id }, select: CHAT_USER_SELECT }),
          prisma.user.findUnique({ where: { id: conversation.user2Id }, select: CHAT_USER_SELECT }),
        ]);

        const convForUser1 = serializeBigInt({
          id: conversation.id,
          otherUser: user2Info,
          lastMessage: { id: message.id, type: message.type, content: message.content, senderId: message.senderId, createdAt: message.createdAt },
          updatedAt: conversation.updatedAt,
        });
        const convForUser2 = serializeBigInt({
          id: conversation.id,
          otherUser: user1Info,
          lastMessage: { id: message.id, type: message.type, content: message.content, senderId: message.senderId, createdAt: message.createdAt },
          updatedAt: conversation.updatedAt,
        });
        io.to(`user_${conversation.user1Id}`).emit('chat:conversation_updated', convForUser1);
        io.to(`user_${conversation.user2Id}`).emit('chat:conversation_updated', convForUser2);
      } catch {
        // Socket.io not available (e.g., during tests)
      }

      return serializedMessage;
    },

    async markAsRead(conversationId: number, userId: number) {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });
      if (!conversation) {
        throw notFound('会话不存在');
      }
      if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
        throw forbidden('无权操作此会话');
      }

      const otherUserId = getOtherUserId(conversation, userId);

      const result = await prisma.message.updateMany({
        where: {
          conversationId,
          senderId: otherUserId,
          readAt: null,
        },
        data: { readAt: new Date() },
      });

      // Emit read receipt to the sender
      if (result.count > 0) {
        try {
          const io = getIO();
          io.to(`user_${otherUserId}`).emit('chat:message_read', {
            conversationId,
            readBy: userId,
            readCount: result.count,
          });
        } catch {
          // Socket.io not available
        }
      }

      return { readCount: result.count };
    },

    async search(conversationId: number, userId: number, query: MessageSearchQuery) {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });
      if (!conversation) {
        throw notFound('会话不存在');
      }
      if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
        throw forbidden('无权搜索此会话消息');
      }

      // Allow empty keyword when filtering by type/sender/date
      const hasKeyword = query.keyword && query.keyword.trim();
      if (hasKeyword && query.keyword.trim().length > 100) {
        throw badRequest('搜索关键词不能超过100个字符');
      }

      const { skip, take, page, pageSize } = PaginationUtil.getPagination(query);

      const where: Prisma.MessageWhereInput = {
        conversationId,
      };

      // Keyword filter
      if (hasKeyword) {
        where.content = { contains: query.keyword.trim() };
      }

      // Type filter
      if (query.type) {
        where.type = query.type;
      }

      // Sender filter
      if (query.senderId) {
        // Validate sender is participant
        if (query.senderId !== conversation.user1Id && query.senderId !== conversation.user2Id) {
          throw badRequest('发送者不是会话参与者');
        }
        where.senderId = query.senderId;
      }

      // Date range filter
      if (query.startDate || query.endDate) {
        where.createdAt = {};
        if (query.startDate) {
          const start = new Date(query.startDate);
          if (isNaN(start.getTime())) {
            throw badRequest('开始日期格式不正确');
          }
          where.createdAt.gte = start;
        }
        if (query.endDate) {
          const end = new Date(query.endDate);
          if (isNaN(end.getTime())) {
            throw badRequest('结束日期格式不正确');
          }
          // Include the entire end date
          end.setHours(23, 59, 59, 999);
          where.createdAt.lte = end;
        }
      }

      const [total, messages] = await Promise.all([
        prisma.message.count({ where }),
        prisma.message.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: { select: CHAT_USER_SELECT },
          },
        }),
      ]);

      const list = messages.map(m => serializeBigInt({
        id: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        type: m.type,
        content: m.content,
        readAt: m.readAt,
        createdAt: m.createdAt,
        sender: m.sender,
      }));

      return PaginationUtil.buildResponse(list, total, page, pageSize);
    },
  },

  blacklist: {
    async list(userId: number, query: ConversationQuery) {
      const { skip, take, page, pageSize } = PaginationUtil.getPagination(query);

      const [total, items] = await Promise.all([
        prisma.blacklist.count({ where: { userId } }),
        prisma.blacklist.findMany({
          where: { userId },
          skip,
          take,
          orderBy: { createdAt: 'desc' },
          include: {
            blockedUser: { select: CHAT_USER_SELECT },
          },
        }),
      ]);

      const list = items.map(item => ({
        id: item.id,
        blockedUser: item.blockedUser,
        createdAt: item.createdAt,
      }));

      return PaginationUtil.buildResponse(list, total, page, pageSize);
    },

    async block(userId: number, blockedUserId: number) {
      if (userId === blockedUserId) {
        throw badRequest('不能拉黑自己');
      }

      const blockedUser = await prisma.user.findUnique({
        where: { id: blockedUserId },
        select: CHAT_USER_SELECT,
      });
      if (!blockedUser) {
        throw notFound('用户不存在');
      }

      try {
        const entry = await prisma.blacklist.create({
          data: { userId, blockedUserId },
          include: {
            blockedUser: { select: CHAT_USER_SELECT },
          },
        });

        // Notify the blocked user
        try {
          const io = getIO();
          io.to(`user_${blockedUserId}`).emit('chat:blocked', { blockedByUserId: userId });
        } catch {
          // Socket.io not available
        }

        return {
          id: entry.id,
          blockedUser: entry.blockedUser,
          createdAt: entry.createdAt,
        };
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw conflict('已经拉黑了该用户');
        }
        throw err;
      }
    },

    async unblock(userId: number, blockedUserId: number) {
      const entry = await prisma.blacklist.findUnique({
        where: { userId_blockedUserId: { userId, blockedUserId } },
      });
      if (!entry) {
        throw notFound('未拉黑该用户');
      }

      await prisma.blacklist.delete({
        where: { id: entry.id },
      });

      // Notify the unblocked user
      try {
        const io = getIO();
        io.to(`user_${blockedUserId}`).emit('chat:unblocked', { unblockedByUserId: userId });
      } catch {
        // Socket.io not available
      }

      return { message: '已解除拉黑' };
    },

    async isBlocked(userId: number, otherUserId: number) {
      const blockedByMe = await prisma.blacklist.count({
        where: { userId, blockedUserId: otherUserId },
      });
      const blockedByOther = await prisma.blacklist.count({
        where: { userId: otherUserId, blockedUserId: userId },
      });

      return {
        isBlocked: blockedByMe > 0 || blockedByOther > 0,
        blockedByMe: blockedByMe > 0,
        blockedByOther: blockedByOther > 0,
      };
    },
  },

  quickReply: {
    async list(userId: number) {
      const items = await prisma.quickReply.findMany({
        where: { userId },
        orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }],
      });
      return items;
    },

    async create(userId: number, content: string, sort?: number) {
      if (!content || !content.trim()) {
        throw badRequest('请填写快捷回复内容');
      }
      if (content.trim().length > 255) {
        throw badRequest('快捷回复内容不能超过255个字符');
      }

      const entry = await prisma.quickReply.create({
        data: {
          userId,
          content: content.trim(),
          sort: sort ?? 0,
        },
      });
      return entry;
    },

    async update(id: number, userId: number, data: { content?: string; sort?: number }) {
      const entry = await prisma.quickReply.findUnique({
        where: { id },
      });
      if (!entry) {
        throw notFound('快捷回复不存在');
      }
      if (entry.userId !== userId) {
        throw forbidden('无权修改此快捷回复');
      }

      if (data.content !== undefined) {
        if (typeof data.content !== 'string' || !data.content.trim()) {
          throw badRequest('快捷回复内容不能为空');
        }
        if (data.content.trim().length > 255) {
          throw badRequest('快捷回复内容不能超过255个字符');
        }
      }

      const updateData: { content?: string; sort?: number } = {};
      if (data.content !== undefined) updateData.content = data.content.trim();
      if (data.sort !== undefined) updateData.sort = data.sort;

      const updated = await prisma.quickReply.update({
        where: { id },
        data: updateData,
      });
      return updated;
    },

    async delete(id: number, userId: number) {
      const entry = await prisma.quickReply.findUnique({
        where: { id },
      });
      if (!entry) {
        throw notFound('快捷回复不存在');
      }
      if (entry.userId !== userId) {
        throw forbidden('无权删除此快捷回复');
      }

      await prisma.quickReply.delete({
        where: { id },
      });
    },

    async batchUpdateSort(userId: number, items: { id: number; sort: number }[]) {
      if (!items || items.length === 0) {
        throw badRequest('请提供排序数据');
      }
      if (items.length > 100) {
        throw badRequest('排序数据不能超过100条');
      }
      for (const item of items) {
        if (typeof item.id !== 'number' || !Number.isInteger(item.id) || item.id <= 0 ||
            typeof item.sort !== 'number' || !Number.isInteger(item.sort)) {
          throw badRequest('排序数据格式不正确');
        }
      }

      // Verify all items belong to the user
      const ids = items.map(item => item.id);
      const count = await prisma.quickReply.count({
        where: { id: { in: ids }, userId },
      });
      if (count !== ids.length) {
        throw forbidden('包含不属于你的快捷回复');
      }

      await prisma.$transaction(
        items.map(item =>
          prisma.quickReply.update({
            where: { id: item.id },
            data: { sort: item.sort },
          })
        )
      );

      return { message: '排序已更新' };
    },
  },

  bargain: {
    async getTemplate(productId: bigint, userId: number) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          name: true,
          currentPrice: true,
          bargain: true,
          status: true,
        },
      });

      if (!product) {
        throw notFound('商品不存在');
      }

      if (!product.bargain) {
        throw badRequest('该商品不支持议价');
      }

      const price = Number(product.currentPrice);
      return {
        template: `这个商品【${product.name}】可以优惠吗？我出${price}元`,
        product: {
          id: product.id.toString(),
          name: product.name,
          currentPrice: price,
          bargain: product.bargain,
        },
      };
    },
  },
};

async function validateAndEnrichContent(type: MessageType, content: string, senderId: number, otherUserId: number): Promise<string> {
  if (!content) {
    throw badRequest('消息内容不能为空');
  }

  switch (type) {
    case 'text':
      if (content.length > CONTENT_MAX_LENGTH) {
        throw badRequest(`消息内容不能超过${CONTENT_MAX_LENGTH}个字符`);
      }
      return content;

    case 'image':
      if (content.length > IMAGE_URL_MAX_LENGTH) {
        throw badRequest('图片链接不能超过500个字符');
      }
      if (!content.startsWith('/') && !content.startsWith('http')) {
        throw badRequest('图片链接格式不正确');
      }
      return content;

    case 'product': {
      let parsed: { productId: string };
      try {
        parsed = JSON.parse(content);
      } catch {
        throw badRequest('商品消息格式不正确');
      }
      if (!parsed.productId || !/^\d+$/.test(parsed.productId)) {
        throw badRequest('商品ID格式不正确');
      }

      const product = await prisma.product.findUnique({
        where: { id: BigInt(parsed.productId) },
        select: {
          id: true,
          name: true,
          images: true,
          currentPrice: true,
          userId: true,
          status: true,
        },
      });
      if (!product) {
        throw notFound('商品不存在');
      }
      if (product.status !== 'active') {
        throw badRequest('只能发送在售中的商品');
      }
      // 商品必须属于当前会话的某一方（我的宝贝或对方宝贝）
      if (product.userId !== senderId && product.userId !== otherUserId) {
        throw forbidden('只能发送与当前聊天相关的商品');
      }

      const cardContent: ProductCardContent = {
        productId: product.id.toString(),
        name: product.name,
        image: (product.images as string[])?.[0] || null,
        price: Number(product.currentPrice),
      };
      return JSON.stringify(cardContent);
    }

    case 'order': {
      let parsed: { orderId: string };
      try {
        parsed = JSON.parse(content);
      } catch {
        throw badRequest('订单消息格式不正确');
      }
      if (!parsed.orderId || !/^\d+$/.test(parsed.orderId)) {
        throw badRequest('订单ID格式不正确');
      }

      const order = await prisma.order.findUnique({
        where: { id: BigInt(parsed.orderId) },
        select: {
          id: true,
          orderNo: true,
          productName: true,
          productImage: true,
          status: true,
          buyerId: true,
          sellerId: true,
        },
      });
      if (!order) {
        throw notFound('订单不存在');
      }
      if (order.status === 'cancelled') {
        throw badRequest('不能发送已取消的订单');
      }
      if (order.buyerId !== senderId && order.sellerId !== senderId) {
        throw forbidden('只能发送与自己相关的订单');
      }
      // 订单的买卖双方必须恰好是当前会话的两个人
      if ((order.buyerId !== senderId || order.sellerId !== otherUserId) &&
          (order.sellerId !== senderId || order.buyerId !== otherUserId)) {
        throw forbidden('只能发送与当前聊天对方交易的订单');
      }

      const cardContent: OrderCardContent = {
        orderId: order.id.toString(),
        orderNo: order.orderNo,
        productName: order.productName,
        productImage: order.productImage,
        status: order.status,
      };
      return JSON.stringify(cardContent);
    }

    default:
      throw badRequest('不支持的消息类型');
  }
}