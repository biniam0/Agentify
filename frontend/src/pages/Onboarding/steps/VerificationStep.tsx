import { useState, useEffect } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import * as billingService from '@/services/billingService';

const VERIFICATION_STEPS = [
  'Connecting to payment processor...',
  'Verifying card details...',
  'Authenticating transaction...',
  'Verification complete',
];

export default function VerificationStep() {
  const { state, setPaymentSubStep, setPaymentVerified } = useOnboarding();
  const [currentVerifyStep, setCurrentVerifyStep] = useState(0);
  const [verified, setVerified] = useState(state.paymentVerified);
  const [error, setError] = useState('');

  useEffect(() => {
    if (state.paymentVerified) {
      setVerified(true);
      setCurrentVerifyStep(VERIFICATION_STEPS.length - 1);
      return;
    }

    if (!state.checkoutData?.sessionId) return;

    let cancelled = false;

    const runVerification = async () => {
      for (let i = 0; i < VERIFICATION_STEPS.length - 1; i++) {
        if (cancelled) return;
        await new Promise((r) => setTimeout(r, 1200));
        if (cancelled) return;
        setCurrentVerifyStep(i + 1);
      }

      try {
        const response = await billingService.verifyPayment({
          sessionId: state.checkoutData!.sessionId,
          paymentMethod: 'mock_pm_visa_4242',
        });

        if (cancelled) return;

        if (response.verified) {
          setVerified(true);
          setPaymentVerified(true);
        }
      } catch (err: any) {
        if (cancelled) return;
        setError(err.response?.data?.error || 'Verification failed. Please try again.');
      }
    };

    runVerification();

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-heading dark:text-foreground">
          Payment verification
        </h1>
        <p className="text-sm text-body dark:text-muted-foreground mt-2">
          We're securely verifying your payment details. This usually takes a few seconds.
        </p>
      </div>

      {/* Verification animation card */}
      <div className="rounded-xl border border-subtle dark:border-border bg-elevated dark:bg-card p-8 flex flex-col items-center text-center">
        {!verified && !error ? (
          <>
            <div className="h-16 w-16 rounded-full bg-brand/10 flex items-center justify-center mb-6">
              <ShieldCheck className="h-8 w-8 text-brand animate-pulse" />
            </div>

            <div className="w-full max-w-xs space-y-3">
              {VERIFICATION_STEPS.map((step, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  {idx < currentVerifyStep ? (
                    <CheckCircle2 className="h-4 w-4 text-brand shrink-0" />
                  ) : idx === currentVerifyStep ? (
                    <Loader2 className="h-4 w-4 text-brand shrink-0 animate-spin" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-gray-200 dark:border-white/15 shrink-0" />
                  )}
                  <span
                    className={`text-sm ${idx <= currentVerifyStep
                      ? 'text-heading dark:text-foreground'
                      : 'text-gray-400 dark:text-muted-foreground'
                      }`}
                  >
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : verified ? (
          <>
            <div className="h-16 w-16 rounded-full flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="optimizeQuality" fill-rule="evenodd" clip-rule="evenodd" viewBox="0 0 511.99 486.95"><path fill-rule="nonzero" d="M193.54 213.74l43.9 41.72 79.27-95.04 34.12 28.37-109.68 131.5-78.25-74.34 30.64-32.21zm62.22-179.38L335.12.04l43.58 74.11 84.4 18.89-8.3 85.52 57.19 64.91-57.04 64.37 8.12 86.11-83.92 18.53-44.06 74.47-78.86-34.36-79.36 34.31-43.58-74.1-84.4-18.89 8.3-85.52L0 243.48l57.04-64.37L48.92 93l83.92-18.53L176.9 0l78.86 34.36zm68.04.33l-68.13 29.46-67.51-29.42-37.77 63.84-71.99 15.89 6.96 73.88-48.85 55.13 49.04 55.66-7.12 73.4 72.41 16.2 37.35 63.53 68.13-29.46 67.51 29.42 37.77-63.84 71.99-15.89-6.96-73.88 48.85-55.13-49.04-55.66 7.12-73.4-72.41-16.2-37.35-63.53z" /></svg>
            </div>
            <h2 className="text-lg font-semibold text-heading dark:text-foreground">
              Payment verified
            </h2>
            <p className="text-sm text-body dark:text-muted-foreground mt-1 max-w-sm">
              Your card ending in <span className="font-mono font-medium text-heading dark:text-foreground">4242</span> has been successfully verified.
            </p>
          </>
        ) : null}

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-3 w-full">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Order summary */}
      {state.checkoutData && (
        <div className="rounded-xl border border-subtle dark:border-border bg-elevated dark:bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-heading dark:text-foreground">
                {state.checkoutData.planName}
              </p>
              <p className="text-xs text-body dark:text-muted-foreground mt-0.5">
                {state.checkoutData.interval === 'ANNUAL' ? 'Annual billing' : 'Monthly billing'}
              </p>
            </div>
            <p className="text-sm font-medium text-heading dark:text-foreground">
              ${(state.checkoutData.amount / 100).toFixed(2)}/{state.checkoutData.interval === 'ANNUAL' ? 'yr' : 'mo'}
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-end items-center pt-2">
        {verified && (
          <Button
            onClick={() => setPaymentSubStep('confirmation')}
            className="bg-brand hover:bg-brand-hover text-white font-medium px-8 h-11 gap-2"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
        {error && (
          <Button
            onClick={() => setPaymentSubStep('checkout')}
            variant="outline"
            className="gap-2"
          >
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}
