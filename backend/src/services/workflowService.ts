/**
 * Simplified Workflow Service
 * MVP: Simple intent → targets → execution
 */

import prisma from '../config/database';
import { config } from '../config/env';
import axios from 'axios';
import * as loggingService from './loggingService';
import { SimpleIntent } from './llm/promptParserService';
import { Target, findTargets } from './targetFinderService';

// ============================================
// SIMPLIFIED EXECUTION ENGINE
// ============================================

// Helper to replace variables in a string
const replaceVariables = (template: string, variables: Record<string, string | undefined>) => {
  if (!template) return '';
  return template.replace(/\{(\w+)\}/g, (_, key) => variables[key] || `{${key}}`);
};

/**
 * Execute workflow directly from intent and targets
 * Simplified flow: intent → targets → ElevenLabs
 */
export const executeSimpleWorkflow = async (
  intent: SimpleIntent,
  userId: string,
  workflowName?: string
): Promise<{ success: boolean; batchId?: string; executionId?: string; error?: string }> => {
  try {
    console.log(`🚀 Executing simple workflow: ${intent.action}`);

    // 1. Find targets using the intent
    const targets = await findTargets(intent);

    if (targets.length === 0) {
      return { success: false, error: 'No targets found matching the criteria' };
    }

    // 2. Create temporary Workflow record for simple execution
    const workflow = await prisma.workflow.create({
      data: {
        name: workflowName || intent.action,
        description: `Simple workflow: ${intent.goal}`,
        nlPrompt: `${intent.action} - ${intent.script.main_ask}`,
        workflowConfig: JSON.parse(JSON.stringify({
          simplified: true,
          intent,
          targetCriteria: intent.target_criteria,
          script: intent.script,
          goal: intent.goal,
        })),
        createdBy: userId,
        createdByName: 'Simple Workflow User',
        createdByEmail: 'simple@workflow.local',
        status: 'APPROVED', // Auto-approve simple workflows
        workflowType: 'CUSTOM',
      },
    });

    // 3. Create WorkflowExecution record
    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId: workflow.id, // Reference the created workflow
        status: 'PENDING',
        totalTargets: targets.length,
        targetList: JSON.parse(JSON.stringify(targets)),
        executedBy: userId,
        metadata: JSON.parse(JSON.stringify({
          intent,
          workflowName: workflowName || intent.action,
          simplified: true,
        })),
      },
    });

    // 3. Prepare ElevenLabs Batch Payload
    const batchPayload = {
      call_name: `AgentX: ${workflowName || intent.action} (${new Date().toISOString()})`,
      agent_id: config.elevenlabs.infoGatheringAgentId,
      agent_phone_number_id: config.elevenlabs.phoneNumberId,
      recipients: targets.map(target => {
        // Build dynamic variables from target data
        const variables = {
          rep_name: target.name,
          deal_name: target.dealName,
          company: target.company,
          deal_amount: target.dealAmount?.toString(),
          deal_stage: target.dealStage,
          workflowExecutionId: execution.id, // For webhook tracking
          targetPhone: target.phone, // For webhook tracking
        };

        return {
          phone_number: target.phone,
          conversation_initiation_client_data: {
            dynamic_variables: variables,
            conversation_config_override: {
              agent: {
                first_message: replaceVariables(intent.script.opening, variables),
                prompt: {
                  prompt: replaceVariables(formatSimpleSystemPrompt(intent), variables),
                },
              },
            },
          },
        };
      }),
    };

    console.log(`📞 Submitting batch call to ElevenLabs for ${targets.length} recipients...`);

    // 4. Submit to ElevenLabs API
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

    // 5. Update Execution record
    await prisma.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: 'RUNNING',
        startedAt: new Date(),
        metadata: JSON.parse(JSON.stringify({
          ...execution.metadata as any,
          batchId,
        })),
      },
    });

    // 6. Create WorkflowCallOutcome records for tracking
    const outcomePromises = targets.map(target =>
      prisma.workflowCallOutcome.create({
        data: {
          executionId: execution.id, // Fixed: use executionId instead of workflowExecutionId
          targetName: target.name,
          targetPhone: target.phone,
          targetEmail: target.email,
          dealId: target.dealId,
          dealName: target.dealName,
          tenantSlug: target.tenantSlug,
          status: 'INITIATED',
        },
      })
    );
    await Promise.all(outcomePromises);

    // Log activity
    await loggingService.logActivity({
      activityType: 'WORKFLOW_EXECUTION', // Now this should work with the updated enum
      status: 'SUCCESS',
      userId,
      metadata: JSON.parse(JSON.stringify({
        intent: intent.action,
        executionId: execution.id,
        batchId,
        targetCount: targets.length,
      })),
    });

    return { 
      success: true, 
      batchId, 
      executionId: execution.id 
    };

  } catch (error: any) {
    console.error('❌ Simple workflow execution failed:', error.response?.data || error.message);
    
    await loggingService.logError({
      errorType: 'EXTERNAL_SERVICE',
      severity: 'CRITICAL',
      source: 'workflowService.executeSimpleWorkflow',
      message: error.message || 'Failed to execute simple workflow',
      stack: error.stack,
      userId,
      responseData: error.response?.data,
    });

    return { success: false, error: error.message };
  }
};

/**
 * Format system prompt for simple intent-based workflow
 */
const formatSimpleSystemPrompt = (intent: SimpleIntent): string => {
  return `
You are AgentX, an AI RevOps assistant.

Your goal: ${intent.script.main_ask}

Context: ${intent.script.context || 'No additional context provided.'}

Instructions:
- Be professional and conversational
- Focus on the main ask: ${intent.script.main_ask}
- If they agree, guide them through next steps
- If they decline, politely acknowledge and end
- If they have questions, address them professionally
- If voicemail, leave a brief, clear message

Success criteria: ${intent.goal}

Keep the conversation focused and helpful.
`;
};
