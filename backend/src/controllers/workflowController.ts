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
import { getCachedUser } from '../utils/userCache';
import prisma from '../config/database';
import { WorkflowConfig } from '../types/workflow';
import { SimpleIntent } from '../services/llm/promptParserService';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate smart suggestions based on search criteria that found no targets
 */
const generateSmartSuggestions = (intent: SimpleIntent): string[] => {
  const suggestions: string[] = [];
  const { target_criteria } = intent;
  
  // Suggestions based on what was searched for
  if (target_criteria.deal_name) {
    const dealNames = Array.isArray(target_criteria.deal_name) 
      ? target_criteria.deal_name 
      : [target_criteria.deal_name];
    
    dealNames.forEach(dealName => {
      if (dealName.includes(',')) {
        suggestions.push(`Try searching without the comma: "${dealName.split(',')[0].trim()}"`);
      }
      if (dealName.split(' ').length > 2) {
        suggestions.push(`Try a shorter deal name: "${dealName.split(' ').slice(0, 2).join(' ')}"`);
      }
    });
    suggestions.push('Check if the deal names are spelled correctly');
  }
  
  if (target_criteria.contact_name) {
    const contactNames = Array.isArray(target_criteria.contact_name) 
      ? target_criteria.contact_name 
      : [target_criteria.contact_name];
    
    contactNames.forEach(contactName => {
      suggestions.push(`Verify that "${contactName}" exists in the system`);
    });
    suggestions.push('Try searching by first name only');
  }
  
  if (target_criteria.deal_stage) {
    suggestions.push(`Try removing the "${target_criteria.deal_stage}" stage filter`);
    suggestions.push('Check if the deal is in a different stage than expected');
  }
  
  if (target_criteria.company) {
    const companies = Array.isArray(target_criteria.company) 
      ? target_criteria.company 
      : [target_criteria.company];
    
    companies.forEach(company => {
      suggestions.push(`Try a shorter company name: "${company.split(' ')[0]}"`);
    });
  }
  
  // General suggestions
  suggestions.push('Check if the deal exists in a different tenant');
  suggestions.push('Verify the deal hasn\'t been archived or deleted');
  suggestions.push('Try broadening your search criteria');
  
  return suggestions.slice(0, 5); // Limit to 5 suggestions
};

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    name?: string;
    tenantSlug?: string;
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

    const tenantSlug = (req.body?.tenantSlug || req.user?.tenantSlug) as string | undefined;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'tenantSlug is required' });
    }

    console.log(`🎯 Finding targets for intent: ${intent.action} (tenant: ${tenantSlug})`);

    const preview = await previewTargets(intent, tenantSlug);

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
 * Complete workflow flow: parse → find → execute
 * POST /api/workflows/run-simple
 */
export const runSimpleWorkflow = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { prompt, workflowName } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required and must be a string' });
    }

    let userId = req.user?.userId;
    if (!userId && req.service) {
      userId = 'service-account';
    }

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const tenantSlug = (req.body?.tenantSlug || req.user?.tenantSlug) as string | undefined;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'tenantSlug is required' });
    }

    console.log(`🔄 Running complete simple workflow for: "${prompt.substring(0, 100)}..." (tenant: ${tenantSlug})`);

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
    const preview = await previewTargets(intent, tenantSlug);

    // Distinguish between "no deal matched" and "deals matched but unreachable"
    if (preview.count === 0 && preview.matchedDealCount > 0) {
      return res.json({
        ok: true,
        intent,
        intentSummary: generateIntentSummary(intent),
        targets: {
          count: 0,
          sample: [],
          summary: `Matched ${preview.matchedDealCount} deal${preview.matchedDealCount === 1 ? '' : 's'} but none are reachable.`,
        },
        noTargetsFound: true,
        unreachable: preview.unreachable,
        matchedDealCount: preview.matchedDealCount,
        message: `Matched ${preview.matchedDealCount} deal${preview.matchedDealCount === 1 ? '' : 's'}, but the owner${preview.matchedDealCount === 1 ? ' has' : 's have'} no phone number registered in BarrierX, so the call cannot be placed.`,
        suggestions: [
          'Add a phone number to the deal owner in HubSpot/BarrierX',
          'Verify that BarrierX has synced the latest owner contact details',
        ],
        requiresApproval: false,
      });
    }

    if (preview.count === 0) {
      return res.json({
        ok: true,
        intent,
        intentSummary: generateIntentSummary(intent),
        targets: {
          count: 0,
          sample: [],
          summary: preview.summary,
        },
        noTargetsFound: true,
        suggestions: generateSmartSuggestions(intent),
        requiresApproval: false,
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
      unreachable: preview.unreachable,
      matchedDealCount: preview.matchedDealCount,
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

    let userId = req.user?.userId;
    if (!userId && req.service) {
      userId = 'service-account';
    }

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const tenantSlug = (req.body?.tenantSlug || req.user?.tenantSlug) as string | undefined;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'tenantSlug is required' });
    }

    console.log(`🔒 Executing approved workflow: ${intent.action} (User: ${userId}, tenant: ${tenantSlug})`);

    // Safety checks before execution
    const preview = await previewTargets(intent, tenantSlug);
    
    // Check target limits (safety threshold)
    if (preview.count > 50) {
      return res.status(400).json({ 
        error: 'Target count exceeds safety limit (50). Please contact admin for large batch approvals.',
        targetCount: preview.count,
        limit: 50
      });
    }

    if (preview.count === 0 && preview.matchedDealCount > 0) {
      return res.json({
        ok: true,
        intent,
        intentSummary: generateIntentSummary(intent),
        targets: {
          count: 0,
          sample: [],
          summary: `Matched ${preview.matchedDealCount} deal${preview.matchedDealCount === 1 ? '' : 's'} but none are reachable.`,
        },
        noTargetsFound: true,
        unreachable: preview.unreachable,
        matchedDealCount: preview.matchedDealCount,
        message: `Matched ${preview.matchedDealCount} deal${preview.matchedDealCount === 1 ? '' : 's'}, but the owner${preview.matchedDealCount === 1 ? ' has' : 's have'} no phone number registered in BarrierX, so the call cannot be placed.`,
        suggestions: [
          'Add a phone number to the deal owner in HubSpot/BarrierX',
          'Verify that BarrierX has synced the latest owner contact details',
        ],
      });
    }

    if (preview.count === 0) {
      return res.json({
        ok: true,
        intent,
        intentSummary: generateIntentSummary(intent),
        targets: {
          count: 0,
          sample: [],
          summary: preview.summary,
        },
        noTargetsFound: true,
        suggestions: generateSmartSuggestions(intent),
        message: 'No targets found matching your criteria',
      });
    }

    // Resolve requester display name (for the script's {{requester_name}})
    let triggeredByName: string | undefined = req.user?.name;
    if (!triggeredByName && userId !== 'service-account') {
      const dbUser = await getCachedUser(userId, { name: true });
      triggeredByName = dbUser?.name;
    }
    if (!triggeredByName && req.service) {
      triggeredByName = `Service: ${req.service.name}`;
    }

    const result = await workflowService.startWorkflowExecution({
      intent,
      userId,
      triggeredByName,
      tenantSlug,
      workflowName,
    });

    if (!result.success) {
      const statusCode = result.warning ? 409 : 400;
      return res.status(statusCode).json({
        error: result.error,
        warning: result.warning || false,
      });
    }

    // Log the approval and execution for audit
    console.log(`✅ Workflow approved and started:`, {
      userId,
      intent: intent.action,
      targetCount: preview.count,
      executionId: result.executionId,
      estimatedCost,
      timestamp: new Date().toISOString(),
    });

    return res.json({
      ok: true,
      execution: {
        id: result.executionId,
      },
      targets: {
        count: preview.count,
        summary: preview.summary,
      },
      message: `Workflow approved — engine started for ${preview.count} target${preview.count === 1 ? '' : 's'} (calls placed in batches of ${workflowService.getWorkflowConfig().batchSize})`,
    });

  } catch (error: any) {
    console.error('❌ Approve and execute workflow error:', error.message);
    return res.status(500).json({ error: 'Failed to execute approved workflow' });
  }
};

/**
 * Get the latest active workflow execution status
 * GET /api/workflows/execution-status
 *
 * Merges DB state (`WorkflowExecution` + outcome counts) with the live
 * in-memory engine state (currentBatch, recentLogs, per-target status).
 */
export const getExecutionStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    let userId = req.user?.userId;
    if (!userId && req.service) userId = 'service-account';
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const execution = await prisma.workflowExecution.findFirst({
      where: {
        status: { in: ['PENDING', 'RUNNING'] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        workflow: { select: { name: true, nlPrompt: true, workflowConfig: true } },
      },
    });

    if (!execution) {
      return res.json({ active: false });
    }

    const outcomes = await prisma.workflowCallOutcome.groupBy({
      by: ['status'],
      where: { executionId: execution.id },
      _count: { status: true },
    });

    const outcomeMap: Record<string, number> = {};
    outcomes.forEach((o) => { outcomeMap[o.status] = o._count.status; });

    const liveState = workflowService.getWorkflowJobState(execution.id);

    return res.json({
      active: true,
      execution: {
        id: execution.id,
        workflowId: execution.workflowId,
        workflowName: execution.workflow.name,
        prompt: execution.workflow.nlPrompt,
        status: execution.status,
        totalTargets: execution.totalTargets,
        callsInitiated: outcomeMap['INITIATED'] || 0,
        callsCompleted: (outcomeMap['COMPLETED'] || 0) + (outcomeMap['ANSWERED'] || 0),
        callsFailed: (outcomeMap['FAILED'] || 0) + (outcomeMap['NO_ANSWER'] || 0) + (outcomeMap['BUSY'] || 0),
        callsCancelled: outcomeMap['CANCELLED'] || 0,
        startedAt: execution.startedAt,
        createdAt: execution.createdAt,

        // Live engine state (may be null if server restarted or job GC'd)
        live: liveState
          ? {
              isRunning: liveState.isRunning,
              currentBatch: liveState.currentBatch,
              totalBatches: liveState.totalBatches,
              processedTargets: liveState.processedTargets,
              successfulCalls: liveState.successfulCalls,
              failedCalls: liveState.failedCalls,
              skippedTargets: liveState.skippedTargets,
              cancelledTargets: liveState.cancelledTargets,
              currentTargets: liveState.currentTargets,
              recentLogs: liveState.recentLogs,
              lastError: liveState.lastError,
            }
          : null,
      },
    });
  } catch (error: any) {
    console.error('❌ Get execution status error:', error.message);
    return res.status(500).json({ error: 'Failed to get execution status' });
  }
};

/**
 * Cancel a running workflow execution
 * POST /api/workflows/execution/:id/cancel
 *
 * Flips the engine's `shouldStop` flag so the loop exits between batches.
 * Remaining PENDING/INITIATED outcomes are marked CANCELLED by the engine
 * itself when it unwinds. In-flight calls continue — we don't terminate
 * ElevenLabs conversations mid-call.
 *
 * Fallback: if the execution exists in DB but not in the live Map (e.g. the
 * server was restarted mid-run), we still mark the DB row CANCELLED so it
 * no longer shows up as active.
 */
export const cancelExecution = async (req: AuthenticatedRequest, res: Response) => {
  try {
    let userId = req.user?.userId;
    if (!userId && req.service) userId = 'service-account';
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { id } = req.params;

    const execution = await prisma.workflowExecution.findUnique({ where: { id } });
    if (!execution) return res.status(404).json({ error: 'Execution not found' });
    if (execution.status !== 'RUNNING' && execution.status !== 'PENDING') {
      return res.status(400).json({ error: `Execution is already ${execution.status}` });
    }

    const liveCancelled = workflowService.requestCancel(id);

    if (!liveCancelled) {
      // No live engine — likely orphaned from a restart. Clean up directly.
      await prisma.workflowExecution.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          completedAt: new Date(),
          errorMessage: `Cancelled by user ${userId} (no live engine)`,
        },
      });
      await prisma.workflowCallOutcome.updateMany({
        where: {
          executionId: id,
          status: { notIn: ['COMPLETED', 'FAILED', 'NO_ANSWER', 'BUSY', 'CANCELLED'] },
        },
        data: { status: 'CANCELLED' },
      });
    }

    console.log(`⛔ Workflow execution ${id} cancel requested by ${userId} (live=${liveCancelled})`);

    return res.json({
      ok: true,
      message: liveCancelled
        ? 'Cancel requested — engine will stop between batches, remaining calls will be marked CANCELLED'
        : 'Execution cancelled (no live engine; marked directly)',
    });
  } catch (error: any) {
    console.error('❌ Cancel execution error:', error.message);
    return res.status(500).json({ error: 'Failed to cancel execution' });
  }
};

/**
 * Cancel ALL running/pending workflow executions
 * POST /api/workflows/execution/cancel-all
 */
export const cancelAllExecutions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    let userId = req.user?.userId;
    if (!userId && req.service) userId = 'service-account';
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const staleExecutions = await prisma.workflowExecution.findMany({
      where: { status: { in: ['PENDING', 'RUNNING'] } },
      select: { id: true },
    });

    if (staleExecutions.length === 0) {
      return res.json({ ok: true, cancelled: 0, message: 'No active executions found' });
    }

    // Signal any live engines to stop (they'll update DB themselves).
    const liveCount = workflowService.requestCancelAll();

    // Orphan cleanup: any DB rows with no live engine need manual cleanup.
    const liveIds = new Set<string>();
    for (const e of staleExecutions) {
      if (workflowService.getWorkflowJobState(e.id)?.isRunning) liveIds.add(e.id);
    }
    const orphanIds = staleExecutions.map((e) => e.id).filter((id) => !liveIds.has(id));

    if (orphanIds.length > 0) {
      await prisma.workflowExecution.updateMany({
        where: { id: { in: orphanIds } },
        data: {
          status: 'CANCELLED',
          completedAt: new Date(),
          errorMessage: `Bulk cancelled by user ${userId} (no live engine)`,
        },
      });
      await prisma.workflowCallOutcome.updateMany({
        where: {
          executionId: { in: orphanIds },
          status: { notIn: ['COMPLETED', 'FAILED', 'NO_ANSWER', 'BUSY', 'CANCELLED'] },
        },
        data: { status: 'CANCELLED' },
      });
    }

    console.log(
      `⛔ Cancel-all by ${userId}: ${liveCount} live engine(s) signalled, ${orphanIds.length} orphan(s) cleaned`,
    );

    return res.json({
      ok: true,
      cancelled: staleExecutions.length,
      liveEnginesSignalled: liveCount,
      orphansCleaned: orphanIds.length,
      message: `${staleExecutions.length} execution(s) cancelled`,
    });
  } catch (error: any) {
    console.error('❌ Cancel all executions error:', error.message);
    return res.status(500).json({ error: 'Failed to cancel executions' });
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
