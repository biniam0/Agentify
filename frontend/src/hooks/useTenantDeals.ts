/**
 * useTenantDeals — sessionStorage-cached fetch of the tenant's deal list
 * used by the template-slot dropdowns (deal / contact / company pickers)
 * in the workflow creator modal.
 *
 * Shape matches `GET /api/workflows/tenant-deals`. Cached per tenant slug.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/services/api';
import { useTenant } from '@/contexts/TenantContext';

export interface TenantDeal {
  dealId: string;
  dealName: string;
  ownerName: string;
  ownerEmail: string | null;
  company: string | null;
  stage: string | null;
  amount: number;
}

export interface TenantDealsFacets {
  companies: string[];
  owners: string[];
  stages: string[];
}

interface CachedPayload {
  fetchedAt: number;
  tenantSlug: string;
  deals: TenantDeal[];
  facets: TenantDealsFacets;
}

const CACHE_KEY_PREFIX = 'agentx_tenant_deals:';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function readCache(tenantSlug: string): CachedPayload | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY_PREFIX + tenantSlug);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPayload;
    if (!parsed?.fetchedAt || Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    if (parsed.tenantSlug !== tenantSlug) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(payload: CachedPayload) {
  try {
    sessionStorage.setItem(CACHE_KEY_PREFIX + payload.tenantSlug, JSON.stringify(payload));
  } catch {
    /* quota / unavailable — fine */
  }
}

export interface UseTenantDealsResult {
  deals: TenantDeal[];
  facets: TenantDealsFacets;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** `true` while the *first* load is in flight (UI can hide combobox). */
  initialLoading: boolean;
}

export function useTenantDeals(enabled: boolean = true): UseTenantDealsResult {
  const { tenantSlug } = useTenant();

  const [deals, setDeals] = useState<TenantDeal[]>([]);
  const [facets, setFacets] = useState<TenantDealsFacets>({
    companies: [],
    owners: [],
    stages: [],
  });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeals = useCallback(
    async (opts: { force?: boolean } = {}) => {
      if (!tenantSlug) return;

      if (!opts.force) {
        const cached = readCache(tenantSlug);
        if (cached) {
          setDeals(cached.deals);
          setFacets(cached.facets);
          setInitialLoading(false);
          return;
        }
      }

      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/workflows/tenant-deals', { params: { tenantSlug } });
        const nextDeals: TenantDeal[] = res.data?.deals || [];
        const nextFacets: TenantDealsFacets = res.data?.facets || {
          companies: [],
          owners: [],
          stages: [],
        };

        setDeals(nextDeals);
        setFacets(nextFacets);
        writeCache({
          fetchedAt: Date.now(),
          tenantSlug,
          deals: nextDeals,
          facets: nextFacets,
        });
      } catch (err: unknown) {
        const anyErr = err as { response?: { data?: { error?: string } }; message?: string };
        const msg =
          anyErr?.response?.data?.error || anyErr?.message || 'Failed to load tenant deals';
        setError(msg);
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [tenantSlug],
  );

  useEffect(() => {
    if (!enabled || !tenantSlug) return;
    fetchDeals();
  }, [enabled, tenantSlug, fetchDeals]);

  const refresh = useCallback(async () => {
    await fetchDeals({ force: true });
  }, [fetchDeals]);

  return useMemo(
    () => ({ deals, facets, loading, error, refresh, initialLoading }),
    [deals, facets, loading, error, refresh, initialLoading],
  );
}
