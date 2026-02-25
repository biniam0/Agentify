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
import { NL_WORKFLOW_SYSTEM_PROMPT, NL_WORKFLOW_FIRST_MESSAGE } from './prompts/nlWorkflowPrompts';

// ============================================
// SIMPLIFIED EXECUTION ENGINE
// ============================================

// Helper to replace variables in a string (supports both {{variable}} and {variable} formats)
const replaceVariables = (template: string, variables: Record<string, string | undefined>) => {
  if (!template) return '';
  // Replace double curly braces first: {{variable}}
  let result = template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || `{{${key}}}`);
  // Then replace single curly braces: {variable}
  result = result.replace(/\{(\w+)\}/g, (_, key) => variables[key] || `{${key}}`);
  return result;
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

    // 3. Get user info for requester context
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true }
    });

    // 4. Prepare ElevenLabs Batch Payload with NL Workflow Agent
    const batchPayload = {
      call_name: `AgentX NL Workflow: ${workflowName || intent.action} (${new Date().toISOString()})`,
      agent_id: config.elevenlabs.nlWorkflowAgentId,
      agent_phone_number_id: config.elevenlabs.phoneNumberId,
      recipients: targets.map(target => {
        // Build enhanced dynamic variables for NL Workflow agent
        const currentDate = new Date();
        const variables = {
          // Sales rep info (the person being called)
          owner_name: target.name,
          
          // Deal information
          deal_id: target.dealId,
          deal_name: target.dealName,
          company: target.company,
          deal_amount: target.dealAmount?.toString() || '',
          deal_stage: target.dealStage || '',
          
          // Workflow context
          workflow_name: workflowName || intent.action,
          original_prompt: intent.action, // The manager's original request
          
          // Requester info (manager/admin who created the workflow)
          requester_name: user?.name || 'Manager',
          
          // Execution tracking
          batch_id: '', // Will be filled after batch creation
          execution_id: execution.id,
          
          // Time context (TODO: Add proper timezone support)
          current_timezone: 'UTC',
          current_timezone_offset: '+00:00',
          current_date_local: currentDate.toISOString().split('T')[0],
          current_time_local: currentDate.toTimeString().split(' ')[0],
          current_day_of_week: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
          
          // Legacy fields for webhook tracking
          workflowExecutionId: execution.id,
          targetPhone: target.phone,
        };

        return {
          phone_number: target.phone,
          conversation_initiation_client_data: {
            dynamic_variables: variables,
            conversation_config_override: {
              agent: {
                first_message: replaceVariables(NL_WORKFLOW_FIRST_MESSAGE, variables),
                prompt: {
                  prompt: replaceVariables(NL_WORKFLOW_SYSTEM_PROMPT, variables),
                },
              },
            },
          },
        };
      }),
    };

    console.log(`📞 Submitting NL Workflow batch call to ElevenLabs for ${targets.length} recipients...`);

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

// Note: formatSimpleSystemPrompt removed - now using NL_WORKFLOW_SYSTEM_PROMPT from prompts file
