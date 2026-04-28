/**
 * Workflow Type Definitions
 * Phase 1: Foundation - Type system for text-to-workflow engine
 */

// ============================================
// WORKFLOW CONFIG SCHEMA
// ============================================

/**
 * Parsed workflow configuration from NL prompt
 * This is what the LLM generates from natural language
 */
export interface WorkflowConfig {
  // Audience targeting
  audienceQuery: AudienceQuery;
  
  // Call script
  scriptTemplate: ScriptTemplate;
  
  // Success criteria
  successCriteria: SuccessCriteria;
  
  // Write-back actions
  writeBackActions: WriteBackAction[];
  
  // Metadata
  estimatedTargets?: number;
  estimatedDuration?: number; // minutes
}

/**
 * Audience query - defines who to call
 */
export interface AudienceQuery {
  // Query type
  type: 'missing_sql' | 'stale_deals' | 'post_meeting' | 'meddic_gap' | 'custom';
  
  // Filters (for BarrierX bulk API)
  filters?: {
    dealStage?: string[]; // e.g., ["Negotiation", "Closed Won"]
    dealPipeline?: string[]; // e.g., ["default", "Sales Pipeline"]
    dealMinAmount?: number;
    dealMaxAmount?: number;
    dealUpdatedSince?: string; // ISO 8601
    dealCreatedSince?: string; // ISO 8601
    tenantSlugs?: string[]; // Filter specific tenants
  };
  
  // Custom logic (for complex audience resolution)
  customLogic?: {
    description: string; // Plain English description of the logic
    conditions: AudienceCondition[];
  };
}

/**
 * Audience condition for complex targeting
 */
export interface AudienceCondition {
  field: string; // e.g., "meetings.endTime", "contacts.length", "amount"
  operator: 'gt' | 'lt' | 'eq' | 'ne' | 'in' | 'nin' | 'exists' | 'notExists' | 'between';
  value: any;
  description?: string; // Human-readable explanation
}

/**
 * Call script template with variables
 */
export interface ScriptTemplate {
  // Opening message (first thing AI says)
  opening: string;
  
  // Main ask/question
  mainAsk: string;
  
  // Branching logic
  branches: {
    accepted?: string; // What to say if rep accepts
    declined?: string; // What to say if rep declines
    objection?: string; // How to handle objections
    voicemail?: string; // Voicemail message
  };
  
  // Variables to inject (e.g., {rep_name}, {deal_name}, {missing_field})
  variables: string[]; // List of variable names used in the script
  
  // ElevenLabs agent configuration
  agentConfig?: {
    firstMessage?: string; // Override opening for ElevenLabs
    systemPrompt?: string; // System prompt additions
    temperature?: number;
    maxDuration?: number; // seconds
  };
}

/**
 * Success criteria - what makes this workflow successful
 */
export interface SuccessCriteria {
  // Primary success metric
  primary: {
    metric: 'acceptance_rate' | 'data_collected' | 'engagement' | 'completion_rate';
    threshold: number; // e.g., 0.7 for 70%
    description: string;
  };
  
  // Secondary metrics (optional)
  secondary?: Array<{
    metric: string;
    threshold: number;
    description: string;
  }>;
}

/**
 * Write-back action - what to do with call outcomes
 */
export interface WriteBackAction {
  // Action type
  type: 'create_note' | 'update_field' | 'create_task' | 'create_meeting' | 'update_stage';
  
  // Trigger condition
  trigger: {
    outcome: 'ACCEPTED' | 'DECLINED' | 'DEFERRED' | 'ANY' | 'SUCCESS';
    condition?: string; // Optional additional condition
  };
  
  // Action configuration
  config: {
    // For create_note
    noteTemplate?: string;
    
    // For update_field
    fieldName?: string;
    fieldValue?: string | boolean | number;
    
    // For create_task
    taskTitle?: string;
    taskBody?: string;
    taskDueDate?: string; // Relative (e.g., "+7d") or absolute
    
    // For create_meeting
    meetingTitle?: string;
    meetingDuration?: number; // minutes
    
    // For update_stage
    newStage?: string;
  };
  
  description: string; // Human-readable description
}

// ============================================
// RESOLVED AUDIENCE
// ============================================

/**
 * Target contact for a workflow execution
 */
export interface WorkflowTarget {
  // Contact info
  name: string;
  phone: string;
  email: string;
  
  // Deal context
  dealId: string;
  dealName: string;
  dealStage?: string;
  dealAmount?: number;
  tenantSlug: string;
  
  // Owner info (HubSpot owner ID)
  hubspotOwnerId: string;
  
  // Custom data for script personalization
  customData?: Record<string, any>;
}

// ============================================
// LLM CLASSIFICATION
// ============================================

/**
 * LLM classification result for call outcome
 */
export interface OutcomeClassification {
  // Primary outcome
  outcome: 'ACCEPTED' | 'DECLINED' | 'DEFERRED' | 'VOICEMAIL' | 'NO_ANSWER' | 'BUSY' | 'FAILED' | 'PARTIAL';
  
  // Confidence score (0-1)
  confidence: number;
  
  // Reasoning
  reasoning: string;
  
  // Extracted data points
  dataPoints?: Record<string, any>;
  
  // Suggested write-back actions
  suggestedActions?: string[];
}

// ============================================
// EXECUTION SUMMARY
// ============================================

/**
 * Workflow execution summary for Slack/notifications
 */
export interface ExecutionSummary {
  workflowId: string;
  workflowName: string;
  executionId: string;
  
  // Stats
  totalTargets: number;
  callsInitiated: number;
  callsCompleted: number;
  callsSuccessful: number;
  callsFailed: number;
  
  // Outcomes breakdown
  outcomes: {
    accepted: number;
    declined: number;
    deferred: number;
    voicemail: number;
    noAnswer: number;
    busy: number;
    failed: number;
  };
  
  // Timing
  startedAt: Date;
  completedAt: Date;
  duration: number; // milliseconds
  
  // Write-back results
  writeBackActions: {
    total: number;
    successful: number;
    failed: number;
  };
  
  // Success rate
  successRate: number; // 0-1
  meetsSuccessCriteria: boolean;
}

// ============================================
// GUARDRAILS
// ============================================

/**
 * Validation result for workflow config
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

// ============================================
// PROMPT INJECTION DETECTION
// ============================================

/**
 * Prompt injection detection result
 */
export interface InjectionDetectionResult {
  isSafe: boolean;
  confidence: number;
  detectedPatterns: string[];
  sanitizedPrompt?: string;
}
