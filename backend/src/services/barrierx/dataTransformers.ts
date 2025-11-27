/**
 * Data Transformers for BarrierX Integration
 * 
 * These functions transform data from BarrierX API format to AgentX internal format.
 * Handles data mapping, validation, and fallback to dummy data when needed.
 */

import { Contact, Deal, Meeting } from '../barrierxService';
import {
  generateDummyContacts,
  generateDummyMeetings,
  generateDummyRiskScores,
} from './dummyDataGenerators';

/**
 * Debug flag for transformer logs - set to true to enable verbose logging
 */
const DEBUG_TRANSFORMERS = false;

/**
 * Default phone number to use when owner phone is not available
 */
const DEFAULT_PHONE = '+251914373107';

/**
 * Format phone number by removing hyphens, spaces, and parentheses
 * Keeps the + sign for international format
 * Example: "+251-914373107" → "+251914373107"
 */
const formatPhoneNumber = (phone: string): string => {
  if (!phone) return phone;
  // Remove hyphens, spaces, and parentheses, but keep the + sign
  return phone.replace(/[-\s()]/g, '');
};

/**
 * Transform a single BarrierX tenant's deals to AgentX Deal format
 * Handles missing data gracefully with dummy data generation
 */
export const transformBarrierXDeals = (tenant: any, userId: string): Deal[] => {
  if (!tenant || !tenant.deals || tenant.deals.length === 0) {
    console.log(`⚠️  No deals found for tenant: ${tenant?.name || 'Unknown'}`);
    return [];
  }

  console.log(`✅ Transforming ${tenant.deals.length} deals for user ${userId}`);

  return tenant.deals.map((deal: any) => transformSingleDeal(deal, userId, tenant));
};

/**
 * Transform a single BarrierX deal to AgentX format
 * Core transformation logic with dummy data fallbacks
 */
const transformSingleDeal = (deal: any, userId: string, tenant: any): Deal => {
  // Transform contacts (use dummy if empty)
  const contacts = transformContacts(deal);

  // Transform meetings (use dummy if empty)
  const meetings = transformMeetings(deal, contacts);

  // Transform risk scores (use dummy if calculating/pending)
  const userDealRiskScores = transformRiskScores(deal);

  // Transform owner information
  const owner = transformOwner(deal);

  return {
    id: deal.id,
    name: deal.dealName || 'Unnamed Deal',
    amount: deal.amount || 0,
    stage: deal.stage || 'Unknown',
    company: deal.company || 'Unknown Company',
    ownerId: userId,
    ownerName: owner.name,
    ownerPhone: owner.phone,
    ownerEmail: owner.email,
    ownerHubspotId: owner.hubspotId,
    tenantSlug: tenant?.slug || tenant?.name || 'unknown',
    contacts,
    meetings,
    summary: deal.summary || `Deal: ${deal.dealName}`,
    userDealRiskScores,
    closeDate: deal.closeDate,
  };
};

/**
 * Transform contacts from BarrierX format
 * Falls back to dummy data if contacts array is empty
 */
const transformContacts = (deal: any): Contact[] => {
  if (!deal.contacts || deal.contacts.length === 0) {
    if (DEBUG_TRANSFORMERS) console.log(`  📝 No contacts for deal ${deal.id}, generating dummy data`);
    return generateDummyContacts(deal);
  }

  return deal.contacts.map((c: any) => ({
    id: c.id || `c-${deal.id}-${Math.random().toString(36).substring(7)}`,
    name: c.name || c.full_name || 'Unknown Contact',
    email: c.email || '',
    phone: c.phone || '',
    company: deal.company || 'Unknown Company',
  }));
};

/**
 * Transform meetings from BarrierX format
 * Falls back to dummy data if meetings array is empty
 * Generates descriptive titles when meeting title is empty
 */
const transformMeetings = (deal: any, contacts: Contact[]): Meeting[] => {
  if (!deal.meetings || deal.meetings.length === 0) {
    if (DEBUG_TRANSFORMERS) console.log(`  📅 No meetings for deal ${deal.id}, generating dummy data`);
    // return generateDummyMeetings(deal, contacts);
    return []
  }

  return deal.meetings.map((m: any, index: number) => {
    // Generate descriptive title when empty
    const meetingTitle = m.title || m.name ||
      `${deal.stage || 'Sales'} Meeting - ${deal.dealName || deal.company || 'Deal'} (#${index + 1})`;

    return {
      id: m.id || `m-${deal.id}-${Math.random().toString(36).substring(7)}`,
      title: meetingTitle,
      startTime: m.startTime || m.start_time || new Date().toISOString(),
      endTime: m.endTime || m.end_time || new Date(Date.now() + 3600000).toISOString(),
      status: determineStatus(m),
      agenda: m.agenda || m.body || m.description || `Discussion about ${deal.dealName || 'the deal'}`,
      participants: contacts,
    };
  });
};

/**
 * Transform risk scores from BarrierX format
 * Falls back to dummy data if calculation is pending/failed
 */
const transformRiskScores = (deal: any): any => {
  if (!deal.userDealRiskScores) {
    if (DEBUG_TRANSFORMERS) console.log(`  ⚠️  No risk scores for deal ${deal.id}, generating dummy data`);
    return generateDummyRiskScores(deal);
  }

  // Check if calculation is complete
  const status = deal.calculationStatus;
  const totalRisk = deal.userDealRiskScores.totalDealRisk;

  if (status === 'calculating' || status === 'pending' || totalRisk === 0) {
    if (DEBUG_TRANSFORMERS) console.log(`  ⚠️  Risk calculation ${status} for deal ${deal.id}, using dummy data`);
    return generateDummyRiskScores(deal);
  }

  // Use real risk scores
  return deal.userDealRiskScores;
};

/**
 * Transform owner information from BarrierX format
 * Provides sensible defaults if owner info is missing
 * Uses default phone number if not available
 */
const transformOwner = (deal: any): {
  name: string;
  phone: string;
  email: string;
  hubspotId?: string;
} => {
  const ownerName = deal.owner?.name || 'Unknown Owner';
  const ownerEmail = deal.owner?.email || '';
  const ownerHubspotId = deal.owner?.hubspotId || deal.owner?.id || deal.ownerId;
  const ownerPhone = formatPhoneNumber(deal.owner?.phone || DEFAULT_PHONE);

  // Debug logging for owner data
  if (DEBUG_TRANSFORMERS && deal.owner) {
    console.log(`  👤 Owner data for deal ${deal.id}:`, JSON.stringify({
      name: deal.owner.name,
      email: deal.owner.email,
      hubspotId: deal.owner.hubspotId,
      id: deal.owner.id,
      phone_raw: deal.owner.phone || `(using default: ${DEFAULT_PHONE})`,
      phone_formatted: ownerPhone,
      extracted_hubspotId: ownerHubspotId
    }, null, 2));
  }

  return {
    name: ownerName,
    phone: ownerPhone,
    email: ownerEmail,
    hubspotId: ownerHubspotId,
  };
};

/**
 * Determine meeting status based on BarrierX data
 * Maps various status values to AgentX status enum
 */
const determineStatus = (meeting: any): 'scheduled' | 'in_progress' | 'completed' => {
  if (!meeting.status) return 'scheduled';

  const status = meeting.status.toLowerCase();

  if (status.includes('completed') || status.includes('done')) {
    return 'completed';
  }

  if (status.includes('progress') || status.includes('active') || status.includes('ongoing')) {
    return 'in_progress';
  }

  return 'scheduled';
};

/**
 * Transform bulk tenant response to user-deals map
 * Maps each deal to its actual owner based on deal.owner.hubspotId
 */
export const transformBulkResponse = (
  tenantsData: any[],
  userIds: string[]
): Map<string, Deal[]> => {
  const dealsMap = new Map<string, Deal[]>();

  // Initialize empty arrays for all users
  userIds.forEach(userId => dealsMap.set(userId, []));

  tenantsData.forEach((tenant: any) => {
    if (!tenant.deals || tenant.deals.length === 0) {
      console.log(`  ⚠️  No deals in tenant ${tenant.name || tenant.slug}`);
      return;
    }

    console.log(`  📦 Processing ${tenant.deals.length} deals from tenant ${tenant.name || tenant.slug}`);

    // Map each deal to its actual owner
    tenant.deals.forEach((deal: any) => {
      const ownerId = deal.owner?.hubspotId;

      if (!ownerId) {
        if (DEBUG_TRANSFORMERS) console.log(`    ⚠️  Deal ${deal.id} (${deal.dealName}) has no owner.hubspotId, skipping...`);
        return;
      }

      // Only process deals for users we're tracking
      if (dealsMap.has(ownerId)) {
        const transformedDeal = transformSingleDeal(deal, ownerId, tenant);
        const existingDeals = dealsMap.get(ownerId) || [];
        dealsMap.set(ownerId, [...existingDeals, transformedDeal]);
      }
    });
  });

  console.log(`  ✅ Mapped deals to ${dealsMap.size} users`);
  dealsMap.forEach((deals, userId) => {
    console.log(`     User ${userId}: ${deals.length} deals`);
  });

  return dealsMap;
};

