import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import DealsSearchBar, { type FilterDef } from './DealsSearchBar';
import DealsFilterTabs from './DealsFilterTabs';
import ClientsDealsTable from './ClientsDealsTable';
import * as dealService from '@/services/dealService';
import type { Deal } from '@/services/dealService';
import { useFilters } from '@/hooks/useFilters';
import { useDebounce } from '@/hooks/useDebounce';
import { riskBucket } from '@/utils/dealRisk';

interface ClientsDealsSectionProps {
  onViewDetails: (deal: Deal) => void;
}

const FILTER_IDS = ['stage', 'risk'] as const;

const RISK_OPTIONS = [
  { value: 'zero', label: 'Zero score' },
  { value: 'low', label: 'Low risk' },
  { value: 'medium', label: 'Medium risk' },
  { value: 'high', label: 'High risk' },
];

const formatStageLabel = (stage: string) =>
  stage
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (s) => s.toUpperCase());

const ClientsDealsSection = ({ onViewDetails }: ClientsDealsSectionProps) => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 250);

  const {
    values: filterValues,
    hasActive,
    setFilter,
    clearAll,
  } = useFilters(FILTER_IDS);

  const stageFilter = filterValues.stage ?? [];
  const riskFilter = filterValues.risk ?? [];

  const fetchDeals = useCallback(async () => {
    try {
      setLoading(true);
      const response = await dealService.getTenantDeals();
      setDeals(response.deals || []);
    } catch (error: any) {
      console.error('Failed to fetch deals:', error);
      toast.error(error.response?.data?.message || 'Failed to load deals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  // Build stage options from the data so we match whatever HubSpot pipeline names are in use.
  const stageOptions = useMemo(() => {
    const seen = new Map<string, number>();
    for (const d of deals) {
      if (!d.stage) continue;
      seen.set(d.stage, (seen.get(d.stage) ?? 0) + 1);
    }
    return Array.from(seen.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([value, count]) => ({ value, label: formatStageLabel(value), count }));
  }, [deals]);

  const dealsFilters: FilterDef[] = useMemo(
    () => [
      { id: 'stage', label: 'Stage', options: stageOptions, multiple: true },
      { id: 'risk', label: 'Risk', options: RISK_OPTIONS, multiple: true },
    ],
    [stageOptions]
  );

  const filteredDeals = useMemo(() => {
    let result = deals;

    if (stageFilter.length > 0) {
      const set = new Set(stageFilter);
      result = result.filter((d) => d.stage && set.has(d.stage));
    }

    if (riskFilter.length > 0) {
      const set = new Set(riskFilter);
      result = result.filter((d) => set.has(riskBucket(d.riskScores?.totalDealRisk ?? 0)));
    }

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter((deal) =>
        deal.dealName?.toLowerCase().includes(q) ||
        deal.company?.toLowerCase().includes(q) ||
        deal.owner?.name?.toLowerCase().includes(q) ||
        deal.owner?.email?.toLowerCase().includes(q) ||
        deal.tenantName?.toLowerCase().includes(q) ||
        deal.stage?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [deals, stageFilter, riskFilter, debouncedSearch]);

  const hasAnyConstraint = hasActive || debouncedSearch.length > 0;

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-heading">Clients Deals</h2>
          <p className="text-sm text-subtle">
            Manage deals and trigger info gathering calls.
          </p>
        </div>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-light text-brand flex-shrink-0 whitespace-nowrap">
          {filteredDeals.length} deals
        </span>
      </div>

      <DealsSearchBar
        onSearch={setSearchQuery}
        filters={dealsFilters}
        values={filterValues}
        onFilterChange={setFilter}
        onClearAll={clearAll}
      />
      <DealsFilterTabs />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-4 sm:p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 sm:gap-4">
                <Skeleton className="h-9 w-9 rounded-lg flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <Skeleton className="h-4 w-full max-w-[200px]" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="hidden sm:block h-6 w-24 rounded-lg flex-shrink-0" />
                <Skeleton className="hidden md:block h-6 w-20 rounded-lg flex-shrink-0" />
                <Skeleton className="hidden md:block h-4 w-16 flex-shrink-0" />
                <Skeleton className="hidden lg:block h-8 w-28 rounded-lg flex-shrink-0" />
              </div>
            ))}
          </div>
        ) : filteredDeals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Briefcase className="h-6 w-6 text-subtle" />
            </div>
            <p className="text-sm font-medium text-heading">No deals found</p>
            <p className="text-xs text-subtle mt-1 max-w-sm">
              {hasAnyConstraint
                ? 'No deals match your current filters. Try clearing a filter or adjusting your search.'
                : 'Deals will appear here once synced'}
            </p>
            {hasActive && (
              <button
                type="button"
                onClick={clearAll}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <ClientsDealsTable deals={filteredDeals} onViewDetails={onViewDetails} />
        )}
      </div>

      {!loading && filteredDeals.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1 py-4">
          <p className="text-xs text-subtle">
            Showing <span className="font-medium text-heading">{filteredDeals.length}</span>
            {hasActive || debouncedSearch ? (
              <> of <span className="font-medium text-heading">{deals.length}</span> deals</>
            ) : (
              <> deals</>
            )}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDeals}
            disabled={loading}
            className="h-8 px-3 text-xs rounded-lg border-default"
          >
            Refresh
          </Button>
        </div>
      )}
    </div>
  );
};

export default ClientsDealsSection;
