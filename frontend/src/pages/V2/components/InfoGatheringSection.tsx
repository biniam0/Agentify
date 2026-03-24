import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import DealsSearchBar from './DealsSearchBar';
import DealsFilterTabs from './DealsFilterTabs';
import InfoGatheringTable from './InfoGatheringTable';
import { API_BASE_URL } from '@/config/api';
import { getAuthHeader } from '@/services/authService';
import type { BarrierXInfoRecord } from './InfoGatheringTable';

interface InfoGatheringSectionProps {
  onViewDetails: (record: BarrierXInfoRecord) => void;
  jobRunning?: boolean;
}

const ITEMS_PER_PAGE = 10;

const InfoGatheringSection = ({ onViewDetails, jobRunning }: InfoGatheringSectionProps) => {
  const [records, setRecords] = useState<BarrierXInfoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: ITEMS_PER_PAGE.toString(),
        offset: ((page - 1) * ITEMS_PER_PAGE).toString(),
      });

      const response = await fetch(`${API_BASE_URL}/logs/barrierx-info?${params}`, {
        headers: {
          ...getAuthHeader(),
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
  }, [page]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    if (!jobRunning) return;
    const interval = setInterval(fetchRecords, 5000);
    return () => clearInterval(interval);
  }, [jobRunning, fetchRecords]);

  const filteredRecords = searchQuery
    ? records.filter((r) => {
        const q = searchQuery.toLowerCase();
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

      <DealsSearchBar onSearch={setSearchQuery} />
      <DealsFilterTabs />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading && records.length === 0 ? (
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
        ) : filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Phone className="h-6 w-6 text-subtle" />
            </div>
            <p className="text-sm font-medium text-heading">No records found</p>
            <p className="text-xs text-subtle mt-1">
              {searchQuery ? 'Try adjusting your search query' : 'Info gathering records will appear here'}
            </p>
          </div>
        ) : (
          <InfoGatheringTable records={filteredRecords} onViewDetails={onViewDetails} />
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
