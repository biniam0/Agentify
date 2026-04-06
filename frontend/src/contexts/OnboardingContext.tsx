import React, { createContext, useContext, useState, useCallback } from 'react';

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
  completed: boolean;
}

interface OnboardingContextValue {
  state: OnboardingState;
  setCurrentStep: (step: number) => void;
  setBusinessInfo: (info: Partial<BusinessInfo>) => void;
  setBarrierXConnected: (connected: boolean) => void;
  setHubSpotConnected: (connected: boolean) => void;
  setSelectedPlan: (plan: string) => void;
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
    completed: false,
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

  const persist = useCallback((next: OnboardingState) => {
    setState(next);
    saveState(next);
  }, []);

  const setCurrentStep = useCallback(
    (step: number) => persist({ ...state, currentStep: step }),
    [state, persist],
  );

  const setBusinessInfo = useCallback(
    (info: Partial<BusinessInfo>) =>
      persist({ ...state, businessInfo: { ...state.businessInfo, ...info } }),
    [state, persist],
  );

  const setBarrierXConnected = useCallback(
    (connected: boolean) => persist({ ...state, barrierxConnected: connected }),
    [state, persist],
  );

  const setHubSpotConnected = useCallback(
    (connected: boolean) => persist({ ...state, hubspotConnected: connected }),
    [state, persist],
  );

  const setSelectedPlan = useCallback(
    (plan: string) => persist({ ...state, selectedPlan: plan }),
    [state, persist],
  );

  const completeOnboarding = useCallback(() => {
    const next = { ...state, completed: true };
    persist(next);
    localStorage.setItem('agentx_onboarded', 'true');
  }, [state, persist]);

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
