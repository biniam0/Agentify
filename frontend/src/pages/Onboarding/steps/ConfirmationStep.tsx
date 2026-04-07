import { useState } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Sparkles, Rocket, ArrowLeft } from 'lucide-react';
import * as billingService from '@/services/billingService';

export default function ConfirmationStep() {
  const { state, completeOnboarding, setPaymentSubStep, setPaymentConfirmed } = useOnboarding();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(state.paymentConfirmed);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (!state.checkoutData?.sessionId) return;
    setLoading(true);
    setError('');

    try {
      await billingService.confirmPayment({
        sessionId: state.checkoutData.sessionId,
      });

      setPaymentConfirmed(true);
      setConfirmed(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to activate subscription. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToDashboard = () => {
    completeOnboarding();
    navigate('/app/v2', { replace: true });
  };

  if (confirmed) {
    return (
      <div className="space-y-8">
        <div className="rounded-xl border border-subtle dark:border-border bg-elevated dark:bg-card p-10 flex flex-col items-center text-center">
          <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6">
            <Rocket className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>

          <h1 className="text-2xl font-bold text-heading dark:text-foreground">
            You're all set!
          </h1>
          <p className="text-sm text-body dark:text-muted-foreground mt-2 max-w-md">
            Your <span className="font-semibold text-heading dark:text-foreground">{state.checkoutData?.planName}</span> subscription
            is now active. Welcome to AgentX!
          </p>

          <div className="mt-6 rounded-lg bg-brand/5 dark:bg-brand/10 border border-brand/20 p-4 w-full max-w-sm">
            <h3 className="text-sm font-semibold text-brand mb-2">What's next?</h3>
            <ul className="space-y-1.5 text-sm text-body dark:text-muted-foreground text-left">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                Explore your admin dashboard
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                Invite your team members
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                Configure AI call workflows
              </li>
            </ul>
          </div>

          <Button
            onClick={handleGoToDashboard}
            className="mt-8 bg-brand hover:bg-brand-hover text-white font-medium px-10 h-12 gap-2 text-base"
          >
            <Sparkles className="h-5 w-5" />
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading dark:text-foreground">
          Confirm your subscription
        </h1>
        <p className="text-sm text-body dark:text-muted-foreground mt-2">
          Review your order details and activate your subscription.
        </p>
      </div>

      {/* Order details */}
      {state.checkoutData && (
        <div className="rounded-xl border border-subtle dark:border-border bg-elevated dark:bg-card overflow-hidden">
          <div className="p-5 border-b border-subtle dark:border-border">
            <h3 className="text-sm font-semibold text-heading dark:text-foreground mb-3">
              Order summary
            </h3>
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-body dark:text-muted-foreground">Plan</span>
                <span className="font-medium text-heading dark:text-foreground">{state.checkoutData.planName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-body dark:text-muted-foreground">Billing cycle</span>
                <span className="font-medium text-heading dark:text-foreground">
                  {state.checkoutData.interval === 'ANNUAL' ? 'Annual' : 'Monthly'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-body dark:text-muted-foreground">Payment method</span>
                <span className="font-medium text-heading dark:text-foreground font-mono">
                  •••• 4242
                </span>
              </div>
            </div>
          </div>
          <div className="p-5 bg-gray-50/50 dark:bg-white/[0.02]">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-heading dark:text-foreground">Total</span>
              <span className="text-xl font-bold text-heading dark:text-foreground">
                ${(state.checkoutData.amount / 100).toFixed(2)}
                <span className="text-sm font-normal text-body dark:text-muted-foreground">
                  /{state.checkoutData.interval === 'ANNUAL' ? 'year' : 'month'}
                </span>
              </span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-3">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between items-center pt-2">
        <Button
          variant="ghost"
          onClick={() => setPaymentSubStep('verification')}
          className="text-body dark:text-muted-foreground gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={loading}
          className="bg-brand hover:bg-brand-hover text-white font-medium px-8 h-11 gap-2"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Activating...
            </span>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Activate Subscription
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
