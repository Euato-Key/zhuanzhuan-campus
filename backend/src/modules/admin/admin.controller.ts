import { Request, Response } from 'express';
import { success } from '../../utils/response';
import { AdminService } from './admin.service';
import { asyncHandler } from '../../common/asyncHandler';

export const AdminController = {
  getDashboard: asyncHandler(async (_req: Request, res: Response) => {
    const stats = await AdminService.getDashboardStats();
    return success(res, stats);
  }),
};
