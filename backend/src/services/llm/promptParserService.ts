/**
 * Prompt Parser Service
 * Phase 1: Foundation - NL prompt → workflow JSON parser
 */

import { z } from 'zod';
import { generateStructuredOutput } from './deepseekService';
import {
  WorkflowConfig,
  AudienceQuery,
  ScriptTemplate,
  SuccessCriteria,
  WriteBackAction,
  ValidationResult,
  InjectionDetectionResult,
} from '../../types/workflow';

// ============================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================

const AudienceConditionSchema = z.object({
  field: z.string(),
  operator: z.enum(['gt', 'lt', 'eq', 'ne', 'in', 'nin', 'exists', 'notExists', 'between']),
  value: z.any(),
  description: z.string().optional(),
});

const AudienceQuerySchema = z.object({
  type: z.enum(['missing_sql', 'stale_deals', 'post_meeting', 'meddic_gap', 'custom']),
  filters: z.object({
    dealStage: z.array(z.string()).optional(),
    dealPipeline: z.array(z.string()).optional(),
    dealMinAmount: z.number().optional(),
    dealMaxAmount: z.number().optional(),
    dealUpdatedSince: z.string().optional(),
    dealCreatedSince: z.string().optional(),
    tenantSlugs: z.array(z.string()).optional(),
  }).optional(),
  customLogic: z.object({
    description: z.string(),
    conditions: z.array(AudienceConditionSchema),
  }).optional(),
});

const ScriptTemplateSchema = z.object({
  opening: z.string(),
  mainAsk: z.string(),
  branches: z.object({
    accepted: z.string().optional(),
    declined: z.string().optional(),
    objection: z.string().optional(),
    voicemail: z.string().optional(),
  }),
  variables: z.array(z.string()),
  agentConfig: z.object({
    firstMessage: z.string().optional(),
    systemPrompt: z.string().optional(),
    temperature: z.number().optional(),
    maxDuration: z.number().optional(),
  }).optional(),
});

const SuccessCriteriaSchema = z.object({
  primary: z.object({
    metric: z.enum(['acceptance_rate', 'data_collected', 'engagement', 'completion_rate']),
    threshold: z.number(),
    description: z.string(),
  }),
  secondary: z.array(z.object({
    metric: z.string(),
    threshold: z.number(),
    description: z.string(),
  })).optional(),
});

const WriteBackActionSchema = z.object({
  type: z.enum(['create_note', 'update_field', 'create_task', 'create_meeting', 'update_stage']),
  trigger: z.object({
    outcome: z.enum(['ACCEPTED', 'DECLINED', 'DEFERRED', 'ANY', 'SUCCESS']),
    condition: z.string().optional(),
  }),
  config: z.object({
    noteTemplate: z.string().optional(),
    fieldName: z.string().optional(),
    fieldValue: z.union([z.string(), z.boolean(), z.number()]).optional(),
    taskTitle: z.string().optional(),
    taskBody: z.string().optional(),
    taskDueDate: z.string().optional(),
    meetingTitle: z.string().optional(),
    meetingDuration: z.number().optional(),
    newStage: z.string().optional(),
  }),
  description: z.string(),
});

const WorkflowConfigSchema = z.object({
  audienceQuery: AudienceQuerySchema,
  scriptTemplate: ScriptTemplateSchema,
  successCriteria: SuccessCriteriaSchema,
  writeBackActions: z.array(WriteBackActionSchema),
  estimatedTargets: z.number().optional(),
  estimatedDuration: z.number().optional(),
});

// ============================================
// PROMPT INJECTION DETECTION
// ============================================

/**
 * Detect potential prompt injection attacks
 * Checks for common patterns like "Ignore previous instructions", system prompts, etc.
 */
export const detectPromptInjection = (prompt: string): InjectionDetectionResult => {
  const injectionPatterns = [
    /ignore\s+(previous|prior|all)\s+instructions/i,
    /system\s*:\s*/i,
    /you\s+are\s+now/i,
    /forget\s+everything/i,
    /<\s*\/?system\s*>/i,
    /\[INST\]/i,
    /\[\/INST\]/i,
    /<\|im_start\|>/i,
    /<\|im_end\|>/i,
    /assistant\s*:\s*/i,
    /human\s*:\s*/i,
  ];

  const detectedPatterns: string[] = [];
  let isSafe = true;

  for (const pattern of injectionPatterns) {
    if (pattern.test(prompt)) {
      detectedPatterns.push(pattern.source);
      isSafe = false;
    }
  }

  // Calculate confidence (simple heuristic)
  const confidence = isSafe ? 0.95 : Math.max(0.3, 1.0 - (detectedPatterns.length * 0.2));

  return {
    isSafe,
    confidence,
    detectedPatterns,
    sanitizedPrompt: isSafe ? prompt : prompt.replace(/[<>[\]|]/g, ''),
  };
};

// ============================================
// PROMPT PARSER
// ============================================

/**
 * Parse natural language prompt into structured workflow configuration
 */
export const parseWorkflowPrompt = async (nlPrompt: string): Promise<WorkflowConfig> => {
  // Step 1: Prompt injection check
  console.log('🔒 Checking for prompt injection...');
  const injectionCheck = detectPromptInjection(nlPrompt);
  
  if (!injectionCheck.isSafe) {
    console.error('⚠️  Potential prompt injection detected!');
    console.error(`   Patterns: ${injectionCheck.detectedPatterns.join(', ')}`);
    throw new Error(
      `Prompt failed security validation. Detected suspicious patterns: ${injectionCheck.detectedPatterns.slice(0, 2).join(', ')}`
    );
  }

  console.log('✅ Prompt injection check passed');

  // Step 2: Parse with DeepSeek
  console.log('🤖 Parsing natural language prompt...');
  console.log(`   Prompt: "${nlPrompt.substring(0, 100)}${nlPrompt.length > 100 ? '...' : ''}"`);

  const systemPrompt = `You are an expert at parsing natural language requests into structured workflow configurations for AgentX, a RevOps automation platform.

Your task is to analyze the user's natural language prompt and extract:
1. WHO to call (audience targeting)
2. WHAT to say (call script)
3. WHAT defines success (success criteria)
4. WHAT to do with results (write-back actions)

Guidelines:
- Be specific and actionable
- Extract all relevant filters from the prompt
- Generate professional, conversational call scripts
- Identify appropriate variables for personalization (e.g., {rep_name}, {deal_name}, {company})
- Define realistic success metrics
- Map outcomes to appropriate CRM actions

Examples of audience types:
- "reps who haven't added SQL" → type: missing_sql
- "deals with no activity in 14 days" → type: stale_deals
- "meetings that ended in last 24h" → type: post_meeting
- "deals >$50k with incomplete MEDDIC" → type: meddic_gap
- Custom complex queries → type: custom with conditions

Common variables:
- {rep_name} - sales rep's first name
- {deal_name} - deal/opportunity name
- {company} - company/account name
- {deal_amount} - deal value
- {deal_stage} - current stage
- {missing_field} - specific field that's missing
- {days_inactive} - number of days without activity

Write-back actions:
- create_note: Add a note to the deal with call summary
- update_field: Update a specific CRM field (e.g., SQL qualification)
- create_task: Create a follow-up task
- create_meeting: Schedule a meeting
- update_stage: Move deal to different stage

Return a complete, valid workflow configuration.`;

  try {
    const workflowConfig = await generateStructuredOutput<WorkflowConfig>({
      prompt: nlPrompt,
      systemPrompt,
      schema: WorkflowConfigSchema,
      temperature: 0.4, // Slightly higher for creativity in script generation
      modelType: 'chat', // Use chat model for speed
    });

    console.log('✅ Workflow config parsed successfully');
    console.log(`   Audience type: ${workflowConfig.audienceQuery.type}`);
    console.log(`   Script variables: ${workflowConfig.scriptTemplate.variables.join(', ')}`);
    console.log(`   Write-back actions: ${workflowConfig.writeBackActions.length}`);

    return workflowConfig;
  } catch (error: any) {
    console.error('❌ Failed to parse workflow prompt:', error.message);
    throw new Error(`Failed to parse prompt: ${error.message}`);
  }
};

// ============================================
// WORKFLOW VALIDATION
// ============================================

/**
 * Validate parsed workflow configuration
 */
export const validateWorkflowConfig = (config: WorkflowConfig): ValidationResult => {
  const errors: ValidationResult['errors'] = [];
  const warnings: ValidationResult['warnings'] = [];

  // Validate audience query
  if (!config.audienceQuery.type) {
    errors.push({
      field: 'audienceQuery.type',
      message: 'Audience query type is required',
      code: 'MISSING_AUDIENCE_TYPE',
    });
  }

  // Validate script template
  if (!config.scriptTemplate.opening || config.scriptTemplate.opening.length < 10) {
    errors.push({
      field: 'scriptTemplate.opening',
      message: 'Script opening must be at least 10 characters',
      code: 'INVALID_SCRIPT_OPENING',
    });
  }

  if (!config.scriptTemplate.mainAsk || config.scriptTemplate.mainAsk.length < 10) {
    errors.push({
      field: 'scriptTemplate.mainAsk',
      message: 'Main ask must be at least 10 characters',
      code: 'INVALID_MAIN_ASK',
    });
  }

  // Check for undefined variables in script
  const scriptText = `${config.scriptTemplate.opening} ${config.scriptTemplate.mainAsk}`;
  const usedVariables = scriptText.match(/\{([^}]+)\}/g) || [];
  const declaredVariables = config.scriptTemplate.variables;
  
  const undeclaredVars = usedVariables
    .map(v => v.slice(1, -1))
    .filter(v => !declaredVariables.includes(v));
  
  if (undeclaredVars.length > 0) {
    warnings.push({
      field: 'scriptTemplate.variables',
      message: `Undeclared variables found: ${undeclaredVars.join(', ')}`,
      severity: 'medium',
    });
  }

  // Validate success criteria
  if (config.successCriteria.primary.threshold < 0 || config.successCriteria.primary.threshold > 1) {
    errors.push({
      field: 'successCriteria.primary.threshold',
      message: 'Success threshold must be between 0 and 1',
      code: 'INVALID_THRESHOLD',
    });
  }

  // Validate write-back actions
  if (config.writeBackActions.length === 0) {
    warnings.push({
      field: 'writeBackActions',
      message: 'No write-back actions defined. Call outcomes will not be saved to CRM.',
      severity: 'high',
    });
  }

  // Check for duplicate write-back actions
  const actionTypes = config.writeBackActions.map(a => `${a.type}-${a.trigger.outcome}`);
  const duplicates = actionTypes.filter((item, index) => actionTypes.indexOf(item) !== index);
  
  if (duplicates.length > 0) {
    warnings.push({
      field: 'writeBackActions',
      message: 'Duplicate write-back actions detected',
      severity: 'low',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};

// ============================================
// WORKFLOW SUMMARY GENERATION
// ============================================

/**
 * Generate human-readable summary of workflow config
 */
export const generateWorkflowSummary = (config: WorkflowConfig): string => {
  const audienceDesc = getAudienceDescription(config.audienceQuery);
  const scriptDesc = `"${config.scriptTemplate.mainAsk.substring(0, 100)}${config.scriptTemplate.mainAsk.length > 100 ? '...' : ''}"`;
  const successDesc = `${(config.successCriteria.primary.threshold * 100).toFixed(0)}% ${config.successCriteria.primary.metric.replace('_', ' ')}`;
  const actionsDesc = config.writeBackActions.map(a => a.type.replace('_', ' ')).join(', ');

  return `This workflow will call ${audienceDesc} and ask ${scriptDesc}. Success is defined as ${successDesc}. Actions: ${actionsDesc}.`;
};

/**
 * Get human-readable audience description
 */
const getAudienceDescription = (query: AudienceQuery): string => {
  switch (query.type) {
    case 'missing_sql':
      return 'reps with deals missing SQL qualification';
    case 'stale_deals':
      return 'reps with stale deals (no recent activity)';
    case 'post_meeting':
      return 'reps after recent meetings';
    case 'meddic_gap':
      return 'reps with incomplete MEDDIC qualifications';
    case 'custom':
      return query.customLogic?.description || 'custom audience';
    default:
      return 'specified audience';
  }
};
