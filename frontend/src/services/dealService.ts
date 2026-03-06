import api from './api';

// Types
export interface DealOwner {
  name: string;
  email: string;
  phone: string;
  timezone?: string;
  hubspotId?: string;
}

export interface DealRiskScores {
  arenaRisk: number;
  controlRoomRisk: number;
  scoreCardRisk: number;
  totalDealRisk: number;
  subCategoryRisk: Record<string, number>;
}

export interface Deal {
  id: string;
  dealName: string;
  company: string;
  pipelineName: string;
  stage: string;
  amount: number;
  owner: DealOwner;
  riskScores: DealRiskScores;
  createdAt?: string;
  updatedAt?: string;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
}

export interface DealsResponse {
  ok: boolean;
  deals: Deal[];
  total: number;
  tenantCount: number;
}

export type GatheringType = 'ZERO_SCORE' | 'LOST_DEAL' | 'INACTIVITY';

export interface TriggerInfoCallResponse {
  success: boolean;
  message?: string;
  error?: string;
  conversationId?: string;
  callSid?: string;
  recordId?: string;
}

/**
 * Get all deals from BarrierX bulk API (admin only)
 */
export const getAdminDeals = async (): Promise<DealsResponse> => {
  const response = await api.get<DealsResponse>('/deals/admin');
  return response.data;
};

/**
 * Trigger info gathering call for a specific deal (admin only)
 */
export const triggerInfoGatheringCall = async (
  dealId: string,
  type: GatheringType,
  deal: Deal
): Promise<TriggerInfoCallResponse> => {
  const response = await api.post<TriggerInfoCallResponse>(
    `/deals/admin/${dealId}/trigger-info-call`,
    {
      type,
      tenantSlug: deal.tenantSlug,
      tenantName: deal.tenantName,
      tenantId: deal.tenantId,
      deal: {
        id: deal.id,
        dealName: deal.dealName,
        company: deal.company,
        pipelineName: deal.pipelineName,
        stage: deal.stage,
        amount: deal.amount,
        owner: deal.owner,
        riskScores: deal.riskScores,
        createdAt: deal.createdAt,
        updatedAt: deal.updatedAt,
      },
    }
  );
  return response.data;
};

export interface AiSummaryResponse {
  ok: boolean;
  summary: string;
  error?: string;
}

/**
 * Generate AI-powered summary of filtered deal data (admin only)
 */
export const generateAiSummary = async (
  deals: unknown[],
  filters?: Record<string, unknown>,
  summary?: Record<string, unknown>,
): Promise<AiSummaryResponse> => {
  const response = await api.post<AiSummaryResponse>('/deals/admin/ai-summary', {
    deals,
    filters,
    summary,
  });
  return response.data;
};
