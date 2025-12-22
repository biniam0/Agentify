// BarrierX Service - Real API Integration
// Uses real BarrierX API for authentication and data fetching

import axios from 'axios';
import { config } from '../config/env';
import {
  getBulkDealsFromCache,
  saveBulkDealsToCache,
  hasDataChanged
} from '../utils/redisCache';

export interface Tenant {
  id: string;
  slug: string;
  name: string;
}

export interface BarrierXLoginResponse {
  ok: boolean;
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tenants: Tenant[];
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
}

export interface Meeting {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  agenda?: string;
  participants: Contact[];
}

export interface Deal {
  id: string;
  name: string;
  amount: number;
  stage: string;
  company?: string;
  ownerId: string;
  ownerName: string;
  ownerPhone?: string;
  ownerEmail?: string;
  ownerHubspotId?: string;
  ownerTimezone?: string;
  tenantSlug?: string;
  contacts: Contact[];
  meetings: Meeting[];
  summary?: string;
  userDealRiskScores?: any;
  closeDate?: string;
  /**
   * Optional: BarrierX may include explicit risks in the bulk API response in the future.
   * When present, these should be preferred over any fallback logic.
   */
  risks?: Array<{
    category: string;
    score: number;
    description: string;
  }>;
  recommendations?: Array<{
    note: string;
    title: string;
    severity: string;
    isAssigned: boolean;
    indicatorId: string;
    isCompleted: boolean;
  }>;
}


// API Methods

// Real BarrierX Login (No Mock Fallback)
export const login = async (email: string, password: string): Promise<BarrierXLoginResponse | null> => {
  try {
    console.log('🌐 Calling BarrierX login API...');
    const response = await axios.post(
      `${config.barrierx.baseUrl}/api/external/login`,
      { email, password },
      {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${config.barrierx.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      }
    );

    console.log('✅ BarrierX login successful');
    return response.data;
  } catch (error: any) {
    console.error('❌ BarrierX login error:', error.response?.data || error.message);
    return null;
  }
};

// Refresh BarrierX access token (No Mock Fallback)
export const refreshAccessToken = async (refreshToken: string): Promise<BarrierXLoginResponse | null> => {
  try {
    console.log('🌐 Refreshing BarrierX access token...');
    const response = await axios.post(
      `${config.barrierx.baseUrl}/api/external/refresh`,
      { refreshToken },
      {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${config.barrierx.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    console.log('✅ BarrierX token refreshed successfully');
    return response.data;
  } catch (error: any) {
    console.error('❌ BarrierX refresh error:', error.response?.data || error.message);
    return null;
  }
};

/**
 * Get deals for a specific user
 * Uses real BarrierX bulk API
 */
export const getUserDeals = async (userId: string): Promise<Deal[]> => {
  // Real BarrierX API call
  try {
    console.log(`🌐 Fetching deals from BarrierX for user: ${userId}`);

    const startTime = Date.now();

    const response = await axios.get(
      `${config.barrierx.baseUrl}/api/external/tenants/bulk`,
      {
        params: {
          user_ids: userId,
          include_deals: true,
          include_members: false,
          sync_engagements: true,
          page: 1,
          limit: 100,
          // Add deal_pipeline filter if configured
          ...(config.automation.dealPipelines.length > 0 && {
            deal_pipeline: config.automation.dealPipelines.join(',')
          }),
        },
        headers: {
          'Authorization': `Bearer ${config.barrierx.apiKey}`,
          'Accept': 'application/json',
        },
        timeout: 15000,
      }
    );

    const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(2);

    if (!response.data.ok || !response.data.tenants?.length) {
      console.log(`⚠️  No tenants found for user ${userId} (took ${durationSeconds}s)`);
      return [];
    }

    // Transform BarrierX format to AgentX format
    const { transformBarrierXDeals } = await import('./barrierx/dataTransformers');
    const deals = transformBarrierXDeals(response.data.tenants[0], userId);

    console.log(`✅ Successfully fetched ${deals.length} deals for user ${userId} in ${durationSeconds}s`);
    return deals;

  } catch (error: any) {
    console.error(`❌ BarrierX API error for user ${userId}:`, error.response?.data || error.message);

    // No fallback - let it fail
    throw new Error(`Failed to fetch deals for user ${userId}: ${error.response?.data?.details || error.message}`);
  }
};

/**
 * Get deals for multiple users in one batch request
 * More efficient for scheduler that processes multiple users
 */
export const getBatchUserDeals = async (userIds: string[]): Promise<Map<string, Deal[]>> => {
  if (userIds.length === 0) {
    return new Map();
  }

  // Real BarrierX batch API call
  try {
    console.log(`🌐 Batch fetching deals for ${userIds.length} users from BarrierX`);

    const startTime = Date.now();

    const response = await axios.get(
      `${config.barrierx.baseUrl}/api/external/tenants/bulk`,
      {
        params: {
          user_ids: userIds.join(','),  // Comma-separated
          include_deals: true,
          include_members: true,
          sync_engagements: true,
          page: 1,
          limit: 500,  // Max allowed
          // Add deal_pipeline filter if configured
          ...(config.automation.dealPipelines.length > 0 && {
            deal_pipeline: config.automation.dealPipelines.join(',')
          }),
        },
        headers: {
          'Authorization': `Bearer ${config.barrierx.apiKey}`,
          'Accept': 'application/json',
        },
        timeout: 30000,  // 30 seconds for batch
      }
    );

    const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(2);

    if (!response.data.ok || !response.data.tenants) {
      console.log(`⚠️  Batch API returned no tenants (took ${durationSeconds}s)`);
      return new Map();
    }

    // Transform bulk response
    const { transformBulkResponse } = await import('./barrierx/dataTransformers');
    const dealsMap = transformBulkResponse(response.data.tenants, userIds);

    console.log(`✅ Successfully batch fetched deals for ${dealsMap.size} users in ${durationSeconds}s`);
    return dealsMap;

  } catch (error: any) {
    console.error(`❌ Batch API error:`, error.response?.data || error.message);
    return new Map();
  }
};

/**
 * Get ALL deals from ALL tenants and ALL users in ONE call
 * Uses wildcard approach (no user_ids parameter) to fetch everything
 * Perfect for bulk automation mode
 */
export const getAllDealsWildcard = async (): Promise<Map<string, Deal[]>> => {
  try {
    // 🔥 OPTIMIZATION: Only fetch deals updated in last X days (default: 60)
    // This reduces payload by ~67% while still catching all active deals
    const updateWindowDays = config.automation.dealUpdateWindowDays;
    const dealUpdatedSince = new Date(Date.now() - updateWindowDays * 24 * 60 * 60 * 1000).toISOString();

    console.log(`🌐 Fetching deals updated in last ${updateWindowDays} days (since ${dealUpdatedSince})...`);

    const startTime = Date.now();

    const response = await axios.get(
      `${config.barrierx.baseUrl}/api/external/tenants/bulk`,
      {
        params: {
          // 🌟 NO user_ids = wildcard "give me everything"!
          // 🔥 BUT filter by update time to reduce payload
          deal_updated_since: dealUpdatedSince,

          // Inclusion settings
          include_deals: true,
          include_members: false,  // Don't need members - we get users from deal owners
          sync_engagements: true,

          // Pagination
          page: 1,
          limit: 1000,  // Max limit for large datasets

          // Add deal_pipeline filter if configured
          ...(config.automation.dealPipelines.length > 0 && {
            deal_pipeline: config.automation.dealPipelines.join(',')
          }),
        },
        headers: {
          'Authorization': `Bearer ${config.barrierx.apiKey}`,
          'Accept': 'application/json',
        },
        timeout: 120000,  // 2 minutes (increased for sync_engagements)
      }
    );

    const endTime = Date.now();
    const durationSeconds = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`⏱️  Bulk fetch completed in ${durationSeconds} seconds`);

    if (!response.data.ok || !response.data.tenants) {
      console.error('❌ Wildcard bulk API failed');
      // Try Redis cache as fallback
      const cachedData = await getBulkDealsFromCache();
      if (cachedData) {
        console.log(`📦 Using Redis cache as fallback (${cachedData.size} users)`);
        return cachedData;
      }
      return new Map();
    }

    const tenants = response.data.tenants;
    console.log(`✅ Got ${tenants.length} tenants with wildcard`);
    console.log(`📊 Total tenants in system: ${response.data.total || response.data.count || tenants.length}`);

    // Filter tenants if TARGET_TENANT_SLUGS is specified
    const filteredTenants = config.automation.targetTenants.length > 0
      ? tenants.filter((t: any) => config.automation.targetTenants.includes(t.slug))
      : tenants;

    if (filteredTenants.length < tenants.length) {
      console.log(`🎯 Filtered to ${filteredTenants.length} target tenants: ${config.automation.targetTenants.join(', ')}`);
    }

    // Extract all unique user IDs from deal owners across all tenants
    const allUserIds = new Set<string>();
    let totalDeals = 0;

    filteredTenants.forEach((tenant: any) => {
      if (tenant.deals) {
        totalDeals += tenant.deals.length;
        tenant.deals.forEach((deal: any) => {
          if (deal.owner?.hubspotId) {
            allUserIds.add(deal.owner.hubspotId);
          }
        });
      }
    });

    console.log(`👥 Found ${allUserIds.size} unique users from deal owners`);
    console.log(`📦 Total deals across all tenants: ${totalDeals}`);

    // Transform bulk response
    const { transformBulkResponse } = await import('./barrierx/dataTransformers');
    const dealsMap = transformBulkResponse(filteredTenants, Array.from(allUserIds));

    console.log(`✅ Wildcard fetch complete: ${dealsMap.size} users mapped`);

    // Log summary per user
    dealsMap.forEach((deals, userId) => {
      console.log(`   User ${userId.substring(0, 12)}...: ${deals.length} deals`);
    });

    // ✅ REDIS CACHING: Check if data changed, then cache it
    const dataChanged = await hasDataChanged(dealsMap);
    if (dataChanged) {
      await saveBulkDealsToCache(dealsMap);
    }

    return dealsMap;

  } catch (error: any) {
    console.error('❌ Wildcard bulk API error:', error.response?.data || error.message);

    // ✅ REDIS CACHE FALLBACK: Try to get cached data
    console.log('🔄 Attempting to use Redis cache...');
    const cachedData = await getBulkDealsFromCache();

    if (cachedData && cachedData.size > 0) {
      console.log(`📦 Using Redis cache as fallback (${cachedData.size} users)`);
      return cachedData;
    }

    console.log('⚠️  No cached data available in Redis');
    return new Map();
  }
};

/**
 * Create HubSpot engagement (NOTE, MEETING, CALL, etc.) via BarrierX
 * This calls the BarrierX API which then creates the engagement in HubSpot
 */
export const createHubSpotEngagement = async (payload: {
  tenantSlug: string;
  dealId: string;
  type: 'NOTE' | 'MEETING' | 'CALL' | 'EMAIL' | 'TASK' | 'SMS';
  ownerId?: string;
  subject?: string;
  body?: string;
  timestamp?: number;
  metadata?: {
    start_time?: string;
    end_time?: string;
    [key: string]: any;
  };
}): Promise<{
  success: boolean;
  engagementId?: string;
  message?: string;
  error?: string;
}> => {
  try {
    console.log(`📝 Creating ${payload.type} engagement in HubSpot via BarrierX...`);
    console.log(`   Deal: ${payload.dealId}, Tenant: ${payload.tenantSlug}`);

    const response = await axios.post(
      `${config.barrierx.baseUrl}/api/external/tenants/${payload.tenantSlug}/deals/${payload.dealId}/hubspot/engagements`,
      {
        type: payload.type,
        ownerId: payload.ownerId,
        subject: payload.subject,
        body: payload.body,
        timestamp: payload.timestamp || Date.now(),
        metadata: payload.metadata,
      },
      {
        headers: {
          'Authorization': `Bearer ${config.barrierx.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        timeout: 15000,
      }
    );

    if (response.data.ok) {
      console.log(`✅ ${payload.type} created successfully! ID: ${response.data.engagementId}`);
      return {
        success: true,
        engagementId: response.data.engagementId,
        message: response.data.message,
      };
    } else {
      console.error(`❌ BarrierX returned not ok:`, response.data);
      return {
        success: false,
        error: response.data.error || 'Unknown error',
      };
    }
  } catch (error: any) {
    console.error(`❌ Failed to create ${payload.type} engagement:`, error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to create engagement',
    };
  }
};

/**
 * Helper: Create a NOTE engagement in HubSpot
 * Called from ElevenLabs webhook when sales rep instructs to create a note
 */
export const createNoteEngagement = async (params: {
  tenantSlug: string;
  dealId: string;
  ownerId: string;
  body: string;
  timestamp?: number;
}): Promise<{ success: boolean; engagementId?: string; error?: string }> => {
  return createHubSpotEngagement({
    tenantSlug: params.tenantSlug,
    dealId: params.dealId,
    type: 'NOTE',
    ownerId: params.ownerId,
    body: params.body,
    timestamp: params.timestamp,
  });
};

/**
 * Helper: Create a MEETING engagement in HubSpot
 * Called from ElevenLabs webhook when sales rep instructs to create a meeting
 */
export const createMeetingEngagement = async (params: {
  tenantSlug: string;
  dealId: string;
  ownerId: string;
  subject: string;
  body?: string;
  startTime: string;
  endTime: string;
  timestamp?: number;
}): Promise<{ success: boolean; engagementId?: string; error?: string }> => {
  return createHubSpotEngagement({
    tenantSlug: params.tenantSlug,
    dealId: params.dealId,
    type: 'MEETING',
    ownerId: params.ownerId,
    subject: params.subject,
    body: params.body,
    timestamp: params.timestamp,
    metadata: {
      start_time: params.startTime,
      end_time: params.endTime,
    },
  });
};

/**
 * Helper: Create a TASK engagement in HubSpot
 * Called from ElevenLabs webhook when sales rep instructs to create a task
 */
export const createTaskEngagement = async (params: {
  tenantSlug: string;
  dealId: string;
  ownerId: string;
  subject: string;
  body?: string;
  timestamp?: number;
  taskType?: 'TODO' | 'EMAIL' | 'CALL';
  status?: 'COMPLETED' | 'NOT_STARTED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
}): Promise<{ success: boolean; engagementId?: string; error?: string }> => {
  console.log('📅 Task Engagement Timestamps:');
  console.log(`   Creation time: ${new Date(Date.now()).toISOString()}`);
  console.log(`   Due date: ${params.timestamp ? new Date(params.timestamp).toISOString() : 'Not specified'}`);

  return createHubSpotEngagement({
    tenantSlug: params.tenantSlug,
    dealId: params.dealId,
    type: 'TASK',
    ownerId: params.ownerId,
    subject: params.subject,
    body: params.body,
    timestamp: Date.now(),  // Task creation time (now)
    metadata: {
      task_type: params.taskType || 'TODO',
      status: params.status || 'NOT_STARTED',
      priority: params.priority,
      due_date: params.timestamp,  // Task due date (from user input)
    },
  });
};

/**
 * @deprecated Use createNoteEngagement instead
 * Kept for backward compatibility with existing webhook code
 */
export const createNote = async (payload: {
  dealId: string;
  content: string;
  userId: string;
}): Promise<{ success: boolean; noteId: string }> => {
  await new Promise(resolve => setTimeout(resolve, 300));

  return {
    success: true,
    noteId: `note-${Date.now()}`,
  };
};

export const createContact = async (payload: {
  name: string;
  email: string;
  phone: string;
  company?: string;
}): Promise<{ success: boolean; contactId: string }> => {
  await new Promise(resolve => setTimeout(resolve, 300));

  return {
    success: true,
    contactId: `contact-${Date.now()}`,
  };
};

export const createDeal = async (payload: {
  name: string;
  amount: number;
  stage: string;
  ownerId: string;
}): Promise<{ success: boolean; dealId: string }> => {
  await new Promise(resolve => setTimeout(resolve, 300));

  return {
    success: true,
    dealId: `deal-${Date.now()}`,
  };
};

export const createCompany = async (payload: {
  name: string;
  domain?: string;
  industry?: string;
}): Promise<{ success: boolean; companyId: string }> => {
  await new Promise(resolve => setTimeout(resolve, 300));

  return {
    success: true,
    companyId: `company-${Date.now()}`,
  };
};

// Get risks for a specific deal
// Uses deal.risks if present (from real BarrierX bulk response); otherwise falls back to a static list for now.
export const getRisks = async (
  dealId: string,
  deal?: Deal
): Promise<{
  success: boolean;
  dealId: string;
  risks: Array<{ category: string; score: number; description: string }>;
}> => {
  // ✅ Prefer real risks from BarrierX bulk response (when/if present)
  if (deal?.risks && deal.risks.length > 0) {
    console.log(`✅ Using ${deal.risks.length} real risks from BarrierX for deal ${dealId}`);
    return { success: true, dealId, risks: deal.risks };
  }

  // Fallback risks (until BarrierX bulk response includes deal.risks)
  const mockRisks = [
    {
      category: 'Economic Buyer',
      score: 7,
      description:
        'Economic buyer engagement is limited. Schedule a direct meeting to confirm budget authority and understand the approval process.',
    },
    {
      category: 'Budget Authority',
      score: 6,
      description:
        'Budget approval process is unclear. Document the decision-making chain and identify all required approvers.',
    },
    {
      category: 'Champion Strength',
      score: 5,
      description:
        'Champion may lack influence to drive internal approval. Provide ROI materials and executive sponsor engagement to strengthen their position.',
    },
  ];

  console.log(`🔧 Using fallback risks for deal ${dealId} (BarrierX bulk response has no deal.risks)`);
  return { success: true, dealId, risks: mockRisks };
};

// Get recommendations for a specific deal
// Uses recommendations from deal if available (from real BarrierX bulk response); otherwise falls back to a static list.
export const getRecommendations = async (
  dealId: string,
  deal?: Deal
): Promise<{
  success: boolean;
  dealId: string;
  recommendations: Array<{
    note: string;
    title: string;
    severity: string;
    isAssigned: boolean;
    indicatorId: string;
    isCompleted: boolean;
  }>;
}> => {
  // Check if deal has recommendations from BarrierX
  if (deal?.recommendations && deal.recommendations.length > 0) {
    console.log(`✅ Using ${deal.recommendations.length} real recommendations from BarrierX for deal ${dealId}`);
    return {
      success: true,
      dealId,
      recommendations: deal.recommendations,
    };
  }

  // Fallback recommendations (only when real recommendations are missing/empty in the bulk response)
  const mockRecommendations = [
    {
      note: 'Schedule a direct meeting with the economic buyer to confirm budget approval authority, understand the approval process, and verify allocated budget availability. Document confirmation and identify any remaining approval steps needed.',
      title: 'Confirm Economic Buyer Budget Authority',
      severity: 'Critical',
      isAssigned: false,
      indicatorId: 'mock-indicator-1',
      isCompleted: false,
    },
    {
      note: 'Create a formal decision authority map identifying all stakeholders, their roles, approval levels, and required steps for deal approval. Share with the champion to ensure alignment and prevent delays from unclear authority.',
      title: 'Document Decision-Making Authority and Process',
      severity: 'Critical',
      isAssigned: false,
      indicatorId: 'mock-indicator-2',
      isCompleted: false,
    },
    {
      note: 'Request written confirmation from the economic buyer committing budget and internal resources for implementation. Include specific resource allocation, timeline commitments, and participation requirements.',
      title: 'Secure Formal Budget and Resource Commitment',
      severity: 'Critical',
      isAssigned: false,
      indicatorId: 'mock-indicator-3',
      isCompleted: false,
    },
    {
      note: "Develop and present a detailed ROI analysis quantifying business impact, cost savings, and payback period. Align metrics with the customer's strategic priorities and demonstrate clear value within 12 months.",
      title: 'Prepare and Present a Formal ROI Analysis',
      severity: 'High',
      isAssigned: false,
      indicatorId: 'mock-indicator-4',
      isCompleted: false,
    },
    {
      note: 'Send the formal contract with clear deliverables, timelines, and terms before month-end to capitalize on current budget availability and maintain deal momentum while stakeholders are engaged.',
      title: 'Finalize Contract Terms Before Period Close(Dummy Data)',
      severity: 'High',
      isAssigned: false,
      indicatorId: 'mock-indicator-5',
      isCompleted: false,
    },
  ];

  console.log(`🔧 Using fallback recommendations for deal ${dealId} (BarrierX bulk response has no recommendations)`);
  return { success: true, dealId, recommendations: mockRecommendations };
};

