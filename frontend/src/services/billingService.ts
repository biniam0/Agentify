import api from './api';

export interface CreateCheckoutRequest {
  planId: string;
  interval: 'MONTHLY' | 'ANNUAL';
}

export interface CreateCheckoutResponse {
  success: boolean;
  sessionId: string;
  customerId: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  interval: string;
}

export interface VerifyPaymentRequest {
  sessionId: string;
  paymentMethod?: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  verified: boolean;
  sessionId: string;
  paymentMethod: string;
}

export interface ConfirmPaymentRequest {
  sessionId: string;
}

export interface ConfirmPaymentResponse {
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
  };
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

export const verifyPayment = async (data: VerifyPaymentRequest): Promise<VerifyPaymentResponse> => {
  const response = await api.post<VerifyPaymentResponse>('/billing/verify-payment', data);
  return response.data;
};

export const confirmPayment = async (data: ConfirmPaymentRequest): Promise<ConfirmPaymentResponse> => {
  const response = await api.post<ConfirmPaymentResponse>('/billing/confirm-payment', data);
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
