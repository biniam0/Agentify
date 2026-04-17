import { useState } from 'react';

import { ExternalLinkIcon, SettingsIcon } from 'lucide-react';

import { Switch } from '@/components/ui/switch';

interface AppItem {
  id: string;
  name: string;
  iconUrl: string;
  websiteUrl: string;
  websiteLabel: string;
  description: string;
}

// Catalog of apps that can be connected. Add more entries here as integrations are built.
const apps: AppItem[] = [
  {
    id: 'hubspot',
    name: 'HubSpot',
    iconUrl: '/logos/hubspot-icon.svg',
    websiteUrl: 'https://www.hubspot.com',
    websiteLabel: 'www.hubspot.com',
    description: "Grow your business with HubSpot's integrated CRM platform.",
  },
];

const ConnectAccount = () => {
  const [connectedIds, setConnectedIds] = useState<string[]>(['hubspot']);

  const toggleConnection = (appId: string, connected: boolean) => {
    setConnectedIds((prev) => (connected ? [...new Set([...prev, appId])] : prev.filter((id) => id !== appId)));
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
            const isConnected = connectedIds.includes(app.id);

            return (
              <div
                key={app.id}
                className="bg-card flex flex-col rounded-xl border p-4"
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
                    onCheckedChange={(checked) => toggleConnection(app.id, checked)}
                    aria-label={`${isConnected ? 'Disconnect' : 'Connect'} ${app.name}`}
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
