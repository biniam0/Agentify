/**
 * Workflow Routes
 * Phase 1: Foundation - Basic test endpoint for prompt parsing
 */

import express from 'express';
import { authenticate } from '../middlewares/auth';
import * as workflowController from '../controllers/workflowController';

const router = express.Router();

// ============================================
// PHASE 1: TEST ENDPOINTS
// ============================================

/**
 * POST /api/workflows/parse-test
 * Test endpoint to parse NL prompt → workflow JSON
 * Admin only
 */
router.post('/parse-test', authenticate, workflowController.testParsePrompt);

// ============================================
// PHASE 2: WORKFLOW EXECUTION
// ============================================

/**
 * POST /api/workflows
 * Create a new workflow
 */
router.post('/', authenticate, workflowController.createWorkflow);

/**
 * POST /api/workflows/:id/preview
 * Preview audience for a workflow
 */
router.post('/:id/preview', authenticate, workflowController.previewWorkflow);

// ============================================
// SIMPLIFIED MVP ENDPOINTS
// ============================================

/**
 * POST /api/workflows/parse-intent
 * Parse natural language prompt into simple intent
 */
router.post('/parse-intent', authenticate, workflowController.parseIntentEndpoint);

/**
 * GET /api/workflows/tenant-deals
 * List the tenant's deals in a slim shape for the template-slot dropdowns.
 */
router.get('/tenant-deals', authenticate, workflowController.listTenantDeals);

/**
 * POST /api/workflows/find-targets
 * Find targets based on intent criteria
 */
router.post('/find-targets', authenticate, workflowController.findTargetsEndpoint);

/**
 * POST /api/workflows/run-simple
 * Complete workflow flow: parse → find → preview (NO AUTO-EXECUTION)
 */
router.post('/run-simple', authenticate, workflowController.runSimpleWorkflow);

/**
 * POST /api/workflows/approve-and-execute
 * Execute workflow after explicit user approval
 */
router.post('/approve-and-execute', authenticate, workflowController.approveAndExecuteWorkflow);

/**
 * GET /api/workflows/execution-status
 * Get the latest active workflow execution status
 */
router.get('/execution-status', authenticate, workflowController.getExecutionStatus);

/**
 * POST /api/workflows/execution/cancel-all
 * Cancel ALL running/pending workflow executions
 */
router.post('/execution/cancel-all', authenticate, workflowController.cancelAllExecutions);

/**
 * POST /api/workflows/execution/:id/cancel
 * Cancel a running workflow execution
 */
router.post('/execution/:id/cancel', authenticate, workflowController.cancelExecution);

export default router;
