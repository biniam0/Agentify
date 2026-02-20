/**
 * Workflow Service
 * Phase 2: Audience Resolution + Execution Engine
 */

import prisma from '../config/database';
import { config } from '../config/env';
import axios from 'axios';
import * as barrierxService from './barrierxService';
import * as loggingService from './loggingService';
import { WorkflowConfig, AudienceQuery, ScriptTemplate } from '../types/workflow';
import { Deal } from './barrierxService';

// ============================================
// AUDIENCE RESOLUTION
// ============================================

/**
 * Resolve audience based on workflow configuration
 * Fetches deals from BarrierX and applies filters
 */
export const resolveAudience = async (
  audienceQuery: AudienceQuery,
  userId: string
): Promise<any[]> => {
  console.log(`🔍 Resolving audience for query type: ${audienceQuery.type}`);

  // Step 1: Fetch all deals (using existing bulk API)
  // In a real scenario, we might want to optimize this to not fetch EVERYTHING if possible
  // but for now, we rely on the wildcard fetch which is cached by Redis
  const allDealsMap = await barrierxService.getAllDealsWildcard();
  
  // Flatten the map into a single array of deals
  let allDeals: Deal[] = [];
  allDealsMap.forEach((deals) => {
    allDeals = allDeals.concat(deals);
  });

  console.log(`📊 Total deals in system: ${allDeals.length}`);

  // Step 2: Apply filters based on query type
  let filteredDeals = filterDeals(allDeals, audienceQuery);

  console.log(`✅ Audience resolved: ${filteredDeals.length} targets found`);

  // Step 3: Map to target format
  return filteredDeals.map(deal => ({
    name: deal.ownerName,
    phone: deal.ownerPhone, // Crucial: Needs to be present
    email: deal.ownerEmail,
    dealId: deal.id,
    dealName: deal.name,
    dealStage: deal.stage,
    dealAmount: deal.amount,
    tenantSlug: deal.tenantSlug,
    hubspotOwnerId: deal.ownerHubspotId,
    // Add any other context needed for the script
    company: deal.company,
  })).filter(target => target.phone); // Filter out users without phone numbers
};

/**
 * Filter deals based on audience query logic
 */
const filterDeals = (deals: Deal[], query: AudienceQuery): Deal[] => {
  const { type, filters, customLogic } = query;

  // Apply base filters first (if any)
  let candidates = deals;

  if (filters) {
    if (filters.dealMinAmount) {
      candidates = candidates.filter(d => (d.amount || 0) >= filters.dealMinAmount!);
    }
    if (filters.dealMaxAmount) {
      candidates = candidates.filter(d => (d.amount || 0) <= filters.dealMaxAmount!);
    }
    if (filters.dealStage && filters.dealStage.length > 0) {
      candidates = candidates.filter(d => filters.dealStage!.includes(d.stage));
    }
    if (filters.tenantSlugs && filters.tenantSlugs.length > 0) {
      candidates = candidates.filter(d => d.tenantSlug && filters.tenantSlugs!.includes(d.tenantSlug));
    }
    // Date filters would need parsing closeDate or updatedAt if available on Deal interface
  }

  // Apply specific logic based on type
  switch (type) {
    case 'missing_sql':
      // TODO: Check for missing SQL qualification
      // Since 'sql_qualified' isn't on the Deal interface yet, we might need to fetch engagements
      // or assume it's missing if not explicitly present.
      // For Phase 2 MVP, we'll simulate this or rely on a placeholder logic.
      return candidates; // Return all candidates for now (simulated)

    case 'stale_deals':
      // TODO: Check last activity date
      return candidates;

    case 'meddic_gap':
      // TODO: Check MEDDIC scores
      return candidates;

    case 'post_meeting':
      // Filter deals with meetings in the last 24h
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return candidates.filter(d => 
        d.meetings.some(m => new Date(m.endTime) > oneDayAgo)
      );

    case 'custom':
      // TODO: Implement custom logic parser
      return candidates;

    default:
      return candidates;
  }
};

// ============================================
// EXECUTION ENGINE (ElevenLabs Batch API)
// ============================================

// Helper to replace variables in a string
const replaceVariables = (template: string, variables: Record<string, string | undefined>) => {
  if (!template) return '';
  return template.replace(/\{(\w+)\}/g, (_, key) => variables[key] || `{${key}}`);
};

/**
 * Execute a workflow by submitting a batch call job to ElevenLabs
 */
export const executeWorkflow = async (
  workflowId: string,
  userId: string
): Promise<{ success: boolean; batchId?: string; error?: string }> => {
  try {
    // 1. Fetch workflow definition
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const workflowConfig = workflow.workflowConfig as any as WorkflowConfig;

    // 2. Resolve audience again (to get fresh data)
    const targets = await resolveAudience(workflowConfig.audienceQuery, userId);

    if (targets.length === 0) {
      return { success: false, error: 'No targets found for this workflow' };
    }

    // 3. Create WorkflowExecution record
    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId,
        status: 'PENDING',
        totalTargets: targets.length,
        targetList: targets, // Store the snapshot of who we targeted
        executedBy: userId,
      },
    });

    // 4. Prepare ElevenLabs Batch Payload
    const batchPayload = {
      call_name: `AgentX Workflow: ${workflow.name} (${new Date().toISOString()})`,
      agent_id: config.elevenlabs.infoGatheringAgentId, // Use the base agent
      agent_phone_number_id: config.elevenlabs.phoneNumberId, // Required for outbound calls
      recipients: targets.map(target => {
        // Prepare variables for this target
        const variables = {
          rep_name: target.name,
          deal_name: target.dealName,
          company: target.company,
          deal_amount: target.dealAmount?.toString(),
          deal_stage: target.dealStage,
          // Add other variables needed by the script
        };

        return {
          phone_number: target.phone,
          // Custom data for this specific call
          conversation_initiation_client_data: {
            dynamic_variables: variables,
            conversation_config_override: {
              agent: {
                // Manually replace variables in the prompt and first message
                first_message: replaceVariables(workflowConfig.scriptTemplate.opening, variables),
                prompt: {
                  prompt: replaceVariables(formatSystemPrompt(workflowConfig.scriptTemplate), variables),
                },
              },
            },
          },
        };
      }),
    };

    console.log(`🚀 Submitting batch call to ElevenLabs for ${targets.length} recipients...`);

    // 5. Submit to ElevenLabs API
    const response = await axios.post(
      'https://api.elevenlabs.io/v1/convai/batch-calling/submit',
      batchPayload,
      {
        headers: {
          'xi-api-key': config.elevenlabs.apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    const batchId = response.data.id;
    console.log(`✅ Batch submitted successfully! Batch ID: ${batchId}`);

    // 6. Update Execution record with Batch ID
    // We'll store the batchId in the metadata or a new field if we add one.
    // For now, let's assume we can store it in the 'targetList' or add a field.
    // Ideally, we should add 'batchId' to WorkflowExecution model.
    // For now, I'll update the status to RUNNING.
    
    await prisma.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: 'RUNNING',
        startedAt: new Date(),
        // We might want to store batchId in a dedicated field or metadata JSON
        // metadata: { batchId } 
      },
    });

    // Log activity
    await loggingService.logActivity({
      activityType: 'SCHEDULER_RUN', // Or a new WORKFLOW_EXECUTION type
      status: 'SUCCESS',
      userId,
      metadata: {
        workflowId,
        executionId: execution.id,
        batchId,
        targetCount: targets.length,
      },
    });

    return { success: true, batchId };

  } catch (error: any) {
    console.error('❌ Workflow execution failed:', error.response?.data || error.message);
    
    await loggingService.logError({
      errorType: 'EXTERNAL_SERVICE',
      severity: 'CRITICAL',
      source: 'workflowService.executeWorkflow',
      message: error.message || 'Failed to execute workflow batch',
      stack: error.stack,
      userId,
      responseData: error.response?.data,
    });

    return { success: false, error: error.message };
  }
};

/**
 * Format the system prompt by combining the base prompt with script logic
 */
const formatSystemPrompt = (script: ScriptTemplate): string => {
  return `
You are AgentX, an AI RevOps assistant.
Your goal is: ${script.mainAsk}

Instructions:
- Start with the opening message provided.
- If they accept: ${script.branches.accepted || "Guide them through the next steps."}
- If they decline: ${script.branches.declined || "Politely acknowledge and end the call."}
- If they object: ${script.branches.objection || "Address the concern professionally."}
- If voicemail: ${script.branches.voicemail || "Leave a concise message."}

Keep the conversation professional, concise, and helpful.
`;
};
