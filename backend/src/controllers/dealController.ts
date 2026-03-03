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

    // Flatten deals with tenant info
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
      tenantId: string;
      tenantSlug: string;
      tenantName: string;
    }> = [];

    for (const tenant of response.data.tenants) {
      for (const deal of tenant.deals || []) {
        const raw = deal as Record<string, any>;
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
          closeDate: raw.closeDate,
          summary: raw.summary,
          meetings: raw.meetings,
          contacts: raw.contacts,
          recommendations: raw.recommendations,
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
          tenantName: tenant.name,
        });
      }
    }

    console.log(`   ✅ Found ${deals.length} deals across ${response.data.tenants.length} tenants`);

    res.json({
      ok: true,
      deals,
      total: deals.length,
      tenantCount: response.data.tenants.length,
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
