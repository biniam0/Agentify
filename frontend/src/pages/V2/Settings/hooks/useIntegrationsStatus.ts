import { useCallback, useEffect, useState } from 'react';

import { toast } from 'sonner';

import api from '@/services/api';

type IntegrationStatus = 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'PENDING';

interface IntegrationRecord {
  id: string;
  provider: string;
  status: IntegrationStatus;
}

interface IntegrationsResponse {
  success: boolean;
  integrations: IntegrationRecord[];
}

/**
 * Shared connection state for HubSpot / integration UI across Settings sections.
 */
export function useIntegrationsStatus() {
  const [connectedProviders, setConnectedProviders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get<IntegrationsResponse>('/user/integrations');
      if (!data?.success) return;
      const next = new Set<string>();
      data.integrations.forEach((i) => {
        if (i.status === 'CONNECTED') next.add(i.provider);
      });
      setConnectedProviders(next);
    } catch (err) {
      console.error('Failed to load integrations:', err);
      toast.error('Failed to load connected accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { connectedProviders, setConnectedProviders, loading, refresh };
}
