import { useEffect, useState } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Button } from '@/components/ui/button';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import * as billingService from '@/services/billingService';
import { GeometricX } from '../components/phone-slides/GeometricX';

type Status = 'loading' | 'success' | 'error';

export default function ConfirmationStep() {
  const { completeOnboarding } = useOnboarding();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>('loading');
  const [planName, setPlanName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      setErrorMsg('No checkout session found. Please try again.');
      return;
    }

    let cancelled = false;

    const checkStatus = async () => {
      try {
        const response = await billingService.getCheckoutStatus(sessionId);

        if (cancelled) return;

        if (response.status === 'paid') {
          const planMap: Record<string, string> = {
            pro: 'Pro Plan',
            business: 'Business Plan',
            enterprise: 'Enterprise Plan',
          };
          setPlanName(planMap[response.planId] || response.planId);
          setStatus('success');
          completeOnboarding();
        } else {
          setStatus('error');
          setErrorMsg('Payment was not completed. Please try again.');
        }
      } catch {
        if (cancelled) return;
        setStatus('error');
        setErrorMsg('Failed to verify payment. Please contact support.');
      }
    };

    checkStatus();
    return () => { cancelled = true; };
  }, [sessionId]);

  const handleGoToDashboard = () => {
    navigate('/app/v2', { replace: true });
  };

  const handleRetry = () => {
    navigate('/app/onboarding', { replace: true });
  };

  if (status === 'loading') {
    return (
      <div className="space-y-8">
        <div className="rounded-xl border border-subtle dark:border-border bg-elevated dark:bg-card p-10 flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-full bg-brand/10 flex items-center justify-center mb-6">
            <Loader2 className="h-8 w-8 text-brand animate-spin" />
          </div>
          <h2 className="text-lg font-semibold text-heading dark:text-foreground">
            Verifying your payment...
          </h2>
          <p className="text-sm text-body dark:text-muted-foreground mt-2">
            Please wait while we confirm your subscription with Stripe.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="space-y-8">
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-10 flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-6">
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-heading dark:text-foreground">
            Payment not completed
          </h2>
          <p className="text-sm text-body dark:text-muted-foreground mt-2 max-w-md">
            {errorMsg}
          </p>
          <Button
            onClick={handleRetry}
            className="mt-6 bg-brand hover:bg-brand-hover text-white font-medium px-8 h-11"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-subtle dark:border-border bg-elevated dark:bg-card p-10 flex flex-col items-center text-center">
        <div className="flex items-center justify-center mb-6">
          <svg width="70px" height="70px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13.8179 4.54512L13.6275 4.27845C12.8298 3.16176 11.1702 3.16176 10.3725 4.27845L10.1821 4.54512C9.76092 5.13471 9.05384 5.45043 8.33373 5.37041L7.48471 5.27608C6.21088 5.13454 5.13454 6.21088 5.27608 7.48471L5.37041 8.33373C5.45043 9.05384 5.13471 9.76092 4.54512 10.1821L4.27845 10.3725C3.16176 11.1702 3.16176 12.8298 4.27845 13.6275L4.54512 13.8179C5.13471 14.2391 5.45043 14.9462 5.37041 15.6663L5.27608 16.5153C5.13454 17.7891 6.21088 18.8655 7.48471 18.7239L8.33373 18.6296C9.05384 18.5496 9.76092 18.8653 10.1821 19.4549L10.3725 19.7215C11.1702 20.8382 12.8298 20.8382 13.6275 19.7215L13.8179 19.4549C14.2391 18.8653 14.9462 18.5496 15.6663 18.6296L16.5153 18.7239C17.7891 18.8655 18.8655 17.7891 18.7239 16.5153L18.6296 15.6663C18.5496 14.9462 18.8653 14.2391 19.4549 13.8179L19.7215 13.6275C20.8382 12.8298 20.8382 11.1702 19.7215 10.3725L19.4549 10.1821C18.8653 9.76092 18.5496 9.05384 18.6296 8.33373L18.7239 7.48471C18.8655 6.21088 17.7891 5.13454 16.5153 5.27608L15.6663 5.37041C14.9462 5.45043 14.2391 5.13471 13.8179 4.54512Z" stroke="#323232" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M9 12L10.8189 13.8189V13.8189C10.9189 13.9189 11.0811 13.9189 11.1811 13.8189V13.8189L15 10" stroke="#323232" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-heading dark:text-foreground">
          You're all set!
        </h1>
        <p className="text-sm text-body dark:text-muted-foreground mt-2 max-w-md">
          Your <span className="font-semibold text-heading dark:text-foreground">{planName}</span> subscription
          is now active. Welcome to <span className="inline-block font-bold text-lg dark:text-foreground">Agent<span><GeometricX className="inline-block h-5 w-5 pb-0.5" /></span></span>
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
              Make call with workflows
            </li>
          </ul>
        </div>

        <Button
          size="sm"
          onClick={handleGoToDashboard}
          className="mt-8 bg-brand hover:bg-brand-hover text-white font-medium px-10 h-10 gap-2 text-base"
        >
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
