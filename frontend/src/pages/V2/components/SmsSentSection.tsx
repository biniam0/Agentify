import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import DealsSearchBar, { type FilterDef } from './DealsSearchBar';
import DealsFilterTabs from './DealsFilterTabs';
import SmsSentTable from './SmsSentTable';
import * as loggingService from '@/services/loggingService';
import type { SmsLog } from '@/services/loggingService';
import { useTenant } from '@/contexts/TenantContext';
import { useFilters } from '@/hooks/useFilters';
import { useDebounce } from '@/hooks/useDebounce';

interface SmsSentSectionProps {
  onViewDetails: (sms: SmsLog) => void;
}

const ITEMS_PER_PAGE = 10;

const FILTER_IDS = ['status', 'triggerSource'] as const;

const SMS_STATUS_OPTIONS = [
  { value: 'QUEUED', label: 'Queued' },
  { value: 'SENT', label: 'Sent' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'FAILED', label: 'Failed' },
];

const TRIGGER_OPTIONS = [
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'MANUAL', label: 'Manual' },
  { value: 'RETRY', label: 'Retry' },
  { value: 'WEBHOOK', label: 'Webhook' },
];

const SMS_FILTERS: FilterDef[] = [
  { id: 'status', label: 'Status', options: SMS_STATUS_OPTIONS, multiple: true },
  { id: 'triggerSource', label: 'Trigger', options: TRIGGER_OPTIONS, multiple: true },
];

const SmsSentSection = ({ onViewDetails }: SmsSentSectionProps) => {
  const { tenantSlug } = useTenant();
  const [logs, setLogs] = useState<SmsLog[]>([]);
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
  const triggerFilter = filterValues.triggerSource ?? [];

  const filterKey = useMemo(
    () => `${statusFilter.join(',')}|${triggerFilter.join(',')}`,
    [statusFilter, triggerFilter]
  );

  useEffect(() => {
    setPage(1);
  }, [filterKey]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await loggingService.getSmsLogs({
        tenantSlug: tenantSlug || undefined,
        limit: ITEMS_PER_PAGE,
        offset: (page - 1) * ITEMS_PER_PAGE,
        status: statusFilter.length > 0 ? statusFilter : undefined,
        triggerSource: triggerFilter.length > 0 ? triggerFilter : undefined,
      });

      if (response.success) {
        setLogs(response.data || []);
        setTotal(response.total || 0);
      }
    } catch (error: any) {
      console.error('Failed to fetch SMS logs:', error);
      toast.error(error.response?.data?.error || 'Failed to load SMS logs');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, tenantSlug, filterKey]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = debouncedSearch
    ? logs.filter((l) => {
        const q = debouncedSearch.toLowerCase();
        return (
          l.ownerName?.toLowerCase().includes(q) ||
          l.userName?.toLowerCase().includes(q) ||
          l.toPhone?.toLowerCase().includes(q) ||
          l.dealName?.toLowerCase().includes(q) ||
          l.meetingTitle?.toLowerCase().includes(q) ||
          l.userEmail?.toLowerCase().includes(q) ||
          l.status?.toLowerCase().includes(q)
        );
      })
    : logs;

  const startItem = (page - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(page * ITEMS_PER_PAGE, total);
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  const hasAnyConstraint = hasActive || debouncedSearch.length > 0;

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-heading">SMS Sent</h2>
          <p className="text-sm text-subtle">
            Track SMS notifications sent to deal owners.
          </p>
        </div>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-light text-brand flex-shrink-0 whitespace-nowrap">
          {total} total
        </span>
      </div>

      <DealsSearchBar
        onSearch={setSearchQuery}
        filters={SMS_FILTERS}
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
                <Skeleton className="hidden md:block h-6 w-20 rounded-lg flex-shrink-0" />
                <Skeleton className="hidden md:block h-4 w-16 flex-shrink-0" />
                <Skeleton className="hidden lg:block h-8 w-28 rounded-lg flex-shrink-0" />
              </div>
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <MessageSquare className="h-6 w-6 text-subtle" />
            </div>
            <p className="text-sm font-medium text-heading">No SMS logs found</p>
            <p className="text-xs text-subtle mt-1 max-w-sm">
              {hasAnyConstraint
                ? 'No SMS messages match your current filters. Try clearing a filter or adjusting your search.'
                : 'SMS notifications will appear here'}
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
          <SmsSentTable logs={filteredLogs} onViewDetails={onViewDetails} />
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

export default SmsSentSection;
