import { useEffect, useState } from 'react';

import { ExternalLinkIcon, SettingsIcon, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

import api from '@/services/api';

type IntegrationStatus = 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'PENDING';

interface AppItem {
  // Backend provider enum value (e.g., "HUBSPOT")
  providerId: string;
  name: string;
  iconUrl: string;
  websiteUrl: string;
  websiteLabel: string;
  description: string;
}

interface IntegrationRecord {
  id: string;
  provider: string;
  status: IntegrationStatus;
}

interface IntegrationsResponse {
  success: boolean;
  integrations: IntegrationRecord[];
}

// Catalog of apps that can be connected. Add more entries here as integrations are built.
const apps: AppItem[] = [
  {
    providerId: 'HUBSPOT',
    name: 'HubSpot',
    iconUrl: '/logos/hubspot-icon.svg',
    websiteUrl: 'https://www.hubspot.com',
    websiteLabel: 'www.hubspot.com',
    description: "Grow your business with HubSpot's integrated CRM platform.",
  },
];

const RESYNC_COOLDOWN_MS = 60000; // 60 seconds

const ConnectAccount = () => {
  const [connectedProviders, setConnectedProviders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [resyncing, setResyncing] = useState(false);
  const [resyncCooldown, setResyncCooldown] = useState(0);
  const [showResyncConfirm, setShowResyncConfirm] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { data } = await api.get<IntegrationsResponse>('/user/integrations');
        if (cancelled || !data?.success) return;
        const next = new Set<string>();
        data.integrations.forEach((i) => {
          if (i.status === 'CONNECTED') next.add(i.provider);
        });
        setConnectedProviders(next);
      } catch (err) {
        console.error('Failed to load integrations:', err);
        toast.error('Failed to load connected accounts');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Cooldown countdown effect
  useEffect(() => {
    if (resyncCooldown <= 0) return;
    const interval = setInterval(() => {
      setResyncCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resyncCooldown]);

  const toggleConnection = async (providerId: string, nextChecked: boolean) => {
    if (pending[providerId]) return;
    setPending((prev) => ({ ...prev, [providerId]: true }));

    // Optimistic update — revert on failure.
    setConnectedProviders((prev) => {
      const next = new Set(prev);
      if (nextChecked) next.add(providerId);
      else next.delete(providerId);
      return next;
    });

    try {
      const action = nextChecked ? 'connect' : 'disconnect';
      await api.post(`/user/integrations/${providerId}/${action}`);
      toast.success(
        `${apps.find((a) => a.providerId === providerId)?.name ?? providerId} ${nextChecked ? 'connected' : 'disconnected'}`
      );
    } catch (err) {
      console.error('Failed to toggle integration:', err);
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to update integration';
      toast.error(message);
      setConnectedProviders((prev) => {
        const next = new Set(prev);
        if (nextChecked) next.delete(providerId);
        else next.add(providerId);
        return next;
      });
    } finally {
      setPending((prev) => {
        const next = { ...prev };
        delete next[providerId];
        return next;
      });
    }
  };

  const handleResyncClick = () => {
    setShowResyncConfirm(true);
  };

  const cancelResync = () => {
    setShowResyncConfirm(false);
  };

  const confirmResync = async () => {
    setShowResyncConfirm(false);
    setResyncing(true);

    try {
      const response = await api.post('/user/hubspot/resync');
      if (response.data?.success) {
        toast.success('HubSpot resync started! Your data will be updated in the background (5-10 min).', {
          duration: 8000,
        });
        setResyncCooldown(RESYNC_COOLDOWN_MS / 1000); // Convert to seconds
      } else {
        toast.error(response.data?.error || 'Failed to start resync');
      }
    } catch (err) {
      console.error('Failed to resync HubSpot:', err);
      const message = 
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 
        'Failed to start HubSpot resync. Please try again later.';
      toast.error(message);
    } finally {
      setResyncing(false);
    }
  };

  const isHubSpotConnected = connectedProviders.has('HUBSPOT');

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
      <div className="flex flex-col">
        <h3 className="text-foreground font-semibold">Connect Accounts</h3>
        <p className="text-muted-foreground text-sm">Manage your connected accounts.</p>
      </div>

      <div className="lg:col-span-2 space-y-4">
        {/* HubSpot Sync Status Banner */}
        {isHubSpotConnected && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            {showResyncConfirm ? (
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-900">
                    Are you sure? This will refresh all HubSpot data for your tenant.
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    This process runs in the background and may take 5-10 minutes to complete.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={cancelResync}
                      className="h-8 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={confirmResync}
                      disabled={resyncing}
                      className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {resyncing ? 'Starting...' : 'Confirm Resync'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <RefreshCw className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-blue-900">HubSpot Data Sync</h4>
                    <p className="text-xs text-blue-700 mt-0.5">
                      Keep your CRM data up to date
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={handleResyncClick}
                  disabled={resyncing || resyncCooldown > 0}
                  className="h-9 text-sm bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                >
                  {resyncing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                      Syncing...
                    </>
                  ) : resyncCooldown > 0 ? (
                    `Resync in ${resyncCooldown}s`
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1.5" />
                      Resync Now
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {apps.map((app) => {
            const isConnected = connectedProviders.has(app.providerId);
            const isPending = !!pending[app.providerId];

            return (
              <div
                key={app.providerId}
                className="bg-card flex flex-col rounded-xl border p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="bg-background flex size-10 items-center justify-center rounded-lg border p-1.5">
                    <img src={app.iconUrl} alt={`${app.name} logo`} className="size-full object-contain" />
                  </div>
                  <a
                    href={app.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs transition-colors"
                  >
                    {app.websiteLabel}
                    <ExternalLinkIcon className="size-3" />
                  </a>
                </div>

                <div className="mt-3 space-y-1">
                  <h4 className="text-foreground text-base font-semibold">{app.name}</h4>
                  <p className="text-muted-foreground text-sm leading-snug">{app.description}</p>
                </div>

                <div className="border-border mt-4 flex items-center justify-between border-t pt-3">
                  <button
                    type="button"
                    className="text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
                  >
                    <SettingsIcon className="size-4" />
                    Manage
                  </button>
                  <Switch
                    checked={isConnected}
                    onCheckedChange={(checked) => toggleConnection(app.providerId, checked)}
                    aria-label={`${isConnected ? 'Disconnect' : 'Connect'} ${app.name}`}
                    disabled={loading || isPending}
                    className={isConnected ? 'bg-emerald-500' : undefined}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ConnectAccount;
