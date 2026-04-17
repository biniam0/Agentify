/**
 * Deal Routes
 * 
 * Admin routes for managing deals and triggering info gathering calls
 */

import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { requireAdmin } from '../middlewares/adminAuth';
import * as dealController from '../controllers/dealController';
import { config } from '../config/env';

const router = Router();

// All deal routes require authentication AND admin access (ADMIN or SUPER_ADMIN)
const adminProtected = config.admin.disableAdminGuard ? [authenticate] : [authenticate, requireAdmin];

// Get all deals from BarrierX bulk API
router.get('/admin', adminProtected, dealController.getAdminDeals);

// Get deals for the authenticated user's tenant (V2 dashboard)
router.get('/tenant', adminProtected, dealController.getTenantDeals);

// Generate AI summary of filtered deals (must be before :dealId routes)
router.post('/admin/ai-summary', adminProtected, dealController.generateDealSummary);

// Trigger info gathering call for a specific deal
router.post('/admin/:dealId/trigger-info-call', adminProtected, dealController.triggerInfoGatheringCall);

export default router;
