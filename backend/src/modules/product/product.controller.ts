import { Request, Response } from 'express';
import { ProductService, ProductQuery, AdminProductQuery, CreateProductData, UpdateProductData } from './product.service';
import { success, fail } from '../../utils/response';

export const ProductController = {
  // 创建商品
  async create(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const data: CreateProductData = req.body;

      if (!data.name || !data.name.trim()) {
        return fail(res, '商品名称不能为空', 400);
      }
      if (data.name.length > 100) {
        return fail(res, '商品名称不能超过100个字符', 400);
      }
      if (!data.categoryId) {
        return fail(res, '请选择商品分类', 400);
      }
      if (!data.images || !Array.isArray(data.images) || data.images.length === 0) {
        return fail(res, '至少上传一张商品主图', 400);
      }
      if (!data.currentPrice || data.currentPrice < 0) {
        return fail(res, '请输入正确的价格', 400);
      }
      if (!data.itemCondition) {
        return fail(res, '请选择新旧程度', 400);
      }
      if (!data.deliveryType) {
        return fail(res, '请选择交易方式', 400);
      }

      const product = await ProductService.create(userId, data);
      return success(res, product, '商品发布成功，等待审核', 201);
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number };
      return fail(res, error.message, error.statusCode || 500);
    }
  },

  // 获取商品列表（公开）
  async getList(req: Request, res: Response) {
    try {
      const query: ProductQuery = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 10,
        keyword: req.query.keyword as string,
        categoryId: req.query.categoryId ? parseInt(req.query.categoryId as string, 10) : undefined,
        itemCondition: req.query.itemCondition as ProductQuery['itemCondition'],
        minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
        deliveryType: req.query.deliveryType as ProductQuery['deliveryType'],
        sortBy: req.query.sortBy as ProductQuery['sortBy'],
        sortOrder: req.query.sortOrder as ProductQuery['sortOrder'],
      };

      const result = await ProductService.getList(query);
      return success(res, result);
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number };
      return fail(res, error.message, error.statusCode || 500);
    }
  },

  // 获取商品详情
  async getById(req: Request, res: Response) {
    try {
      const id = BigInt(req.params.id as string);
      const userId = req.user?.userId;

      const product = await ProductService.getById(id, userId);
      return success(res, product);
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number };
      return fail(res, error.message, error.statusCode || 500);
    }
  },

  // 获取指定用户的商品列表（公开）
  async getUserProducts(req: Request, res: Response) {
    try {
      const userId = parseInt(req.params.userId as string, 10);
      const query: ProductQuery = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 12,
        status: req.query.status as ProductQuery['status'],
        userId,
      };

      const result = await ProductService.getUserProducts(userId, query);
      return success(res, result);
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number };
      return fail(res, error.message, error.statusCode || 500);
    }
  },

  // 获取我的商品列表
  async getMyProducts(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const query: ProductQuery = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 10,
        status: req.query.status as ProductQuery['status'],
      };

      const result = await ProductService.getMyProducts(userId, query);
      return success(res, result);
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number };
      return fail(res, error.message, error.statusCode || 500);
    }
  },

  // 更新商品
  async update(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const productId = BigInt(req.params.id as string);
      const data: UpdateProductData = req.body;

      if (data.name !== undefined && !data.name.trim()) {
        return fail(res, '商品名称不能为空', 400);
      }
      if (data.name && data.name.length > 100) {
        return fail(res, '商品名称不能超过100个字符', 400);
      }
      if (data.currentPrice !== undefined && data.currentPrice < 0) {
        return fail(res, '价格不能为负数', 400);
      }

      const product = await ProductService.update(userId, productId, data);
      return success(res, product, '更新成功');
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number };
      return fail(res, error.message, error.statusCode || 500);
    }
  },

  // 下架商品
  async offline(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const productId = BigInt(req.params.id as string);

      const product = await ProductService.offline(userId, productId);
      return success(res, product, '商品已下架');
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number };
      return fail(res, error.message, error.statusCode || 500);
    }
  },

  // 重新上架
  async relist(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const productId = BigInt(req.params.id as string);

      const product = await ProductService.relist(userId, productId);
      return success(res, product, '商品已重新提交审核');
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number };
      return fail(res, error.message, error.statusCode || 500);
    }
  },

  // 删除商品
  async delete(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const productId = BigInt(req.params.id as string);

      const result = await ProductService.delete(userId, productId);
      return success(res, null, result.message);
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number };
      return fail(res, error.message, error.statusCode || 500);
    }
  },

  // ========== 管理员功能 ==========

  // 获取所有商品列表（管理员）
  async getAdminList(req: Request, res: Response) {
    try {
      const query: AdminProductQuery = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 10,
        keyword: req.query.keyword as string,
        categoryId: req.query.categoryId ? parseInt(req.query.categoryId as string, 10) : undefined,
        status: req.query.status as AdminProductQuery['status'],
        sellerId: req.query.sellerId ? parseInt(req.query.sellerId as string, 10) : undefined,
      };

      const result = await ProductService.getAdminList(query);
      return success(res, result);
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number };
      return fail(res, error.message, error.statusCode || 500);
    }
  },

  // 审核通过
  async approve(req: Request, res: Response) {
    try {
      const adminId = req.user!.userId;
      const productId = BigInt(req.params.id as string);

      const product = await ProductService.approve(adminId, productId);
      return success(res, product, '审核通过');
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number };
      return fail(res, error.message, error.statusCode || 500);
    }
  },

  // 审核拒绝
  async reject(req: Request, res: Response) {
    try {
      const adminId = req.user!.userId;
      const productId = BigInt(req.params.id as string);
      const { reason } = req.body;

      if (!reason || !reason.trim()) {
        return fail(res, '请填写拒绝原因', 400);
      }

      const product = await ProductService.reject(adminId, productId, reason.trim());
      return success(res, product, '已拒绝');
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number };
      return fail(res, error.message, error.statusCode || 500);
    }
  },

  // 封禁商品
  async ban(req: Request, res: Response) {
    try {
      const adminId = req.user!.userId;
      const productId = BigInt(req.params.id as string);
      const { reason } = req.body;

      if (!reason || !reason.trim()) {
        return fail(res, '请填写封禁原因', 400);
      }

      const product = await ProductService.ban(adminId, productId, reason.trim());
      return success(res, product, '商品已封禁');
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number };
      return fail(res, error.message, error.statusCode || 500);
    }
  },

  // 解封商品
  async unban(req: Request, res: Response) {
    try {
      const adminId = req.user!.userId;
      const productId = BigInt(req.params.id as string);

      const product = await ProductService.unban(adminId, productId);
      return success(res, product, '商品已解封');
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number };
      return fail(res, error.message, error.statusCode || 500);
    }
  },

  // 强制下架
  async forceOffline(req: Request, res: Response) {
    try {
      const adminId = req.user!.userId;
      const productId = BigInt(req.params.id as string);
      const { reason } = req.body;

      if (!reason || !reason.trim()) {
        return fail(res, '请填写下架原因', 400);
      }

      const product = await ProductService.forceOffline(adminId, productId, reason.trim());
      return success(res, product, '商品已下架');
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number };
      return fail(res, error.message, error.statusCode || 500);
    }
  },
};