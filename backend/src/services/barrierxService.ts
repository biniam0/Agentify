// BarrierX Service - Real API Integration
// Uses real BarrierX API for authentication (login/refresh)
// Falls back to mock data for deals in development mode

import axios from 'axios';
import { config } from '../config/env';
import mockUsersDataJson from '../data/mockUsers.json';
import { generateDummyRecommendations } from './barrierx/dummyDataGenerators';

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
  tenantSlug?: string;
  contacts: Contact[];
  meetings: Meeting[];
  summary?: string;
  userDealRiskScores?: any;
  closeDate?: string;
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

// Process time templates like {{T+10}} or {{T-15}} into ISO dates
// Used by mock data to generate dynamic meeting times
const processTimeTemplates = (timeStr: string): string => {
  const now = Date.now();

  // Match {{T+X}} or {{T-X}} patterns
  const match = timeStr.match(/\{\{T([+-])(\d+)\}\}/);

  if (match) {
    const operator = match[1];
    const minutes = parseInt(match[2], 10);
    const milliseconds = minutes * 60 * 1000;

    const targetTime = operator === '+'
      ? now + milliseconds
      : now - milliseconds;

    return new Date(targetTime).toISOString();
  }

  // If no template found, return as-is (might be an ISO date already)
  return timeStr;
};

/**
 * Get deals for a specific user
 * Uses real BarrierX bulk API when available, falls back to mock data
 */
export const getUserDeals = async (userId: string): Promise<Deal[]> => {
  // Use mock data if flag is enabled
  if (config.barrierx.useMockData) {
    console.log(`🔧 Using MOCK data for user ${userId}`);
    return mockGetUserDeals(userId);
  }

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
      return mockGetUserDeals(userId);
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

  // Use mock data if flag is enabled
  if (config.barrierx.useMockData) {
    console.log(`🔧 Using MOCK data for ${userIds.length} users`);
    const dealsMap = new Map<string, Deal[]>();
    await Promise.all(
      userIds.map(async (id) => {
        const deals = await mockGetUserDeals(id);
        dealsMap.set(id, deals);
      })
    );
    return dealsMap;
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
      const dealsMap = new Map<string, Deal[]>();
      await Promise.all(
        userIds.map(async (id) => {
          const deals = await mockGetUserDeals(id);
          dealsMap.set(id, deals);
        })
      );
      return dealsMap;
    }

    // Transform bulk response
    const { transformBulkResponse } = await import('./barrierx/dataTransformers');
    const dealsMap = transformBulkResponse(response.data.tenants, userIds);
    
    console.log(`✅ Successfully batch fetched deals for ${dealsMap.size} users in ${durationSeconds}s`);
    return dealsMap;

  } catch (error: any) {
    console.error(`❌ Batch API error:`, error.response?.data || error.message);

    // Fallback to mock data in development
    if (config.nodeEnv === 'development') {
      console.log(`🔧 Falling back to MOCK data for batch request`);
      const dealsMap = new Map<string, Deal[]>();
      await Promise.all(
        userIds.map(async (id) => {
          const deals = await mockGetUserDeals(id);
          dealsMap.set(id, deals);
        })
      );
      return dealsMap;
    }

    return new Map();
  }
};

/**
 * Get ALL deals from ALL tenants and ALL users in ONE call
 * Uses wildcard approach (no user_ids parameter) to fetch everything
 * Perfect for bulk automation mode
 */
export const getAllDealsWildcard = async (): Promise<Map<string, Deal[]>> => {
  // Use mock data if flag is enabled
  if (config.barrierx.useMockData) {
    console.log(`🔧 Using MOCK data for wildcard request`);
    // For mock, just return empty map or all mock users
    return new Map();
  }

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

    return dealsMap;

  } catch (error: any) {
    console.error('❌ Wildcard bulk API error:', error.response?.data || error.message);

    // Fallback to mock data in development
    if (config.nodeEnv === 'development') {
      console.log(`🔧 Falling back to MOCK data for wildcard request`);
      return new Map();
    }

    return new Map();
  }
};

/**
 * Mock implementation for getUserDeals
 * Used when USE_MOCK_BARRIERX=true or as fallback
*/
const mockGetUserDeals = async (userId: string): Promise<Deal[]> => {
  await new Promise(resolve => setTimeout(resolve, 400));

  const typedMockUsers = mockUsersDataJson as { [key: string]: any };
  const userData = typedMockUsers[userId];

  if (!userData || !userData.deals) {
    return [];
  }

  // Convert mockUsers.json deal format to BarrierX Deal format
  const deals: Deal[] = userData.deals.map((deal: any) => {
    // Convert contacts from mockUsers.json format
    const contacts: Contact[] = deal.contacts?.map((c: any) => ({
      id: c.id,
      name: c.properties.name,
      email: c.properties.email,
      phone: c.properties.phone,
      company: deal.company,
    })) || [];

    // Convert meetings from mockUsers.json format
    const meetings: Meeting[] = deal.meetings?.map((m: any) => ({
      id: m.id,
      title: m.title,
      startTime: processTimeTemplates(m.startTime),
      endTime: processTimeTemplates(m.endTime),
      status: 'scheduled' as const,
      agenda: m.body,
      participants: contacts,
    })) || [];

    return {
      id: deal.id,
      name: deal.dealName,
      amount: deal.amount,
      stage: deal.stage,
      company: deal.company,
      ownerId: userId,
      ownerName: userData.name,
      ownerPhone: deal.owner?.phone,
      contacts,
      meetings,
      summary: deal.summary,
      userDealRiskScores: deal.userDealRiskScores,
      closeDate: deal.closeDate,
    };
  });

  return deals;
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
// Returns simple mock risks until BarrierX API provides real risk data
export const getRisks = async (dealId: string): Promise<{
  success: boolean;
  dealId: string;
  risks: Array<{ category: string; score: number; description: string }>;
}> => {
  // Simple mock risks - useful for ElevenLabs agent context
  const mockRisks = [
    {
      category: 'Champion',
      score: 6,
      description: 'Champion engagement needs improvement. Consider scheduling a direct touchpoint with the decision maker.',
    },
    {
      category: 'Timeline',
      score: 5,
      description: 'Deal velocity is tracking slightly behind schedule. Monitor the close date and create urgency.',
    },
    {
      category: 'Competition',
      score: 4,
      description: 'Competitive activity detected in this account. Be prepared to differentiate your solution.',
    },
  ];

  return {
    success: true,
    dealId,
    risks: mockRisks,
  };
};

// Get recommendations for a specific deal
// Returns mock recommendations that mirror the BarrierX recommendation structure
export const getRecommendations = async (dealId: string): Promise<{
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
  const mockRecommendations = [
    {
      note: 'Schedule a meeting with the economic buyer to explicitly confirm their budget approval authority and understand the complete approval process for the deal amount.',
      title: 'Confirm Economic Buyer Budget Authority',
      severity: 'Critical',
      isAssigned: false,
      indicatorId: 'mock-indicator-1',
      isCompleted: false,
    },
    {
      note: 'Work with your champion to demonstrate their ability to secure budget commitments by preparing a business case that shows clear ROI and aligns with the economic buyer’s priorities.',
      title: 'Secure Budget Commitment from Champion',
      severity: 'Critical',
      isAssigned: false,
      indicatorId: 'mock-indicator-2',
      isCompleted: false,
    },
    {
      note: 'Document formal budget and resource commitments from the economic buyer and implementation team, ensuring all stakeholders are aligned on the target close date.',
      title: 'Obtain Formal Budget and Resource Commitments',
      severity: 'Critical',
      isAssigned: false,
      indicatorId: 'mock-indicator-3',
      isCompleted: false,
    },
    {
      note: 'Address all unresolved commercial terms in the contract that could delay the target close date, focusing on the most critical blockers first.',
      title: 'Resolve Unresolved Commercial Terms',
      severity: 'High',
      isAssigned: false,
      indicatorId: 'mock-indicator-4',
      isCompleted: false,
    },
  ];

  return {
    success: true,
    dealId,
    recommendations: mockRecommendations,
  };
};

