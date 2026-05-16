import { Request, Response } from 'express';
import { RegionService } from './region.service';
import { success } from '../../utils/response';
import { asyncHandler } from '../../common/asyncHandler';
import { badRequest } from '../../common/errors';

export const RegionController = {
  getProvinces: asyncHandler(async (_req: Request, res: Response) => {
    const provinces = await RegionService.getProvinces();
    return success(res, provinces);
  }),

  getCities: asyncHandler(async (req: Request, res: Response) => {
    const { adcode } = req.query;
    if (!adcode || typeof adcode !== 'string') throw badRequest('请提供省份adcode');
    const cities = await RegionService.getCities(adcode);
    return success(res, cities);
  }),

  getDistricts: asyncHandler(async (req: Request, res: Response) => {
    const { adcode } = req.query;
    if (!adcode || typeof adcode !== 'string') throw badRequest('请提供城市adcode');
    const districts = await RegionService.getDistricts(adcode);
    return success(res, districts);
  }),
};