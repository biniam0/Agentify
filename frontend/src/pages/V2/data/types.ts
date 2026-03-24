export type DealStatus =
  | 'Closed Lost'
  | 'Budgetary Letter'
  | 'Negotiation'
  | 'Proposal'
  | 'Verbal Agreement'
  | 'Closed Won';

export type RiskLevel = 'Low risk' | 'Medium risk' | 'High risk';

export type FilterTab =
  | 'calls'
  | 'info-gatherings'
  | 'clients-meetings'
  | 'investigations'
  | 'clients-deals'
  | 'sms-sent';

export interface DealContact {
  name: string;
  email: string;
  phone: string;
}

export interface DealWorkflowStatus {
  current: string;
  lastCallDate: string;
}

export interface DealInsight {
  whyLost: string;
  competitor: string;
  whatToDoNext: string;
}

export interface AiAnalysis {
  summary: string;
  impact: string;
  recommendation: string;
}

export interface NextStepCard {
  id: string;
  title: string;
  description: string;
  icon: 'search' | 'document' | 'calendar';
}

export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  timestamp?: string;
  completed: boolean;
}

export interface V2Deal {
  id: string;
  companyName: string;
  companySubtitle: string;
  companyLogo?: string;
  companyLogoColor: string;
  status: DealStatus;
  value: number;
  barrierScore: number;
  riskLevel: RiskLevel;
  nextStep: string;
  contact: DealContact;
  workflowStatus: DealWorkflowStatus;
  dealExternalId?: string;
  conversationId?: string;
  duration?: string;
  analysisTag?: string;
  dealOutcome?: string;
  dealOutcomeReason?: string;
  insight?: DealInsight;
  aiAnalysis?: AiAnalysis;
  recommendedNextSteps?: NextStepCard[];
  timeline?: TimelineEvent[];
  totalTimelineEvents?: number;
}
