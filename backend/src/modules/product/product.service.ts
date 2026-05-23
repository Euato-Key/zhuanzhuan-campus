import { prisma } from '../../config/prisma';
import { Prisma, ItemCondition, DeliveryType, ProductStatus } from '@prisma/client';
import { badRequest, notFound, forbidden } from '../../common/errors';
import { PaginationUtil } from '../../common/pagination';
import { NotificationService } from '../notification/notification.service';
import { AuditService } from '../ai/audit.service';
import { PRODUCT_CATEGORY_SELECT, PRODUCT_USER_SELECT, PRODUCT_DETAIL_USER_SELECT, PRODUCT_DETAIL_CATEGORY_SELECT, USER_ADMIN_SELECT } from '../../common/selects';

export type { ItemCondition, DeliveryType, ProductStatus };
export { toItemCondition, tryToItemCondition };

const ITEM_CONDITION_MAP: Record<string, ItemCondition> = {
  'new': ItemCondition.new,
  '99new': ItemCondition.ninety_nine_new,
  '95new': ItemCondition.ninety_five_new,
  '90new': ItemCondition.ninety_new,
  '80new': ItemCondition.eighty_new,
};

function toItemCondition(value: string): ItemCondition {
  const result = ITEM_CONDITION_MAP[value];
  if (!result) {
    throw badRequest(`无效的新旧程度: ${value}`);
  }
  return result;
}

function tryToItemCondition(value: string): ItemCondition | undefined {
  return ITEM_CONDITION_MAP[value];
}

export interface ProductSpec {
  name: string;
  value: string;
}

export interface CreateProductData {
  name: string;
  description?: string;
  categoryId: number;
  tags?: string[];
  images: string[];
  detailImages?: string[];
  originalPrice?: number;
  currentPrice: number;
  bargain?: boolean;
  deliveryType: DeliveryType;
  pickupAddress?: string;
  pickupTime?: string;
  itemCondition: string;
  stock?: number;
  brand?: string;
  specs?: ProductSpec[];
  shippingAddress?: string;
  validDays?: number;
}

export interface UpdateProductData {
  name?: string;
  description?: string;
  categoryId?: number;
  tags?: string[];
  images?: string[];
  detailImages?: string[];
  originalPrice?: number;
  currentPrice?: number;
  bargain?: boolean;
  deliveryType?: DeliveryType;
  pickupAddress?: string;
  pickupTime?: string;
  itemCondition?: string;
  stock?: number;
  brand?: string;
  specs?: ProductSpec[];
  shippingAddress?: string;
  validDays?: number;
}

export interface ProductQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  categoryId?: number;
  status?: ProductStatus;
  itemCondition?: ItemCondition;
  minPrice?: number;
  maxPrice?: number;
  deliveryType?: DeliveryType;
  sortBy?: 'price' | 'time' | 'favorite';
  sortOrder?: 'asc' | 'desc';
  userId?: number;
}

export interface AdminProductQuery extends ProductQuery {
  sellerId?: number;
}

const RE_AUDIT_FIELDS = ['name', 'description', 'categoryId', 'images', 'currentPrice'] as const;

function calculateExpireTime(validDays?: number): Date | null {
  if (!validDays) return null;
  const expireTime = new Date();
  expireTime.setDate(expireTime.getDate() + validDays);
  return expireTime;
}

function needsReAudit(updateData: UpdateProductData): boolean {
  return RE_AUDIT_FIELDS.some(field => field in updateData);
}

async function findProductOrThrow(productId: bigint, options?: { checkOwnership?: number; allowedStatuses?: ProductStatus[] }) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw notFound('商品不存在');
  }

  if (options?.checkOwnership !== undefined && product.userId !== options.checkOwnership) {
    throw forbidden('无权操作此商品');
  }

  if (options?.allowedStatuses && !options.allowedStatuses.includes(product.status)) {
    throw badRequest(`只能操作${options.allowedStatuses.join('、')}状态的商品`);
  }

  return product;
}

/**
 * 触发AI审核（如果已启用且产品为pending状态）
 * 不阻塞主流程，AI审核失败时保持pending状态
 */
async function triggerAIAuditIfEnabled(productId: bigint, scene: 'first_publish' | 'edit') {
  try {
    const shouldAudit = await AuditService.shouldAudit(scene);
    if (shouldAudit) {
      console.log(`[AI Audit] Triggering ${scene} audit for product ${productId}`);
      // 重新查询确保产品仍是 pending 状态
      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (product && product.status === 'pending') {
        await AuditService.auditProduct(productId);
      }
    }
  } catch (err) {
    console.error(`[AI Audit] ${scene} audit failed for product ${productId}:`, err);
    // AI审核失败不影响产品创建/更新，保持pending等待人工审核
  }
}

export const ProductService = {
  async create(userId: number, data: CreateProductData) {
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) {
      throw badRequest('分类不存在');
    }

    if (!data.images || data.images.length === 0) {
      throw badRequest('至少上传一张商品主图');
    }
    if (data.images.length > 9) {
      throw badRequest('商品主图最多9张');
    }

    if (data.validDays && ![7, 15, 30].includes(data.validDays)) {
      throw badRequest('有效期只能是7天、15天或30天');
    }

    if (data.currentPrice < 0) {
      throw badRequest('价格不能为负数');
    }
    if (data.originalPrice && data.originalPrice < 0) {
      throw badRequest('原价不能为负数');
    }

    if (data.stock !== undefined && data.stock < 1) {
      throw badRequest('库存至少为1');
    }

    if (data.deliveryType === DeliveryType.self || data.deliveryType === DeliveryType.both) {
      if (!data.pickupAddress) {
        throw badRequest('自提商品需填写自提地点');
      }
    }

    const expireTime = calculateExpireTime(data.validDays);

    const product = await prisma.product.create({
      data: {
        userId,
        name: data.name.trim(),
        description: data.description?.trim() ?? '',
        categoryId: data.categoryId,
        tags: data.tags ?? Prisma.JsonNull,
        images: data.images,
        detailImages: data.detailImages ?? Prisma.JsonNull,
        originalPrice: data.originalPrice,
        currentPrice: data.currentPrice,
        bargain: data.bargain ?? false,
        deliveryType: data.deliveryType,
        pickupAddress: data.pickupAddress,
        pickupTime: data.pickupTime,
        itemCondition: toItemCondition(data.itemCondition),
        stock: data.stock ?? 1,
        brand: data.brand,
        specs: data.specs ? JSON.parse(JSON.stringify(data.specs)) : Prisma.JsonNull,
        shippingAddress: data.shippingAddress,
        validDays: data.validDays,
        expireTime,
        status: ProductStatus.pending,
      },
      include: {
        category: { select: PRODUCT_CATEGORY_SELECT },
        user: { select: PRODUCT_USER_SELECT },
      },
    });

    // 触发AI首次发布审核（异步不阻塞）
    triggerAIAuditIfEnabled(product.id, 'first_publish');

    return product;
  },

  async getList(query: ProductQuery) {
    const { skip, take, page, pageSize } = PaginationUtil.getPagination({
      page: query.page,
      pageSize: query.pageSize,
    });

    const where: Prisma.ProductWhereInput = {
      status: ProductStatus.active,
    };

    if (query.keyword) {
      const keyword = query.keyword.trim();
      where.OR = [
        { name: { contains: keyword } },
        { description: { contains: keyword } },
        { brand: { contains: keyword } },
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

    if (query.itemCondition) {
      where.itemCondition = query.itemCondition;
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.currentPrice = {};
      if (query.minPrice !== undefined) {
        where.currentPrice.gte = query.minPrice;
      }
      if (query.maxPrice !== undefined) {
        where.currentPrice.lte = query.maxPrice;
      }
    }

    if (query.deliveryType) {
      where.deliveryType = { in: [query.deliveryType, 'both'] };
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    if (query.sortBy === 'price') {
      orderBy = { currentPrice: query.sortOrder ?? 'asc' };
    } else if (query.sortBy === 'favorite') {
      orderBy = { favoriteCount: 'desc' };
    } else if (query.sortBy === 'time') {
      orderBy = { createdAt: query.sortOrder ?? 'desc' };
    }

    const [total, list] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          category: { select: PRODUCT_CATEGORY_SELECT },
          user: { select: PRODUCT_USER_SELECT },
        },
      }),
    ]);

    return PaginationUtil.buildResponse(list, total, page, pageSize);
  },

  async getById(id: bigint, userId?: number) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: PRODUCT_DETAIL_CATEGORY_SELECT },
        user: { select: PRODUCT_DETAIL_USER_SELECT },
      },
    });

    if (!product) {
      throw notFound('商品不存在');
    }

    if (product.status !== ProductStatus.active) {
      if (!userId || userId !== product.userId) {
        throw notFound('商品不存在或已下架');
      }
    }

    const isOwner = userId && userId === product.userId;
    const shouldIncrementView = product.status === ProductStatus.active && !isOwner;

    const [favoriteResult] = await Promise.all([
      userId ? prisma.favorite.findFirst({
        where: { userId, productId: id },
      }) : Promise.resolve(null),
      shouldIncrementView ? prisma.product.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      }) : Promise.resolve(product),
    ]);

    return { ...product, isFavorited: !!favoriteResult };
  },

  async getMyProducts(userId: number, query: ProductQuery) {
    const { skip, take, page, pageSize } = PaginationUtil.getPagination({
      page: query.page,
      pageSize: query.pageSize,
    });

    const where: Prisma.ProductWhereInput = { userId };

    if (query.status) {
      where.status = query.status;
    }

    const [total, list] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: PRODUCT_CATEGORY_SELECT },
        },
      }),
    ]);

    return PaginationUtil.buildResponse(list, total, page, pageSize);
  },

  async getUserProducts(userId: number, query: ProductQuery) {
    const { skip, take, page, pageSize } = PaginationUtil.getPagination({
      page: query.page,
      pageSize: query.pageSize,
      maxPageSize: 50,
    });

    const where: Prisma.ProductWhereInput = {
      userId,
      status: ProductStatus.active,
    };

    const [total, list] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          images: true,
          currentPrice: true,
          status: true,
        },
      }),
    ]);

    return PaginationUtil.buildResponse(list, total, page, pageSize);
  },

  async update(userId: number, productId: bigint, data: UpdateProductData) {
    const product = await findProductOrThrow(productId, {
      checkOwnership: userId,
      allowedStatuses: [ProductStatus.pending, ProductStatus.active, ProductStatus.offline, ProductStatus.audit_failed],
    });

    if (product.status === ProductStatus.banned) {
      throw badRequest('商品已被封禁，无法修改');
    }

    if (data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
      });
      if (!category) {
        throw badRequest('分类不存在');
      }
    }

    if (data.images) {
      if (data.images.length === 0) {
        throw badRequest('至少保留一张商品主图');
      }
      if (data.images.length > 9) {
        throw badRequest('商品主图最多9张');
      }
    }

    if (data.currentPrice !== undefined && data.currentPrice < 0) {
      throw badRequest('价格不能为负数');
    }
    if (data.originalPrice !== undefined && data.originalPrice < 0) {
      throw badRequest('原价不能为负数');
    }

    const newDeliveryType = data.deliveryType ?? product.deliveryType;
    if (newDeliveryType === DeliveryType.self || newDeliveryType === DeliveryType.both) {
      const pickupAddress = data.pickupAddress ?? product.pickupAddress;
      if (!pickupAddress) {
        throw badRequest('自提商品需填写自提地点');
      }
    }

    const needReAudit = needsReAudit(data);

    const updateData: Prisma.ProductUpdateInput = {};

    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined) updateData.description = data.description?.trim();
    if (data.categoryId !== undefined) {
      updateData.category = { connect: { id: data.categoryId } };
    }
    if (data.tags !== undefined) updateData.tags = data.tags ?? Prisma.JsonNull;
    if (data.images !== undefined) updateData.images = data.images;
    if (data.detailImages !== undefined) updateData.detailImages = data.detailImages ?? Prisma.JsonNull;
    if (data.originalPrice !== undefined) updateData.originalPrice = data.originalPrice;
    if (data.currentPrice !== undefined) updateData.currentPrice = data.currentPrice;
    if (data.bargain !== undefined) updateData.bargain = data.bargain;
    if (data.deliveryType !== undefined) updateData.deliveryType = data.deliveryType;
    if (data.pickupAddress !== undefined) updateData.pickupAddress = data.pickupAddress;
    if (data.pickupTime !== undefined) updateData.pickupTime = data.pickupTime;
    if (data.itemCondition !== undefined) updateData.itemCondition = toItemCondition(data.itemCondition);
    if (data.stock !== undefined) updateData.stock = data.stock;
    if (data.brand !== undefined) updateData.brand = data.brand;
    if (data.specs !== undefined) updateData.specs = data.specs ? JSON.parse(JSON.stringify(data.specs)) : Prisma.JsonNull;
    if (data.shippingAddress !== undefined) updateData.shippingAddress = data.shippingAddress;
    if (data.validDays !== undefined) {
      updateData.validDays = data.validDays;
      updateData.expireTime = calculateExpireTime(data.validDays);
    }

    // 需要重新审核的情况
    const needsAudit = needReAudit || product.status === ProductStatus.audit_failed;
    if (needsAudit) {
      if (product.status === ProductStatus.audit_failed) {
        if (product.auditCount >= 3) {
          throw badRequest('审核次数已达上限，无法再次提交');
        }
        updateData.auditCount = { increment: 1 };
      }
      updateData.status = ProductStatus.pending;
      updateData.rejectReason = null;
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: updateData,
      include: {
        category: { select: PRODUCT_CATEGORY_SELECT },
      },
    });

    // 如果触发了重新审核，尝试AI自动审核
    if (needsAudit) {
      triggerAIAuditIfEnabled(productId, 'edit');
    }

    return updated;
  },

  async offline(userId: number, productId: bigint) {
    await findProductOrThrow(productId, {
      checkOwnership: userId,
      allowedStatuses: [ProductStatus.active],
    });

    const updated = await prisma.product.update({
      where: { id: productId },
      data: { status: ProductStatus.offline },
    });

    return updated;
  },

  async relist(userId: number, productId: bigint) {
    const product = await findProductOrThrow(productId, {
      checkOwnership: userId,
    });

    if (product.status !== ProductStatus.offline && product.status !== ProductStatus.audit_failed) {
      throw badRequest('只能重新上架已下架或审核失败的商品');
    }

    if (product.status === ProductStatus.audit_failed) {
      if (product.auditCount >= 3) {
        throw badRequest('审核次数已达上限');
      }
    }

    const updateData: Prisma.ProductUpdateInput = {
      status: ProductStatus.pending,
      rejectReason: null,
      expireTime: calculateExpireTime(product.validDays ?? undefined),
      relistCount: { increment: 1 },
    };

    if (product.status === ProductStatus.audit_failed) {
      updateData.auditCount = { increment: 1 };
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: updateData,
    });

    // 触发AI首次发布审核（重新上架视为首次发布审核）
    triggerAIAuditIfEnabled(productId, 'first_publish');

    return updated;
  },

  async delete(userId: number, productId: bigint) {
    await findProductOrThrow(productId, { checkOwnership: userId });

    const pendingOrders = await prisma.order.count({
      where: {
        productId,
        status: { notIn: ['completed', 'cancelled', 'refunded'] },
      },
    });

    if (pendingOrders > 0) {
      throw badRequest('存在未完成的订单，无法删除');
    }

    await prisma.product.delete({
      where: { id: productId },
    });

    return { message: '删除成功' };
  },

  async getAdminList(query: AdminProductQuery) {
    const { skip, take, page, pageSize } = PaginationUtil.getPagination({
      page: query.page,
      pageSize: query.pageSize,
    });

    const where: Prisma.ProductWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.sellerId) {
      where.userId = query.sellerId;
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.keyword) {
      const keyword = query.keyword.trim();
      where.OR = [
        { name: { contains: keyword } },
        { description: { contains: keyword } },
      ];
    }

    const [total, list] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: PRODUCT_CATEGORY_SELECT },
          user: { select: USER_ADMIN_SELECT },
        },
      }),
    ]);

    return PaginationUtil.buildResponse(list, total, page, pageSize);
  },

  async approve(_adminId: number, productId: bigint) {
    const product = await findProductOrThrow(productId, {
      allowedStatuses: [ProductStatus.pending],
    });

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        status: ProductStatus.active,
        expireTime: calculateExpireTime(product.validDays ?? undefined),
      },
    });

    // 通知卖家商品审核通过
    await NotificationService.create({
      userId: product.userId,
      type: 'product',
      title: '商品审核通过',
      content: `商品「${product.name}」审核已通过，已上架展示`,
      relatedId: product.id,
      relatedType: 'product',
    });

    return updated;
  },

  async reject(_adminId: number, productId: bigint, reason: string) {
    const product = await findProductOrThrow(productId, {
      allowedStatuses: [ProductStatus.pending],
    });

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        status: ProductStatus.audit_failed,
        rejectReason: reason,
      },
    });

    // 通知卖家商品审核拒绝
    await NotificationService.create({
      userId: product.userId,
      type: 'product',
      title: '商品审核未通过',
      content: `商品「${product.name}」审核未通过，原因：${reason}`,
      relatedId: product.id,
      relatedType: 'product',
    });

    return updated;
  },

  async ban(_adminId: number, productId: bigint, reason: string) {
    const product = await findProductOrThrow(productId);

    if (product.status === ProductStatus.banned) {
      throw badRequest('商品已被封禁');
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        status: ProductStatus.banned,
        rejectReason: reason,
      },
    });

    // 通知卖家商品被封禁
    await NotificationService.create({
      userId: product.userId,
      type: 'product',
      title: '商品已被封禁',
      content: `商品「${product.name}」已被管理员封禁，原因：${reason}`,
      relatedId: product.id,
      relatedType: 'product',
    });

    return updated;
  },

  async unban(_adminId: number, productId: bigint) {
    const product = await findProductOrThrow(productId, {
      allowedStatuses: [ProductStatus.banned],
    });

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        status: ProductStatus.pending,
        rejectReason: null,
      },
    });

    // 通知卖家商品已解封
    await NotificationService.create({
      userId: product.userId,
      type: 'product',
      title: '商品已解封',
      content: `商品「${product.name}」已被管理员解封，将重新进入审核`,
      relatedId: product.id,
      relatedType: 'product',
    });

    return updated;
  },

  async forceOffline(_adminId: number, productId: bigint, reason: string) {
    const product = await findProductOrThrow(productId, {
      allowedStatuses: [ProductStatus.active],
    });

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        status: ProductStatus.offline,
        rejectReason: reason,
      },
    });

    // 通知卖家商品被强制下架
    await NotificationService.create({
      userId: product.userId,
      type: 'product',
      title: '商品被强制下架',
      content: `商品「${product.name}」被管理员强制下架，原因：${reason}`,
      relatedId: product.id,
      relatedType: 'product',
    });

    return updated;
  },

  async addFavorite(userId: number, productId: bigint) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw notFound('商品不存在');
    }

    const existing = await prisma.favorite.findFirst({
      where: { userId, productId },
    });
    if (existing) {
      throw badRequest('已收藏该商品');
    }

    await prisma.$transaction([
      prisma.favorite.create({ data: { userId, productId } }),
      prisma.product.update({
        where: { id: productId },
        data: { favoriteCount: { increment: 1 } },
      }),
    ]);

    return { isFavorited: true };
  },

  async removeFavorite(userId: number, productId: bigint) {
    const favorite = await prisma.favorite.findFirst({
      where: { userId, productId },
    });
    if (!favorite) {
      throw badRequest('未收藏该商品');
    }

    await prisma.$transaction([
      prisma.favorite.delete({ where: { id: favorite.id } }),
      prisma.product.update({
        where: { id: productId },
        data: { favoriteCount: { decrement: 1 } },
      }),
    ]);

    return { isFavorited: false };
  },

  async getFavorites(userId: number, query: { page?: number; pageSize?: number }) {
    const { skip, take, page, pageSize } = PaginationUtil.getPagination({
      page: query.page,
      pageSize: query.pageSize,
    });

    const where: Prisma.FavoriteWhereInput = { userId };

    const [total, list] = await Promise.all([
      prisma.favorite.count({ where }),
      prisma.favorite.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              images: true,
              currentPrice: true,
              originalPrice: true,
              itemCondition: true,
              deliveryType: true,
              bargain: true,
              viewCount: true,
              favoriteCount: true,
              status: true,
              createdAt: true,
              category: { select: PRODUCT_CATEGORY_SELECT },
              user: { select: PRODUCT_USER_SELECT },
            },
          },
        },
      }),
    ]);

    const filteredList = list
      .filter(f => f.product !== null)
      .map(f => ({
        ...f.product,
        favoriteId: f.id,
        favoritedAt: f.createdAt,
      }));

    const filteredTotal = total - (list.length - filteredList.length);
    return PaginationUtil.buildResponse(filteredList, filteredTotal, page, pageSize);
  },
};
