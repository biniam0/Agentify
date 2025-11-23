// Mock BarrierX Service
// This simulates the BarrierX API with dummy data

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

export interface BarrierXUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  isAuth: boolean;
  isEnabled: boolean;
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


// Mock data store
const mockTenants: Tenant[] = [
  {
    id: '3ee7bca3-fa9b-4abc-b886-f45b286451cc',
    slug: 'agent-call',
    name: 'AgentCall',
  },
  {
    id: '4ff8cdb4-gb0c-5bcd-c997-g56c397562dd',
    slug: 'sales-pro',
    name: 'SalesPro',
  },
];

// Verified BarrierX Users
const mockUsers: BarrierXUser[] = [
  {
    id: 'f1e1g57h-h608-8701-ffi5-f6i42476h6e9',
    name: 'Tamirat Kebede',
    email: 'tamiratkebede@gmail.com',
    phone: '+251914373107',
    isAuth: true,
    isEnabled: true,
    tenants: [mockTenants[0]],
  },
  {
    id: 'c8b8d24e-e275-5378-ccg2-c3g19143e3b6',
    name: 'Alex Johnson',
    email: 'alex.johnson@example.com',
    phone: '+251914373107',
    isAuth: true,
    isEnabled: true,
    tenants: [mockTenants[0], mockTenants[1]],
  },
  {
    id: 'd9c9e35f-f386-6489-ddh3-d4h20254f4c7',
    name: 'Sarah Williams',
    email: 'sarah.williams@company.com',
    phone: '+251914373107',
    isAuth: true,
    isEnabled: true,
    tenants: [mockTenants[0]],
  },
  {
    id: 'e0d0f46g-g497-7590-eei4-e5i31365g5d8',
    name: 'James Martinez',
    email: 'james.martinez@enterprise.com',
    phone: '+12125556789',
    isAuth: true,
    isEnabled: true,
    tenants: [mockTenants[0], mockTenants[1]],
  },
];



// Simulated API Methods

export const login = async (email: string, password: string): Promise<BarrierXLoginResponse | null> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const user = mockUsers.find(u => u.email === email);

  // For demo purposes, any password works
  if (user && password) {
    // Generate mock JWT token
    const mockAccessToken = `eyJhbGciOiJIUzI1NiIsImtpZCI6IjIxejc1OFk1R0l4b3dPTDEiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL21vY2stYmFycmllcnguY29tL2F1dGgvdjEiLCJzdWIiOiIke3VzZXIuaWR9IiwiYXVkIjoiYXV0aGVudGljYXRlZCIsImV4cCI6MTc5OTk5OTk5OSwiaWF0IjoxNzYyOTMyOTAzLCJlbWFpbCI6IiR7dXNlci5lbWFpbH0iLCJwaG9uZSI6IiR7dXNlci5waG9uZX0iLCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsIjoiJHt1c2VyLmVtYWlsfSIsImZpcnN0X25hbWUiOiIke3VzZXIubmFtZS5zcGxpdCgnICcpWzBdfSIsImxhc3RfbmFtZSI6IiR7dXNlci5uYW1lLnNwbGl0KCcgJylbMV19Iiwic3ViIjoiJHt1c2VyLmlkfSJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCJ9.mock-signature`;

    const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

    return {
      ok: true,
      userId: user.id,
      accessToken: mockAccessToken,
      refreshToken: 'mock-refresh-token-' + Math.random().toString(36).substring(7),
      expiresAt,
      tenants: user.tenants,
    };
  }

  return null;
};

export const getUserById = async (id: string): Promise<BarrierXUser | null> => {
  await new Promise(resolve => setTimeout(resolve, 300));

  const user = mockUsers.find(u => u.id === id);
  return user || null;
};

// Process time templates like {{T+10}} or {{T-15}} into ISO dates
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

export const getUserDeals = async (userId: string): Promise<Deal[]> => {
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

