/**
 * Target Finder Service
 * Simplified MVP: Find targets from bulk data using LLM intent
 */

import axios from 'axios';
import { config } from '../config/env';
import { Deal } from './barrierxService';
import { SimpleIntent } from './llm/promptParserService';

// ============================================
// TARGET INTERFACE
// ============================================

export interface Target {
  name: string;
  phone: string;
  email?: string;
  dealId: string;
  dealName: string;
  dealStage?: string;
  dealAmount?: number;
  company?: string;
  tenantSlug?: string;
  hubspotOwnerId?: string;
}

export interface UnreachableTarget {
  name: string;
  email?: string;
  dealId: string;
  dealName: string;
  company?: string;
  reason: string;
}

// ============================================
// PER-TENANT DATA FETCHING
// ============================================

export async function getTenantDealsWildcard(tenantSlug: string): Promise<Deal[]> {
  console.log(`📡 Fetching deals for tenant: ${tenantSlug}...`);

  const url = `${config.barrierx.baseUrl}/api/external/tenants/${tenantSlug}/deals`;
  const response = await axios.get(url, {
    headers: {
      'Authorization': `Bearer ${config.barrierx.apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 60000,
  });

  const rawDeals: any[] = response.data.deals || [];

  const deals: Deal[] = rawDeals.map((deal: any) => ({
    id: deal.id,
    name: deal.dealName || 'Unnamed Deal',
    amount: deal.amount || 0,
    stage: deal.stage || 'Unknown',
    company: deal.company || 'Unknown Company',
    ownerId: deal.owner?.hubspotId || '',
    ownerName: deal.owner?.name || 'Unknown',
    ownerPhone: deal.owner?.phone || '',
    ownerEmail: deal.owner?.email || '',
    ownerHubspotId: deal.owner?.hubspotId,
    ownerTimezone: deal.owner?.timezone,
    tenantSlug,
    contacts: (deal.contacts || []).map((c: any) => ({
      id: c.id || '',
      name: c.name || c.full_name || 'Unknown Contact',
      email: c.email || '',
      phone: c.phone || '',
      company: deal.company || '',
    })),
    meetings: (deal.meetings || []).map((m: any) => ({
      id: m.id || '',
      title: m.title || '',
      startTime: m.startTime || '',
      endTime: m.endTime || '',
      body: m.body || '',
    })),
    summary: deal.summary || `Deal: ${deal.dealName}`,
    userDealRiskScores: deal.userDealRiskScores || {
      arenaRisk: 0, controlRoomRisk: 0, scoreCardRisk: 0, totalDealRisk: 0, subCategoryRisk: {},
    },
    closeDate: deal.closeDate,
    recommendations: deal.recommendations || [],
  }));

  console.log(`   ✅ Found ${deals.length} deals for tenant: ${tenantSlug}`);
  return deals;
}

// ============================================
// TARGET FINDING
// ============================================

/**
 * Find targets based on simple intent criteria (including unreachable ones).
 * Returns both callable targets (phone present) and unreachable ones
 * (matched by criteria but missing phone or owner name) so the caller can
 * distinguish "no match" from "matched but can't call".
 */
const findTargetsWithUnreachable = async (
  intent: SimpleIntent,
  tenantSlug: string,
): Promise<{ targets: Target[]; unreachable: UnreachableTarget[]; matchedDealCount: number }> => {
  console.log(`🎯 Finding targets for intent: ${intent.action} (tenant: ${tenantSlug})`);

  const allDeals = await getTenantDealsWildcard(tenantSlug);

  console.log(`📊 Total deals for tenant ${tenantSlug}: ${allDeals.length}`);

  const filteredDeals = filterDealsByIntent(allDeals, intent);

  console.log(`✅ Matched deals: ${filteredDeals.length}`);

  const targets: Target[] = [];
  const unreachable: UnreachableTarget[] = [];

  for (const deal of filteredDeals) {
    const phone = (deal.ownerPhone || '').trim();
    const name = (deal.ownerName || '').trim();

    if (!name) {
      unreachable.push({
        name: 'Unknown',
        email: deal.ownerEmail,
        dealId: deal.id,
        dealName: deal.name,
        company: deal.company,
        reason: 'Deal owner has no name in BarrierX',
      });
      continue;
    }

    if (!phone) {
      unreachable.push({
        name,
        email: deal.ownerEmail,
        dealId: deal.id,
        dealName: deal.name,
        company: deal.company,
        reason: 'Deal owner has no phone number in BarrierX',
      });
      continue;
    }

    targets.push({
      name,
      phone,
      email: deal.ownerEmail,
      dealId: deal.id,
      dealName: deal.name,
      dealStage: deal.stage,
      dealAmount: deal.amount,
      company: deal.company,
      tenantSlug: deal.tenantSlug,
      hubspotOwnerId: deal.ownerHubspotId,
    });
  }

  console.log(`📞 Reachable targets (with phone): ${targets.length}`);
  if (unreachable.length > 0) {
    console.log(`🚫 Unreachable matches (missing phone/name): ${unreachable.length}`);
    unreachable.forEach(u =>
      console.log(`   - "${u.dealName}" (${u.name}): ${u.reason}`),
    );
  }

  return { targets, unreachable, matchedDealCount: filteredDeals.length };
};

/**
 * Find callable targets based on simple intent criteria.
 * Only returns targets with a phone number (required for calling).
 */
export const findTargets = async (intent: SimpleIntent, tenantSlug: string): Promise<Target[]> => {
  const { targets } = await findTargetsWithUnreachable(intent, tenantSlug);
  return targets;
};

// ============================================
// SIMPLE FILTERING LOGIC
// ============================================

/**
 * Filter deals based on simple intent criteria
 * This is the "manual" filtering logic that applies LLM-generated criteria
 */
const filterDealsByIntent = (deals: Deal[], intent: SimpleIntent): Deal[] => {
  const { target_criteria } = intent;
  
  console.log(`🔍 Workflow Filtering ${deals.length} deals with criteria:`, JSON.stringify(target_criteria, null, 2));
  
  // Track filtering statistics
  let contactFiltered = 0;
  let dealNameFiltered = 0;
  let companyFiltered = 0;
  let stageFiltered = 0;
  let amountFiltered = 0;
  let tenantFiltered = 0;
  let keywordFiltered = 0;
  
  const filteredDeals = deals.filter(deal => {
    // Filter by contact name (case-insensitive partial match) - supports arrays
    if (target_criteria.contact_name) {
      const contactNames = Array.isArray(target_criteria.contact_name) 
        ? target_criteria.contact_name 
        : [target_criteria.contact_name];
      
      const contactMatch = contactNames.some(name => 
        deal.ownerName?.toLowerCase().includes(name.toLowerCase())
      );
      if (!contactMatch) {
        contactFiltered++;
        return false;
      }
    }

    // Filter by deal name (case-insensitive partial match) - supports arrays
    if (target_criteria.deal_name) {
      const dealNames = Array.isArray(target_criteria.deal_name) 
        ? target_criteria.deal_name 
        : [target_criteria.deal_name];
      
      const dealMatch = dealNames.some(name => 
        deal.name?.toLowerCase().includes(name.toLowerCase())
      );
      if (!dealMatch) {
        dealNameFiltered++;
        return false;
      }
    }

    // Filter by company (case-insensitive partial match) - supports arrays
    if (target_criteria.company) {
      const companies = Array.isArray(target_criteria.company) 
        ? target_criteria.company 
        : [target_criteria.company];
      
      const companyMatch = companies.some(company => 
        deal.company?.toLowerCase().includes(company.toLowerCase())
      );
      if (!companyMatch) {
        companyFiltered++;
        return false;
      }
    }

    // Filter by deal stage (exact match)
    if (target_criteria.deal_stage) {
      if (deal.stage !== target_criteria.deal_stage) {
        stageFiltered++;
        return false;
      }
    }

    // Filter by deal amount (min/max)
    if (target_criteria.deal_min_amount && deal.amount) {
      if (deal.amount < target_criteria.deal_min_amount) {
        amountFiltered++;
        return false;
      }
    }
    if (target_criteria.deal_max_amount && deal.amount) {
      if (deal.amount > target_criteria.deal_max_amount) {
        amountFiltered++;
        return false;
      }
    }

    // Filter by tenant slug (exact match)
    if (target_criteria.tenant_slug) {
      if (deal.tenantSlug !== target_criteria.tenant_slug) {
        tenantFiltered++;
        return false;
      }
    }

    // Filter by keywords (search in deal name and description)
    if (target_criteria.keywords && target_criteria.keywords.length > 0) {
      const searchText = `${deal.name} ${deal.summary || ''}`.toLowerCase();
      const hasKeyword = target_criteria.keywords.some(keyword =>
        searchText.includes(keyword.toLowerCase())
      );
      if (!hasKeyword) {
        keywordFiltered++;
        return false;
      }
    }

    // Log successful matches only
    console.log(`✅ Deal matched: "${deal.name}" (${deal.ownerName}, ${deal.stage})`);
    return true;
  });

  // Professional summary logging
  console.log(`🎯 Filtering complete: ${filteredDeals.length} matches out of ${deals.length} total deals`);
  
  if (filteredDeals.length === 0 && deals.length > 0) {
    console.log(`📊 Filter breakdown:`);
    if (contactFiltered > 0) console.log(`   👤 ${contactFiltered} deals filtered by contact name`);
    if (dealNameFiltered > 0) console.log(`   📋 ${dealNameFiltered} deals filtered by deal name`);
    if (companyFiltered > 0) console.log(`   🏢 ${companyFiltered} deals filtered by company`);
    if (stageFiltered > 0) console.log(`   📊 ${stageFiltered} deals filtered by stage`);
    if (amountFiltered > 0) console.log(`   💰 ${amountFiltered} deals filtered by amount`);
    if (tenantFiltered > 0) console.log(`   🏠 ${tenantFiltered} deals filtered by tenant`);
    if (keywordFiltered > 0) console.log(`   🔍 ${keywordFiltered} deals filtered by keywords`);
  }
  
  return filteredDeals;
};

// ============================================
// TARGET PREVIEW
// ============================================

/**
 * Get a preview of targets without executing the workflow
 */
export const previewTargets = async (intent: SimpleIntent, tenantSlug: string): Promise<{
  count: number;
  sample: Target[];
  summary: string;
  unreachable: UnreachableTarget[];
  matchedDealCount: number;
}> => {
  const { targets, unreachable, matchedDealCount } = await findTargetsWithUnreachable(intent, tenantSlug);

  return {
    count: targets.length,
    sample: targets.slice(0, 5),
    summary: generateTargetSummary(targets, intent),
    unreachable,
    matchedDealCount,
  };
};

/**
 * Generate summary of found targets
 */
const generateTargetSummary = (targets: Target[], intent: SimpleIntent): string => {
  if (targets.length === 0) {
    return 'No targets found matching the criteria.';
  }

  const companies = [...new Set(targets.map(t => t.company).filter(Boolean))];
  const stages = [...new Set(targets.map(t => t.dealStage).filter(Boolean))];

  let summary = `Found ${targets.length} target${targets.length === 1 ? '' : 's'}`;

  if (companies.length > 0) {
    summary += ` across ${companies.length} compan${companies.length === 1 ? 'y' : 'ies'}`;
  }

  if (stages.length > 0) {
    summary += ` in ${stages.length} deal stage${stages.length === 1 ? '' : 's'}`;
  }

  return summary + '.';
};