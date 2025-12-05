export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  isAuth: boolean;
  isEnabled: boolean;
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
  dealId: string;
  dealName: string;
  dealAmount?: number;
  dealStage?: string;
  dealCompany?: string;
  dealSummary?: string;
  dealRisks?: any;
  dealCloseDate?: string;
  contact: Contact | null;
  owner?: {
    name: string;
    phone: string;
    email: string;
  } | null;
  // For admin mode
  ownerBarrierxUserId?: string;
  ownerTenantSlug?: string;
}

export interface Deal {
  id: string;
  name: string;
  amount: number;
  stage: string;
  ownerId: string;
  ownerName: string;
  contacts: Contact[];
  meetings: Meeting[];
  summary?: string;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
}

export interface BarrierXData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tenants: Tenant[];
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: User;
  barrierx?: BarrierXData;
}

export interface MeetingsResponse {
  success: boolean;
  meetings: Meeting[];
  totalUsers?: number;
}

export interface CallTriggerResponse {
  success: boolean;
  message: string;
  conversationId?: string;
  callSid?: string;
}

