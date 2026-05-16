import { Request, Response } from 'express';
import { UniversityService, UniversityQuery } from './university.service';
import { success } from '../../utils/response';
import { asyncHandler } from '../../common/asyncHandler';
import { badRequest } from '../../common/errors';

export const UniversityController = {
  search: asyncHandler(async (req: Request, res: Response) => {
    const query: UniversityQuery = {
      keyword: req.query.keyword as string,
      province: req.query.province as string,
      level: req.query.level as UniversityQuery['level'],
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined,
    };
    const result = await UniversityService.search(query);
    return success(res, result);
  }),

  getProvinces: asyncHandler(async (_req: Request, res: Response) => {
    const provinces = await UniversityService.getProvinces();
    return success(res, provinces);
  }),

  getByProvince: asyncHandler(async (req: Request, res: Response) => {
    const province = req.query.province as string;
    if (!province) throw badRequest('请提供省份名称');
    const universities = await UniversityService.getByProvince(province);
    return success(res, universities);
  }),
};