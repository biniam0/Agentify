// BarrierX Service - Real API Integration
// Uses real BarrierX API for authentication (login/refresh)
// Falls back to mock data for deals in development mode

import axios from 'axios';
import { config } from '../config/env';
import mockUsersDataJson from '../data/mockUsers.json';

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

    const response = await axios.get(
      `${config.barrierx.baseUrl}/api/external/tenants/bulk`,
      {
        params: {
          user_ids: userId,
          include_deals: true,
          include_members: false,
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

    if (!response.data.ok || !response.data.tenants?.length) {
      console.log(`⚠️  No tenants found for user ${userId}, using mock data`);
      return mockGetUserDeals(userId);
    }

    // Transform BarrierX format to AgentX format
    const { transformBarrierXDeals } = await import('./barrierx/dataTransformers');
    const deals = transformBarrierXDeals(response.data.tenants[0], userId);

    console.log(`✅ Successfully fetched ${deals.length} deals for user ${userId}`);
    return deals;

  } catch (error: any) {
    console.error(`❌ BarrierX API error for user ${userId}:`, error.response?.data || error.message);

    // Fallback to mock data in development
    if (config.nodeEnv === 'development') {
      console.log(`🔧 Falling back to MOCK data due to API error`);
      return mockGetUserDeals(userId);
    }

    return [];
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

    const response = await axios.get(
      `${config.barrierx.baseUrl}/api/external/tenants/bulk`,
      {
        params: {
          user_ids: userIds.join(','),  // Comma-separated
          include_deals: true,
          include_members: true,
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

    if (!response.data.ok || !response.data.tenants) {
      console.log(`⚠️  Batch API returned no tenants, using mock data`);
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

    console.log(`✅ Successfully batch fetched deals for ${dealsMap.size} users`);
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
export const getRisks = async (dealId: string): Promise<{
  success: boolean;
  dealId: string;
  risks: Array<{ category: string; score: number; description: string }>;
}> => {
  await new Promise(resolve => setTimeout(resolve, 200));

  // Find deal in mockUsers.json to get risk scores
  const typedMockUsers = mockUsersDataJson as { [key: string]: any };
  let dealRiskScores = null;

  // Search through all users to find the deal
  for (const userId in typedMockUsers) {
    const userData = typedMockUsers[userId];
    const deal = userData.deals?.find((d: any) => d.id === dealId);
    if (deal) {
      dealRiskScores = deal.userDealRiskScores;
      break;
    }
  }

  // Generate risks based on scores
  const risks = [];

  if (dealRiskScores) {
    const subRisks = dealRiskScores.subCategoryRisk || {};

    // Competition Risks
    if (subRisks.CompetitionRisks > 10) {
      risks.push({
        category: 'CompetitionRisks',
        score: subRisks.CompetitionRisks,
        description: `High competition risk detected with score of ${subRisks.CompetitionRisks}. Multiple competitors identified in the deal.`,
      });
    } else if (subRisks.CompetitionRisks > 5) {
      risks.push({
        category: 'CompetitionRisks',
        score: subRisks.CompetitionRisks,
        description: `Moderate competition risk (score: ${subRisks.CompetitionRisks}). Some competitive pressure exists.`,
      });
    }

    // Champion Risks
    if (subRisks.ChampionRisks > 10) {
      risks.push({
        category: 'ChampionRisks',
        score: subRisks.ChampionRisks,
        description: `Champion engagement is low (score: ${subRisks.ChampionRisks}). Limited contact with key decision maker.`,
      });
    } else if (subRisks.ChampionRisks > 5) {
      risks.push({
        category: 'ChampionRisks',
        score: subRisks.ChampionRisks,
        description: `Champion engagement needs attention (score: ${subRisks.ChampionRisks}).`,
      });
    }

    // Contractual/Legal Risks
    if (subRisks.ContractualLegalRisks > 5) {
      risks.push({
        category: 'ContractualLegalRisks',
        score: subRisks.ContractualLegalRisks,
        description: `Contract review pending with risk score ${subRisks.ContractualLegalRisks}. Legal concerns may delay closure.`,
      });
    }

    // Deal Velocity
    if (subRisks.DealVelocity > 5) {
      risks.push({
        category: 'DealVelocity',
        score: subRisks.DealVelocity,
        description: `Deal velocity is slower than expected (score: ${subRisks.DealVelocity}). Timeline may be at risk.`,
      });
    }
  }

  // Fill with defaults if less than 3 risks
  while (risks.length < 3) {
    if (risks.length === 0) {
      risks.push({
        category: 'General',
        score: 0,
        description: 'Deal is tracking well with minimal risks identified. All key metrics are positive.',
      });
    } else {
      risks.push({
        category: 'General',
        score: 0,
        description: 'No additional significant risks detected at this time.',
      });
    }
  }

  return {
    success: true,
    dealId,
    risks: risks.slice(0, 3),
  };
};

// Get recommendations for a specific deal
export const getRecommendations = async (dealId: string): Promise<{
  success: boolean;
  dealId: string;
  recommendations: Array<{ action: string; priority: string }>;
}> => {
  await new Promise(resolve => setTimeout(resolve, 200));

  // Find deal in mockUsers.json to get risk scores
  const typedMockUsers = mockUsersDataJson as { [key: string]: any };
  let dealRiskScores = null;

  // Search through all users to find the deal
  for (const userId in typedMockUsers) {
    const userData = typedMockUsers[userId];
    const deal = userData.deals?.find((d: any) => d.id === dealId);
    if (deal) {
      dealRiskScores = deal.userDealRiskScores;
      break;
    }
  }

  // Generate recommendations based on risks
  const recommendations = [];

  if (dealRiskScores) {
    const subRisks = dealRiskScores.subCategoryRisk || {};

    // Competition-based recommendations
    if (subRisks.CompetitionRisks > 10) {
      recommendations.push({
        action: 'Schedule competitive analysis call with champion and prepare differentiation materials.',
        priority: 'high',
      });
    } else if (subRisks.CompetitionRisks > 5) {
      recommendations.push({
        action: 'Highlight unique value propositions and schedule product comparison session.',
        priority: 'medium',
      });
    }

    // Champion-based recommendations
    if (subRisks.ChampionRisks > 10) {
      recommendations.push({
        action: 'Increase touchpoints with champion and schedule one-on-one executive briefing.',
        priority: 'high',
      });
    } else if (subRisks.ChampionRisks > 5) {
      recommendations.push({
        action: 'Build stronger relationship through regular check-ins and value demonstrations.',
        priority: 'medium',
      });
    }

    // Contractual recommendations
    if (subRisks.ContractualLegalRisks > 5) {
      recommendations.push({
        action: 'Engage legal teams early and provide contract redlines for faster review.',
        priority: 'high',
      });
    }

    // Velocity recommendations
    if (subRisks.DealVelocity > 5) {
      recommendations.push({
        action: 'Create urgency through limited-time offers and expedite decision-making process.',
        priority: 'medium',
      });
    }

    // Arena/Control recommendations
    if (dealRiskScores.arenaRisk > 10) {
      recommendations.push({
        action: 'Conduct comprehensive deal review and adjust strategy accordingly.',
        priority: 'high',
      });
    }
  }

  // Fill with defaults if less than 3
  while (recommendations.length < 3) {
    if (recommendations.length === 0) {
      recommendations.push({
        action: 'Continue with standard sales process and maintain regular communication cadence.',
        priority: 'low',
      });
    } else {
      recommendations.push({
        action: 'Proceed with planned next steps and monitor deal progress closely.',
        priority: 'low',
      });
    }
  }

  return {
    success: true,
    dealId,
    recommendations: recommendations.slice(0, 3),
  };
};

