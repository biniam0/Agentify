/**
 * Workflow Service — Scheduled Per-Call Engine
 *
 * Replaces the old ElevenLabs batch-calling/submit flow with an Info-Gathering
 * style engine: calls are placed 1-by-1 through `/v1/convai/twilio/outbound-call`
 * in batches of N, spread by phone number so the same owner isn't called
 * back-to-back, with configurable delay between batches and a calling-hours
 * guard.
 *
 * Architecture:
 *   - Public entry: `startWorkflowExecution(...)`. Creates the Workflow +
 *     WorkflowExecution rows synchronously, kicks off the engine async, and
 *     returns the executionId immediately so the UI can poll.
 *   - In-memory `jobStates: Map<executionId, WorkflowJobState>` tracks live
 *     progress for the UI (`currentBatch`, `recentLogs`, per-target status…).
 *   - Concurrency: one workflow per tenant at a time, and blocked if an Info
 *     Gathering job is currently running (shared ElevenLabs phone number).
 *   - Cancel: `requestCancel(executionId)` flips `shouldStop`; the loop exits
 *     cleanly between calls/batches. In-flight calls continue to completion.
 */

import axios from 'axios';

import prisma from '../config/database';
import { config } from '../config/env';
import {
  WORKFLOW_CONFIGS,
  WorkflowType,
  isWithinCallingHours,
  formatCallingHoursError,
  getWorkflowConfig,
} from '../config/workflowConfig';
import { SimpleIntent } from './llm/promptParserService';
import { Target, findTargets } from './targetFinderService';
import {
  NL_WORKFLOW_SYSTEM_PROMPT,
  NL_WORKFLOW_FIRST_MESSAGE,
} from './prompts/nlWorkflowPrompts';
import * as loggingService from './loggingService';
import { getJobStatus as getInfoGatheringStatus } from './infoGatheringService';

// ============================================
// TYPES
// ============================================

export interface CurrentTargetInfo {
  name: string;
  phone: string;
  dealName?: string;
  company?: string;
  status: 'PENDING' | 'CALLING' | 'INITIATED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  conversationId?: string;
  error?: string;
}

export interface WorkflowJobState {
  executionId: string;
  workflowId: string;
  workflowName: string;
  tenantSlug: string;
  type: WorkflowType;
  triggeredBy: string;
  // Identity of the caller (for CallLog parity)
  triggeredByUserId: string;
  triggeredByEmail: string;

  isRunning: boolean;
  shouldStop: boolean;
  startedAt: Date;
  finishedAt: Date | null;

  totalTargets: number;
  processedTargets: number;
  successfulCalls: number;
  failedCalls: number;
  skippedTargets: number;
  cancelledTargets: number;

  currentBatch: number;
  totalBatches: number;

  currentTargets: CurrentTargetInfo[];
  recentLogs: string[];
  lastError: string | null;
}

// ============================================
// IN-MEMORY STATE (matches Info Gathering style, no persistence across restarts)
// ============================================

const jobStates: Map<string, WorkflowJobState> = new Map();

function getTenantJob(tenantSlug: string): WorkflowJobState | undefined {
  for (const state of jobStates.values()) {
    if (state.isRunning && state.tenantSlug === tenantSlug) return state;
  }
  return undefined;
}

export function getWorkflowJobState(executionId: string): WorkflowJobState | undefined {
  return jobStates.get(executionId);
}

export function getActiveWorkflowJobForTenant(tenantSlug: string): WorkflowJobState | undefined {
  return getTenantJob(tenantSlug);
}

export function isAnyWorkflowRunning(): boolean {
  for (const state of jobStates.values()) if (state.isRunning) return true;
  return false;
}

export function requestCancel(executionId: string): boolean {
  const state = jobStates.get(executionId);
  if (!state || !state.isRunning) return false;
  log(state, '⛔ Stop requested');
  state.shouldStop = true;
  return true;
}

export function requestCancelAll(): number {
  let count = 0;
  for (const state of jobStates.values()) {
    if (state.isRunning) {
      state.shouldStop = true;
      count++;
    }
  }
  return count;
}

// ============================================
// LOGGING HELPER
// ============================================

function log(state: WorkflowJobState, message: string) {
  const stamp = new Date().toISOString();
  const line = `[${stamp}] ${message}`;
  console.log(`[wf:${state.executionId.slice(0, 8)}] ${message}`);
  state.recentLogs.push(line);
  const limit = WORKFLOW_CONFIGS[state.type].recentLogsLimit;
  if (state.recentLogs.length > limit) {
    state.recentLogs.splice(0, state.recentLogs.length - limit);
  }
}

// ============================================
// HELPERS
// ============================================

const replaceVariables = (
  template: string,
  variables: Record<string, string | undefined>,
): string => {
  if (!template) return '';
  let result = template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || `{{${key}}}`);
  result = result.replace(/\{(\w+)\}/g, (_, key) => variables[key] || `{${key}}`);
  return result;
};

/**
 * Spread targets by phone number so the same phone isn't called back-to-back.
 * Round-robin over unique phone groups — matches Info Gathering's `spreadByOwner`.
 */
function spreadByPhone(targets: Target[]): Target[] {
  const groups = new Map<string, Target[]>();
  for (const t of targets) {
    const key = (t.phone || '').replace(/\s+/g, '') || `__no_phone__:${t.dealId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  const queues = Array.from(groups.values());
  const result: Target[] = [];
  let round = 0;
  let hasMore = true;
  while (hasMore) {
    hasMore = false;
    for (const q of queues) {
      if (round < q.length) {
        result.push(q[round]);
        hasMore = true;
      }
    }
    round++;
  }
  return result;
}

/**
 * Interruptible delay that respects `state.shouldStop`.
 */
async function interruptibleDelay(state: WorkflowJobState, ms: number): Promise<boolean> {
  const checkInterval = 5000;
  let elapsed = 0;
  while (elapsed < ms && !state.shouldStop) {
    const remaining = ms - elapsed;
    const waitTime = Math.min(checkInterval, remaining);
    await new Promise((r) => setTimeout(r, waitTime));
    elapsed += waitTime;
    if (elapsed % 60000 === 0 && elapsed < ms) {
      const minutesRemaining = Math.ceil((ms - elapsed) / 60000);
      log(state, `   ⏳ ${minutesRemaining} minute(s) remaining before next batch...`);
    }
  }
  return !state.shouldStop;
}

/**
 * Build the dynamic variables for one target (same shape as before, plus
 * `call_type` and `workflow_execution_id` so the webhook can route updates
 * back to `WorkflowCallOutcome`).
 */
function buildDynamicVariables(args: {
  target: Target;
  intent: SimpleIntent;
  workflowName: string;
  requesterName: string;
  executionId: string;
  callType: string;
}): Record<string, string> {
  const { target, intent, workflowName, requesterName, executionId, callType } = args;
  const currentDate = new Date();
  return {
    // Sales rep being called
    owner_name: target.name,
    owner_first_name: (target.name || '').split(' ')[0] || '',
    owner_email: target.email || '',

    // Deal information
    deal_id: target.dealId,
    deal_name: target.dealName,
    company: target.company || '',
    // Duplicate under `company_name` for parity with pre/post-call and info-
    // gathering webhook contracts (they read `dynamicVariables.company_name`).
    company_name: target.company || '',
    deal_amount: target.dealAmount?.toString() || '',
    deal_stage: target.dealStage || '',

    // Workflow context
    workflow_name: workflowName,
    original_prompt: intent.action,

    // Requester (manager/admin)
    requester_name: requesterName,

    // Routing / tracking
    call_type: callType,
    workflow_execution_id: executionId,
    execution_id: executionId,
    target_phone: target.phone,
    tenant_slug: target.tenantSlug || '',
    // Use tenantSlug as a fallback tenant name — Target doesn't carry a
    // separate display name today. Matches info-gathering fallback pattern.
    tenant_name: target.tenantSlug || '',
    // HubSpot owner id — required by the generic note-creation block in the
    // ElevenLabs post-call webhook. Without this, workflow calls would log
    // "Owner ID: MISSING" for every call.
    hubspot_owner_id: target.hubspotOwnerId || '',

    // Time context
    current_timezone: 'UTC',
    current_timezone_offset: '+00:00',
    current_date_local: currentDate.toISOString().split('T')[0],
    current_time_local: currentDate.toTimeString().split(' ')[0],
    current_day_of_week: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),

    // Legacy alias preserved for webhook compatibility
    workflowExecutionId: executionId,
    targetPhone: target.phone,
  };
}

/**
 * Trigger a single outbound call via ElevenLabs.
 */
async function triggerCall(args: {
  target: Target;
  intent: SimpleIntent;
  workflowName: string;
  requesterName: string;
  executionId: string;
}): Promise<{ conversationId?: string; callSid?: string; error?: string }> {
  const agentId = config.elevenlabs.nlWorkflowAgentId;
  if (!agentId) return { error: 'ELEVENLABS_NL_WORKFLOW_AGENT_ID not configured' };

  const phoneNumberId = config.elevenlabs.phoneNumberId;
  if (!phoneNumberId) return { error: 'ELEVENLABS_PHONE_NUMBER_ID not configured' };

  if (!args.target.phone) return { error: 'No phone number' };

  const callType = WORKFLOW_CONFIGS.NL_WORKFLOW.callType;
  const dynamicVariables = buildDynamicVariables({ ...args, callType });

  const payload = {
    agent_id: agentId,
    agent_phone_number_id: phoneNumberId,
    to_number: args.target.phone,
    conversation_initiation_client_data: {
      dynamic_variables: dynamicVariables,
      conversation_config_override: {
        agent: {
          first_message: replaceVariables(NL_WORKFLOW_FIRST_MESSAGE, dynamicVariables),
          prompt: {
            prompt: replaceVariables(NL_WORKFLOW_SYSTEM_PROMPT, dynamicVariables),
          },
        },
      },
    },
  };

  try {
    const response = await axios.post(
      'https://api.elevenlabs.io/v1/convai/twilio/outbound-call',
      payload,
      {
        headers: {
          'xi-api-key': config.elevenlabs.apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      },
    );
    return {
      conversationId: response.data.conversation_id,
      callSid: response.data.callSid,
    };
  } catch (error: any) {
    return { error: error.response?.data?.detail || error.message };
  }
}

/**
 * Wait for every outcome in `outcomeIds` to reach a terminal status
 * (COMPLETED | FAILED | NO_ANSWER | BUSY | CANCELLED). Webhook-driven.
 * Times out per config.
 */
async function waitForBatchCompletion(
  state: WorkflowJobState,
  outcomeIds: string[],
): Promise<void> {
  if (outcomeIds.length === 0) return;
  const cfg = WORKFLOW_CONFIGS[state.type];
  const startTime = Date.now();
  const pollIntervalMs = 15000;

  log(state, `⏳ Waiting for ${outcomeIds.length} call(s) to complete...`);

  while (!state.shouldStop) {
    if (Date.now() - startTime > cfg.batchTimeoutMs) {
      log(
        state,
        `⚠️ Batch timeout (${Math.round(cfg.batchTimeoutMs / 60000)} min) — moving on`,
      );
      return;
    }

    const records = await prisma.workflowCallOutcome.findMany({
      where: { id: { in: outcomeIds } },
      select: { id: true, status: true, targetName: true, dealName: true, conversationId: true },
    });

    const terminalStatuses = ['COMPLETED', 'FAILED', 'NO_ANSWER', 'BUSY', 'CANCELLED'] as const;
    const terminal = records.filter((r) => (terminalStatuses as readonly string[]).includes(r.status));
    const pending = records.filter((r) => !(terminalStatuses as readonly string[]).includes(r.status));

    // Keep live currentTargets in sync with DB status
    for (const r of records) {
      const ct = state.currentTargets.find((c) => c.conversationId && c.conversationId === r.conversationId);
      if (ct) {
        ct.status = r.status as CurrentTargetInfo['status'];
      }
    }

    log(state, `   📊 Progress: ${terminal.length}/${records.length} completed`);

    if (pending.length === 0) {
      log(state, `   ✅ Batch completed`);
      return;
    }

    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
}

// ============================================
// CORE ENGINE
// ============================================

async function runEngine(state: WorkflowJobState, intent: SimpleIntent): Promise<void> {
  const cfg = WORKFLOW_CONFIGS[state.type];

  try {
    log(state, `🚀 ${cfg.displayName} execution starting (tenant: ${state.tenantSlug})`);

    // 1. Resolve targets
    const rawTargets = await findTargets(intent, state.tenantSlug);
    if (rawTargets.length === 0) {
      log(state, '✅ No targets matched the criteria');
      await prisma.workflowExecution.update({
        where: { id: state.executionId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          errorMessage: 'No targets found matching criteria',
        },
      });
      return;
    }

    if (rawTargets.length > cfg.maxTargetsPerExecution) {
      log(
        state,
        `⚠️ Target count ${rawTargets.length} exceeds safety cap (${cfg.maxTargetsPerExecution}) — truncating`,
      );
    }
    const cappedTargets = rawTargets.slice(0, cfg.maxTargetsPerExecution);

    // 2. Spread by phone
    const targets = spreadByPhone(cappedTargets);
    state.totalTargets = targets.length;
    state.totalBatches = Math.ceil(targets.length / cfg.batchSize);

    // 3. Seed DB with the full target list + PENDING outcomes (one per target).
    //    Outcomes are created up-front so `/execution-status` can report them
    //    and cancel can flip remaining PENDING/INITIATED ones to CANCELLED.
    await prisma.workflowExecution.update({
      where: { id: state.executionId },
      data: {
        status: 'RUNNING',
        startedAt: new Date(),
        totalTargets: targets.length,
        targetList: JSON.parse(JSON.stringify(targets)),
      },
    });

    // Populate in-memory currentTargets list (for UI display)
    state.currentTargets = targets.map((t) => ({
      name: t.name,
      phone: t.phone,
      dealName: t.dealName,
      company: t.company,
      status: 'PENDING',
    }));

    log(state, `📞 ${targets.length} target(s), ${state.totalBatches} batch(es) of ${cfg.batchSize}`);

    // 4. Process batches
    for (
      let batchIndex = 0;
      batchIndex < state.totalBatches && !state.shouldStop;
      batchIndex++
    ) {
      if (!isWithinCallingHours(state.type)) {
        log(state, `⏰ Outside calling hours — stopping`);
        state.shouldStop = true;
        break;
      }

      state.currentBatch = batchIndex + 1;
      const start = batchIndex * cfg.batchSize;
      const end = Math.min(start + cfg.batchSize, targets.length);
      const batch = targets.slice(start, end);

      log(
        state,
        `\n═══════════════════════════════════════════════════════════════`,
      );
      log(
        state,
        `📦 BATCH ${state.currentBatch}/${state.totalBatches} (targets ${start + 1}-${end} of ${targets.length})`,
      );

      const outcomeIds: string[] = [];

      for (let i = 0; i < batch.length; i++) {
        if (state.shouldStop) break;
        if (!isWithinCallingHours(state.type)) {
          log(state, `⏰ Outside calling hours mid-batch — stopping`);
          state.shouldStop = true;
          break;
        }

        const target = batch[i];
        const currentIdx = start + i;
        const ct = state.currentTargets[currentIdx];
        ct.status = 'CALLING';

        log(
          state,
          `📋 ${target.dealName || '(no deal)'} — ${target.name} (${target.phone})`,
        );
        log(state, `   📞 Triggering call...`);

        const result = await triggerCall({
          target,
          intent,
          workflowName: state.workflowName,
          requesterName: state.triggeredBy || 'Manager',
          executionId: state.executionId,
        });

        if (result.error) {
          log(state, `   ❌ Failed to initiate: ${result.error}`);
          state.failedCalls++;
          state.processedTargets++;
          ct.status = 'FAILED';
          ct.error = result.error;

          const outcome = await prisma.workflowCallOutcome.create({
            data: {
              executionId: state.executionId,
              targetName: target.name,
              targetPhone: target.phone,
              targetEmail: target.email,
              dealId: target.dealId,
              dealName: target.dealName,
              tenantSlug: target.tenantSlug,
              hubspotOwnerId: target.hubspotOwnerId,
              agentId: config.elevenlabs.nlWorkflowAgentId,
              status: 'FAILED',
              errorMessage: result.error,
            },
          });
          outcomeIds.push(outcome.id);

          // CallLog parity — even initiation failures get a row so they
          // show up in the unified call-logs UI.
          await loggingService
            .logCallInitiation({
              callType: 'NL_WORKFLOW',
              userId: state.triggeredByUserId,
              userName: state.triggeredBy,
              userEmail: state.triggeredByEmail,
              tenantSlug: target.tenantSlug,
              tenantName: target.tenantSlug,
              hubspotOwnerId: target.hubspotOwnerId,
              dealId: target.dealId,
              dealName: target.dealName,
              phoneNumber: target.phone,
              ownerName: target.name,
              agentId: config.elevenlabs.nlWorkflowAgentId,
              triggerSource: 'MANUAL',
              triggerUserId: state.triggeredByUserId,
              dynamicVariables: { executionId: state.executionId },
            })
            .then(async (row) => {
              if (row?.id) {
                await prisma.callLog.update({
                  where: { id: row.id },
                  data: { status: 'FAILED', failureReason: result.error },
                }).catch(() => { /* best-effort */ });
              }
            })
            .catch((e) => console.error('⚠️ failed CallLog (trigger-failed):', e?.message));

          continue;
        }

        log(state, `   ✅ Call initiated (conversation_id=${result.conversationId})`);
        ct.status = 'INITIATED';
        ct.conversationId = result.conversationId;

        const outcome = await prisma.workflowCallOutcome.create({
          data: {
            executionId: state.executionId,
            targetName: target.name,
            targetPhone: target.phone,
            targetEmail: target.email,
            dealId: target.dealId,
            dealName: target.dealName,
            tenantSlug: target.tenantSlug,
            hubspotOwnerId: target.hubspotOwnerId,
            conversationId: result.conversationId,
            callSid: result.callSid,
            agentId: config.elevenlabs.nlWorkflowAgentId,
            status: 'INITIATED',
          },
        });
        outcomeIds.push(outcome.id);

        // CallLog parity — creates a row the generic webhook post-call
        // flow and the admin Call Logs UI can both consume.
        await loggingService
          .logCallInitiation({
            callType: 'NL_WORKFLOW',
            userId: state.triggeredByUserId,
            userName: state.triggeredBy,
            userEmail: state.triggeredByEmail,
            tenantSlug: target.tenantSlug,
            tenantName: target.tenantSlug,
            hubspotOwnerId: target.hubspotOwnerId,
            dealId: target.dealId,
            dealName: target.dealName,
            phoneNumber: target.phone,
            ownerName: target.name,
            agentId: config.elevenlabs.nlWorkflowAgentId,
            triggerSource: 'MANUAL',
            triggerUserId: state.triggeredByUserId,
            conversationId: result.conversationId,
            callSid: result.callSid,
            dynamicVariables: { executionId: state.executionId },
          })
          .catch((e) => console.error('⚠️ failed CallLog (initiated):', e?.message));

        state.successfulCalls++;
        state.processedTargets++;

        // Intra-batch gap so the two calls don't hit the API simultaneously
        if (i < batch.length - 1) {
          await new Promise((r) => setTimeout(r, cfg.intraBatchGapMs));
        }
      }

      if (!state.shouldStop) {
        await waitForBatchCompletion(state, outcomeIds);
      }

      const percentComplete = Math.round((end / targets.length) * 100);
      log(state, `📈 Overall progress: ${end}/${targets.length} (${percentComplete}%)`);

      // Delay between batches
      if (batchIndex < state.totalBatches - 1 && !state.shouldStop) {
        if (cfg.delayBetweenBatchesMs > 0) {
          const mins = Math.round(cfg.delayBetweenBatchesMs / 60000);
          log(state, `⏳ Waiting ${mins} minute(s) before next batch...`);
          const ok = await interruptibleDelay(state, cfg.delayBetweenBatchesMs);
          if (!ok) {
            log(state, '⛔ Stopped during inter-batch delay — exiting');
            break;
          }
          log(state, '✅ Delay completed, proceeding');
        }
      }
    }

    // 5. Mark remaining outcomes (if cancelled) as CANCELLED
    if (state.shouldStop) {
      const cancelled = await prisma.workflowCallOutcome.updateMany({
        where: {
          executionId: state.executionId,
          status: { notIn: ['COMPLETED', 'FAILED', 'NO_ANSWER', 'BUSY', 'CANCELLED'] },
        },
        data: { status: 'CANCELLED' },
      });
      state.cancelledTargets += cancelled.count;
      for (const ct of state.currentTargets) {
        if (ct.status === 'PENDING' || ct.status === 'CALLING') {
          ct.status = 'CANCELLED';
        }
      }

      await prisma.workflowExecution.update({
        where: { id: state.executionId },
        data: {
          status: 'CANCELLED',
          completedAt: new Date(),
          errorMessage: `Cancelled (${state.processedTargets}/${state.totalTargets} processed)`,
        },
      });
      log(state, `🛑 Execution CANCELLED — ${cancelled.count} remaining outcome(s) marked CANCELLED`);
    } else {
      await prisma.workflowExecution.update({
        where: { id: state.executionId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
      log(state, `🏁 Execution COMPLETED`);
    }

    // Final summary
    log(state, '═══════════════════════════════════════════════════════════════');
    log(state, '📊 FINAL SUMMARY');
    log(state, `   📞 Calls initiated: ${state.successfulCalls}`);
    log(state, `   ❌ Failed to initiate: ${state.failedCalls}`);
    log(state, `   🛑 Cancelled: ${state.cancelledTargets}`);
    log(state, `   📦 Batches: ${state.currentBatch}/${state.totalBatches}`);
  } catch (error: any) {
    state.lastError = error?.message || String(error);
    log(state, `❌ Engine error: ${state.lastError}`);
    await prisma.workflowExecution.update({
      where: { id: state.executionId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errorMessage: state.lastError,
      },
    }).catch(() => { /* best-effort */ });

    await loggingService.logError({
      errorType: 'EXTERNAL_SERVICE',
      severity: 'CRITICAL',
      source: 'workflowService.runEngine',
      message: state.lastError || 'Workflow engine error',
      stack: error?.stack,
      userId: state.triggeredBy,
    });
  } finally {
    state.isRunning = false;
    state.finishedAt = new Date();
    // Keep state in memory for a short window so the UI can still read final
    // progress after the run ends. GC after 10 minutes.
    setTimeout(() => jobStates.delete(state.executionId), 10 * 60 * 1000).unref?.();
  }
}

// ============================================
// PUBLIC API
// ============================================

export interface StartWorkflowResult {
  success: boolean;
  executionId?: string;
  warning?: boolean;
  error?: string;
}

/**
 * Kick off a new NL workflow execution.
 *
 * Guards (rejects early):
 *   - BARRIERX_API_KEY / ELEVENLABS_KEY / ELEVENLABS_NL_WORKFLOW_AGENT_ID configured
 *   - Inside calling hours (08:00–16:00 UTC)
 *   - No other workflow running for this tenant
 *   - No Info Gathering job currently running (shared phone number)
 */
export async function startWorkflowExecution(args: {
  intent: SimpleIntent;
  userId: string;
  triggeredByName?: string;
  triggeredByEmail?: string;
  tenantSlug: string;
  workflowName?: string;
  type?: WorkflowType;
}): Promise<StartWorkflowResult> {
  const type: WorkflowType = args.type || 'NL_WORKFLOW';

  // --- Guards ---
  if (!config.barrierx.apiKey) {
    return { success: false, error: 'BARRIERX_API_KEY not configured' };
  }
  if (!config.elevenlabs.apiKey) {
    return { success: false, error: 'ELEVENLABS_KEY not configured' };
  }
  if (!config.elevenlabs.nlWorkflowAgentId) {
    return { success: false, error: 'ELEVENLABS_NL_WORKFLOW_AGENT_ID not configured' };
  }

  if (!isWithinCallingHours(type)) {
    return { success: false, warning: true, error: formatCallingHoursError(type) };
  }

  const existing = getTenantJob(args.tenantSlug);
  if (existing) {
    return {
      success: false,
      error: `A workflow is already running for tenant ${args.tenantSlug} (execution ${existing.executionId})`,
    };
  }

  const infoStatus = getInfoGatheringStatus();
  if (infoStatus.isRunning) {
    return {
      success: false,
      error: `Info Gathering job (${infoStatus.type}) is currently running — please wait for it to finish`,
    };
  }

  // --- Create Workflow + WorkflowExecution rows ---
  const workflowName = args.workflowName || args.intent.action || 'NL Workflow';
  const requesterName = args.triggeredByName || 'Manager';

  const workflow = await prisma.workflow.create({
    data: {
      name: workflowName,
      description: `NL workflow: ${args.intent.goal}`,
      nlPrompt: `${args.intent.action} - ${args.intent.script.main_ask}`,
      workflowConfig: JSON.parse(
        JSON.stringify({
          simplified: true,
          intent: args.intent,
          targetCriteria: args.intent.target_criteria,
          script: args.intent.script,
          goal: args.intent.goal,
        }),
      ),
      createdBy: args.userId,
      createdByName: requesterName,
      createdByEmail: 'nl@workflow.local',
      status: 'APPROVED',
      workflowType: 'CUSTOM',
    },
  });

  const execution = await prisma.workflowExecution.create({
    data: {
      workflowId: workflow.id,
      status: 'PENDING',
      totalTargets: 0,
      targetList: [],
      executedBy: args.userId,
      metadata: JSON.parse(
        JSON.stringify({
          intent: args.intent,
          workflowName,
          engine: 'scheduled-per-call-v1',
        }),
      ),
    },
  });

  // --- Seed in-memory state ---
  const state: WorkflowJobState = {
    executionId: execution.id,
    workflowId: workflow.id,
    workflowName,
    tenantSlug: args.tenantSlug,
    type,
    triggeredBy: requesterName,
    triggeredByUserId: args.userId,
    triggeredByEmail: args.triggeredByEmail || 'nl@workflow.local',

    isRunning: true,
    shouldStop: false,
    startedAt: new Date(),
    finishedAt: null,

    totalTargets: 0,
    processedTargets: 0,
    successfulCalls: 0,
    failedCalls: 0,
    skippedTargets: 0,
    cancelledTargets: 0,

    currentBatch: 0,
    totalBatches: 0,

    currentTargets: [],
    recentLogs: [],
    lastError: null,
  };
  jobStates.set(execution.id, state);

  // Fire-and-forget — UI polls `/execution-status` for progress.
  runEngine(state, args.intent).catch((err) => {
    console.error('workflowService.runEngine unhandled error:', err);
  });

  // Log kickoff
  await loggingService.logActivity({
    activityType: 'WORKFLOW_EXECUTION',
    status: 'SUCCESS',
    userId: args.userId,
    metadata: JSON.parse(
      JSON.stringify({
        intent: args.intent.action,
        executionId: execution.id,
        workflowId: workflow.id,
        tenantSlug: args.tenantSlug,
        engine: 'scheduled-per-call-v1',
      }),
    ),
  });

  return { success: true, executionId: execution.id };
}

// Re-export for convenience
export { WORKFLOW_CONFIGS, getWorkflowConfig };
