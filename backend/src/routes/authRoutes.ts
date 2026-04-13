import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authenticate, authController.logout);

export default router;

