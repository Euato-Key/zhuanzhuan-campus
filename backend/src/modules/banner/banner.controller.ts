import { Request, Response } from 'express';
import { BannerService } from './banner.service';
import { success } from '../../utils/response';
import { asyncHandler } from '../../common/asyncHandler';
import { badRequest } from '../../common/errors';

export const BannerController = {
  getActiveBanners: asyncHandler(async (_req: Request, res: Response) => {
    const banners = await BannerService.getActiveBanners();
    return success(res, banners);
  }),

  getList: asyncHandler(async (req: Request, res: Response) => {
    const { page, pageSize, status } = req.query;
    const result = await BannerService.getList({
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 10,
      status: status as string | undefined,
    });
    return success(res, result);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const { title, imageUrl, linkUrl, sort, status, startTime, endTime } = req.body;
    if (!title || !imageUrl) {
      throw badRequest('标题和图片不能为空');
    }
    const banner = await BannerService.create({
      title,
      imageUrl,
      linkUrl,
      sort,
      status,
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
    });
    return success(res, banner, '创建成功');
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { title, imageUrl, linkUrl, sort, status, startTime, endTime } = req.body;
    const banner = await BannerService.update(id, {
      title,
      imageUrl,
      linkUrl,
      sort,
      status,
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
    });
    return success(res, banner, '更新成功');
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    await BannerService.delete(id);
    return success(res, null, '删除成功');
  }),

  toggleStatus: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const banner = await BannerService.toggleStatus(id);
    return success(res, banner, '状态已切换');
  }),
};