/**
 * Workflow Controller
 * Phase 1: Foundation - Basic test controller for prompt parsing
 */

import { Request, Response } from 'express';
import { parseWorkflowPrompt, validateWorkflowConfig, generateWorkflowSummary } from '../services/llm/promptParserService';
import * as loggingService from '../services/loggingService';
import { AuthRequest } from '../middlewares/auth';
import { getCachedUser } from '../utils/userCache';

// ============================================
// PHASE 1: TEST ENDPOINTS
// ============================================

/**
 * Test endpoint to parse natural language prompt
 * POST /api/workflows/parse-test
 */
export const testParsePrompt = async (req: AuthRequest, res: Response) => {
  try {
    const { prompt } = req.body;
    const userId = req.user?.userId;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        ok: false,
        error: 'Prompt is required and must be a string',
      });
    }

    // Fetch user details for logging
    let userName = 'Unknown User';
    let userEmail = req.user?.email;

    if (userId) {
      const dbUser = await getCachedUser(userId, { name: true, email: true });
      if (dbUser) {
        userName = dbUser.name;
        userEmail = dbUser.email;
      }
    }

    console.log('🧪 TEST: Parsing workflow prompt...');
    console.log(`   User: ${userEmail}`);
    console.log(`   Prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`);

    const startTime = Date.now();

    // Step 1: Parse prompt
    const workflowConfig = await parseWorkflowPrompt(prompt);

    // Step 2: Validate config
    const validation = validateWorkflowConfig(workflowConfig);

    // Step 3: Generate summary
    const summary = generateWorkflowSummary(workflowConfig);

    const duration = Date.now() - startTime;

    console.log(`✅ TEST: Parsing complete in ${duration}ms`);
    console.log(`   Valid: ${validation.valid}`);
    console.log(`   Warnings: ${validation.warnings.length}`);
    console.log(`   Summary: ${summary}`);

    // Log activity
    await loggingService.logActivity({
      activityType: 'DATA_FETCH', // Reusing existing enum
      status: 'SUCCESS',
      userId: userId,
      userName: userName,
      userEmail: userEmail,
      metadata: {
        testType: 'workflow_parse',
        promptLength: prompt.length,
        audienceType: workflowConfig.audienceQuery.type,
        duration,
      },
    });

    return res.json({
      ok: true,
      workflowConfig,
      validation,
      summary,
      meta: {
        duration,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('❌ TEST: Parse prompt error:', error.message);

    // Log error
    await loggingService.logError({
      errorType: 'API_ERROR',
      severity: 'MEDIUM',
      source: 'workflowController.testParsePrompt',
      message: error.message || 'Failed to parse workflow prompt',
      stack: error.stack,
      userId: req.user?.userId,
      userEmail: req.user?.email,
    });

    return res.status(500).json({
      ok: false,
      error: error.message || 'Failed to parse workflow prompt',
    });
  }
};

// ============================================
// PHASE 2-4: FULL WORKFLOW CONTROLLERS (Coming Soon)
// ============================================

// export const createWorkflow = async (req: Request, res: Response) => { ... }
// export const listWorkflows = async (req: Request, res: Response) => { ... }
// export const getWorkflow = async (req: Request, res: Response) => { ... }
// export const approveWorkflow = async (req: Request, res: Response) => { ... }
// export const executeWorkflow = async (req: Request, res: Response) => { ... }
// export const listExecutions = async (req: Request, res: Response) => { ... }
// export const getExecution = async (req: Request, res: Response) => { ... }
// export const listSuggestedTasks = async (req: Request, res: Response) => { ... }
