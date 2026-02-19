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
router.post('/parse-test', authenticateService, workflowController.testParsePrompt);

// ============================================
// PHASE 2-4: FULL WORKFLOW ENDPOINTS (Coming Soon)
// ============================================

// POST /api/workflows - Create workflow from NL prompt
// GET /api/workflows - List user's workflows
// GET /api/workflows/:id - Get workflow details
// POST /api/workflows/:id/approve - Approve workflow
// POST /api/workflows/:id/execute - Execute approved workflow
// GET /api/workflows/:id/executions - List workflow executions
// GET /api/workflows/executions/:executionId - Get execution details
// GET /api/workflows/suggested-tasks - List suggested tasks

export default router;
