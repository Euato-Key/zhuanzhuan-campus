import { prisma } from '../../config/prisma';
import { Prisma, WantBuyStatus } from '@prisma/client';
import { badRequest, notFound, forbidden } from '../../common/errors';
import { PaginationUtil } from '../../common/pagination';
import { NotificationService } from '../notification/notification.service';
import { WANT_BUY_LIST_SELECT, WANT_BUY_DETAIL_SELECT, WANT_BUY_COMMENT_SELECT, WANT_BUY_COMMENT_USER_SELECT } from '../../common/selects';

export type { WantBuyStatus };

export interface CreateWantBuyData {
  name: string;
  categoryId?: number;
  description?: string;
  tags?: string[];
  budgetMin?: number;
  budgetMax?: number;
  quantity?: number;
  images?: string[];
  validDays?: number;
}

export interface UpdateWantBuyData {
  name?: string;
  categoryId?: number | null;
  description?: string;
  tags?: string[];
  budgetMin?: number | null;
  budgetMax?: number | null;
  quantity?: number;
  images?: string[];
  validDays?: number;
}

export interface WantBuyQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  categoryId?: number;
  status?: WantBuyStatus;
  userId?: number;
  sortBy?: 'time' | 'view' | 'comment';
  sortOrder?: 'asc' | 'desc';
}

export interface CommentQuery {
  page?: number;
  pageSize?: number;
}

function calculateExpireTime(validDays?: number): Date | null {
  const days = validDays ?? 30;
  const expireTime = new Date();
  expireTime.setDate(expireTime.getDate() + days);
  return expireTime;
}

async function findWantBuyOrThrow(id: number, options?: { checkOwnership?: number; allowedStatuses?: WantBuyStatus[] }) {
  const wantBuy = await prisma.wantBuy.findUnique({
    where: { id },
  });

  if (!wantBuy) {
    throw notFound('求购贴不存在');
  }

  if (options?.checkOwnership !== undefined && wantBuy.userId !== options.checkOwnership) {
    throw forbidden('无权操作此求购贴');
  }

  if (options?.allowedStatuses && !options.allowedStatuses.includes(wantBuy.status)) {
    throw badRequest(`只能操作${options.allowedStatuses.join('、')}状态的求购贴`);
  }

  return wantBuy;
}

async function findCommentOrThrow(id: number, options?: { checkOwnership?: number }) {
  const comment = await prisma.wantBuyComment.findUnique({
    where: { id },
  });

  if (!comment) {
    throw notFound('评论不存在');
  }

  if (options?.checkOwnership !== undefined && comment.userId !== options.checkOwnership) {
    throw forbidden('无权操作此评论');
  }

  return comment;
}

export const WantBuyService = {
  // ==================== 求购贴相关 ====================

  async create(userId: number, data: CreateWantBuyData) {
    if (!data.name || !data.name.trim()) {
      throw badRequest('商品名称不能为空');
    }
    if (data.name.length > 100) {
      throw badRequest('商品名称不能超过100个字符');
    }

    if (data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
      });
      if (!category) {
        throw badRequest('分类不存在');
      }
    }

    if (data.validDays && ![7, 15, 30].includes(data.validDays)) {
      throw badRequest('有效期只能是7天、15天或30天');
    }

    if (data.budgetMin !== undefined && data.budgetMax !== undefined) {
      if (data.budgetMin > data.budgetMax) {
        throw badRequest('预算最低价不能大于最高价');
      }
    }

    if (data.budgetMin !== undefined && data.budgetMin < 0) {
      throw badRequest('预算不能为负数');
    }
    if (data.budgetMax !== undefined && data.budgetMax < 0) {
      throw badRequest('预算不能为负数');
    }

    if (data.quantity !== undefined && data.quantity < 1) {
      throw badRequest('求购数量至少为1');
    }

    if (data.images && data.images.length > 9) {
      throw badRequest('图片最多9张');
    }

    const expireTime = calculateExpireTime(data.validDays);

    const wantBuy = await prisma.wantBuy.create({
      data: {
        userId,
        name: data.name.trim(),
        categoryId: data.categoryId ?? null,
        description: data.description?.trim() ?? null,
        tags: data.tags ?? Prisma.JsonNull,
        budgetMin: data.budgetMin ?? null,
        budgetMax: data.budgetMax ?? null,
        quantity: data.quantity ?? 1,
        images: data.images ?? Prisma.JsonNull,
        validDays: data.validDays ?? 30,
        expireTime,
        status: WantBuyStatus.active,
      },
      include: {
        user: { select: WANT_BUY_LIST_SELECT.user.select },
        category: { select: WANT_BUY_LIST_SELECT.category.select },
      },
    });

    return wantBuy;
  },

  async getList(query: WantBuyQuery) {
    const { skip, take, page, pageSize } = PaginationUtil.getPagination({
      page: query.page,
      pageSize: query.pageSize,
    });

    const where: Prisma.WantBuyWhereInput = {};

    // 默认只显示 active 状态
    if (query.status) {
      where.status = query.status;
    } else {
      where.status = WantBuyStatus.active;
    }

    if (query.keyword) {
      const keyword = query.keyword.trim();
      where.OR = [
        { name: { contains: keyword } },
        { description: { contains: keyword } },
      ];
    }

    if (query.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: query.categoryId },
        include: { children: true },
      });
      if (category) {
        const categoryIds = [category.id, ...category.children.map(c => c.id)];
        where.categoryId = { in: categoryIds };
      }
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    let orderBy: Prisma.WantBuyOrderByWithRelationInput = { createdAt: 'desc' };
    if (query.sortBy === 'view') {
      orderBy = { viewCount: query.sortOrder ?? 'desc' };
    } else if (query.sortBy === 'comment') {
      orderBy = { commentCount: query.sortOrder ?? 'desc' };
    } else if (query.sortBy === 'time') {
      orderBy = { createdAt: query.sortOrder ?? 'desc' };
    }

    const [total, list] = await Promise.all([
      prisma.wantBuy.count({ where }),
      prisma.wantBuy.findMany({
        where,
        skip,
        take,
        orderBy,
        select: WANT_BUY_LIST_SELECT,
      }),
    ]);

    return PaginationUtil.buildResponse(list, total, page, pageSize);
  },

  async getById(id: number, userId?: number) {
    const wantBuy = await prisma.wantBuy.findUnique({
      where: { id },
      select: WANT_BUY_DETAIL_SELECT,
    });

    if (!wantBuy) {
      throw notFound('求购贴不存在');
    }

    // 非作者只能看 active 状态
    if (wantBuy.status !== WantBuyStatus.active) {
      if (!userId || userId !== wantBuy.userId) {
        throw notFound('求购贴不存在或已关闭');
      }
    }

    // 增加浏览量（作者自己看不加）
    const isOwner = userId && userId === wantBuy.userId;
    if (!isOwner && wantBuy.status === WantBuyStatus.active) {
      await prisma.wantBuy.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      });
    }

    return { ...wantBuy, isOwner };
  },

  async getMyList(userId: number, query: WantBuyQuery) {
    const { skip, take, page, pageSize } = PaginationUtil.getPagination({
      page: query.page,
      pageSize: query.pageSize,
    });

    const where: Prisma.WantBuyWhereInput = { userId };

    if (query.status) {
      where.status = query.status;
    }

    if (query.keyword) {
      const keyword = query.keyword.trim();
      where.OR = [
        { name: { contains: keyword } },
        { description: { contains: keyword } },
      ];
    }

    const [total, list] = await Promise.all([
      prisma.wantBuy.count({ where }),
      prisma.wantBuy.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: WANT_BUY_LIST_SELECT,
      }),
    ]);

    return PaginationUtil.buildResponse(list, total, page, pageSize);
  },

  async getUserList(userId: number, query: WantBuyQuery) {
    const { skip, take, page, pageSize } = PaginationUtil.getPagination({
      page: query.page,
      pageSize: query.pageSize,
      maxPageSize: 50,
    });

    const where: Prisma.WantBuyWhereInput = {
      userId,
      status: WantBuyStatus.active,
    };

    const [total, list] = await Promise.all([
      prisma.wantBuy.count({ where }),
      prisma.wantBuy.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: WANT_BUY_LIST_SELECT,
      }),
    ]);

    return PaginationUtil.buildResponse(list, total, page, pageSize);
  },

  async update(userId: number, id: number, data: UpdateWantBuyData) {
    const wantBuy = await findWantBuyOrThrow(id, {
      checkOwnership: userId,
      allowedStatuses: [WantBuyStatus.active, WantBuyStatus.found],
    });

    if (data.name !== undefined) {
      if (!data.name.trim()) {
        throw badRequest('商品名称不能为空');
      }
      if (data.name.length > 100) {
        throw badRequest('商品名称不能超过100个字符');
      }
    }

    if (data.categoryId !== undefined && data.categoryId !== null) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
      });
      if (!category) {
        throw badRequest('分类不存在');
      }
    }

    if (data.validDays !== undefined && ![7, 15, 30].includes(data.validDays)) {
      throw badRequest('有效期只能是7天、15天或30天');
    }

    if (data.budgetMin !== undefined && data.budgetMax !== undefined) {
      const min = data.budgetMin ?? wantBuy.budgetMin?.toNumber();
      const max = data.budgetMax ?? wantBuy.budgetMax?.toNumber();
      if (min !== null && min !== undefined && max !== null && max !== undefined && min > max) {
        throw badRequest('预算最低价不能大于最高价');
      }
    }

    if (data.images && data.images.length > 9) {
      throw badRequest('图片最多9张');
    }

    const updateData: Prisma.WantBuyUpdateInput = {};

    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.categoryId !== undefined) {
      updateData.category = data.categoryId ? { connect: { id: data.categoryId } } : { disconnect: true };
    }
    if (data.description !== undefined) updateData.description = data.description?.trim() ?? null;
    if (data.tags !== undefined) updateData.tags = data.tags ?? Prisma.JsonNull;
    if (data.budgetMin !== undefined) updateData.budgetMin = data.budgetMin ?? null;
    if (data.budgetMax !== undefined) updateData.budgetMax = data.budgetMax ?? null;
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.images !== undefined) updateData.images = data.images ?? Prisma.JsonNull;
    if (data.validDays !== undefined) {
      updateData.validDays = data.validDays;
      updateData.expireTime = calculateExpireTime(data.validDays);
    }

    const updated = await prisma.wantBuy.update({
      where: { id },
      data: updateData,
      select: WANT_BUY_DETAIL_SELECT,
    });

    return updated;
  },

  async delete(userId: number, id: number) {
    await findWantBuyOrThrow(id, { checkOwnership: userId });

    await prisma.wantBuy.delete({
      where: { id },
    });

    return { message: '删除成功' };
  },

  async markFound(userId: number, id: number) {
    await findWantBuyOrThrow(id, {
      checkOwnership: userId,
      allowedStatuses: [WantBuyStatus.active],
    });

    const updated = await prisma.wantBuy.update({
      where: { id },
      data: { status: WantBuyStatus.found },
      select: WANT_BUY_DETAIL_SELECT,
    });

    return updated;
  },

  async close(userId: number, id: number) {
    await findWantBuyOrThrow(id, {
      checkOwnership: userId,
      allowedStatuses: [WantBuyStatus.active, WantBuyStatus.found],
    });

    const updated = await prisma.wantBuy.update({
      where: { id },
      data: { status: WantBuyStatus.closed },
      select: WANT_BUY_DETAIL_SELECT,
    });

    return updated;
  },

  async reopen(userId: number, id: number) {
    const wantBuy = await findWantBuyOrThrow(id, { checkOwnership: userId });

    if (wantBuy.status !== WantBuyStatus.closed && wantBuy.status !== WantBuyStatus.expired) {
      throw badRequest('只能重新开启已关闭或已过期的求购贴');
    }

    const expireTime = calculateExpireTime(wantBuy.validDays ?? undefined);

    const updated = await prisma.wantBuy.update({
      where: { id },
      data: {
        status: WantBuyStatus.active,
        expireTime,
      },
      select: WANT_BUY_DETAIL_SELECT,
    });

    return updated;
  },

  // ==================== 评论相关 ====================

  async getComments(wantBuyId: number, query: CommentQuery, userId?: number) {
    const wantBuy = await prisma.wantBuy.findUnique({
      where: { id: wantBuyId },
    });

    if (!wantBuy) {
      throw notFound('求购贴不存在');
    }

    const { skip, take, page, pageSize } = PaginationUtil.getPagination({
      page: query.page,
      pageSize: query.pageSize,
      maxPageSize: 50,
    });

    // 查询一级评论
    const where: Prisma.WantBuyCommentWhereInput = {
      wantBuyId,
      parentId: null,
    };

    const [total, comments] = await Promise.all([
      prisma.wantBuyComment.count({ where }),
      prisma.wantBuyComment.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: WANT_BUY_COMMENT_SELECT,
      }),
    ]);

    // 批量查询回复
    const commentIds = comments.map(c => c.id);
    const replies = commentIds.length > 0 ? await prisma.wantBuyComment.findMany({
      where: {
        wantBuyId,
        parentId: { in: commentIds },
      },
      orderBy: { createdAt: 'asc' },
      select: WANT_BUY_COMMENT_SELECT,
    }) : [];

    // 查询当前用户的点赞状态
    const allCommentIds = [...commentIds, ...replies.map(r => r.id)];
    const userLikes = userId ? await prisma.wantBuyCommentLike.findMany({
      where: {
        commentId: { in: allCommentIds },
        userId,
      },
      select: { commentId: true },
    }) : [];

    const likedCommentIds = new Set(userLikes.map(l => l.commentId));

    // 组装评论树
    const repliesMap = new Map<number, typeof replies>();
    for (const reply of replies) {
      const parentId = reply.parentId!;
      if (!repliesMap.has(parentId)) {
        repliesMap.set(parentId, []);
      }
      repliesMap.get(parentId)!.push({
        ...reply,
        isLiked: likedCommentIds.has(reply.id),
      } as typeof reply & { isLiked: boolean });
    }

    const commentsWithReplies = comments.map(comment => ({
      ...comment,
      isLiked: likedCommentIds.has(comment.id),
      replies: repliesMap.get(comment.id) ?? [],
    }));

    return PaginationUtil.buildResponse(commentsWithReplies as typeof commentsWithReplies, total, page, pageSize);
  },

  async createComment(userId: number, wantBuyId: number, data: { content: string; parentId?: number; replyToId?: number }) {
    const wantBuy = await prisma.wantBuy.findUnique({
      where: { id: wantBuyId },
    });

    if (!wantBuy) {
      throw notFound('求购贴不存在');
    }

    if (wantBuy.status !== WantBuyStatus.active) {
      throw badRequest('该求购贴已关闭，无法评论');
    }

    if (!data.content || !data.content.trim()) {
      throw badRequest('评论内容不能为空');
    }
    if (data.content.length > 500) {
      throw badRequest('评论内容不能超过500个字符');
    }

    // 检查父评论
    let actualParentId: number | null = null;
    let replyToId: number | null = null;

    if (data.parentId) {
      const parent = await prisma.wantBuyComment.findUnique({
        where: { id: data.parentId },
      });
      if (!parent || parent.wantBuyId !== wantBuyId) {
        throw badRequest('父评论不存在');
      }

      // 如果父评论是一级评论，直接使用
      if (!parent.parentId) {
        actualParentId = parent.id;
        // 如果指定了 replyToId，使用它；否则回复一级评论作者
        replyToId = data.replyToId ?? null;
      } else {
        // 如果父评论是二级评论，找到它的一级父评论
        actualParentId = parent.parentId;
        // replyToId 指向被回复的二级评论
        replyToId = parent.id;
      }
    }

    const comment = await prisma.wantBuyComment.create({
      data: {
        wantBuyId,
        userId,
        parentId: actualParentId,
        replyToId,
        content: data.content.trim(),
      },
      select: WANT_BUY_COMMENT_SELECT,
    });

    // 更新评论数
    await prisma.wantBuy.update({
      where: { id: wantBuyId },
      data: { commentCount: { increment: 1 } },
    });

    // 通知帖子作者收到评论
    if (wantBuy.userId !== userId) {
      await NotificationService.create({
        userId: wantBuy.userId,
        type: 'interaction',
        title: '求购贴收到新评论',
        content: `您的求购贴「${wantBuy.name}」收到了新评论`,
        relatedId: wantBuy.id,
        relatedType: 'want_buy',
      });
    }

    // 通知被回复的评论作者
    if (replyToId) {
      const replyToComment = await prisma.wantBuyComment.findUnique({
        where: { id: replyToId },
      });
      if (replyToComment && replyToComment.userId !== userId) {
        await NotificationService.create({
          userId: replyToComment.userId,
          type: 'interaction',
          title: '您的评论收到回复',
          content: `您在求购贴「${wantBuy.name}」中的评论收到了回复`,
          relatedId: wantBuy.id,
          relatedType: 'want_buy',
        });
      }
    }

    // 返回时添加 isLiked 和 replies 字段
    return {
      ...comment,
      isLiked: false,
      replies: [],
    };
  },

  async updateComment(userId: number, commentId: number, content: string) {
    const comment = await findCommentOrThrow(commentId, { checkOwnership: userId });

    if (!content || !content.trim()) {
      throw badRequest('评论内容不能为空');
    }
    if (content.length > 500) {
      throw badRequest('评论内容不能超过500个字符');
    }

    const updated = await prisma.wantBuyComment.update({
      where: { id: commentId },
      data: { content: content.trim() },
      select: WANT_BUY_COMMENT_SELECT,
    });

    return {
      ...updated,
      isLiked: false,
      replies: [],
    };
  },

  async deleteComment(userId: number, commentId: number) {
    const comment = await findCommentOrThrow(commentId, { checkOwnership: userId });

    // 统计要删除的评论总数（包括回复）
    const replyCount = await prisma.wantBuyComment.count({
      where: { parentId: commentId },
    });
    const totalDeleted = replyCount + 1;

    await prisma.$transaction([
      // 删除点赞记录
      prisma.wantBuyCommentLike.deleteMany({
        where: { commentId },
      }),
      // 删除回复的点赞记录
      prisma.wantBuyCommentLike.deleteMany({
        where: { commentId: { in: await prisma.wantBuyComment.findMany({ where: { parentId: commentId }, select: { id: true } }).then(r => r.map(x => x.id)) } },
      }),
      // 删除回复（如果有）
      prisma.wantBuyComment.deleteMany({
        where: { parentId: commentId },
      }),
      // 删除评论
      prisma.wantBuyComment.delete({
        where: { id: commentId },
      }),
      // 更新评论数
      prisma.wantBuy.update({
        where: { id: comment.wantBuyId },
        data: { commentCount: { decrement: totalDeleted } },
      }),
    ]);

    return { message: '删除成功' };
  },

  async likeComment(userId: number, commentId: number) {
    const comment = await prisma.wantBuyComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw notFound('评论不存在');
    }

    const existing = await prisma.wantBuyCommentLike.findUnique({
      where: {
        commentId_userId: { commentId, userId },
      },
    });

    if (existing) {
      throw badRequest('已点赞过该评论');
    }

    await prisma.$transaction([
      prisma.wantBuyCommentLike.create({
        data: { commentId, userId },
      }),
      prisma.wantBuyComment.update({
        where: { id: commentId },
        data: { likeCount: { increment: 1 } },
      }),
    ]);

    // 通知评论作者收到点赞
    if (comment.userId !== userId) {
      await NotificationService.create({
        userId: comment.userId,
        type: 'interaction',
        title: '评论收到点赞',
        content: '您的求购贴评论收到了一个赞',
        relatedId: comment.wantBuyId,
        relatedType: 'want_buy',
      });
    }

    // 获取更新后的点赞数
    const updated = await prisma.wantBuyComment.findUnique({
      where: { id: commentId },
      select: { likeCount: true },
    });

    return { isLiked: true, likeCount: updated?.likeCount ?? comment.likeCount + 1 };
  },

  async unlikeComment(userId: number, commentId: number) {
    const like = await prisma.wantBuyCommentLike.findUnique({
      where: {
        commentId_userId: { commentId, userId },
      },
    });

    if (!like) {
      throw badRequest('未点赞过该评论');
    }

    const comment = await prisma.wantBuyComment.findUnique({
      where: { id: commentId },
      select: { likeCount: true },
    });

    await prisma.$transaction([
      prisma.wantBuyCommentLike.delete({
        where: { id: like.id },
      }),
      prisma.wantBuyComment.update({
        where: { id: commentId },
        data: { likeCount: { decrement: 1 } },
      }),
    ]);

    return { isLiked: false, likeCount: Math.max(0, (comment?.likeCount ?? 1) - 1) };
  },

  // ==================== 管理员相关 ====================

  async getAdminList(query: WantBuyQuery) {
    const { skip, take, page, pageSize } = PaginationUtil.getPagination({
      page: query.page,
      pageSize: query.pageSize,
    });

    const where: Prisma.WantBuyWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.keyword) {
      const keyword = query.keyword.trim();
      where.OR = [
        { name: { contains: keyword } },
        { description: { contains: keyword } },
      ];
    }

    const [total, list] = await Promise.all([
      prisma.wantBuy.count({ where }),
      prisma.wantBuy.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          ...WANT_BUY_LIST_SELECT,
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return PaginationUtil.buildResponse(list, total, page, pageSize);
  },

  async adminDelete(_adminId: number, id: number) {
    await findWantBuyOrThrow(id);

    await prisma.wantBuy.delete({
      where: { id },
    });

    return { message: '删除成功' };
  },

  async adminDeleteComment(_adminId: number, commentId: number) {
    const comment = await prisma.wantBuyComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw notFound('评论不存在');
    }

    // 统计要删除的评论总数（包括回复）
    const replyCount = await prisma.wantBuyComment.count({
      where: { parentId: commentId },
    });
    const totalDeleted = replyCount + 1;

    // 获取所有回复的ID
    const replyIds = await prisma.wantBuyComment.findMany({
      where: { parentId: commentId },
      select: { id: true },
    }).then(r => r.map(x => x.id));
    const allCommentIds = [...replyIds, commentId];

    await prisma.$transaction([
      // 删除所有点赞记录
      prisma.wantBuyCommentLike.deleteMany({
        where: { commentId: { in: allCommentIds } },
      }),
      // 删除回复
      prisma.wantBuyComment.deleteMany({
        where: { parentId: commentId },
      }),
      // 删除评论
      prisma.wantBuyComment.delete({
        where: { id: commentId },
      }),
      // 更新评论数
      prisma.wantBuy.update({
        where: { id: comment.wantBuyId },
        data: { commentCount: { decrement: totalDeleted } },
      }),
    ]);

    return { message: '删除成功' };
  },
};
