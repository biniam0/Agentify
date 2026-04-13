import api from './api';

export interface CreateCheckoutRequest {
  planId: string;
  interval: 'MONTHLY' | 'ANNUAL';
}

export interface CreateCheckoutResponse {
  success: boolean;
  checkoutUrl: string;
  sessionId: string;
}

export interface CheckoutStatusResponse {
  success: boolean;
  status: string;
  planId: string;
  interval: string;
}

export interface SubscriptionResponse {
  success: boolean;
  subscription: {
    id: string;
    planId: string;
    planName: string;
    status: string;
    interval: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    amount: number;
    currency: string;
    cancelAtPeriodEnd: boolean;
  } | null;
}

export const createCheckout = async (data: CreateCheckoutRequest): Promise<CreateCheckoutResponse> => {
  const response = await api.post<CreateCheckoutResponse>('/billing/create-checkout', data);
  return response.data;
};

export const getCheckoutStatus = async (sessionId: string): Promise<CheckoutStatusResponse> => {
  const response = await api.get<CheckoutStatusResponse>(`/billing/checkout-status?session_id=${sessionId}`);
  return response.data;
};

export const getSubscription = async (): Promise<SubscriptionResponse> => {
  const response = await api.get<SubscriptionResponse>('/billing/subscription');
  return response.data;
};

export const saveOnboardingProfile = async (data: {
  name?: string;
  phone: string;
  businessType: string;
  softwareCategory: string;
  averageSalesCycle: string;
  averageDealSize: string;
}) => {
  const response = await api.post('/billing/onboarding', data);
  return response.data;
};
