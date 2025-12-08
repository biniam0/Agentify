/**
 * Logging Routes
 * 
 * All routes protected with admin authentication.
 * Only tamiratkebede120@gmail.com can access.
 */

import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { requireAdmin } from '../middlewares/adminAuth';
import * as loggingController from '../controllers/loggingController';

const router = Router();

// All logging routes require authentication AND admin access
const adminProtected = [authenticate, requireAdmin];

// ============================================
// CALL LOGS
// ============================================
router.get('/calls', adminProtected, loggingController.getCallLogs);

// ============================================
// ACTIVITY LOGS
// ============================================
router.get('/activity', adminProtected, loggingController.getActivityLogs);

// ============================================
// ERROR LOGS
// ============================================
router.get('/errors', adminProtected, loggingController.getErrorLogs);

// ============================================
// WEBHOOK LOGS
// ============================================
router.get('/webhooks', adminProtected, loggingController.getWebhookLogs);

// ============================================
// SCHEDULER LOGS
// ============================================
router.get('/scheduler', adminProtected, loggingController.getSchedulerLogs);

// ============================================
// CRM ACTION LOGS
// ============================================
router.get('/crm-actions', adminProtected, loggingController.getCrmActionLogs);

// ============================================
// ANALYTICS
// ============================================
router.get('/analytics/calls', adminProtected, loggingController.getCallAnalytics);
router.get('/analytics/dashboard', adminProtected, loggingController.getDashboardStats);

export default router;

