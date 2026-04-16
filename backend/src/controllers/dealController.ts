/**
 * Deal Controller
 * 
 * Admin-only endpoints for managing deals and triggering info gathering calls
 */

import { Response } from 'express';
import axios from 'axios';
import { config } from '../config/env';
import { AuthRequest } from '../middlewares/auth';
import { triggerSingleDealCall } from '../services/infoGatheringService';
import { GatheringType } from '../config/gatheringConfig';
import { generateCompletion } from '../services/llm/deepseekService';

// Types for BarrierX API response
interface DealOwner {
  name: string;
  email: string;
  phone: string;
  timezone?: string;
  hubspotId?: string;
}

interface DealRiskScores {
  arenaRisk: number;
  controlRoomRisk: number;
  scoreCardRisk: number;
  totalDealRisk: number;
  subCategoryRisk: Record<string, number>;
}

interface Deal {
  id: string;
  dealName: string;
  company: string;
  pipelineName: string;
  stage: string;
  amount: number;
  owner: DealOwner;
  userDealRiskScores: DealRiskScores;
  createdAt?: string;
  updatedAt?: string;
  closeDate?: string;
  summary?: string;
  meetings?: Array<Record<string, unknown>>;
  contacts?: Array<Record<string, unknown>>;
  recommendations?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

interface Tenant {
  id: string;
  slug: string;
  name: string;
}

interface BulkApiResponse {
  ok: boolean;
  tenants: Array<Tenant & { deals: Deal[] }>;
}

const BARRIERX_BULK_API = `${config.barrierx.baseUrl}/api/external/tenants/bulk`;

/**
 * Get all deals from BarrierX bulk API
 */
export const getAdminDeals = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log('📊 ADMIN: Fetching all deals from BarrierX API');

    const params = new URLSearchParams({
      include_deals: 'true',
      include_members: 'false',
      sync_engagements: 'true',
    });

    if (config.automation.dealPipelines.length > 0) {
      params.set('deal_pipeline', config.automation.dealPipelines.join(','));
    }

    // Get deals updated within the configured window
    const dealUpdateSince = new Date();
    dealUpdateSince.setDate(dealUpdateSince.getDate() - config.automation.dealUpdateWindowDays);
    params.set('deal_updated_since', dealUpdateSince.toISOString().split('T')[0] + 'T00:00:00Z');

    const url = `${BARRIERX_BULK_API}?${params.toString()}`;

    const response = await axios.get<BulkApiResponse>(url, {
      headers: {
        'Authorization': `Bearer ${config.barrierx.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.data.ok) {
      throw new Error('BarrierX API returned error');
    }

    // Flatten deals with tenant info (including meetings/contacts for investigation filters)
    const deals: Array<{
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
      closeDate?: string;
      summary?: string;
      meetings?: Array<Record<string, unknown>>;
      contacts?: Array<Record<string, unknown>>;
      recommendations?: Array<Record<string, unknown>>;
      tenantId: string;
      tenantSlug: string;
      tenantName: string;
    }> = [];

    for (const tenant of response.data.tenants) {
      for (const deal of tenant.deals || []) {
        deals.push({
          id: deal.id,
          dealName: deal.dealName,
          company: deal.company,
          pipelineName: deal.pipelineName,
          stage: deal.stage,
          amount: deal.amount,
          owner: deal.owner,
          riskScores: deal.userDealRiskScores,
          createdAt: deal.createdAt,
          updatedAt: deal.updatedAt,
          closeDate: deal.closeDate,
          summary: deal.summary,
          meetings: deal.meetings,
          contacts: deal.contacts,
          recommendations: deal.recommendations,
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
          tenantName: tenant.name,
        });
      }
    }

    const { tenantSlug: filterTenantSlug } = req.query;
    const filteredDeals = filterTenantSlug
      ? deals.filter(d => d.tenantSlug === filterTenantSlug)
      : deals;

    console.log(`   ✅ Found ${deals.length} deals across ${response.data.tenants.length} tenants${filterTenantSlug ? ` (filtered to ${filteredDeals.length} for tenant: ${filterTenantSlug})` : ''}`);

    res.json({
      ok: true,
      deals: filteredDeals,
      total: filteredDeals.length,
      tenantCount: filterTenantSlug ? 1 : response.data.tenants.length,
    });
  } catch (error: any) {
    console.error('❌ Get admin deals error:', error);
    res.status(500).json({
      error: 'Failed to fetch deals',
      message: error.message,
    });
  }
};

/**
 * Trigger info gathering call for a single deal
 */
export const triggerInfoGatheringCall = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { dealId } = req.params;
    const { type, tenantSlug, tenantName, tenantId, deal } = req.body;

    // Validate gathering type
    const validTypes: GatheringType[] = ['ZERO_SCORE', 'LOST_DEAL', 'INACTIVITY'];
    if (!type || !validTypes.includes(type)) {
      res.status(400).json({
        error: 'Invalid gathering type',
        message: `Type must be one of: ${validTypes.join(', ')}`,
      });
      return;
    }

    // Validate required data
    if (!deal || !tenantSlug) {
      res.status(400).json({
        error: 'Missing required data',
        message: 'Deal data and tenant slug are required',
      });
      return;
    }

    const triggeredBy = req.user?.email || 'admin';
    console.log(`🎯 ADMIN: Triggering ${type} call for deal ${dealId} by ${triggeredBy}`);

    // Prepare tenant and deal objects
    const tenant: Tenant = {
      id: tenantId || tenantSlug,
      slug: tenantSlug,
      name: tenantName || tenantSlug,
    };

    const dealData: Deal = {
      id: deal.id || dealId,
      dealName: deal.dealName,
      company: deal.company,
      pipelineName: deal.pipelineName || '',
      stage: deal.stage,
      amount: deal.amount,
      owner: deal.owner,
      userDealRiskScores: deal.riskScores || {
        arenaRisk: 0,
        controlRoomRisk: 0,
        scoreCardRisk: 0,
        totalDealRisk: 0,
        subCategoryRisk: {},
      },
      createdAt: deal.createdAt,
      updatedAt: deal.updatedAt,
    };

    // Trigger the call
    const result = await triggerSingleDealCall(tenant, dealData, type as GatheringType, triggeredBy);

    if (!result.success) {
      res.status(400).json({
        error: 'Failed to trigger call',
        message: result.error,
      });
      return;
    }

    res.json({
      success: true,
      message: `${type} call triggered successfully`,
      conversationId: result.conversationId,
      callSid: result.callSid,
      recordId: result.recordId,
    });
  } catch (error: any) {
    console.error('❌ Trigger info gathering call error:', error);
    res.status(500).json({
      error: 'Failed to trigger info gathering call',
      message: error.message,
    });
  }
};

/**
 * Generate AI-powered summary of filtered deal data
 */
export const generateDealSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { deals, filters, summary } = req.body;

    if (!deals || !Array.isArray(deals) || deals.length === 0) {
      res.status(400).json({ error: 'No deals provided' });
      return;
    }

    console.log(`🤖 ADMIN: Generating AI summary for ${deals.length} deals`);

    const condensed = deals.slice(0, 60).map((d: Record<string, any>) => ({
      name: d.dealName,
      company: d.company,
      stage: d.stage,
      amount: d.amount,
      owner: d.owner?.name,
      tenant: d.tenantName || d.tenantSlug,
      risk: d.riskScores?.totalDealRisk ?? d._suggestedGatheringType ?? null,
      suggested: d._suggestedGatheringType || d.suggestedGatheringType || null,
      reason: d._suggestedReason || d.suggestedReason || null,
      updatedAt: d.updatedAt,
      meetingsCount: d.meetings?.length ?? d.meetingsCount ?? 0,
      nextMeeting: d.nextMeeting || null,
      topRec: d.recommendations?.[0]?.title || d.topRecommendationTitle || null,
      topRecSeverity: d.recommendations?.[0]?.severity || d.topRecommendationSeverity || null,
    }));

    const filterDescription = filters && Object.keys(filters).length > 0
      ? `Active filters: ${Object.entries(filters).map(([k, v]) => `${k}=${v}`).join(', ')}`
      : 'No filters applied (showing all deals)';

    const summaryContext = summary
      ? `Stats: ${summary.totalDeals} total, ${summary.lostDeals} lost, ${summary.inactiveDeals} inactive, ${summary.zeroScoreDeals} zero-score, ${summary.healthyDeals} healthy, pipeline $${summary.pipelineValue?.toLocaleString()}, ${summary.dealsWithMeetings} with meetings, ${summary.uniqueOwners} owners`
      : '';

    const prompt = `You are an expert sales analyst for a B2B SaaS company. Analyze the following CRM deal data and provide a concise, actionable executive summary.

${filterDescription}
${summaryContext}

Deal data (${condensed.length} deals):
${JSON.stringify(condensed, null, 1)}

Provide a brief executive summary (4-6 bullet points) covering:
1. Pipeline health overview (total value, deal distribution by stage)
2. Deals needing immediate attention (lost, inactive 14+ days, zero risk scores)
3. Key risks and which deals have the highest risk scores
4. Upcoming meetings and next actions
5. Notable patterns or concerns (concentrated owners, stale deals, missing data)

Be specific with deal names, amounts, and owner names. Keep it concise and actionable. Use markdown formatting with bullet points.`;

    const text = await generateCompletion({
      prompt,
      systemPrompt: 'You are a senior sales operations analyst. Provide concise, data-driven insights from CRM deal data. Be specific with names, numbers, and actionable recommendations. Use markdown bullet points.',
      temperature: 0.4,
      maxTokens: 1500,
      modelType: 'chat',
    });

    res.json({ ok: true, summary: text });
  } catch (error: any) {
    console.error('❌ AI summary error:', error);
    res.status(500).json({
      error: 'Failed to generate AI summary',
      message: error.message,
    });
  }
};
