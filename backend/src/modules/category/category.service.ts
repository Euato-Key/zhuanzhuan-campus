import { prisma } from '../../config/prisma';
import { badRequest, notFound, conflict } from '../../common/errors';
import { CATEGORY_BASE_SELECT, CATEGORY_CHILDREN_SELECT } from '../../common/selects';

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
      select: CATEGORY_BASE_SELECT,
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
      select: {
        id: true,
        name: true,
        parentId: true,
        icon: true,
        sort: true,
        createdAt: true,
        updatedAt: true,
        children: {
          select: CATEGORY_CHILDREN_SELECT,
        },
        _count: {
          select: { products: true },
        },
      },
    });
  },

  async create(data: CreateCategoryData) {
    const [parent, existing] = await Promise.all([
      data.parentId ? prisma.category.findUnique({ where: { id: data.parentId } }) : null,
      prisma.category.findFirst({
        where: { name: data.name, parentId: data.parentId ?? null },
      }),
    ]);

    if (data.parentId && !parent) {
      throw notFound('父分类不存在');
    }
    if (parent && parent.parentId !== null) {
      throw badRequest('最多支持两级分类');
    }
    if (existing) {
      throw conflict('该分类名称已存在');
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
      throw notFound('分类不存在');
    }

    const needParentCheck = data.parentId !== undefined && data.parentId !== null && data.parentId !== id;
    const needNameCheck = data.name !== undefined;

    const [parent, childrenCount, existingName] = await Promise.all([
      needParentCheck ? prisma.category.findUnique({ where: { id: data.parentId! } }) : null,
      needParentCheck ? prisma.category.count({ where: { parentId: id } }) : 0,
      needNameCheck ? prisma.category.findFirst({
        where: {
          name: data.name,
          parentId: data.parentId ?? category.parentId ?? null,
          NOT: { id },
        },
      }) : null,
    ]);

    if (data.parentId === id) {
      throw badRequest('不能将自己设为父分类');
    }
    if (needParentCheck) {
      if (!parent) {
        throw notFound('父分类不存在');
      }
      if (parent.parentId !== null) {
        throw badRequest('最多支持两级分类');
      }
      if (childrenCount > 0) {
        throw badRequest('该分类下有子分类，不能变为子分类');
      }
    }
    if (needNameCheck && existingName) {
      throw conflict('该分类名称已存在');
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
      throw notFound('分类不存在');
    }

    if (category._count.products > 0) {
      throw badRequest('该分类下有商品，无法删除');
    }

    if (category._count.children > 0) {
      throw badRequest('该分类下有子分类，无法删除');
    }

    await prisma.category.delete({
      where: { id },
    });

    return { message: '删除成功' };
  },
};
