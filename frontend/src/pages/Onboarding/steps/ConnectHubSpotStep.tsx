import { useState } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, ArrowLeft, CheckCircle2, Loader2, ExternalLink } from 'lucide-react';

export default function ConnectHubSpotStep() {
  const { state, setHubSpotConnected, setCurrentStep } = useOnboarding();
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    // Mocked: simulate a connection delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setHubSpotConnected(true);
    setConnecting(false);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-heading dark:text-foreground">
          Connect HubSpot
        </h1>
        <p className="text-sm text-body dark:text-muted-foreground mt-2">
          Sync your CRM data so AgentX can deliver AI-powered deal intelligence
        </p>
      </div>

      {state.hubspotConnected ? (
        <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center">
              <img
                src="/logos/hubspot-icon.svg"
                alt="HubSpot"
                className="h-10 w-auto" />
            </div>
            <div>
              <p className="font-semibold text-green-800 dark:text-green-300">HubSpot Connected</p>
              <p className="text-sm text-green-600 dark:text-green-400 mt-0.5">
                Your HubSpot CRM is synced with AgentX
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-subtle dark:border-border shadow-card">
          <CardContent className="p-8 text-center space-y-6">
            {/* HubSpot logo area */}
            <div className="flex justify-center">
              <div className="flex h-25 w-25 items-center justify-center">
                <img
                  src="/logos/hubspot-icon.svg"
                  alt="HubSpot"
                  className="h-16 w-auto"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).parentElement!.innerHTML =
                      '<span class="text-2xl font-bold text-orange-500">HS</span>';
                  }}
                />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-heading dark:text-foreground">
                Connect your HubSpot account
              </h3>
              <p className="text-sm text-body dark:text-muted-foreground mt-2 max-w-sm mx-auto">
                AgentX will sync your deals, contacts, and meetings to provide real-time sales intelligence and automated CRM updates.
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleConnect}
                disabled={connecting}
                className="bg-[#FF7A59] hover:bg-[#E8694A] text-white font-medium px-8 h-12 gap-2 text-base"
              >
                {connecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4" />
                    Connect HubSpot
                  </>
                )}
              </Button>

              <p className="text-xs text-subtle dark:text-muted-foreground">
                You can also connect HubSpot later from Settings
              </p>
            </div>

            {/* What you'll get */}
            <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-5 text-left mt-4">
              <p className="text-xs font-medium text-heading dark:text-foreground uppercase tracking-wider mb-3">
                What you'll get
              </p>
              <ul className="space-y-2.5">
                {[
                  'Automatic pre & post meeting call briefs',
                  'Real-time deal risk scoring',
                  'AI-generated CRM notes and tasks',
                  'Smart meeting preparation insights',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-body dark:text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-brand mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button
          variant="ghost"
          onClick={() => setCurrentStep(1)}
          className="text-body dark:text-muted-foreground gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={() => setCurrentStep(3)}
          disabled={!state.hubspotConnected}
          variant="gradientEmerald"
          className="px-6 h-11"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
