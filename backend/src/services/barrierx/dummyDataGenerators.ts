/**
 * Dummy Data Generators for BarrierX Integration
 * 
 * These functions generate placeholder data when real data is not available
 * from the BarrierX API (e.g., when meetings, contacts, or risk scores are empty).
 */

import { Contact, Meeting } from '../barrierxService';

/**
 * Generate dummy contacts for a deal when none exist
 * Creates realistic contact data based on deal owner information
 */
/**
 * Default phone number to use when none is available
 */
const DEFAULT_PHONE = '+251914373107';

export const generateDummyContacts = (deal: any): Contact[] => {
  const contacts: Contact[] = [];

  // Primary contact from deal owner
  if (deal.owner && deal.owner.email) {
    contacts.push({
      id: `c-${deal.id}-owner`,
      name: deal.owner.name || 'Primary Contact',
      email: deal.owner.email,
      phone: deal.owner.phone || DEFAULT_PHONE,
      company: deal.company || 'Unknown Company',
    });
  } else {
    // Fallback generic contact
    contacts.push({
      id: `c-${deal.id}-1`,
      name: 'Primary Contact',
      email: `contact@${(deal.company || 'example').toLowerCase().replace(/\s+/g, '')}.com`,
      phone: DEFAULT_PHONE,
      company: deal.company || 'Unknown Company',
    });
  }

  // Add a secondary contact (decision maker)
  contacts.push({
    id: `c-${deal.id}-2`,
    name: 'Decision Maker',
    email: `dm@${(deal.company || 'example').toLowerCase().replace(/\s+/g, '')}.com`,
    phone: DEFAULT_PHONE,
    company: deal.company || 'Unknown Company',
  });

  return contacts;
};

/**
 * Generate dummy meetings based on deal stage and information
 * Creates appropriate meetings with realistic timing based on deal stage
 */
export const generateDummyMeetings = (deal: any, contacts: Contact[]): Meeting[] => {
  const meetings: Meeting[] = [];
  const now = Date.now();
  
  // Convert stage to lowercase for easier comparison
  const stage = (deal.stage || '').toLowerCase();

  // Pre-meeting (15 minutes before)
  const preMeetingTime = now - 15 * 60 * 1000;
  meetings.push({
    id: `m-${deal.id}-pre`,
    title: `Pre-${stage} Call`,
    startTime: new Date(preMeetingTime).toISOString(),
    endTime: new Date(preMeetingTime + 30 * 60 * 1000).toISOString(),
    status: 'completed' as const,
    agenda: `Preparation call for ${deal.dealName} - ${stage} phase`,
    participants: contacts,
  });

  // Current/upcoming meeting based on stage
  if (stage.includes('appointment') || stage.includes('presentation')) {
    const nextMeetingTime = now + 24 * 60 * 60 * 1000; // Tomorrow
    meetings.push({
      id: `m-${deal.id}-current`,
      title: `${deal.stage} Meeting`,
      startTime: new Date(nextMeetingTime).toISOString(),
      endTime: new Date(nextMeetingTime + 60 * 60 * 1000).toISOString(),
      status: 'scheduled' as const,
      agenda: `Discussion about ${deal.dealName} - ${stage} phase`,
      participants: contacts,
    });
  }

  // Follow-up meeting (30 minutes after current time for post-call testing)
  const postMeetingTime = now + 30 * 60 * 1000;
  meetings.push({
    id: `m-${deal.id}-post`,
    title: `Follow-up: ${deal.dealName}`,
    startTime: new Date(postMeetingTime).toISOString(),
    endTime: new Date(postMeetingTime + 30 * 60 * 1000).toISOString(),
    status: 'scheduled' as const,
    agenda: `Follow-up discussion and next steps for ${deal.dealName}`,
    participants: contacts,
  });

  return meetings;
};

/**
 * Generate dummy risk scores when calculation is pending or failed
 * Creates realistic risk distribution based on deal amount and stage
 */
export const generateDummyRiskScores = (deal: any): any => {
  // Higher amounts = potentially higher risk
  const amountFactor = Math.min((deal.amount || 0) / 50000, 1);
  
  // Different stages have different risk profiles
  const stageFactor = getStageRiskFactor(deal.stage);
  
  // Calculate base risks
  const arenaRisk = Math.floor((Math.random() * 15 + 5) * stageFactor);
  const controlRoomRisk = Math.floor((Math.random() * 12 + 3) * stageFactor);
  const scoreCardRisk = Math.floor((Math.random() * 10 + 2) * stageFactor);
  const totalDealRisk = Math.min(arenaRisk + controlRoomRisk + scoreCardRisk, 100);

  return {
    arenaRisk,
    controlRoomRisk,
    scoreCardRisk,
    totalDealRisk,
    subCategoryRisk: {
      ChampionRisks: Math.floor(Math.random() * 10),
      CompetitionRisks: Math.floor(Math.random() * 12),
      ContractualLegalRisks: Math.floor(Math.random() * 8),
      DealVelocity: Math.floor(Math.random() * 6),
      DecisionCriteriaRisks: Math.floor(Math.random() * 7),
      DecisionProcessRisks: Math.floor(Math.random() * 9),
      EconomicBuyerAuthorityRisks: Math.floor(Math.random() * 11),
      EngagementRelationshipRisks: Math.floor(Math.random() * 8),
      ExternalOrganizationalStabilityRisks: Math.floor(Math.random() * 5),
      FinancialRisks: Math.floor(Math.random() * 10),
      ImplementationPostSaleRisks: Math.floor(Math.random() * 6),
      IndustryMarketRisks: Math.floor(Math.random() * 7),
      InternalSalesProcessRisks: Math.floor(Math.random() * 5),
      MetricsValueRisks: Math.floor(Math.random() * 8),
      PainPriorityRisks: Math.floor(Math.random() * 9),
      PaperProcessProcurementRisks: Math.floor(Math.random() * 10),
      SolutionFitRisks: Math.floor(Math.random() * 11),
      TouchPoints: Math.floor(Math.random() * 15),
    },
  };
};

/**
 * Helper function to determine risk factor based on deal stage
 * Earlier stages = higher risk, later stages = lower risk
 */
const getStageRiskFactor = (stage: string = ''): number => {
  const lowerStage = stage.toLowerCase();
  
  if (lowerStage.includes('qualified')) return 1.2;
  if (lowerStage.includes('appointment')) return 1.0;
  if (lowerStage.includes('presentation')) return 0.9;
  if (lowerStage.includes('decision')) return 0.7;
  if (lowerStage.includes('contract')) return 0.5;
  if (lowerStage.includes('closed won')) return 0.3;
  if (lowerStage.includes('closed lost')) return 1.5;
  
  return 1.0; // Default
};

/**
 * Generate dummy recommendations based on deal information
 * Creates actionable recommendations based on stage and risks
 */
export const generateDummyRecommendations = (deal: any): string[] => {
  const recommendations: string[] = [];
  const stage = (deal.stage || '').toLowerCase();

  if (stage.includes('appointment')) {
    recommendations.push('Schedule follow-up meeting within 48 hours');
    recommendations.push('Identify key decision makers before next meeting');
  } else if (stage.includes('presentation')) {
    recommendations.push('Prepare detailed ROI analysis');
    recommendations.push('Address potential objections proactively');
  } else if (stage.includes('decision')) {
    recommendations.push('Schedule executive sponsor meeting');
    recommendations.push('Prepare contract draft for review');
  }

  if (deal.amount > 50000) {
    recommendations.push('Consider involving senior leadership');
  }

  return recommendations;
};

