import { prisma } from '../../config/prisma';
import { PaginationUtil } from '../../common/pagination';
import { notFound } from '../../common/errors';

export interface CreateBannerData {
  title: string;
  imageUrl: string;
  linkUrl?: string;
  sort?: number;
  status?: string;
  startTime?: Date;
  endTime?: Date;
}

export interface UpdateBannerData extends Partial<CreateBannerData> {}

export interface BannerQuery {
  page?: number;
  pageSize?: number;
  status?: string;
}

const BANNER_SELECT = {
  id: true,
  title: true,
  imageUrl: true,
  linkUrl: true,
  sort: true,
  status: true,
  startTime: true,
  endTime: true,
  createdAt: true,
  updatedAt: true,
};

export class BannerService {
  static async getActiveBanners() {
    const now = new Date();
    return prisma.banner.findMany({
      where: {
        status: 'active',
        OR: [
          { startTime: null, endTime: null },
          { startTime: { lte: now }, endTime: null },
          { startTime: null, endTime: { gte: now } },
          { startTime: { lte: now }, endTime: { gte: now } },
        ],
      },
      orderBy: { sort: 'asc' },
      select: BANNER_SELECT,
    });
  }

  static async getList(query: BannerQuery) {
    const { skip, take, page, pageSize } = PaginationUtil.getPagination({
      page: query.page,
      pageSize: query.pageSize,
    });

    const where: any = {};
    if (query.status) where.status = query.status;

    const [total, list] = await Promise.all([
      prisma.banner.count({ where }),
      prisma.banner.findMany({
        where,
        skip,
        take,
        orderBy: { sort: 'asc' },
        select: BANNER_SELECT,
      }),
    ]);

    return PaginationUtil.buildResponse(list, total, page, pageSize);
  }

  static async create(data: CreateBannerData) {
    return prisma.banner.create({
      data: {
        title: data.title,
        imageUrl: data.imageUrl,
        linkUrl: data.linkUrl || null,
        sort: data.sort ?? 1,
        status: data.status || 'active',
        startTime: data.startTime || null,
        endTime: data.endTime || null,
      },
      select: BANNER_SELECT,
    });
  }

  static async update(id: number, data: UpdateBannerData) {
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.linkUrl !== undefined) updateData.linkUrl = data.linkUrl;
    if (data.sort !== undefined) updateData.sort = data.sort;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.startTime !== undefined) updateData.startTime = data.startTime;
    if (data.endTime !== undefined) updateData.endTime = data.endTime;

    return prisma.banner.update({
      where: { id },
      data: updateData,
      select: BANNER_SELECT,
    });
  }

  static async delete(id: number) {
    return prisma.banner.delete({ where: { id } });
  }

  static async toggleStatus(id: number) {
    const banner = await prisma.banner.findUnique({ where: { id } });
    if (!banner) throw notFound('轮播图不存在');
    return prisma.banner.update({
      where: { id },
      data: { status: banner.status === 'active' ? 'inactive' : 'active' },
      select: BANNER_SELECT,
    });
  }
}
