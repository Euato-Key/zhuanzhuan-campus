import { Router } from 'express';
import { RegionController } from './region.controller';

const router = Router();

// 获取所有省份
router.get('/provinces', RegionController.getProvinces);

// 获取某省的城市
router.get('/cities', RegionController.getCities);

// 获取某市的区县
router.get('/districts', RegionController.getDistricts);

export default router;