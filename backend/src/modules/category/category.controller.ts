import { Request, Response } from 'express';
import { CategoryService } from './category.service';
import { success, fail } from '../../utils/response';

export const CategoryController = {
  async getTree(_req: Request, res: Response) {
    try {
      const tree = await CategoryService.getAll();
      return success(res, tree);
    } catch (err: any) {
      return fail(res, err.message, err.statusCode || 500);
    }
  },

  async getList(_req: Request, res: Response) {
    try {
      const list = await CategoryService.getFlatList();
      return success(res, list);
    } catch (err: any) {
      return fail(res, err.message, err.statusCode || 500);
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) return fail(res, '无效的分类ID', 400);

      const category = await CategoryService.getById(id);
      if (!category) return fail(res, '分类不存在', 404);

      return success(res, category);
    } catch (err: any) {
      return fail(res, err.message, err.statusCode || 500);
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { name, parentId, icon, sort } = req.body;

      if (!name || name.trim().length === 0) {
        return fail(res, '分类名称不能为空', 400);
      }
      if (name.length > 50) {
        return fail(res, '分类名称不能超过50个字符', 400);
      }

      const category = await CategoryService.create({
        name: name.trim(),
        parentId: parentId ?? null,
        icon,
        sort,
      });

      return success(res, category, '创建成功', 201);
    } catch (err: any) {
      return fail(res, err.message, err.statusCode || 500);
    }
  },

  async update(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) return fail(res, '无效的分类ID', 400);

      const { name, parentId, icon, sort } = req.body;

      if (name !== undefined && name.trim().length === 0) {
        return fail(res, '分类名称不能为空', 400);
      }
      if (name !== undefined && name.length > 50) {
        return fail(res, '分类名称不能超过50个字符', 400);
      }

      const category = await CategoryService.update(id, {
        name: name?.trim(),
        parentId: parentId ?? null,
        icon,
        sort,
      });

      return success(res, category, '更新成功');
    } catch (err: any) {
      return fail(res, err.message, err.statusCode || 500);
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) return fail(res, '无效的分类ID', 400);

      const result = await CategoryService.delete(id);
      return success(res, null, result.message);
    } catch (err: any) {
      return fail(res, err.message, err.statusCode || 500);
    }
  },
};
