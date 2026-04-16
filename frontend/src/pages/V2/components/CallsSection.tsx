import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import DealsSearchBar from './DealsSearchBar';
import DealsFilterTabs from './DealsFilterTabs';
import CallsTable from './CallsTable';
import * as loggingService from '@/services/loggingService';
import type { CallLog } from '@/services/loggingService';
import { useTenant } from '@/contexts/TenantContext';

interface CallsSectionProps {
  onViewDetails: (log: CallLog) => void;
}

const ITEMS_PER_PAGE = 10;

const CallsSection = ({ onViewDetails }: CallsSectionProps) => {
  const { tenantSlug } = useTenant();
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await loggingService.getCallLogs({
        tenantSlug: tenantSlug || undefined,
        limit: ITEMS_PER_PAGE,
        offset: page * ITEMS_PER_PAGE,
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
  }, [page, tenantSlug]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = searchQuery
    ? logs.filter((log) => {
        const q = searchQuery.toLowerCase();
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

      <DealsSearchBar onSearch={setSearchQuery} />
      <DealsFilterTabs />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-20 rounded-lg" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-20 rounded-lg" />
                <Skeleton className="h-8 w-28 rounded-lg" />
              </div>
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Phone className="h-6 w-6 text-subtle" />
            </div>
            <p className="text-sm font-medium text-heading">No call logs found</p>
            <p className="text-xs text-subtle mt-1">
              {searchQuery ? 'Try adjusting your search query' : 'Call logs will appear here once calls are triggered'}
            </p>
          </div>
        ) : (
          <CallsTable logs={filteredLogs} onViewDetails={onViewDetails} />
        )}
      </div>

      {total > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between px-1 py-4">
          <p className="text-xs text-subtle">
            Showing <span className="font-medium text-heading">{startItem}–{endItem}</span> of <span className="font-medium text-heading">{total}</span>
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
