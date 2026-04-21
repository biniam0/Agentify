import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import DealsSearchBar, { type FilterDef } from './DealsSearchBar';
import DealsFilterTabs from './DealsFilterTabs';
import CallsTable from './CallsTable';
import * as loggingService from '@/services/loggingService';
import type { CallLog } from '@/services/loggingService';
import { useTenant } from '@/contexts/TenantContext';
import { useFilters } from '@/hooks/useFilters';
import { useDebounce } from '@/hooks/useDebounce';

interface CallsSectionProps {
  onViewDetails: (log: CallLog) => void;
}

const ITEMS_PER_PAGE = 10;

const FILTER_IDS = ['status', 'callType'] as const;

const CALL_STATUS_OPTIONS = [
  { value: 'INITIATED', label: 'Initiated' },
  { value: 'RINGING', label: 'Ringing' },
  { value: 'ANSWERED', label: 'Answered' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'NO_ANSWER', label: 'No answer' },
  { value: 'BUSY', label: 'Busy' },
];

const CALL_TYPE_OPTIONS = [
  { value: 'PRE_CALL', label: 'Pre-call' },
  { value: 'POST_CALL', label: 'Post-call' },
];

const CALLS_FILTERS: FilterDef[] = [
  { id: 'status', label: 'Status', options: CALL_STATUS_OPTIONS, multiple: true },
  { id: 'callType', label: 'Call Type', options: CALL_TYPE_OPTIONS, multiple: true },
];

const CallsSection = ({ onViewDetails }: CallsSectionProps) => {
  const { tenantSlug } = useTenant();
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
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
  const callTypeFilter = filterValues.callType ?? [];

  // Whenever filters change, jump back to the first page so results stay consistent.
  // We key this on the serialized values so a filter flip doesn't also fire for
  // pagination changes.
  const filterKey = useMemo(
    () => `${statusFilter.join(',')}|${callTypeFilter.join(',')}`,
    [statusFilter, callTypeFilter]
  );

  useEffect(() => {
    setPage(0);
  }, [filterKey]);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await loggingService.getCallLogs({
        tenantSlug: tenantSlug || undefined,
        limit: ITEMS_PER_PAGE,
        offset: page * ITEMS_PER_PAGE,
        status: statusFilter.length > 0 ? statusFilter : undefined,
        callType: callTypeFilter.length > 0 ? callTypeFilter : undefined,
      });

      if (response.success) {
        setLogs(response.data);
        setTotal(response.total);
      }
    } catch (error: any) {
      console.error('Failed to fetch call logs:', error);
      toast.error(error.response?.data?.error || 'Failed to load call logs');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, tenantSlug, filterKey]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = debouncedSearch
    ? logs.filter((log) => {
        const q = debouncedSearch.toLowerCase();
        return (
          log.dealName?.toLowerCase().includes(q) ||
          log.userName?.toLowerCase().includes(q) ||
          log.ownerName?.toLowerCase().includes(q) ||
          log.status.toLowerCase().includes(q) ||
          log.phoneNumber?.toLowerCase().includes(q)
        );
      })
    : logs;

  const startItem = page * ITEMS_PER_PAGE + 1;
  const endItem = Math.min((page + 1) * ITEMS_PER_PAGE, total);
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const hasAnyConstraint = hasActive || debouncedSearch.length > 0;

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-heading">Active Deals</h2>
          <p className="text-sm text-subtle">
            Manage and track your ongoing opportunities.
          </p>
        </div>
      </div>

      <DealsSearchBar
        onSearch={setSearchQuery}
        filters={CALLS_FILTERS}
        values={filterValues}
        onFilterChange={setFilter}
        onClearAll={clearAll}
      />
      <DealsFilterTabs />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading && logs.length === 0 ? (
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
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Phone className="h-6 w-6 text-subtle" />
            </div>
            <p className="text-sm font-medium text-heading">No call logs found</p>
            <p className="text-xs text-subtle mt-1 max-w-sm">
              {hasAnyConstraint
                ? 'No calls match your current filters. Try clearing a filter or adjusting your search.'
                : 'Call logs will appear here once calls are triggered'}
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
          <CallsTable logs={filteredLogs} onViewDetails={onViewDetails} />
        )}
      </div>

      {total > ITEMS_PER_PAGE && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1 py-4">
          <p className="text-xs text-subtle">
            Showing <span className="font-medium text-heading">{startItem}–{endItem}</span> of <span className="font-medium text-heading">{total}</span>
            {activeCount > 0 && (
              <span className="text-subtle"> · filtered</span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="h-8 px-3 text-xs rounded-lg border-default disabled:opacity-40"
            >
              Previous
            </Button>
            <span className="text-xs text-subtle px-2">
              Page <span className="font-medium text-heading">{page + 1}</span> of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={(page + 1) * ITEMS_PER_PAGE >= total}
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

export default CallsSection;
