/**
 * Gathering Configuration Module
 * 
 * Centralizes all configuration for info gathering call types.
 * Uses a single unified ElevenLabs agent with 3 server tools.
 * 
 * This module makes it easy to:
 * - Add new gathering types
 * - Configure type-specific settings (questions, dynamic variables)
 * - Maintain separate callback endpoints per type
 */

import { config } from './env';

// ============================================
// TYPES
// ============================================

export type GatheringType = 'ZERO_SCORE' | 'LOST_DEAL' | 'INACTIVITY';

export interface GatheringTypeConfig {
    // Display info
    displayName: string;
    description: string;

    // Call type identifier
    callType: string;

    // Dynamic variables specific to this type
    contextMessageTemplate: (dealName: string) => string;
    additionalDynamicVariables?: Record<string, string>;

    // Callback endpoint (for server tool)
    callbackEndpoint: string;

    // Deal filter criteria
    dealFilter: {
        // Function name to filter deals
        filterFn: string;
        // Description for logging
        filterDescription: string;
    };

    // Questions asked during the call
    questions: string[];

    // Fields saved to database
    savedFields: string[];

    // Delay between batches in milliseconds (to prevent call flooding)
    delayBetweenBatchesMs: number;
}

// ============================================
// TYPE-SPECIFIC CONFIGURATIONS
// ============================================

export const GATHERING_CONFIGS: Record<GatheringType, GatheringTypeConfig> = {
    ZERO_SCORE: {
        displayName: 'Zero Score',
        description: 'Deals with no BarrierX scores',
        callType: 'BARRIERX_INFO_GATHERING',

        // Context message template
        contextMessageTemplate: (dealName: string) =>
            `This is a call to gather information about deal "${dealName}" which has no BarrierX scores yet.`,

        // Callback endpoint
        callbackEndpoint: '/api/webhook/info-gathering/zero-score',

        // Deal filter
        dealFilter: {
            filterFn: 'hasNoBarrierXScore',
            filterDescription: 'deals with no BarrierX scores (all scores = 0)',
        },

        // Questions
        questions: [
            'What are the quantified pain points for this deal?',
            'Who is your champion - the internal advocate actively pushing for this deal?',
            'Who is the economic buyer - the person with authority to approve the budget?',
        ],

        // Database fields
        savedFields: ['quantifiedPainPoints', 'championInfo', 'economicBuyerInfo'],

        // 5 minutes between batches
        delayBetweenBatchesMs: 5 * 60 * 1000,
    },

    LOST_DEAL: {
        displayName: 'Lost Deal',
        description: 'Deals marked as Lost',
        callType: 'LOST_DEAL_QUESTIONNAIRE',

        // Context message template
        contextMessageTemplate: (dealName: string) =>
            `This is a call to gather feedback about deal "${dealName}" which was marked as Lost.`,

        // Additional dynamic variables specific to lost deals
        additionalDynamicVariables: {
            // loss_stage will be added dynamically from deal.stage
        },

        // Callback endpoint
        callbackEndpoint: '/api/webhook/info-gathering/lost-deal',

        // Deal filter
        dealFilter: {
            filterFn: 'isLost',
            filterDescription: 'deals marked as "Lost"',
        },

        // Questions
        questions: [
            'What was the primary reason this deal was lost?',
            'Who was the deal lost to?',
            'What could we improve for next time?',
        ],

        // Database fields
        savedFields: ['lossReason', 'competitorName', 'lessonsLearned'],

        // 30 minutes between batches (longer gap for lost deals to prevent flooding)
        delayBetweenBatchesMs: 30 * 60 * 1000,
    },

    INACTIVITY: {
        displayName: 'Inactivity Check',
        description: 'Deals with no activity for 2 weeks',
        callType: 'INACTIVITY_CHECK',

        // Context message template
        contextMessageTemplate: (dealName: string) =>
            `This is a call to check on deal "${dealName}" which has had no activity for 2 weeks.`,

        // Callback endpoint
        callbackEndpoint: '/api/webhook/info-gathering/inactivity',

        // Deal filter
        dealFilter: {
            filterFn: 'hasNoRecentActivity',
            filterDescription: 'deals with no activity in the last 2 weeks',
        },

        // Questions
        questions: [
            'What\'s the current status of this deal?',
            'Are there any blockers or challenges you\'re facing?',
            'What are the next steps you\'re planning?',
        ],

        // Database fields
        savedFields: ['currentStatus', 'blockers', 'nextSteps'],

        // 10 minutes between batches
        delayBetweenBatchesMs: 10 * 60 * 1000,
    },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the agent ID for info gathering.
 * Uses a single unified agent for all gathering types.
 */
export function getAgentIdForType(_type: GatheringType): string | undefined {
    return config.elevenlabs.infoGatheringAgentId || undefined;
}

/**
 * Get configuration for a specific gathering type.
 */
export function getGatheringConfig(type: GatheringType): GatheringTypeConfig {
    return GATHERING_CONFIGS[type];
}

/**
 * Build dynamic variables for a gathering type.
 */
export function buildDynamicVariables(
    type: GatheringType,
    baseVariables: Record<string, string>,
    deal: { dealName: string; stage?: string }
): Record<string, string> {
    const typeConfig = GATHERING_CONFIGS[type];

    const variables: Record<string, string> = {
        ...baseVariables,
        gathering_type: type,
        call_type: typeConfig.callType,
        context_message: typeConfig.contextMessageTemplate(deal.dealName),
    };

    // Add type-specific additional variables
    if (typeConfig.additionalDynamicVariables) {
        Object.assign(variables, typeConfig.additionalDynamicVariables);
    }

    // Special handling for lost deals - add the loss stage
    if (type === 'LOST_DEAL' && deal.stage) {
        variables.loss_stage = deal.stage;
    }

    return variables;
}

/**
 * Get Redis key for tracking called deals.
 * Each type has its own namespace to prevent collisions.
 */
export function getRedisKey(type: GatheringType, dealId: string): string {
    return `barrierx:info:called:${type}:${dealId}`;
}

/**
 * Get all supported gathering types.
 */
export function getAllGatheringTypes(): GatheringType[] {
    return Object.keys(GATHERING_CONFIGS) as GatheringType[];
}

/**
 * Check if a gathering type is valid.
 */
export function isValidGatheringType(type: string): type is GatheringType {
    return type in GATHERING_CONFIGS;
}

/**
 * Get display info for all gathering types (for UI).
 */
export function getGatheringTypeDisplayInfo(): Array<{
    type: GatheringType;
    displayName: string;
    description: string;
    isConfigured: boolean;
}> {
    return getAllGatheringTypes().map(type => ({
        type,
        displayName: GATHERING_CONFIGS[type].displayName,
        description: GATHERING_CONFIGS[type].description,
        isConfigured: !!getAgentIdForType(type),
    }));
}
