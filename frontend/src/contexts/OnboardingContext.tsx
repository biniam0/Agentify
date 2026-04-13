import React, { createContext, useContext, useState, useCallback } from 'react';
import { getUser, setUser } from '../services/authService';

export interface BusinessInfo {
  name: string;
  email: string;
  phone: string;
  businessType: string;
  softwareCategory: string;
  averageSalesCycle: string;
  averageDealSize: string;
}

export interface OnboardingState {
  currentStep: number;
  businessInfo: BusinessInfo;
  barrierxConnected: boolean;
  hubspotConnected: boolean;
  selectedPlan: string | null;
  billingInterval: 'MONTHLY' | 'ANNUAL';
  completed: boolean;
  checkoutLoading: boolean;
}

interface OnboardingContextValue {
  state: OnboardingState;
  setCurrentStep: (step: number) => void;
  setBusinessInfo: (info: Partial<BusinessInfo>) => void;
  setBarrierXConnected: (connected: boolean) => void;
  setHubSpotConnected: (connected: boolean) => void;
  setSelectedPlan: (plan: string) => void;
  setBillingInterval: (interval: 'MONTHLY' | 'ANNUAL') => void;
  setCheckoutLoading: (loading: boolean) => void;
  completeOnboarding: () => void;
  canProceedToStep: (step: number) => boolean;
}

const STORAGE_KEY = 'agentx_onboarding';

function loadState(): OnboardingState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveState(state: OnboardingState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getInitialState(userName?: string, userEmail?: string): OnboardingState {
  const saved = loadState();
  if (saved && !saved.completed) return saved;

  return {
    currentStep: 0,
    businessInfo: {
      name: userName || '',
      email: userEmail || '',
      phone: '',
      businessType: '',
      softwareCategory: '',
      averageSalesCycle: '',
      averageDealSize: '',
    },
    barrierxConnected: false,
    hubspotConnected: false,
    selectedPlan: null,
    billingInterval: 'MONTHLY',
    completed: false,
    checkoutLoading: false,
  };
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

export function OnboardingProvider({
  children,
  userName,
  userEmail,
}: {
  children: React.ReactNode;
  userName?: string;
  userEmail?: string;
}) {
  const [state, setState] = useState<OnboardingState>(() => getInitialState(userName, userEmail));

  const update = useCallback((updater: (prev: OnboardingState) => OnboardingState) => {
    setState((prev) => {
      const next = updater(prev);
      saveState(next);
      return next;
    });
  }, []);

  const setCurrentStep = useCallback(
    (step: number) => update((prev) => ({ ...prev, currentStep: step })),
    [update],
  );

  const setBusinessInfo = useCallback(
    (info: Partial<BusinessInfo>) =>
      update((prev) => ({ ...prev, businessInfo: { ...prev.businessInfo, ...info } })),
    [update],
  );

  const setBarrierXConnected = useCallback(
    (connected: boolean) => update((prev) => ({ ...prev, barrierxConnected: connected })),
    [update],
  );

  const setHubSpotConnected = useCallback(
    (connected: boolean) => update((prev) => ({ ...prev, hubspotConnected: connected })),
    [update],
  );

  const setSelectedPlan = useCallback(
    (plan: string) => update((prev) => ({ ...prev, selectedPlan: plan })),
    [update],
  );

  const setBillingInterval = useCallback(
    (interval: 'MONTHLY' | 'ANNUAL') => update((prev) => ({ ...prev, billingInterval: interval })),
    [update],
  );

  const setCheckoutLoading = useCallback(
    (loading: boolean) => update((prev) => ({ ...prev, checkoutLoading: loading })),
    [update],
  );

  const completeOnboarding = useCallback(() => {
    update((prev) => {
      const cachedUser = getUser();
      if (cachedUser) {
        setUser({ ...cachedUser, onboardingCompleted: true });
      }
      return { ...prev, completed: true };
    });
  }, [update]);

  const canProceedToStep = useCallback(
    (step: number): boolean => {
      if (step <= 0) return true;
      if (step === 1) {
        const b = state.businessInfo;
        return !!(b.name && b.email && b.phone && b.businessType && b.softwareCategory && b.averageSalesCycle && b.averageDealSize);
      }
      if (step === 2) return state.barrierxConnected;
      if (step === 3) return state.hubspotConnected;
      return false;
    },
    [state],
  );

  return (
    <OnboardingContext.Provider
      value={{
        state,
        setCurrentStep,
        setBusinessInfo,
        setBarrierXConnected,
        setHubSpotConnected,
        setSelectedPlan,
        setBillingInterval,
        setCheckoutLoading,
        completeOnboarding,
        canProceedToStep,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}
