import { useCallback, useEffect, useMemo, useState } from 'react';

import * as dealService from '@/services/dealService';
import type { Deal } from '@/services/dealService';
import { getDealsAtRisk, MAX_AT_RISK_DEALS } from '@/utils/dealRisk';

export interface UseDealsAtRiskResult {
  /** Up to `max` deals with a high BarrierX risk score, sorted by severity desc. */
  atRiskDeals: Deal[];
  /** Total deals returned by the tenant endpoint, for context in the UI. */
  totalDeals: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetches the authenticated user's tenant deals (via `/api/deals/tenant`) and
 * exposes the at-risk subset for alert/overview surfaces. Tenant scoping is
 * enforced on the backend from the JWT — the frontend never passes a tenant.
 */
export function useDealsAtRisk(max: number = MAX_AT_RISK_DEALS): UseDealsAtRiskResult {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await dealService.getTenantDeals();
      setDeals(response.deals ?? []);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data
          ?.message ||
        (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data
          ?.error ||
        (err instanceof Error ? err.message : undefined) ||
        'Failed to load deals';
      setError(message);
      setDeals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const atRiskDeals = useMemo(() => getDealsAtRisk(deals, max), [deals, max]);

  return {
    atRiskDeals,
    totalDeals: deals.length,
    loading,
    error,
    refetch: fetchDeals,
  };
}

export default useDealsAtRisk;
