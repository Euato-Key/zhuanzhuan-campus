import { Request, Response } from 'express';
import { ProductService, ProductQuery, AdminProductQuery, CreateProductData, UpdateProductData, toItemCondition, tryToItemCondition } from './product.service';
import { success, fail } from '../../utils/response';
import { asyncHandler } from '../../common/asyncHandler';
import { ValidationUtil } from '../../common/validation';

function parseProductQuery(req: Request): ProductQuery {
  const itemConditionStr = req.query.itemCondition as string | undefined;
  return {
    page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
    pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined,
    keyword: req.query.keyword as string,
    categoryId: req.query.categoryId ? parseInt(req.query.categoryId as string, 10) : undefined,
    itemCondition: itemConditionStr ? tryToItemCondition(itemConditionStr) : undefined,
    minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
    maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
    deliveryType: req.query.deliveryType as ProductQuery['deliveryType'],
    sortBy: req.query.sortBy as ProductQuery['sortBy'],
    sortOrder: req.query.sortOrder as ProductQuery['sortOrder'],
  };
}

function parseAdminProductQuery(req: Request): AdminProductQuery {
  return {
    ...parseProductQuery(req),
    status: req.query.status as AdminProductQuery['status'],
    sellerId: req.query.sellerId ? parseInt(req.query.sellerId as string, 10) : undefined,
  };
}

function parseProductId(req: Request): bigint {
  return ValidationUtil.parseBigIntParam(req.params.id, '商品ID');
}

export const ProductController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
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
  }),

  getList: asyncHandler(async (req: Request, res: Response) => {
    const query = parseProductQuery(req);
    const result = await ProductService.getList(query);
    return success(res, result);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const id = parseProductId(req);
    const userId = req.user?.userId;
    const product = await ProductService.getById(id, userId);
    return success(res, product);
  }),

  getUserProducts: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.parseIdParam(req.params.userId, '用户ID');
    const query: ProductQuery = {
      ...parseProductQuery(req),
      userId,
    };
    const result = await ProductService.getUserProducts(userId, query);
    return success(res, result);
  }),

  getMyProducts: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const query: ProductQuery = {
      ...parseProductQuery(req),
      status: req.query.status as ProductQuery['status'],
    };
    const result = await ProductService.getMyProducts(userId, query);
    return success(res, result);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const productId = parseProductId(req);
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
  }),

  offline: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const productId = parseProductId(req);
    const product = await ProductService.offline(userId, productId);
    return success(res, product, '商品已下架');
  }),

  relist: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const productId = parseProductId(req);
    const product = await ProductService.relist(userId, productId);
    return success(res, product, '商品已重新提交审核');
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const productId = parseProductId(req);
    const result = await ProductService.delete(userId, productId);
    return success(res, null, result.message);
  }),

  getAdminList: asyncHandler(async (req: Request, res: Response) => {
    const query = parseAdminProductQuery(req);
    const result = await ProductService.getAdminList(query);
    return success(res, result);
  }),

  approve: asyncHandler(async (req: Request, res: Response) => {
    const adminId = ValidationUtil.requireUserId(req);
    const productId = parseProductId(req);
    const product = await ProductService.approve(adminId, productId);
    return success(res, product, '审核通过');
  }),

  reject: asyncHandler(async (req: Request, res: Response) => {
    const adminId = ValidationUtil.requireUserId(req);
    const productId = parseProductId(req);
    const reason = ValidationUtil.requireNonEmptyString(req.body.reason, '拒绝原因');
    const product = await ProductService.reject(adminId, productId, reason);
    return success(res, product, '已拒绝');
  }),

  ban: asyncHandler(async (req: Request, res: Response) => {
    const adminId = ValidationUtil.requireUserId(req);
    const productId = parseProductId(req);
    const reason = ValidationUtil.requireNonEmptyString(req.body.reason, '封禁原因');
    const product = await ProductService.ban(adminId, productId, reason);
    return success(res, product, '商品已封禁');
  }),

  unban: asyncHandler(async (req: Request, res: Response) => {
    const adminId = ValidationUtil.requireUserId(req);
    const productId = parseProductId(req);
    const product = await ProductService.unban(adminId, productId);
    return success(res, product, '商品已解封');
  }),

  forceOffline: asyncHandler(async (req: Request, res: Response) => {
    const adminId = ValidationUtil.requireUserId(req);
    const productId = parseProductId(req);
    const reason = ValidationUtil.requireNonEmptyString(req.body.reason, '下架原因');
    const product = await ProductService.forceOffline(adminId, productId, reason);
    return success(res, product, '商品已下架');
  }),
};
