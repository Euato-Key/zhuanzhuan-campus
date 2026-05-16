import { prisma } from '../../config/prisma';
import { Prisma, ItemCondition, DeliveryType, ProductStatus } from '@prisma/client';

// 导出Prisma生成的枚举类型
export type { ItemCondition, DeliveryType, ProductStatus };

// 前端传来的值到Prisma枚举的映射
const ITEM_CONDITION_MAP: Record<string, ItemCondition> = {
  'new': ItemCondition.new,
  '99new': ItemCondition.ninety_nine_new,
  '95new': ItemCondition.ninety_five_new,
  '90new': ItemCondition.ninety_new,
  '80new': ItemCondition.eighty_new,
};

// 将前端传来的字符串转换为Prisma枚举
function toItemCondition(value: string): ItemCondition {
  const result = ITEM_CONDITION_MAP[value];
  if (!result) {
    throw Object.assign(new Error(`无效的新旧程度: ${value}`), { statusCode: 400 });
  }
  return result;
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
  itemCondition: string; // 前端传字符串，如 '95new'
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
  itemCondition?: string; // 前端传字符串，如 '95new'
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

// 需要重新审核的字段
const RE_AUDIT_FIELDS = ['name', 'description', 'categoryId', 'images', 'currentPrice'] as const;

// 计算过期时间
function calculateExpireTime(validDays?: number): Date | null {
  if (!validDays) return null;
  const expireTime = new Date();
  expireTime.setDate(expireTime.getDate() + validDays);
  return expireTime;
}

// 检查是否需要重新审核
function needsReAudit(updateData: UpdateProductData): boolean {
  return RE_AUDIT_FIELDS.some(field => field in updateData);
}

export const ProductService = {
  // 创建商品
  async create(userId: number, data: CreateProductData) {
    // 验证分类是否存在
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) {
      throw Object.assign(new Error('分类不存在'), { statusCode: 400 });
    }

    // 验证图片数量
    if (!data.images || data.images.length === 0) {
      throw Object.assign(new Error('至少上传一张商品主图'), { statusCode: 400 });
    }
    if (data.images.length > 9) {
      throw Object.assign(new Error('商品主图最多9张'), { statusCode: 400 });
    }

    // 验证有效期
    if (data.validDays && ![7, 15, 30].includes(data.validDays)) {
      throw Object.assign(new Error('有效期只能是7天、15天或30天'), { statusCode: 400 });
    }

    // 验证价格
    if (data.currentPrice < 0) {
      throw Object.assign(new Error('价格不能为负数'), { statusCode: 400 });
    }
    if (data.originalPrice && data.originalPrice < 0) {
      throw Object.assign(new Error('原价不能为负数'), { statusCode: 400 });
    }

    // 验证库存
    if (data.stock !== undefined && data.stock < 1) {
      throw Object.assign(new Error('库存至少为1'), { statusCode: 400 });
    }

    // 验证自提信息
    if (data.deliveryType === 'self' || data.deliveryType === 'both') {
      if (!data.pickupAddress) {
        throw Object.assign(new Error('自提商品需填写自提地点'), { statusCode: 400 });
      }
    }

    const expireTime = calculateExpireTime(data.validDays);

    const product = await prisma.product.create({
      data: {
        userId,
        name: data.name.trim(),
        description: data.description?.trim(),
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
        specs: data.specs ?? Prisma.JsonNull,
        shippingAddress: data.shippingAddress,
        validDays: data.validDays,
        expireTime,
        status: 'pending',
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
        user: {
          select: { id: true, username: true, avatar: true },
        },
      },
    });

    return product;
  },

  // 获取商品列表（公开）
  async getList(query: ProductQuery) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 10, 50);
    const skip = (page - 1) * pageSize;

    const where: Prisma.ProductWhereInput = {
      status: 'active',
    };

    // 关键词搜索
    if (query.keyword) {
      const keyword = query.keyword.trim();
      where.OR = [
        { name: { contains: keyword } },
        { description: { contains: keyword } },
        { brand: { contains: keyword } },
      ];
    }

    // 分类筛选
    if (query.categoryId) {
      // 支持子分类查询
      const category = await prisma.category.findUnique({
        where: { id: query.categoryId },
        include: { children: true },
      });
      if (category) {
        const categoryIds = [category.id, ...category.children.map(c => c.id)];
        where.categoryId = { in: categoryIds };
      }
    }

    // 新旧程度筛选
    if (query.itemCondition) {
      where.itemCondition = query.itemCondition;
    }

    // 价格区间筛选
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.currentPrice = {};
      if (query.minPrice !== undefined) {
        where.currentPrice.gte = query.minPrice;
      }
      if (query.maxPrice !== undefined) {
        where.currentPrice.lte = query.maxPrice;
      }
    }

    // 交易方式筛选
    if (query.deliveryType) {
      where.deliveryType = { in: [query.deliveryType, 'both'] };
    }

    // 排序
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
        take: pageSize,
        orderBy,
        include: {
          category: { select: { id: true, name: true } },
          user: { select: { id: true, username: true, avatar: true } },
        },
      }),
    ]);

    return {
      list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  // 获取商品详情
  async getById(id: bigint, userId?: number) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, parentId: true } },
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            school: true,
            campus: true,
            creditScore: true,
          },
        },
      },
    });

    if (!product) {
      throw Object.assign(new Error('商品不存在'), { statusCode: 404 });
    }

    // 非上架状态，只有卖家和管理员可见
    if (product.status !== 'active') {
      // TODO: 需要从请求中获取管理员角色信息进行判断
      // 当前方案：仅卖家可见非上架商品
      if (!userId || userId !== product.userId) {
        throw Object.assign(new Error('商品不存在或已下架'), { statusCode: 404 });
      }
    }

    // 增加浏览量
    await prisma.product.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    // 记录浏览历史
    if (userId) {
      await prisma.$executeRaw`
        INSERT INTO product_views (user_id, product_id, created_at)
        VALUES (${userId}, ${id}, NOW())
      `;
    }

    // 检查是否已收藏
    let isFavorited = false;
    if (userId) {
      const favorite = await prisma.favorite.findFirst({
        where: { userId, productId: id },
      });
      isFavorited = !!favorite;
    }

    return { ...product, isFavorited };
  },

  // 获取用户的商品列表
  async getMyProducts(userId: number, query: ProductQuery) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 10, 50);
    const skip = (page - 1) * pageSize;

    const where: Prisma.ProductWhereInput = { userId };

    if (query.status) {
      where.status = query.status;
    }

    const [total, list] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  // 获取指定用户的公开商品列表（用于用户主页）
  async getUserProducts(userId: number, query: ProductQuery) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 12, 50);
    const skip = (page - 1) * pageSize;

    // 公开接口只显示在售商品
    const where: Prisma.ProductWhereInput = {
      userId,
      status: 'active',
    };

    const [total, list] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: pageSize,
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

    return {
      list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  // 更新商品
  async update(userId: number, productId: bigint, data: UpdateProductData) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw Object.assign(new Error('商品不存在'), { statusCode: 404 });
    }

    if (product.userId !== userId) {
      throw Object.assign(new Error('无权修改此商品'), { statusCode: 403 });
    }

    // 已封禁的商品不能修改
    if (product.status === 'banned') {
      throw Object.assign(new Error('商品已被封禁，无法修改'), { statusCode: 400 });
    }

    // 审核失败的商品修改后重新提交审核
    // 其他状态的商品修改需要判断是否需要重新审核

    // 验证分类
    if (data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
      });
      if (!category) {
        throw Object.assign(new Error('分类不存在'), { statusCode: 400 });
      }
    }

    // 验证图片
    if (data.images) {
      if (data.images.length === 0) {
        throw Object.assign(new Error('至少保留一张商品主图'), { statusCode: 400 });
      }
      if (data.images.length > 9) {
        throw Object.assign(new Error('商品主图最多9张'), { statusCode: 400 });
      }
    }

    // 验证价格
    if (data.currentPrice !== undefined && data.currentPrice < 0) {
      throw Object.assign(new Error('价格不能为负数'), { statusCode: 400 });
    }
    if (data.originalPrice !== undefined && data.originalPrice < 0) {
      throw Object.assign(new Error('原价不能为负数'), { statusCode: 400 });
    }

    // 验证自提信息
    const newDeliveryType = data.deliveryType ?? product.deliveryType;
    if (newDeliveryType === 'self' || newDeliveryType === 'both') {
      const pickupAddress = data.pickupAddress ?? product.pickupAddress;
      if (!pickupAddress) {
        throw Object.assign(new Error('自提商品需填写自提地点'), { statusCode: 400 });
      }
    }

    // 判断是否需要重新审核
    const needReAudit = needsReAudit(data);

    // 构建更新数据
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
    if (data.specs !== undefined) updateData.specs = data.specs ?? Prisma.JsonNull;
    if (data.shippingAddress !== undefined) updateData.shippingAddress = data.shippingAddress;
    if (data.validDays !== undefined) {
      updateData.validDays = data.validDays;
      updateData.expireTime = calculateExpireTime(data.validDays);
    }

    // 如果需要重新审核且当前不是审核失败状态
    if (needReAudit && product.status !== 'audit_failed') {
      // 检查审核次数
      if (product.auditCount >= 3) {
        throw Object.assign(new Error('审核次数已达上限，无法再次提交'), { statusCode: 400 });
      }
      updateData.status = 'pending';
      updateData.rejectReason = null;
    }

    // 如果是审核失败状态，修改后重新提交
    if (product.status === 'audit_failed') {
      if (product.auditCount >= 3) {
        throw Object.assign(new Error('审核次数已达上限，无法再次提交'), { statusCode: 400 });
      }
      updateData.status = 'pending';
      updateData.rejectReason = null;
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: updateData,
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    return updated;
  },

  // 下架商品
  async offline(userId: number, productId: bigint) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw Object.assign(new Error('商品不存在'), { statusCode: 404 });
    }

    if (product.userId !== userId) {
      throw Object.assign(new Error('无权操作此商品'), { statusCode: 403 });
    }

    if (product.status !== 'active') {
      throw Object.assign(new Error('只能下架在售商品'), { statusCode: 400 });
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: { status: 'offline' },
    });

    return updated;
  },

  // 重新上架
  async relist(userId: number, productId: bigint) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw Object.assign(new Error('商品不存在'), { statusCode: 404 });
    }

    if (product.userId !== userId) {
      throw Object.assign(new Error('无权操作此商品'), { statusCode: 403 });
    }

    if (product.status !== 'offline' && product.status !== 'audit_failed') {
      throw Object.assign(new Error('只能重新上架已下架或审核失败的商品'), { statusCode: 400 });
    }

    // 审核失败状态需要检查审核次数
    if (product.status === 'audit_failed' && product.auditCount >= 3) {
      throw Object.assign(new Error('审核次数已达上限'), { statusCode: 400 });
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        status: 'pending',
        rejectReason: null,
        expireTime: calculateExpireTime(product.validDays ?? undefined),
        relistCount: { increment: 1 },
      },
    });

    return updated;
  },

  // 删除商品
  async delete(userId: number, productId: bigint) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        _count: { select: { orders: true } },
      },
    });

    if (!product) {
      throw Object.assign(new Error('商品不存在'), { statusCode: 404 });
    }

    if (product.userId !== userId) {
      throw Object.assign(new Error('无权删除此商品'), { statusCode: 403 });
    }

    // 检查是否有未完成的订单
    const pendingOrders = await prisma.order.count({
      where: {
        productId,
        status: { notIn: ['completed', 'cancelled', 'refunded'] },
      },
    });

    if (pendingOrders > 0) {
      throw Object.assign(new Error('存在未完成的订单，无法删除'), { statusCode: 400 });
    }

    await prisma.product.delete({
      where: { id: productId },
    });

    return { message: '删除成功' };
  },

  // ========== 管理员功能 ==========

  // 获取所有商品列表（管理员）
  async getAdminList(query: AdminProductQuery) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 10, 50);
    const skip = (page - 1) * pageSize;

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
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true } },
          user: { select: { id: true, username: true, email: true } },
        },
      }),
    ]);

    return {
      list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  // 审核通过
  async approve(adminId: number, productId: bigint) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw Object.assign(new Error('商品不存在'), { statusCode: 404 });
    }

    if (product.status !== 'pending') {
      throw Object.assign(new Error('只能审核待审核状态的商品'), { statusCode: 400 });
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        status: 'active',
        auditCount: { increment: 1 },
        expireTime: calculateExpireTime(product.validDays ?? undefined),
      },
    });

    return updated;
  },

  // 审核拒绝
  async reject(adminId: number, productId: bigint, reason: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw Object.assign(new Error('商品不存在'), { statusCode: 404 });
    }

    if (product.status !== 'pending') {
      throw Object.assign(new Error('只能审核待审核状态的商品'), { statusCode: 400 });
    }

    const newAuditCount = product.auditCount + 1;
    const newStatus = newAuditCount >= 3 ? 'audit_failed' : 'pending';

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        status: newStatus,
        rejectReason: reason,
        auditCount: newAuditCount,
      },
    });

    return updated;
  },

  // 封禁商品
  async ban(adminId: number, productId: bigint, reason: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw Object.assign(new Error('商品不存在'), { statusCode: 404 });
    }

    if (product.status === 'banned') {
      throw Object.assign(new Error('商品已被封禁'), { statusCode: 400 });
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        status: 'banned',
        rejectReason: reason,
      },
    });

    return updated;
  },

  // 解封商品
  async unban(adminId: number, productId: bigint) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw Object.assign(new Error('商品不存在'), { statusCode: 404 });
    }

    if (product.status !== 'banned') {
      throw Object.assign(new Error('只能解封被封禁的商品'), { statusCode: 400 });
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        status: 'pending',
        rejectReason: null,
      },
    });

    return updated;
  },

  // 强制下架
  async forceOffline(adminId: number, productId: bigint, reason: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw Object.assign(new Error('商品不存在'), { statusCode: 404 });
    }

    if (product.status !== 'active') {
      throw Object.assign(new Error('只能下架在售商品'), { statusCode: 400 });
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        status: 'offline',
        rejectReason: reason,
      },
    });

    return updated;
  },
};
