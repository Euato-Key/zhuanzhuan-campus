import { Request, Response } from 'express';
import { AddressService, CreateAddressData, UpdateAddressData } from './address.service';
import { success } from '../../utils/response';
import { asyncHandler } from '../../common/asyncHandler';
import { ValidationUtil } from '../../common/validation';

function parseAddressId(req: Request): number {
  return ValidationUtil.parseIdParam(req.params.id, '地址ID');
}

export const AddressController = {
  getList: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const addresses = await AddressService.getList(userId);
    return success(res, addresses);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const addressId = parseAddressId(req);
    const address = await AddressService.getById(userId, addressId);
    return success(res, address);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const data: CreateAddressData = req.body;

    const address = await AddressService.create(userId, data);
    return success(res, address, '地址创建成功', 201);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const addressId = parseAddressId(req);
    const data: UpdateAddressData = req.body;

    const address = await AddressService.update(userId, addressId, data);
    return success(res, address, '地址更新成功');
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const addressId = parseAddressId(req);
    await AddressService.delete(userId, addressId);
    return success(res, null, '地址删除成功');
  }),

  setDefault: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.requireUserId(req);
    const addressId = parseAddressId(req);
    const address = await AddressService.setDefault(userId, addressId);
    return success(res, address, '已设置为默认地址');
  }),
};