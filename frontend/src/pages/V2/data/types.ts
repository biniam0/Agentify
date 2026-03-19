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
  | 'meeting-scheduled'
  | 'investigations'
  | 'high-risk';

export interface DealContact {
  name: string;
  email: string;
  phone: string;
}

export interface DealWorkflowStatus {
  current: string;
  lastCallDate: string;
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
}
