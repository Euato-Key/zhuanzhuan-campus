import { Request, Response } from 'express';
import { RegionService } from './region.service';
import { success, fail } from '../../utils/response';
import { asyncHandler } from '../../common/asyncHandler';

export const RegionController = {
  /**
   * 获取所有省份
   */
  getProvinces: asyncHandler(async (_req: Request, res: Response) => {
    const provinces = await RegionService.getProvinces();
    return success(res, provinces);
  }),

  /**
   * 获取某省的城市
   */
  getCities: asyncHandler(async (req: Request, res: Response) => {
    const { adcode } = req.query;
    if (!adcode || typeof adcode !== 'string') {
      return fail(res, '请提供省份adcode');
    }
    const cities = await RegionService.getCities(adcode);
    return success(res, cities);
  }),

  /**
   * 获取某市的区县
   */
  getDistricts: asyncHandler(async (req: Request, res: Response) => {
    const { adcode } = req.query;
    if (!adcode || typeof adcode !== 'string') {
      return fail(res, '请提供城市adcode');
    }
    const districts = await RegionService.getDistricts(adcode);
    return success(res, districts);
  }),
};