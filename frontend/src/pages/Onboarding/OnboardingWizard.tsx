import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingProvider, useOnboarding } from '@/contexts/OnboardingContext';
import * as authService from '@/services/authService';
import { Check } from 'lucide-react';
import BusinessInfoStep from './steps/BusinessInfoStep';
import ConnectBarrierXStep from './steps/ConnectBarrierXStep';
import ConnectHubSpotStep from './steps/ConnectHubSpotStep';
import ChoosePlanStep from './steps/ChoosePlanStep';

const STEPS = [
  { id: 0, label: 'Tell us about your business', description: 'Help our AI understand your sales process' },
  { id: 1, label: 'Connect BarrierX', description: 'Link your BarrierX account to AgentX' },
  { id: 2, label: 'Connect HubSpot', description: 'Sync your CRM data for AI insights' },
  { id: 3, label: 'Choose your plan', description: 'Select the plan that fits your team' },
];

function StepContent() {
  const { state } = useOnboarding();

  switch (state.currentStep) {
    case 0:
      return <BusinessInfoStep />;
    case 1:
      return <ConnectBarrierXStep />;
    case 2:
      return <ConnectHubSpotStep />;
    case 3:
      return <ChoosePlanStep />;
    default:
      return <BusinessInfoStep />;
  }
}

function WizardInner() {
  const { state, setCurrentStep, canProceedToStep } = useOnboarding();
  const navigate = useNavigate();

  useEffect(() => {
    if (state.completed) {
      navigate('/app/v2', { replace: true });
    }
  }, [state.completed, navigate]);

  return (
    <div className="min-h-screen dark:bg-background">
      <div className="min-h-screen flex items-center justify-center px-4 py-10">
        <div className="flex items-start gap-16 w-full max-w-[1060px]">
          {/* Floating sidebar card */}
          <aside className="hidden lg:flex w-[320px] shrink-0 flex-col rounded-md border border-gray-200 dark:border-border bg-white dark:bg-card p-8">
            {/* Logo */}
            <div className="mb-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-extrabold text-heading dark:text-foreground tracking-tight">
                  Agent
                </span>
                <svg viewBox="0 0 42 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-[1.4rem] w-auto">
                  <path d="M42 28H28V14L42 28Z" fill="#53A17D" />
                  <path d="M28 14V0L42 2.00272e-06L28 14Z" fill="#2D6A4F" />
                  <path d="M14 28V14H28L14 28Z" fill="#2D6A4F" />
                  <path d="M28 14H14V0L28 14Z" fill="#53A17D" />
                  <path d="M14 28H0L14 14V28Z" fill="#53A17D" />
                  <path d="M14 14L0 0H14V14Z" fill="#53A17D" />
                </svg>
              </div>
            </div>

            <div className="mt-5 mb-7">
              <h2 className="text-lg font-semibold text-heading dark:text-foreground">Let's get started</h2>
              <p className="text-sm text-body dark:text-muted-foreground mt-1 leading-relaxed">
                Set up your account and connect your tools to unlock the full potential of AgentX
              </p>
            </div>

            {/* Vertical stepper */}
            <nav>
              {STEPS.map((step, index) => {
                const isActive = state.currentStep === step.id;
                const isCompleted = canProceedToStep(step.id + 1);
                const isClickable = step.id === 0 || canProceedToStep(step.id);
                const isLast = index === STEPS.length - 1;

                return (
                  <div key={step.id} className="flex gap-3">
                    {/* Circle + line column */}
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => isClickable && setCurrentStep(step.id)}
                        disabled={!isClickable}
                        className={`relative z-10 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all duration-300 ${isCompleted
                          ? 'border-brand bg-brand text-white'
                          : isActive
                            ? 'border-brand bg-white dark:bg-card shadow-[0_0_0_2px_rgba(29,139,113,0.10)]'
                            : isClickable
                              ? 'border-gray-300 dark:border-white/15 bg-white dark:bg-card'
                              : 'border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-card opacity-50 cursor-not-allowed'
                          }`}
                      >
                        {isCompleted ? (
                          <Check className="h-2.5 w-2.5" strokeWidth={3} />
                        ) : isActive ? (
                          <div className="h-1.5 w-1.5 rounded-full bg-brand" />
                        ) : (
                          <div className="h-1 w-1 rounded-full bg-gray-300 dark:bg-white/20" />
                        )}
                      </button>

                      {!isLast && (
                        <div
                          className={`w-px flex-1 my-0.5 transition-colors duration-300 ${isCompleted ? 'bg-brand' : 'bg-gray-200 dark:bg-white/10'
                            }`}
                        />
                      )}
                    </div>

                    {/* Label column */}
                    <button
                      onClick={() => isClickable && setCurrentStep(step.id)}
                      disabled={!isClickable}
                      className={`text-left pb-6 pt-0.5 transition-opacity duration-200 ${!isClickable ? 'opacity-45 cursor-not-allowed' : ''
                        } ${isLast ? 'pb-0' : ''}`}
                    >
                      <p
                        className={`text-[13px] font-semibold leading-tight ${isActive
                          ? 'text-[#1D8B71]'
                          : isCompleted
                            ? 'text-heading dark:text-foreground'
                            : 'text-gray-500 dark:text-muted-foreground'
                          }`}
                      >
                        {step.label}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-muted-foreground mt-1 leading-relaxed">
                        {step.description}
                      </p>
                    </button>
                  </div>
                );
              })}
            </nav>
          </aside>

          {/* Main content area */}
          <main className="flex-1 min-w-0">
            {/* Mobile step indicator */}
            <div className="lg:hidden px-5 py-4 mb-6 rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-card">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  {STEPS.map((step) => (
                    <div
                      key={step.id}
                      className={`h-2 rounded-full transition-all duration-300 ${step.id === state.currentStep
                        ? 'w-8 bg-brand'
                        : step.id < state.currentStep || canProceedToStep(step.id + 1)
                          ? 'w-2 bg-brand/40'
                          : 'w-2 bg-gray-200 dark:bg-white/10'
                        }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-body dark:text-muted-foreground ml-3">
                  Step {state.currentStep + 1} of {STEPS.length}
                </span>
              </div>
              <p className="text-sm font-medium text-heading dark:text-foreground mt-1">
                {STEPS[state.currentStep].label}
              </p>
            </div>

            {/* Step content */}
            <StepContent />
          </main>

        </div>
      </div>
    </div>
  );
}

export default function OnboardingWizard() {
  const user = authService.getUser();

  return (
    <OnboardingProvider userName={user?.name} userEmail={user?.email}>
      <WizardInner />
    </OnboardingProvider>
  );
}
