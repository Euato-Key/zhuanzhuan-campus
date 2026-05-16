import { Router } from 'express';
import { UniversityController } from './university.controller';

const router = Router();

router.get('/search', UniversityController.search);
router.get('/provinces', UniversityController.getProvinces);
router.get('/list', UniversityController.getByProvince);

export default router;
