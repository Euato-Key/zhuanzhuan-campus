import { prisma } from '../../config/prisma';
import { Prisma } from '@prisma/client';
import { PaginationUtil } from '../../common/pagination';

export interface UniversityQuery {
  keyword?: string;
  province?: string;
  level?: '本科' | '专科';
  page?: number;
  pageSize?: number;
}

export const UniversityService = {
  async search(query: UniversityQuery) {
    const { keyword, province, level, page, pageSize } = query;
    const { skip, take, page: p, pageSize: ps } = PaginationUtil.getPagination({
      page,
      pageSize,
      maxPageSize: 50,
    });

    const where: Prisma.UniversityWhereInput = {};
    if (keyword) {
      where.name = { contains: keyword };
    }
    if (province) {
      where.province = province;
    }
    if (level) {
      where.level = level;
    }

    const [list, total] = await Promise.all([
      prisma.university.findMany({
        where,
        select: {
          id: true,
          name: true,
          code: true,
          province: true,
          city: true,
          level: true,
        },
        orderBy: [{ province: 'asc' }, { name: 'asc' }],
        skip,
        take,
      }),
      prisma.university.count({ where }),
    ]);

    return PaginationUtil.buildResponse(list, total, p, ps);
  },

  async getProvinces() {
    const result = await prisma.university.findMany({
      select: { province: true },
      distinct: ['province'],
      orderBy: { province: 'asc' },
    });
    return result.map((r) => r.province);
  },

  async getByProvince(province: string) {
    return prisma.university.findMany({
      where: { province },
      select: {
        id: true,
        name: true,
        code: true,
        city: true,
        level: true,
      },
      orderBy: [{ city: 'asc' }, { name: 'asc' }],
    });
  },
};
