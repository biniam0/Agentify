/**
 * Workflow Routes
 * Phase 1: Foundation - Basic test endpoint for prompt parsing
 */

import express from 'express';
import { authenticate } from '../middlewares/auth';
import { requireAdmin } from '../middlewares/adminAuth';
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
 * Complete workflow flow: parse → find → execute
 */
router.post('/run-simple', authenticate, workflowController.runSimpleWorkflow);

export default router;
