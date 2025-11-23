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
  generateDummyRecommendations,
} from './dummyDataGenerators';

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
    console.log(`  📝 No contacts for deal ${deal.id}, generating dummy data`);
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
 */
const transformMeetings = (deal: any, contacts: Contact[]): Meeting[] => {
  if (!deal.meetings || deal.meetings.length === 0) {
    console.log(`  📅 No meetings for deal ${deal.id}, generating dummy data`);
    return generateDummyMeetings(deal, contacts);
  }

  return deal.meetings.map((m: any) => ({
    id: m.id || `m-${deal.id}-${Math.random().toString(36).substring(7)}`,
    title: m.title || m.name || 'Meeting',
    startTime: m.startTime || m.start_time || new Date().toISOString(),
    endTime: m.endTime || m.end_time || new Date(Date.now() + 3600000).toISOString(),
    status: determineStatus(m),
    agenda: m.agenda || m.body || m.description || 'No agenda set',
    participants: contacts,
  }));
};

/**
 * Transform risk scores from BarrierX format
 * Falls back to dummy data if calculation is pending/failed
 */
const transformRiskScores = (deal: any): any => {
  if (!deal.userDealRiskScores) {
    console.log(`  ⚠️  No risk scores for deal ${deal.id}, generating dummy data`);
    return generateDummyRiskScores(deal);
  }

  // Check if calculation is complete
  const status = deal.calculationStatus;
  const totalRisk = deal.userDealRiskScores.totalDealRisk;

  if (status === 'calculating' || status === 'pending' || totalRisk === 0) {
    console.log(`  ⚠️  Risk calculation ${status} for deal ${deal.id}, using dummy data`);
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
const transformOwner = (deal: any): { name: string; phone: string } => {
  const ownerName = deal.owner?.name || 'Unknown Owner';
  let ownerPhone = deal.owner?.phone || '';

  // Use default phone number if missing
  if (!ownerPhone) {
    ownerPhone = '+251914373107';
    console.log(`  📞 Using default phone for owner: ${ownerPhone}`);
  }

  return {
    name: ownerName,
    phone: ownerPhone,
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
 * Maps multiple tenants to their respective users
 */
export const transformBulkResponse = (
  tenantsData: any[],
  userIds: string[]
): Map<string, Deal[]> => {
  const dealsMap = new Map<string, Deal[]>();

  tenantsData.forEach((tenant: any) => {
    if (!tenant.members || tenant.members.length === 0) {
      // No members info, assume single user for the tenant
      if (userIds.length === 1) {
        const deals = transformBarrierXDeals(tenant, userIds[0]);
        dealsMap.set(userIds[0], deals);
      }
      return;
    }

    // Map tenant members to userIds
    tenant.members.forEach((member: any) => {
      if (userIds.includes(member.user_id)) {
        const deals = transformBarrierXDeals(tenant, member.user_id);
        dealsMap.set(member.user_id, deals);
      }
    });
  });

  return dealsMap;
};

