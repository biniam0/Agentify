import { useState } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, CreditCard, Lock, Shield } from 'lucide-react';
import * as billingService from '@/services/billingService';

const PLAN_DISPLAY: Record<string, { name: string; monthlyPrice: string; annualPrice: string }> = {
  pro: { name: 'Pro Plan', monthlyPrice: '$49', annualPrice: '$39' },
  business: { name: 'Business Plan', monthlyPrice: '$149', annualPrice: '$119' },
  enterprise: { name: 'Enterprise Plan', monthlyPrice: '$499', annualPrice: '$399' },
};

export default function CheckoutStep() {
  const { state, setPaymentSubStep, startCheckoutVerification } = useOnboarding();
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardName, setCardName] = useState(state.businessInfo.name);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const plan = state.selectedPlan ? PLAN_DISPLAY[state.selectedPlan] : null;
  const price = plan
    ? state.billingInterval === 'ANNUAL' ? plan.annualPrice : plan.monthlyPrice
    : '';
  const intervalLabel = state.billingInterval === 'ANNUAL' ? '/mo (billed annually)' : '/month';

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const isFormValid = cardNumber.replace(/\s/g, '').length === 16
    && expiry.length === 5
    && cvc.length >= 3
    && cardName.trim().length > 0;

  const handleSubmit = async () => {
    if (!isFormValid || !state.selectedPlan) return;
    setLoading(true);
    setError('');

    try {
      const response = await billingService.createCheckout({
        planId: state.selectedPlan,
        interval: state.billingInterval,
      });

      startCheckoutVerification({
        sessionId: response.sessionId,
        customerId: response.customerId,
        planName: response.planName,
        amount: response.amount,
        currency: response.currency,
        interval: response.interval,
      });
    } catch (err: any) {
      const serverError = err.response?.data?.error;
      const serverMessage = err.response?.data?.message;
      const status = err.response?.status;
      console.error('Checkout error:', { status, serverError, serverMessage, err });
      setError(serverError || serverMessage || `Payment failed (${status || 'network error'}). Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading dark:text-foreground">
          Payment details
        </h1>
        <p className="text-sm text-body dark:text-muted-foreground mt-2">
          Enter your card information to complete your subscription.
        </p>
      </div>

      {/* Order summary */}
      {plan && (
        <div className="rounded-xl border border-subtle dark:border-border bg-elevated dark:bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-heading dark:text-foreground">{plan.name}</p>
              <p className="text-xs text-body dark:text-muted-foreground mt-0.5">
                {state.billingInterval === 'ANNUAL' ? 'Annual billing' : 'Monthly billing'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-heading dark:text-foreground">{price}</p>
              <p className="text-xs text-body dark:text-muted-foreground">{intervalLabel}</p>
            </div>
          </div>
        </div>
      )}

      {/* Card form */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="cardName" className="text-sm text-heading dark:text-foreground">
            Name on card
          </Label>
          <Input
            id="cardName"
            name="ccname"
            autoComplete="cc-name"
            value={cardName}
            onChange={(e) => setCardName(e.target.value)}
            placeholder="John Doe"
            className="mt-1.5 bg-white dark:bg-card"
          />
        </div>

        <div>
          <Label htmlFor="cardNumber" className="text-sm text-heading dark:text-foreground">
            Card number
          </Label>
          <div className="relative mt-1.5">
            <Input
              id="cardNumber"
              name="cardnumber"
              autoComplete="cc-number"
              inputMode="numeric"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              placeholder="4242 4242 4242 4242"
              className="bg-white dark:bg-card pr-10"
              maxLength={19}
            />
            <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="expiry" className="text-sm text-heading dark:text-foreground">
              Expiry date
            </Label>
            <Input
              id="expiry"
              name="cc-exp"
              autoComplete="cc-exp"
              inputMode="numeric"
              value={expiry}
              onChange={(e) => setExpiry(formatExpiry(e.target.value))}
              placeholder="MM/YY"
              className="mt-1.5 bg-white dark:bg-card"
              maxLength={5}
            />
          </div>
          <div>
            <Label htmlFor="cvc" className="text-sm text-heading dark:text-foreground">
              CVC
            </Label>
            <Input
              id="cvc"
              name="cvc"
              autoComplete="cc-csc"
              inputMode="numeric"
              value={cvc}
              onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="123"
              className="mt-1.5 bg-white dark:bg-card"
              maxLength={4}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-3">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Security badges */}
      <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-muted-foreground">
        <span className="flex items-center gap-1">
          <Lock className="h-3 w-3" />
          SSL encrypted
        </span>
        <span className="flex items-center gap-1">
          <Shield className="h-3 w-3" />
          PCI compliant
        </span>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-2">
        <Button
          variant="ghost"
          onClick={() => setPaymentSubStep(null)}
          className="text-body dark:text-muted-foreground gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to plans
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!isFormValid || loading}
          className="bg-brand hover:bg-brand-hover text-white font-medium px-8 h-11 gap-2"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Processing...
            </span>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              Pay {price}{intervalLabel}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
