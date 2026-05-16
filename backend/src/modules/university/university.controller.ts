import { Request, Response } from 'express';
import { UniversityService } from './university.service';
import { success, fail } from '../../utils/response';
import { asyncHandler } from '../../common/asyncHandler';

export const UniversityController = {
  search: asyncHandler(async (req: Request, res: Response) => {
    const { keyword, province, level, page, pageSize } = req.query;
    const result = await UniversityService.search({
      keyword: keyword as string | undefined,
      province: province as string | undefined,
      level: level as '本科' | '专科' | undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string, 10) : undefined,
    });
    return success(res, result);
  }),

  getProvinces: asyncHandler(async (_req: Request, res: Response) => {
    const provinces = await UniversityService.getProvinces();
    return success(res, provinces);
  }),

  getByProvince: asyncHandler(async (req: Request, res: Response) => {
    const { province } = req.query;
    if (!province || typeof province !== 'string') {
      return fail(res, '请提供省份参数');
    }
    const universities = await UniversityService.getByProvince(province);
    return success(res, universities);
  }),
};
