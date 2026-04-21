import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import DealsSearchBar, { type FilterDef } from './DealsSearchBar';
import DealsFilterTabs from './DealsFilterTabs';
import InfoGatheringTable from './InfoGatheringTable';
import { API_BASE_URL } from '@/config/api';
import type { BarrierXInfoRecord } from './InfoGatheringTable';
import { useTenant } from '@/contexts/TenantContext';
import { useFilters } from '@/hooks/useFilters';
import { useDebounce } from '@/hooks/useDebounce';

interface InfoGatheringSectionProps {
  onViewDetails: (record: BarrierXInfoRecord) => void;
  jobRunning?: boolean;
}

const ITEMS_PER_PAGE = 10;

const FILTER_IDS = ['status', 'gatheringType'] as const;

const INFO_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'SKIPPED', label: 'Skipped' },
];

const GATHERING_TYPE_OPTIONS = [
  { value: 'ZERO_SCORE', label: 'Zero score' },
  { value: 'LOST_DEAL', label: 'Lost deal' },
  { value: 'INACTIVITY', label: 'Inactivity' },
];

const INFO_FILTERS: FilterDef[] = [
  { id: 'status', label: 'Status', options: INFO_STATUS_OPTIONS, multiple: true },
  { id: 'gatheringType', label: 'Type', options: GATHERING_TYPE_OPTIONS, multiple: true },
];

const InfoGatheringSection = ({ onViewDetails, jobRunning }: InfoGatheringSectionProps) => {
  const { tenantSlug } = useTenant();
  const [records, setRecords] = useState<BarrierXInfoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 250);

  const {
    values: filterValues,
    activeCount,
    hasActive,
    setFilter,
    clearAll,
  } = useFilters(FILTER_IDS);

  const statusFilter = filterValues.status ?? [];
  const typeFilter = filterValues.gatheringType ?? [];

  const filterKey = useMemo(
    () => `${statusFilter.join(',')}|${typeFilter.join(',')}`,
    [statusFilter, typeFilter]
  );

  useEffect(() => {
    setPage(1);
  }, [filterKey]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: ITEMS_PER_PAGE.toString(),
        offset: ((page - 1) * ITEMS_PER_PAGE).toString(),
      });
      if (tenantSlug) params.set('tenantSlug', tenantSlug);
      if (statusFilter.length > 0) params.set('status', statusFilter.join(','));
      if (typeFilter.length > 0) params.set('gatheringType', typeFilter.join(','));

      const response = await fetch(`${API_BASE_URL}/logs/barrierx-info?${params}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch records');

      const data = await response.json();
      setRecords(data.data || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to fetch info gathering records:', error);
      toast.error('Failed to load info gathering records');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, tenantSlug, filterKey]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    if (!jobRunning) return;
    const interval = setInterval(fetchRecords, 5000);
    return () => clearInterval(interval);
  }, [jobRunning, fetchRecords]);

  const filteredRecords = debouncedSearch
    ? records.filter((r) => {
        const q = debouncedSearch.toLowerCase();
        return (
          r.dealName?.toLowerCase().includes(q) ||
          r.companyName?.toLowerCase().includes(q) ||
          r.ownerName?.toLowerCase().includes(q) ||
          r.status.toLowerCase().includes(q)
        );
      })
    : records;

  const startItem = (page - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(page * ITEMS_PER_PAGE, total);
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  const hasAnyConstraint = hasActive || debouncedSearch.length > 0;

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-heading">Info Gathering</h2>
          <p className="text-sm text-subtle">
            Manage and track your automated info gathering calls.
          </p>
        </div>
      </div>

      <DealsSearchBar
        onSearch={setSearchQuery}
        filters={INFO_FILTERS}
        values={filterValues}
        onFilterChange={setFilter}
        onClearAll={clearAll}
      />
      <DealsFilterTabs />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading && records.length === 0 ? (
          <div className="p-4 sm:p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 sm:gap-4">
                <Skeleton className="h-9 w-9 rounded-lg flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <Skeleton className="h-4 w-full max-w-[200px]" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="hidden sm:block h-6 w-20 rounded-lg flex-shrink-0" />
                <Skeleton className="hidden md:block h-4 w-16 flex-shrink-0" />
                <Skeleton className="hidden md:block h-6 w-20 rounded-lg flex-shrink-0" />
                <Skeleton className="hidden lg:block h-8 w-28 rounded-lg flex-shrink-0" />
              </div>
            ))}
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Phone className="h-6 w-6 text-subtle" />
            </div>
            <p className="text-sm font-medium text-heading">No records found</p>
            <p className="text-xs text-subtle mt-1 max-w-sm">
              {hasAnyConstraint
                ? 'No records match your current filters. Try clearing a filter or adjusting your search.'
                : 'Info gathering records will appear here'}
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
          <InfoGatheringTable records={filteredRecords} onViewDetails={onViewDetails} />
        )}
      </div>

      {total > ITEMS_PER_PAGE && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1 py-4">
          <p className="text-xs text-subtle">
            Showing <span className="font-medium text-heading">{startItem}–{endItem}</span> of <span className="font-medium text-heading">{total}</span>
            {activeCount > 0 && <span className="text-subtle"> · filtered</span>}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-8 px-3 text-xs rounded-lg border-default disabled:opacity-40"
            >
              Previous
            </Button>
            <span className="text-xs text-subtle px-2">
              Page <span className="font-medium text-heading">{page}</span> of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
              className="h-8 px-3 text-xs rounded-lg border-default disabled:opacity-40"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InfoGatheringSection;
