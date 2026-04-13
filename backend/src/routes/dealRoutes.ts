/**
 * Deal Routes
 * 
 * Admin routes for managing deals and triggering info gathering calls
 */

import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { requireSuperAdmin } from '../middlewares/adminAuth';
import * as dealController from '../controllers/dealController';
import { config } from '../config/env';

const router = Router();

// All deal routes require authentication AND super-admin access
const adminProtected = config.admin.disableAdminGuard ? [authenticate] : [authenticate, requireSuperAdmin];

// Get all deals from BarrierX bulk API
router.get('/admin', adminProtected, dealController.getAdminDeals);

// Generate AI summary of filtered deals (must be before :dealId routes)
router.post('/admin/ai-summary', adminProtected, dealController.generateDealSummary);

// Trigger info gathering call for a specific deal
router.post('/admin/:dealId/trigger-info-call', adminProtected, dealController.triggerInfoGatheringCall);

export default router;
