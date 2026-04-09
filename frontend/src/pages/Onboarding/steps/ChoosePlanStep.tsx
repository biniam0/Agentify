import { useState } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Check, CreditCard, Loader2, ExternalLink } from 'lucide-react';
import * as billingService from '@/services/billingService';

const PLANS = [
  {
    id: 'pro',
    name: 'Pro Plan',
    monthlyPrice: 300,
    annualPrice: 3228,
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
    monthlyPrice: 900,
    annualPrice: 10428,
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
    monthlyPrice: 1200,
    annualPrice: 13800,
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

function formatPrice(cents: number, interval: 'MONTHLY' | 'ANNUAL'): string {
  if (interval === 'ANNUAL') {
    const monthly = cents / 12;
    return `$${monthly.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  return `$${cents.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function ChoosePlanStep() {
  const { state, setSelectedPlan, setBillingInterval, setCurrentStep } = useOnboarding();
  const [annualBilling, setAnnualBilling] = useState(state.billingInterval === 'ANNUAL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handleToggleBilling = (checked: boolean) => {
    setAnnualBilling(checked);
    setBillingInterval(checked ? 'ANNUAL' : 'MONTHLY');
  };

  const handleProceedToCheckout = async () => {
    if (!state.selectedPlan) return;
    setLoading(true);
    setError('');

    try {
      const response = await billingService.createCheckout({
        planId: state.selectedPlan,
        interval: state.billingInterval,
      });

      if (response.checkoutUrl) {
        window.location.href = response.checkoutUrl;
      } else {
        setError('Failed to create checkout session. Please try again.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start checkout. Please try again.';
      setError(msg);
      setLoading(false);
    }
  };

  const interval = annualBilling ? 'ANNUAL' as const : 'MONTHLY' as const;

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
          onCheckedChange={handleToggleBilling}
          className="data-[state=checked]:bg-brand"
        />
        <span className={`text-sm ${annualBilling ? 'text-heading dark:text-foreground font-medium' : 'text-body dark:text-muted-foreground'}`}>
          Annual
        </span>
        {annualBilling && (
          <span className="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
            Save up to 20%
          </span>
        )}
      </div>

      {/* Plan cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {PLANS.map((plan) => {
          const isSelected = state.selectedPlan === plan.id;
          const price = annualBilling ? plan.annualPrice : plan.monthlyPrice;
          const displayPrice = formatPrice(price, interval);

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
              {plan.badge && (
                <span className="absolute -top-2.5 right-4 rounded-full bg-brand px-3 py-0.5 text-[10px] font-semibold text-white uppercase tracking-wide">
                  {plan.badge}
                </span>
              )}

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

              {/* Price */}
              <div className="mb-4">
                <span className="text-2xl font-bold text-heading dark:text-foreground">
                  {displayPrice}
                </span>
                <span className="text-sm text-body dark:text-muted-foreground">
                  /mo{annualBilling ? ' (billed annually)' : ''}
                </span>
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

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-3">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

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
          onClick={handleProceedToCheckout}
          disabled={!state.selectedPlan || loading}
          className="bg-brand hover:bg-brand-hover text-white font-medium px-8 h-11 gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Redirecting to Stripe...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4" />
              Proceed to Checkout
              <ExternalLink className="h-3.5 w-3.5 opacity-60" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
