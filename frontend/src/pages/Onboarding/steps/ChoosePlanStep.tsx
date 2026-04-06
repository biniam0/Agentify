import { useOnboarding } from '@/contexts/OnboardingContext';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Check, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const PLANS = [
  {
    id: 'pro',
    name: 'Pro Plan',
    deals: '5 Deals monitoring',
    highlighted: false,
    features: [
      '1 Seat included',
      '90 Risk Indicators',
      '5 Recommendations per deal',
      '9 Barrier Categories',
    ],
  },
  {
    id: 'business',
    name: 'Business Plan',
    deals: '30 Deals monitoring',
    highlighted: true,
    badge: 'Best value',
    features: [
      '3 Seats included',
      '150 Risk Indicators',
      '25 Recommendations per deal',
      '13 Barrier Categories',
      'Public API & Webhooks',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise Plan',
    deals: 'Unlimited Deals monitoring',
    highlighted: false,
    features: [
      'Unlimited Seats included',
      '500+ Risk Indicators',
      'Unlimited Recommendations',
      '18 Barrier Categories',
      'SSO, API & Webhooks',
      'Enterprise Governance',
    ],
  },
];

export default function ChoosePlanStep() {
  const { state, setSelectedPlan, completeOnboarding, setCurrentStep } = useOnboarding();
  const [annualBilling, setAnnualBilling] = useState(false);
  const [completing, setCompleting] = useState(false);
  const navigate = useNavigate();

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handleComplete = async () => {
    if (!state.selectedPlan) return;
    setCompleting(true);
    // Simulate a brief delay for UX
    await new Promise((r) => setTimeout(r, 800));
    completeOnboarding();
    navigate('/app/v2', { replace: true });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-heading dark:text-foreground">
          Choose your plan
        </h1>
        <p className="text-sm text-body dark:text-muted-foreground mt-2">
          Select the subscription plan that suits your needs. You can always change later.
        </p>
      </div>

      {/* Billing toggle */}
      <div className="flex items-center gap-3">
        <span className={`text-sm ${!annualBilling ? 'text-heading dark:text-foreground font-medium' : 'text-body dark:text-muted-foreground'}`}>
          Monthly
        </span>
        <Switch
          checked={annualBilling}
          onCheckedChange={setAnnualBilling}
          className="data-[state=checked]:bg-brand"
        />
        <span className={`text-sm ${annualBilling ? 'text-heading dark:text-foreground font-medium' : 'text-body dark:text-muted-foreground'}`}>
          Annual
        </span>
        {annualBilling && (
          <span className="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
            Save 20%
          </span>
        )}
      </div>

      {/* Plan cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {PLANS.map((plan) => {
          const isSelected = state.selectedPlan === plan.id;

          return (
            <button
              key={plan.id}
              onClick={() => handleSelectPlan(plan.id)}
              className={`relative flex flex-col rounded-2xl border p-5 text-left transition-all duration-200 ${
                isSelected
                  ? 'border-brand ring-2 ring-brand/20 bg-brand/5 dark:bg-brand/10'
                  : plan.highlighted
                  ? 'border-brand/30 bg-brand/[0.02] dark:bg-brand/5 hover:border-brand/50'
                  : 'border-subtle dark:border-border bg-elevated dark:bg-card hover:border-gray-300 dark:hover:border-white/20'
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <span className="absolute -top-2.5 right-4 rounded-full bg-brand px-3 py-0.5 text-[10px] font-semibold text-white uppercase tracking-wide">
                  {plan.badge}
                </span>
              )}

              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-3 right-3 h-6 w-6 rounded-full bg-brand flex items-center justify-center">
                  <Check className="h-3.5 w-3.5 text-white" />
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-base font-semibold text-heading dark:text-foreground">
                  {plan.name}
                </h3>
                <p className="text-xs text-body dark:text-muted-foreground mt-1">{plan.deals}</p>
              </div>

              <div className="h-px bg-gray-100 dark:bg-white/10 mb-4" />

              <ul className="space-y-2.5 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check
                      className={`h-4 w-4 shrink-0 mt-0.5 ${
                        isSelected ? 'text-brand' : 'text-gray-400 dark:text-gray-500'
                      }`}
                      strokeWidth={2.5}
                    />
                    <span className="text-body dark:text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-4">
        <Button
          variant="ghost"
          onClick={() => setCurrentStep(2)}
          className="text-body dark:text-muted-foreground gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleComplete}
          disabled={!state.selectedPlan || completing}
          className="bg-brand hover:bg-brand-hover text-white font-medium px-8 h-11 gap-2"
        >
          {completing ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Setting up...
            </span>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Complete Setup
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
