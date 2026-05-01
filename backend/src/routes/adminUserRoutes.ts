import { Router } from 'express';

import { authenticate } from '../middlewares/auth';
import { requireSuperAdmin } from '../middlewares/adminAuth';
import * as adminUserController from '../controllers/adminUserController';

const router = Router();

// All routes here are SUPER_ADMIN only.
router.use(authenticate);
router.use(requireSuperAdmin);

router.get('/', adminUserController.listPlatformUsers);
router.patch('/:id/role', adminUserController.updateUserRole);

export default router;
