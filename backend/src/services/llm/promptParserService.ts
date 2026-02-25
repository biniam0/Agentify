/**
 * Simple Intent Parser Service
 * Simplified MVP: NL prompt → simple intent → targets → execution
 */

import { z } from 'zod';
import { generateStructuredOutput } from './deepseekService';

// ============================================
// SIMPLIFIED SCHEMAS
// ============================================

// Simple intent interface for LLM parsing
const SimpleIntentSchema = z.object({
  // What the user wants to do
  action: z.string().describe("The main action to perform (e.g., 'call about missing SQL', 'follow up on deal')"),
  
  // Who to target (simple criteria)
  target_criteria: z.object({
    contact_name: z.string().optional().describe("Specific contact name to target"),
    deal_name: z.string().optional().describe("Specific deal name to target"),
    company: z.string().optional().describe("Company name to target"),
    deal_stage: z.string().optional().describe("Deal stage to filter by"),
    deal_min_amount: z.number().optional().describe("Minimum deal amount"),
    deal_max_amount: z.number().optional().describe("Maximum deal amount"),
    tenant_slug: z.string().optional().describe("Specific tenant/organization"),
    keywords: z.array(z.string()).optional().describe("Keywords to search for in deal names or descriptions"),
  }),
  
  // What to say (simple script)
  script: z.object({
    opening: z.string().describe("Opening message for the call"),
    main_ask: z.string().describe("Main request or question"),
    context: z.string().optional().describe("Additional context or background"),
  }),
  
  // Expected outcome
  goal: z.string().describe("What success looks like for this workflow"),
});

export interface SimpleIntent {
  action: string;
  target_criteria: {
    contact_name?: string;
    deal_name?: string;
    company?: string;
    deal_stage?: string;
    deal_min_amount?: number;
    deal_max_amount?: number;
    tenant_slug?: string;
    keywords?: string[];
  };
  script: {
    opening: string;
    main_ask: string;
    context?: string;
  };
  goal: string;
}

// ============================================
// SIMPLE PROMPT INJECTION DETECTION
// ============================================

export const detectPromptInjection = (prompt: string): { isSafe: boolean; sanitizedPrompt: string } => {
  const injectionPatterns = [
    /ignore\s+(previous|prior|all)\s+instructions/i,
    /system\s*:\s*/i,
    /you\s+are\s+now/i,
    /forget\s+everything/i,
  ];

  const isSafe = !injectionPatterns.some(pattern => pattern.test(prompt));
  
  return {
    isSafe,
    sanitizedPrompt: isSafe ? prompt : prompt.replace(/[<>[\]|]/g, ''),
  };
};

// ============================================
// SIMPLE INTENT PARSER
// ============================================

/**
 * Parse natural language prompt into simple intent
 */
export const parseIntent = async (nlPrompt: string): Promise<SimpleIntent> => {
  // Step 1: Basic security check
  console.log('🔒 Checking for prompt injection...');
  const injectionCheck = detectPromptInjection(nlPrompt);
  
  if (!injectionCheck.isSafe) {
    throw new Error('Prompt failed security validation');
  }

  console.log('✅ Security check passed');

  // Step 2: Parse with DeepSeek
  console.log('🤖 Parsing intent from prompt...');
  console.log(`   Prompt: "${nlPrompt.substring(0, 100)}${nlPrompt.length > 100 ? '...' : ''}"`);

  const systemPrompt = `You are an expert at parsing natural language requests into actionable intents for AgentX.

Context: You're creating scripts for managers/administrators who want to call their sales reps about specific deals or topics.

Your task: Extract WHO to call, WHAT to say, and WHY from the user's request.

Guidelines:
- The caller is a manager/admin calling their sales rep
- Use {{requester_name}} for the caller's name (will be filled in later)
- Use {{owner_name}} for the sales rep being called
- Generate professional, direct scripts appropriate for manager-to-rep communication
- Focus on getting specific information about deals, progress, or issues
- Include the actual deal names and any specific questions asked
- Be conversational but professional

IMPORTANT - Deal Stage Filtering Rules:
- Only include "deal_stage" in target_criteria when filtering FOR deals IN that stage
- Do NOT include "deal_stage" when asking ABOUT or QUESTIONING a deal's stage
- Examples:
  * "Call reps with deals in Negotiation" → include deal_stage: "Negotiation"
  * "Ask why the deal is in Negotiation" → do NOT include deal_stage (it's a question)
  * "Check on deals stuck in Demo" → include deal_stage: "Demo"
  * "Find out why deal moved to Closed Lost" → do NOT include deal_stage (it's a question)

Script Template Rules:
- Opening: "Hi {{owner_name}}, this is {{requester_name}}. I wanted to check in about [specific deal/topic]."
- Main ask: Be direct about what information is needed
- Keep it professional but conversational
- Reference specific deals, stages, or issues mentioned in the request

Examples:
- "Call John about the Microsoft deal status" → 
  Opening: "Hi {{owner_name}}, this is {{requester_name}}. I wanted to get an update on the Microsoft deal."
  
- "Ask Sarah why the Oracle deal is stuck in Demo stage" → 
  Opening: "Hi {{owner_name}}, this is {{requester_name}}. I noticed the Oracle deal is in Demo stage and wanted to understand what's happening."
  
- "Give Tamirat a call about the Wesgroup deal and ask why it's in Negotiation" →
  Opening: "Hi {{owner_name}}, this is {{requester_name}}. I wanted to check in about the Wesgroup deal and understand why it's currently in the Negotiation stage."

Return a simple intent structure with clear targeting criteria and professional scripts using the {{variable}} format.`;

  try {
    const intent = await generateStructuredOutput<SimpleIntent>({
      prompt: nlPrompt,
      systemPrompt,
      schema: SimpleIntentSchema,
      temperature: 0.1, // Lower temperature for more consistent, precise intent parsing
      modelType: 'chat',
    });

    console.log('✅ Intent parsed successfully');
    console.log(`   Action: ${intent.action}`);
    console.log(`   Target criteria: ${JSON.stringify(intent.target_criteria)}`);

    return intent;
  } catch (error: any) {
    console.error('❌ Failed to parse intent:', error.message);
    throw new Error(`Failed to parse intent: ${error.message}`);
  }
};

// ============================================
// INTENT VALIDATION
// ============================================

/**
 * Validate parsed intent
 */
export const validateIntent = (intent: SimpleIntent): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Basic validation
  if (!intent.action || intent.action.length < 5) {
    errors.push('Action must be at least 5 characters');
  }

  if (!intent.script.opening || intent.script.opening.length < 10) {
    errors.push('Opening message must be at least 10 characters');
  }

  if (!intent.script.main_ask || intent.script.main_ask.length < 10) {
    errors.push('Main ask must be at least 10 characters');
  }

  if (!intent.goal || intent.goal.length < 5) {
    errors.push('Goal must be specified');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// ============================================
// INTENT SUMMARY GENERATION
// ============================================

/**
 * Generate human-readable summary of intent
 */
export const generateIntentSummary = (intent: SimpleIntent): string => {
  const criteria = intent.target_criteria;
  let targetDesc = 'contacts';
  
  if (criteria.contact_name) targetDesc = `${criteria.contact_name}`;
  else if (criteria.deal_name) targetDesc = `contacts with "${criteria.deal_name}" deal`;
  else if (criteria.company) targetDesc = `contacts from ${criteria.company}`;
  else if (criteria.deal_stage) targetDesc = `contacts with ${criteria.deal_stage} deals`;
  
  return `${intent.action}: Call ${targetDesc} to ${intent.script.main_ask.toLowerCase()}`;
};
