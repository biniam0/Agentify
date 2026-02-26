/**
 * Target Finder Service
 * Simplified MVP: Find targets from bulk data using LLM intent
 */

import * as barrierxService from './barrierxService';
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

// ============================================
// TARGET FINDING
// ============================================

/**
 * Find targets based on simple intent criteria
 * This replaces the complex audience resolution with simple filtering
 */
export const findTargets = async (intent: SimpleIntent): Promise<Target[]> => {
  console.log(`🎯 Finding targets for intent: ${intent.action}`);
  
  // Step 1: Fetch bulk data from BarrierX (cached by Redis)
  const allDealsMap = await barrierxService.getAllDealsWildcard();
  
  // Flatten into single array
  let allDeals: Deal[] = [];
  allDealsMap.forEach((deals) => {
    allDeals = allDeals.concat(deals);
  });

  console.log(`📊 Total deals in system: ${allDeals.length}`);

  // Step 2: Apply simple filtering based on intent criteria
  const filteredDeals = filterDealsByIntent(allDeals, intent);

  console.log(`✅ Targets found: ${filteredDeals.length}`);

  // Step 3: Convert to target format and filter out contacts without phone numbers
  const targets = filteredDeals
    .map(deal => ({
      name: deal.ownerName,
      phone: deal.ownerPhone || '', // Ensure phone is always a string
      email: deal.ownerEmail,
      dealId: deal.id,
      dealName: deal.name,
      dealStage: deal.stage,
      dealAmount: deal.amount,
      company: deal.company,
      tenantSlug: deal.tenantSlug,
      hubspotOwnerId: deal.ownerHubspotId,
    }))
    .filter(target => target.phone && target.name); // Only include targets with phone and name

  console.log(`📞 Targets with phone numbers: ${targets.length}`);
  
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
  
  console.log(`🔍 Filtering ${deals.length} deals with criteria:`, JSON.stringify(target_criteria, null, 2));
  
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
        console.log(`❌ Contact name mismatch: "${deal.ownerName}" doesn't include any of [${contactNames.join(', ')}]`);
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
        console.log(`❌ Deal name mismatch: "${deal.name}" doesn't include any of [${dealNames.join(', ')}]`);
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
        console.log(`❌ Company mismatch: "${deal.company}" doesn't include any of [${companies.join(', ')}]`);
        return false;
      }
    }

    // Filter by deal stage (exact match)
    if (target_criteria.deal_stage) {
      if (deal.stage !== target_criteria.deal_stage) {
        console.log(`❌ Deal stage mismatch: "${deal.stage}" doesn't match "${target_criteria.deal_stage}"`);
        return false;
      }
    }

    // Filter by deal amount (min/max)
    if (target_criteria.deal_min_amount && deal.amount) {
      if (deal.amount < target_criteria.deal_min_amount) {
        console.log(`❌ Deal amount too low: ${deal.amount} < ${target_criteria.deal_min_amount}`);
        return false;
      }
    }
    if (target_criteria.deal_max_amount && deal.amount) {
      if (deal.amount > target_criteria.deal_max_amount) {
        console.log(`❌ Deal amount too high: ${deal.amount} > ${target_criteria.deal_max_amount}`);
        return false;
      }
    }

    // Filter by tenant slug (exact match)
    if (target_criteria.tenant_slug) {
      if (deal.tenantSlug !== target_criteria.tenant_slug) {
        console.log(`❌ Tenant slug mismatch: "${deal.tenantSlug}" !== "${target_criteria.tenant_slug}"`);
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
        console.log(`❌ Keywords not found: ${target_criteria.keywords.join(', ')} not in "${searchText}"`);
        return false;
      }
    }

    console.log(`✅ Deal matched: "${deal.name}" (${deal.ownerName}, ${deal.stage})`);
    return true;
  });

  console.log(`🎯 Filtering result: ${filteredDeals.length} deals matched out of ${deals.length}`);
  return filteredDeals;
};

// ============================================
// TARGET PREVIEW
// ============================================

/**
 * Get a preview of targets without executing the workflow
 */
export const previewTargets = async (intent: SimpleIntent): Promise<{
  count: number;
  sample: Target[];
  summary: string;
}> => {
  const targets = await findTargets(intent);
  
  return {
    count: targets.length,
    sample: targets.slice(0, 5), // First 5 targets as preview
    summary: generateTargetSummary(targets, intent),
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