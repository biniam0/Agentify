/**
 * Workflow Configuration Module
 *
 * Centralizes all configuration for NL-driven workflow call executions.
 *
 * Modeled after `gatheringConfig.ts` so future workflow subtypes can be added
 * by dropping another entry into `WORKFLOW_CONFIGS` without touching the engine.
 */

// ============================================
// TYPES
// ============================================

export type WorkflowType = 'NL_WORKFLOW';

export interface WorkflowTypeConfig {
  // Display info
  displayName: string;
  description: string;

  // Call type identifier (written into dynamic_variables.call_type so
  // webhook handlers can route the completion back to WorkflowCallOutcome).
  callType: string;

  // Batching / pacing
  batchSize: number;
  intraBatchGapMs: number;
  delayBetweenBatchesMs: number;
  batchTimeoutMs: number;

  // Calling-hours guard (UTC). Calls are only placed when
  // callingHourStart <= utcHour < callingHourEnd.
  callingHourStart: number;
  callingHourEnd: number;

  // Log buffer kept in memory for the UI.
  recentLogsLimit: number;

  // Hard safety cap on number of targets per execution.
  maxTargetsPerExecution: number;
}

// ============================================
// TYPE-SPECIFIC CONFIGURATIONS
// ============================================

export const WORKFLOW_CONFIGS: Record<WorkflowType, WorkflowTypeConfig> = {
  NL_WORKFLOW: {
    displayName: 'NL Workflow',
    description: 'Natural-language manager-to-rep workflow calls',
    callType: 'NL_WORKFLOW',

    batchSize: 2,
    intraBatchGapMs: 1000,
    delayBetweenBatchesMs: 2 * 60 * 1000,
    batchTimeoutMs: 10 * 60 * 1000,

    callingHourStart: 8,
    callingHourEnd: 16,

    recentLogsLimit: 50,

    maxTargetsPerExecution: 50,
  },
};

// ============================================
// HELPERS
// ============================================

export function getWorkflowConfig(type: WorkflowType = 'NL_WORKFLOW'): WorkflowTypeConfig {
  return WORKFLOW_CONFIGS[type];
}

export function isWithinCallingHours(type: WorkflowType = 'NL_WORKFLOW'): boolean {
  const cfg = WORKFLOW_CONFIGS[type];
  const utcHour = new Date().getUTCHours();
  return utcHour >= cfg.callingHourStart && utcHour < cfg.callingHourEnd;
}

export function formatCallingHoursError(type: WorkflowType = 'NL_WORKFLOW'): string {
  const cfg = WORKFLOW_CONFIGS[type];
  return `Calls can only be placed between ${cfg.callingHourStart
    .toString()
    .padStart(2, '0')}:00 and ${cfg.callingHourEnd
    .toString()
    .padStart(2, '0')}:00 UTC. Current UTC time: ${new Date().toISOString().slice(11, 16)}.`;
}
