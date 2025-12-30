/**
 * External Logs API Routes
 * 
 * Phase 2: Individual log endpoints
 * Phase 3: Batch endpoint with time-based filtering
 */

import { Router } from 'express';
import { authenticateService, requireScope, ServiceAuthRequest } from '../middlewares/serviceAuth';
import * as externalLogsController from '../controllers/externalLogsController';
import { Response } from 'express';

const router = Router();

// ============================================
// TEST ENDPOINT
// ============================================

router.get(
  '/test',
  authenticateService,
  requireScope('logs:read'),
  (req: ServiceAuthRequest, res: Response) => {
    res.json({
      success: true,
      message: 'API key authentication working!',
      service: req.service?.name,
      scopes: req.service?.scopes,
      timestamp: new Date().toISOString()
    });
  }
);

// ============================================
// INDIVIDUAL USER LOG ENDPOINTS
// ============================================

// 1. Activity Logs
router.get(
  '/users/:userId/activity',
  authenticateService,
  requireScope('logs:read'),
  externalLogsController.getUserActivityLogs
);

// 2. Call Logs
router.get(
  '/users/:userId/calls',
  authenticateService,
  requireScope('logs:read'),
  externalLogsController.getUserCallLogs
);

// 3. CRM Action Logs
router.get(
  '/users/:userId/crm-actions',
  authenticateService,
  requireScope('logs:read'),
  externalLogsController.getUserCrmActionLogs
);

// 4. Webhook Logs
router.get(
  '/users/:userId/webhooks',
  authenticateService,
  requireScope('logs:read'),
  externalLogsController.getUserWebhookLogs
);

// 5. Scheduler Logs
router.get(
  '/users/:userId/scheduler',
  authenticateService,
  requireScope('logs:read'),
  externalLogsController.getUserSchedulerLogs
);

// 6. Error Logs
router.get(
  '/users/:userId/errors',
  authenticateService,
  requireScope('logs:read'),
  externalLogsController.getUserErrorLogs
);

// ============================================
// PHASE 3: BATCH ENDPOINT
// ============================================

// Batch: Get all logs for one user
router.get(
  '/users/:userId/all',
  authenticateService,
  requireScope('logs:read'),
  externalLogsController.getAllUserLogs
);

export default router;

