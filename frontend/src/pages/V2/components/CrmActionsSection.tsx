import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import DealsSearchBar from './DealsSearchBar';
import DealsFilterTabs from './DealsFilterTabs';
import CrmActionsTable from './CrmActionsTable';
import * as loggingService from '@/services/loggingService';
import type { CrmActionLog } from '@/services/loggingService';
import { useTenant } from '@/contexts/TenantContext';

interface CrmActionsSectionProps {
  onViewDetails: (log: CrmActionLog) => void;
}

const ITEMS_PER_PAGE = 10;

const CrmActionsSection = ({ onViewDetails }: CrmActionsSectionProps) => {
  const { tenantSlug } = useTenant();
  const [logs, setLogs] = useState<CrmActionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await loggingService.getCrmActionLogs({
        tenantSlug: tenantSlug || undefined,
        limit: ITEMS_PER_PAGE,
        offset: (page - 1) * ITEMS_PER_PAGE,
      });

      if (response.success) {
        setLogs(response.data || []);
        setTotal(response.total || 0);
      }
    } catch (error: any) {
      console.error('Failed to fetch CRM action logs:', error);
      toast.error(error.response?.data?.error || 'Failed to load CRM action logs');
    } finally {
      setLoading(false);
    }
  }, [page, tenantSlug]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = searchQuery
    ? logs.filter((l) => {
        const q = searchQuery.toLowerCase();
        return (
          l.title?.toLowerCase().includes(q) ||
          l.body?.toLowerCase().includes(q) ||
          l.actionType?.toLowerCase().includes(q) ||
          l.tenantSlug?.toLowerCase().includes(q) ||
          l.status?.toLowerCase().includes(q) ||
          l.dealId?.toLowerCase().includes(q)
        );
      })
    : logs;

  const startItem = (page - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(page * ITEMS_PER_PAGE, total);
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-heading">CRM Actions</h2>
          <p className="text-sm text-subtle">
            Notes, meetings, contacts, and deals created by AgentX.
          </p>
        </div>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-light text-brand flex-shrink-0 whitespace-nowrap">
          {total} total
        </span>
      </div>

      <DealsSearchBar onSearch={setSearchQuery} />
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
                <Skeleton className="hidden sm:block h-6 w-16 rounded-lg flex-shrink-0" />
                <Skeleton className="hidden md:block h-6 w-16 rounded-lg flex-shrink-0" />
                <Skeleton className="hidden md:block h-4 w-16 flex-shrink-0" />
                <Skeleton className="hidden lg:block h-8 w-28 rounded-lg flex-shrink-0" />
              </div>
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <FileText className="h-6 w-6 text-subtle" />
            </div>
            <p className="text-sm font-medium text-heading">No CRM actions found</p>
            <p className="text-xs text-subtle mt-1">
              {searchQuery ? 'Try adjusting your search query' : 'CRM actions will appear here'}
            </p>
          </div>
        ) : (
          <CrmActionsTable logs={filteredLogs} onViewDetails={onViewDetails} />
        )}
      </div>

      {total > ITEMS_PER_PAGE && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1 py-4">
          <p className="text-xs text-subtle">
            Showing <span className="font-medium text-heading">{startItem}–{endItem}</span> of <span className="font-medium text-heading">{total}</span>
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

export default CrmActionsSection;
