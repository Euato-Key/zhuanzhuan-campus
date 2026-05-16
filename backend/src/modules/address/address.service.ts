import { prisma } from '../../config/prisma';
import { badRequest, notFound, forbidden } from '../../common/errors';

export interface CreateAddressData {
  receiverName: string;
  receiverPhone: string;
  province: string;
  city: string;
  district: string;
  street?: string;
  detail: string;
  isDefault?: boolean;
}

export interface UpdateAddressData {
  receiverName?: string;
  receiverPhone?: string;
  province?: string;
  city?: string;
  district?: string;
  street?: string;
  detail?: string;
  isDefault?: boolean;
}

export const AddressService = {
  async getList(userId: number) {
    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: { isDefault: 'desc' },
    });
    return addresses;
  },

  async getById(userId: number, addressId: number) {
    const address = await prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address) {
      throw notFound('地址不存在');
    }

    if (address.userId !== userId) {
      throw forbidden('无权访问此地址');
    }

    return address;
  },

  async create(userId: number, data: CreateAddressData) {
    // 验证必填字段
    if (!data.receiverName || !data.receiverName.trim()) {
      throw badRequest('请填写收货人姓名');
    }
    if (!data.receiverPhone || !data.receiverPhone.trim()) {
      throw badRequest('请填写收货人手机号');
    }
    if (!data.province || !data.city || !data.district) {
      throw badRequest('请选择完整的地区信息');
    }
    if (!data.detail || !data.detail.trim()) {
      throw badRequest('请填写详细地址');
    }

    // 检查地址数量上限（最多20个）
    const count = await prisma.address.count({ where: { userId } });
    if (count >= 20) {
      throw badRequest('地址数量已达上限（最多20个）');
    }

    // 如果设置为默认地址，先取消其他默认地址
    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        userId,
        receiverName: data.receiverName.trim(),
        receiverPhone: data.receiverPhone.trim(),
        province: data.province,
        city: data.city,
        district: data.district,
        street: data.street,
        detail: data.detail.trim(),
        isDefault: data.isDefault ?? false,
      },
    });

    return address;
  },

  async update(userId: number, addressId: number, data: UpdateAddressData) {
    const address = await prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address) {
      throw notFound('地址不存在');
    }

    if (address.userId !== userId) {
      throw forbidden('无权修改此地址');
    }

    // 验证字段
    if (data.receiverName !== undefined && !data.receiverName.trim()) {
      throw badRequest('收货人姓名不能为空');
    }
    if (data.receiverPhone !== undefined && !data.receiverPhone.trim()) {
      throw badRequest('收货人手机号不能为空');
    }
    if (data.detail !== undefined && !data.detail.trim()) {
      throw badRequest('详细地址不能为空');
    }

    // 如果设置为默认地址，先取消其他默认地址
    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.address.update({
      where: { id: addressId },
      data: {
        receiverName: data.receiverName?.trim(),
        receiverPhone: data.receiverPhone?.trim(),
        province: data.province,
        city: data.city,
        district: data.district,
        street: data.street,
        detail: data.detail?.trim(),
        isDefault: data.isDefault,
      },
    });

    return updated;
  },

  async delete(userId: number, addressId: number) {
    const address = await prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address) {
      throw notFound('地址不存在');
    }

    if (address.userId !== userId) {
      throw forbidden('无权删除此地址');
    }

    await prisma.address.delete({
      where: { id: addressId },
    });

    return { message: '删除成功' };
  },

  async setDefault(userId: number, addressId: number) {
    const address = await prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address) {
      throw notFound('地址不存在');
    }

    if (address.userId !== userId) {
      throw forbidden('无权操作此地址');
    }

    // 取消其他默认地址
    await prisma.address.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    // 设置为默认
    const updated = await prisma.address.update({
      where: { id: addressId },
      data: { isDefault: true },
    });

    return updated;
  },
};