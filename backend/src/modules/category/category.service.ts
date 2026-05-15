import { prisma } from '../../config/prisma';

export interface CreateCategoryData {
  name: string;
  parentId?: number | null;
  icon?: string;
  sort?: number;
}

export interface UpdateCategoryData {
  name?: string;
  parentId?: number | null;
  icon?: string;
  sort?: number;
}

export interface CategoryTree {
  id: number;
  name: string;
  parentId: number | null;
  icon: string | null;
  sort: number;
  children: CategoryTree[];
  createdAt: Date;
  updatedAt: Date;
}

export const CategoryService = {
  async getAll(): Promise<CategoryTree[]> {
    const categories = await prisma.category.findMany({
      orderBy: [{ sort: 'desc' }, { id: 'asc' }],
    });

    const categoryMap = new Map<number, CategoryTree>();
    const rootCategories: CategoryTree[] = [];

    categories.forEach((cat) => {
      categoryMap.set(cat.id, {
        ...cat,
        children: [],
      });
    });

    categories.forEach((cat) => {
      const node = categoryMap.get(cat.id)!;
      if (cat.parentId === null) {
        rootCategories.push(node);
      } else {
        const parent = categoryMap.get(cat.parentId);
        if (parent) {
          parent.children.push(node);
        }
      }
    });

    return rootCategories;
  },

  async getFlatList(): Promise<{ id: number; name: string; parentId: number | null; icon: string | null; sort: number }[]> {
    return prisma.category.findMany({
      orderBy: [{ sort: 'desc' }, { id: 'asc' }],
      select: {
        id: true,
        name: true,
        parentId: true,
        icon: true,
        sort: true,
      },
    });
  },

  async getById(id: number) {
    return prisma.category.findUnique({
      where: { id },
      include: {
        children: true,
        _count: {
          select: { products: true },
        },
      },
    });
  },

  async create(data: CreateCategoryData) {
    if (data.parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: data.parentId },
      });
      if (!parent) {
        throw Object.assign(new Error('父分类不存在'), { statusCode: 404 });
      }
      if (parent.parentId !== null) {
        throw Object.assign(new Error('最多支持两级分类'), { statusCode: 400 });
      }
    }

    const existing = await prisma.category.findFirst({
      where: {
        name: data.name,
        parentId: data.parentId ?? null,
      },
    });
    if (existing) {
      throw Object.assign(new Error('该分类名称已存在'), { statusCode: 409 });
    }

    return prisma.category.create({
      data: {
        name: data.name,
        parentId: data.parentId ?? null,
        icon: data.icon,
        sort: data.sort ?? 0,
      },
    });
  },

  async update(id: number, data: UpdateCategoryData) {
    const category = await prisma.category.findUnique({
      where: { id },
    });
    if (!category) {
      throw Object.assign(new Error('分类不存在'), { statusCode: 404 });
    }

    if (data.parentId !== undefined) {
      if (data.parentId === id) {
        throw Object.assign(new Error('不能将自己设为父分类'), { statusCode: 400 });
      }
      if (data.parentId !== null) {
        const parent = await prisma.category.findUnique({
          where: { id: data.parentId },
        });
        if (!parent) {
          throw Object.assign(new Error('父分类不存在'), { statusCode: 404 });
        }
        if (parent.parentId !== null) {
          throw Object.assign(new Error('最多支持两级分类'), { statusCode: 400 });
        }
        const children = await prisma.category.count({
          where: { parentId: id },
        });
        if (children > 0) {
          throw Object.assign(new Error('该分类下有子分类，不能变为子分类'), { statusCode: 400 });
        }
      }
    }

    if (data.name !== undefined) {
      const existing = await prisma.category.findFirst({
        where: {
          name: data.name,
          parentId: data.parentId ?? category.parentId ?? null,
          NOT: { id },
        },
      });
      if (existing) {
        throw Object.assign(new Error('该分类名称已存在'), { statusCode: 409 });
      }
    }

    return prisma.category.update({
      where: { id },
      data: {
        name: data.name,
        parentId: data.parentId,
        icon: data.icon,
        sort: data.sort,
      },
    });
  },

  async delete(id: number) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true, children: true },
        },
      },
    });
    if (!category) {
      throw Object.assign(new Error('分类不存在'), { statusCode: 404 });
    }

    if (category._count.products > 0) {
      throw Object.assign(new Error('该分类下有商品，无法删除'), { statusCode: 400 });
    }

    if (category._count.children > 0) {
      throw Object.assign(new Error('该分类下有子分类，无法删除'), { statusCode: 400 });
    }

    await prisma.category.delete({
      where: { id },
    });

    return { message: '删除成功' };
  },
};
