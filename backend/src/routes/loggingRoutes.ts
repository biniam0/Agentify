/**
 * Logging Routes
 * 
 * Admin routes: Only tamiratkebede120@gmail.com can access ALL logs
 * User routes: Each authenticated user can access ONLY their own logs
 */

import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { requireAdmin } from '../middlewares/adminAuth';
import * as loggingController from '../controllers/loggingController';

const router = Router();

// All admin logging routes require authentication AND admin access
const adminProtected = [authenticate, requireAdmin];

// ============================================
// ADMIN ROUTES (UNCHANGED - ALL USERS' DATA)
// ============================================

// CALL LOGS
router.get('/calls', adminProtected, loggingController.getCallLogs);

// ACTIVITY LOGS
router.get('/activity', adminProtected, loggingController.getActivityLogs);

// ERROR LOGS
router.get('/errors', adminProtected, loggingController.getErrorLogs);

// WEBHOOK LOGS
router.get('/webhooks', adminProtected, loggingController.getWebhookLogs);

// SCHEDULER LOGS
router.get('/scheduler', adminProtected, loggingController.getSchedulerLogs);

// CRM ACTION LOGS
router.get('/crm-actions', adminProtected, loggingController.getCrmActionLogs);

// ANALYTICS
router.get('/analytics/calls', adminProtected, loggingController.getCallAnalytics);
router.get('/analytics/dashboard', adminProtected, loggingController.getDashboardStats);

// ============================================
// USER ROUTES (NEW - OWN DATA ONLY)
// ============================================

// User can view their own call logs
router.get('/user/calls', authenticate, loggingController.getUserCallLogs);

// User can view their own activity logs
router.get('/user/activity', authenticate, loggingController.getUserActivityLogs);

// User can view their own CRM action logs
router.get('/user/crm-actions', authenticate, loggingController.getUserCrmActionLogs);

export default router;

