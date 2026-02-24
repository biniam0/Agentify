/**
 * Workflow Controller
 * Phase 1: Foundation - Basic test controller for prompt parsing
 */

import { Request, Response } from 'express';
import { 
  parseIntent,
  validateIntent,
  generateIntentSummary 
} from '../services/llm/promptParserService';
import * as loggingService from '../services/loggingService';
import * as workflowService from '../services/workflowService';
import { previewTargets } from '../services/targetFinderService';
import { AuthRequest } from '../middlewares/auth';
import { getCachedUser } from '../utils/userCache';
import prisma from '../config/database';
import { WorkflowConfig } from '../types/workflow';

// Define a custom request interface that supports both User (JWT) and Service (API Key) auth
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    name?: string;
  };
  service?: {
    id: string;
    name: string;
  };
}

// ============================================
// PHASE 1: TEST ENDPOINTS
// ============================================

/**
 * Test endpoint to parse natural language prompt
 * POST /api/workflows/parse-test
 */
export const testParsePrompt = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { prompt } = req.body;
    
    // Handle both User (JWT) and Service (API Key) authentication
    let userId = req.user?.userId;
    let userEmail = req.user?.email;
    let userName = 'Unknown User';

    // If service authenticated (no user), use a system/admin fallback or the service name
    if (!userId && req.service) {
      // For testing purposes, we'll use a placeholder ID or fetch the admin user
      // In a real app, service actions might be logged differently
      userId = 'service-account'; 
      userName = `Service: ${req.service.name}`;
      userEmail = 'service@agentx.ai';
    }

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        ok: false,
        error: 'Prompt is required and must be a string',
      });
    }

    // Only fetch DB user if we have a real user ID (not the service placeholder)
    if (userId && userId !== 'service-account') {
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

    // Step 1: Parse prompt using new simplified system
    const intent = await parseIntent(prompt);

    // Step 2: Validate intent
    const validation = validateIntent(intent);

    // Step 3: Generate summary
    const summary = generateIntentSummary(intent);

    const duration = Date.now() - startTime;

    console.log(`✅ TEST: Parsing complete in ${duration}ms`);
    console.log(`   Valid: ${validation.valid}`);
    console.log(`   Errors: ${validation.errors.length}`);
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
        intentAction: intent.action,
        duration,
      },
    });

    return res.json({
      ok: true,
      intent,
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
// PHASE 2: WORKFLOW MANAGEMENT
// ============================================

/**
 * Create a new workflow
 * POST /api/workflows
 */
export const createWorkflow = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Handle both User (JWT) and Service (API Key) authentication
    let userId = req.user?.userId;
    let userName = 'Unknown User';
    let userEmail = req.user?.email || 'unknown';

    // If service authenticated (no user), use a system/admin fallback
    if (!userId && req.service) {
      userId = 'service-account-id'; // Placeholder or fetch a specific system user
      userName = `Service: ${req.service.name}`;
      userEmail = 'service@agentx.ai';
    }

    const { name, description, nlPrompt, workflowConfig } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!name || !workflowConfig) {
      return res.status(400).json({ error: 'Name and workflowConfig are required' });
    }

    // Get user details for the record if it's a real user
    if (userId !== 'service-account-id') {
      const dbUser = await getCachedUser(userId, { name: true, email: true });
      if (dbUser) {
        userName = dbUser.name;
        userEmail = dbUser.email;
      }
    }

    const workflow = await prisma.workflow.create({
      data: {
        name,
        description,
        nlPrompt: nlPrompt || '',
        workflowConfig,
        createdBy: userId,
        createdByName: userName,
        createdByEmail: userEmail,
        status: 'DRAFT',
      },
    });

    // Log activity
    await loggingService.logActivity({
      activityType: 'DATA_FETCH', // Using existing enum, ideally add WORKFLOW_CREATED
      status: 'SUCCESS',
      userId,
      userName,
      userEmail,
      metadata: {
        action: 'create_workflow',
        workflowId: workflow.id,
        name: workflow.name,
      },
    });

    return res.json({
      ok: true,
      workflow,
    });
  } catch (error: any) {
    console.error('❌ Create workflow error:', error.message);
    return res.status(500).json({ error: 'Failed to create workflow' });
  }
};

/**
 * Preview audience for a workflow
 * POST /api/workflows/:id/preview
 */
export const previewWorkflow = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Handle both User (JWT) and Service (API Key) authentication
    let userId = req.user?.userId;
    if (!userId && req.service) {
      userId = 'service-account-id'; 
    }

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Fetch workflow
    const workflow = await prisma.workflow.findUnique({
      where: { id },
    });

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const config = workflow.workflowConfig as any as WorkflowConfig;

    // Resolve audience
    // Note: For service account, we might need a way to specify WHICH user's data to access
    // For now, we'll assume the service account has access to everything or pass a specific user ID in body if needed
    // But resolveAudience signature expects a userId. 
    // If it's a service account, we might need to fetch ALL deals or a specific subset.
    // For this test, let's pass the service ID, but resolveAudience might return nothing if it filters by ownerId=userId
    // actually resolveAudience fetches ALL deals (wildcard) then filters. 
    // It doesn't strictly filter by userId unless we tell it to.
    
    // TODO: Implement preview for old workflow system if needed
    const targets: any[] = [];

    return res.json({
      ok: true,
      workflowId: id,
      targetCount: targets.length,
      targets: targets.slice(0, 10), // Return first 10 for preview
      totalEstimated: targets.length,
    });

  } catch (error: any) {
    console.error('❌ Preview workflow error:', error.message);
    return res.status(500).json({ error: 'Failed to preview workflow' });
  }
};

/**
 * Execute a workflow (start batch calls)
 * POST /api/workflows/:id/execute
 */
export const executeWorkflow = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Handle both User (JWT) and Service (API Key) authentication
    let userId = req.user?.userId;
    if (!userId && req.service) {
      userId = 'service-account-id'; 
    }

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log(`🚀 Executing workflow ${id} for user ${userId}`);

    // TODO: Implement execution for old workflow system if needed
    const result = { success: false, error: 'Old workflow system not implemented' };

    if (!result.success) {
      return res.status(500).json({
        ok: false,
        error: result.error || 'Failed to execute workflow',
      });
    }

    return res.json({
      ok: true,
      message: 'Old workflow system not implemented',
    });

  } catch (error: any) {
    console.error('❌ Execute workflow error:', error.message);
    return res.status(500).json({ error: 'Failed to execute workflow' });
  }
};

// ============================================
// SIMPLIFIED MVP ENDPOINTS
// ============================================

/**
 * Parse natural language prompt into simple intent
 * POST /api/workflows/parse-intent
 */
export const parseIntentEndpoint = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required and must be a string' });
    }

    console.log(`🤖 Parsing intent for prompt: "${prompt.substring(0, 100)}..."`);

    // Parse intent using LLM
    const intent = await parseIntent(prompt);

    // Validate intent
    const validation = validateIntent(intent);
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Invalid intent parsed',
        details: validation.errors 
      });
    }

    // Generate summary
    const summary = generateIntentSummary(intent);

    return res.json({
      ok: true,
      intent,
      summary,
      message: 'Intent parsed successfully',
    });

  } catch (error: any) {
    console.error('❌ Parse intent error:', error.message);
    return res.status(500).json({ error: 'Failed to parse intent' });
  }
};

/**
 * Find targets based on intent criteria
 * POST /api/workflows/find-targets
 */
export const findTargetsEndpoint = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { intent } = req.body;

    if (!intent) {
      return res.status(400).json({ error: 'Intent is required' });
    }

    console.log(`🎯 Finding targets for intent: ${intent.action}`);

    // Get target preview
    const preview = await previewTargets(intent);

    return res.json({
      ok: true,
      targets: {
        count: preview.count,
        sample: preview.sample,
        summary: preview.summary,
      },
      message: `Found ${preview.count} target${preview.count === 1 ? '' : 's'}`,
    });

  } catch (error: any) {
    console.error('❌ Find targets error:', error.message);
    return res.status(500).json({ error: 'Failed to find targets' });
  }
};

/**
 * Execute simple workflow directly from intent
 * POST /api/workflows/execute-simple
 */
export const executeSimpleWorkflow = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { intent, workflowName } = req.body;

    if (!intent) {
      return res.status(400).json({ error: 'Intent is required' });
    }

    // Get user ID
    let userId = req.user?.userId;
    if (!userId && req.service) {
      userId = 'service-account';
    }

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log(`🚀 Executing simple workflow: ${intent.action}`);

    // Execute workflow
    const result = await workflowService.executeSimpleWorkflow(intent, userId, workflowName);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({
      ok: true,
      executionId: result.executionId,
      batchId: result.batchId,
      message: 'Simple workflow execution started successfully',
    });

  } catch (error: any) {
    console.error('❌ Execute simple workflow error:', error.message);
    return res.status(500).json({ error: 'Failed to execute simple workflow' });
  }
};

/**
 * Complete workflow flow: parse → find → execute
 * POST /api/workflows/run-simple
 */
export const runSimpleWorkflow = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { prompt, workflowName } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required and must be a string' });
    }

    // Get user ID
    let userId = req.user?.userId;
    if (!userId && req.service) {
      userId = 'service-account';
    }

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log(`🔄 Running complete simple workflow for: "${prompt.substring(0, 100)}..."`);

    // Step 1: Parse intent
    const intent = await parseIntent(prompt);
    const validation = validateIntent(intent);
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Invalid intent parsed',
        details: validation.errors 
      });
    }

    // Step 2: Find targets
    const preview = await previewTargets(intent);
    if (preview.count === 0) {
      return res.status(400).json({ 
        error: 'No targets found matching the criteria',
        intent,
        summary: generateIntentSummary(intent),
      });
    }

    // Step 3: Return preview for approval (DO NOT AUTO-EXECUTE)
    return res.json({
      ok: true,
      intent,
      intentSummary: generateIntentSummary(intent),
      targets: {
        count: preview.count,
        sample: preview.sample,
        summary: preview.summary,
      },
      requiresApproval: true,
      estimatedCost: calculateEstimatedCost(preview.count),
      message: `Found ${preview.count} target${preview.count === 1 ? '' : 's'} - approval required before execution`,
    });

  } catch (error: any) {
    console.error('❌ Run simple workflow error:', error.message);
    return res.status(500).json({ error: 'Failed to run simple workflow' });
  }
};

/**
 * Execute workflow after explicit approval
 * POST /api/workflows/approve-and-execute
 */
export const approveAndExecuteWorkflow = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { intent, workflowName, userConfirmation, estimatedCost } = req.body;

    if (!intent) {
      return res.status(400).json({ error: 'Intent is required' });
    }

    if (!userConfirmation) {
      return res.status(400).json({ error: 'User confirmation is required for execution' });
    }

    // Get user ID
    let userId = req.user?.userId;
    if (!userId && req.service) {
      userId = 'service-account';
    }

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log(`🔒 Executing approved workflow: ${intent.action} (User: ${userId})`);

    // Safety checks before execution
    const preview = await previewTargets(intent);
    
    // Check target limits (safety threshold)
    if (preview.count > 50) {
      return res.status(400).json({ 
        error: 'Target count exceeds safety limit (50). Please contact admin for large batch approvals.',
        targetCount: preview.count,
        limit: 50
      });
    }

    if (preview.count === 0) {
      return res.status(400).json({ 
        error: 'No targets found. Please review your criteria.',
      });
    }

    // Execute the workflow
    const result = await workflowService.executeSimpleWorkflow(intent, userId, workflowName);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Log the approval and execution for audit
    console.log(`✅ Workflow approved and executed:`, {
      userId,
      intent: intent.action,
      targetCount: preview.count,
      executionId: result.executionId,
      batchId: result.batchId,
      estimatedCost,
      timestamp: new Date().toISOString()
    });

    return res.json({
      ok: true,
      execution: {
        id: result.executionId,
        batchId: result.batchId,
      },
      targets: {
        count: preview.count,
        summary: preview.summary,
      },
      message: `Workflow approved and executed successfully for ${preview.count} target${preview.count === 1 ? '' : 's'}`,
    });

  } catch (error: any) {
    console.error('❌ Approve and execute workflow error:', error.message);
    return res.status(500).json({ error: 'Failed to execute approved workflow' });
  }
};

/**
 * Calculate estimated cost for workflow execution
 */
const calculateEstimatedCost = (targetCount: number): { 
  estimatedCalls: number; 
  estimatedCostUSD: number; 
  estimatedDuration: number; 
} => {
  // ElevenLabs pricing: approximately $0.30 per minute of conversation
  // Average call duration: 2-3 minutes
  const avgCallDurationMinutes = 2.5;
  const costPerMinute = 0.30;
  
  return {
    estimatedCalls: targetCount,
    estimatedCostUSD: Math.round(targetCount * avgCallDurationMinutes * costPerMinute * 100) / 100,
    estimatedDuration: Math.round(targetCount * avgCallDurationMinutes), // Total minutes
  };
};
