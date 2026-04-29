import { Dispatch, SetStateAction, useState } from 'react';

import { ExternalLinkIcon, SettingsIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Switch } from '@/components/ui/switch';

import api from '@/services/api';

interface AppItem {
  providerId: string;
  name: string;
  iconUrl: string;
  websiteUrl: string;
  websiteLabel: string;
  description: string;
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

export interface ConnectAccountProps {
  connectedProviders: Set<string>;
  setConnectedProviders: Dispatch<SetStateAction<Set<string>>>;
  loading: boolean;
}

const ConnectAccount = ({ connectedProviders, setConnectedProviders, loading }: ConnectAccountProps) => {
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const toggleConnection = async (providerId: string, nextChecked: boolean) => {
    if (pending[providerId]) return;
    setPending((prev) => ({ ...prev, [providerId]: true }));

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

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
      <div className="flex flex-col">
        <h3 className="text-foreground font-semibold">Connect Accounts</h3>
        <p className="text-muted-foreground text-sm">Manage your connected accounts.</p>
      </div>

      <div className="lg:col-span-2">
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
