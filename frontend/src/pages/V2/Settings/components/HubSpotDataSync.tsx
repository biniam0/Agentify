import { useEffect, useState } from 'react';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

import api from '@/services/api';

const RESYNC_COOLDOWN_MS = 60000; // 60 seconds

interface HubSpotDataSyncProps {
  hubSpotConnected: boolean;
  integrationsLoading: boolean;
}

const HubSpotDataSync = ({ hubSpotConnected, integrationsLoading }: HubSpotDataSyncProps) => {
  const [resyncing, setResyncing] = useState(false);
  const [resyncCooldown, setResyncCooldown] = useState(0);
  const [showResyncConfirm, setShowResyncConfirm] = useState(false);

  useEffect(() => {
    if (resyncCooldown <= 0) return;
    const interval = setInterval(() => {
      setResyncCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resyncCooldown]);

  useEffect(() => {
    if (!hubSpotConnected) setShowResyncConfirm(false);
  }, [hubSpotConnected]);

  const handleResyncClick = () => {
    if (!hubSpotConnected || integrationsLoading || resyncCooldown > 0 || resyncing) return;
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
        setResyncCooldown(RESYNC_COOLDOWN_MS / 1000);
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

  const resyncDisabled =
    !hubSpotConnected || integrationsLoading || resyncing || resyncCooldown > 0;

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
      <div className="flex flex-col space-y-1">
        <h3 className="text-foreground font-semibold">HubSpot data sync</h3>
        <p className="text-muted-foreground text-sm">
          Refresh all HubSpot data for your tenant. Runs in the background (typically 5–10 minutes).
        </p>
        {!hubSpotConnected && !integrationsLoading && (
          <p className="text-muted-foreground text-sm pt-1">
            Connect HubSpot in <span className="text-foreground font-medium">Connect Accounts</span>{' '}
            below to enable resync.
          </p>
        )}
      </div>

      <div className="lg:col-span-2">
        <div className="border rounded-lg p-4 dark:bg-blue-950/30 dark:border-blue-900">
          {showResyncConfirm ? (
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                  Are you sure? This will refresh all HubSpot data for your tenant.
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300/90 mt-1">
                  This process runs in the background and may take 5-10 minutes to complete.
                </p>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" onClick={cancelResync} className="h-8 text-xs">
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={confirmResync}
                    variant="gradientEmerald"
                    disabled={resyncing}
                    className="h-8 text-xs"
                  >
                    {resyncing ? 'Starting...' : 'Confirm Resync'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <RefreshCw className="h-5 w-5 text-green-600 shrink-0 mt-0.5 dark:text-blue-400" />
                <div>
                  <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                    Full HubSpot refresh
                  </h4>
                  <p className="text-xs mt-0.5">
                    Keep your CRM data up to date across AgentX.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={handleResyncClick}
                variant="gradientEmerald"
                disabled={resyncDisabled}
                className="h-9 text-sm shrink-0 disabled:opacity-60"
              >
                {resyncing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                    Syncing...
                  </>
                ) : resyncCooldown > 0 ? (
                  `Resync in ${resyncCooldown}s`
                ) : integrationsLoading ? (
                  'Loading...'
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
      </div>
    </div>
  );
};

export default HubSpotDataSync;
