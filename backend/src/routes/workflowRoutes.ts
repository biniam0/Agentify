/**
 * Workflow Routes
 * Phase 1: Foundation - Basic test endpoint for prompt parsing
 */

import express from 'express';
import { authenticate } from '../middlewares/auth';
import { requireSuperAdmin } from '../middlewares/adminAuth';
import * as workflowController from '../controllers/workflowController';
import { authenticateService } from '../middlewares/serviceAuth';

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

/**
 * POST /api/workflows/:id/execute
 * Execute a workflow (start batch calls)
 */
router.post('/:id/execute', authenticate, workflowController.executeWorkflow);

// ============================================
// SIMPLIFIED MVP ENDPOINTS
// ============================================

/**
 * POST /api/workflows/parse-intent
 * Parse natural language prompt into simple intent
 */
router.post('/parse-intent', authenticate, workflowController.parseIntentEndpoint);

/**
 * POST /api/workflows/find-targets
 * Find targets based on intent criteria
 */
router.post('/find-targets', authenticate, workflowController.findTargetsEndpoint);

/**
 * POST /api/workflows/execute-simple
 * Execute simple workflow directly from intent
 */
router.post('/execute-simple', authenticate, workflowController.executeSimpleWorkflow);

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
