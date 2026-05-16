import { Router } from 'express';
import { AddressController } from './address.controller';
import { authMiddleware } from '../../middlewares/auth';

const router = Router();

// 所有地址路由都需要登录
router.use(authMiddleware);

// 地址列表
router.get('/', AddressController.getList);

// 地址详情
router.get('/:id', AddressController.getById);

// 创建地址
router.post('/', AddressController.create);

// 更新地址
router.put('/:id', AddressController.update);

// 删除地址
router.delete('/:id', AddressController.delete);

// 设为默认地址
router.put('/:id/default', AddressController.setDefault);

export default router;