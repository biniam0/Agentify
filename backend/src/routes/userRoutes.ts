import { Router } from 'express';
import * as userController from '../controllers/userController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// Get current user info
router.get('/me', userController.getCurrentUser);

// Toggle automation enabled/disabled
router.patch('/toggle-enabled', userController.toggleEnabled);

export default router;

