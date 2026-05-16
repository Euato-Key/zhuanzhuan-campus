import { Request, Response } from 'express';
import { CategoryService } from './category.service';
import { success, fail } from '../../utils/response';
import { asyncHandler } from '../../common/asyncHandler';
import { ValidationUtil } from '../../common/validation';

export const CategoryController = {
  getTree: asyncHandler(async (_req: Request, res: Response) => {
    const tree = await CategoryService.getAll();
    return success(res, tree);
  }),

  getList: asyncHandler(async (_req: Request, res: Response) => {
    const list = await CategoryService.getFlatList();
    return success(res, list);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const id = ValidationUtil.parseIdParam(req.params.id, '分类ID');
    const category = await CategoryService.getById(id);
    if (!category) return fail(res, '分类不存在', 404);
    return success(res, category);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const { name, parentId, icon, sort } = req.body;
    ValidationUtil.requireNonEmptyString(name, '分类名称');
    ValidationUtil.validateCategoryName(name);
    const category = await CategoryService.create({
      name: name.trim(),
      parentId: parentId ?? null,
      icon,
      sort,
    });
    return success(res, category, '创建成功', 201);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const id = ValidationUtil.parseIdParam(req.params.id, '分类ID');
    const { name, parentId, icon, sort } = req.body;
    if (name !== undefined) {
      if (name.trim().length === 0) {
        return fail(res, '分类名称不能为空', 400);
      }
      ValidationUtil.validateCategoryName(name);
    }
    const category = await CategoryService.update(id, {
      name: name?.trim(),
      parentId: parentId ?? null,
      icon,
      sort,
    });
    return success(res, category, '更新成功');
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const id = ValidationUtil.parseIdParam(req.params.id, '分类ID');
    const result = await CategoryService.delete(id);
    return success(res, null, result.message);
  }),
};