import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import DealsSearchBar, { type FilterDef } from './DealsSearchBar';
import DealsFilterTabs from './DealsFilterTabs';
import ClientsMeetingsTable from './ClientsMeetingsTable';
import * as meetingService from '@/services/meetingService';
import type { Meeting } from '@/types';
import { useFilters } from '@/hooks/useFilters';
import { useDebounce } from '@/hooks/useDebounce';

interface ClientsMeetingsSectionProps {
  onViewDetails: (meeting: Meeting) => void;
}

const FILTER_IDS = ['status', 'timeframe'] as const;

const MEETING_STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
];

const TIMEFRAME_OPTIONS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
];

const MEETINGS_FILTERS: FilterDef[] = [
  { id: 'status', label: 'Status', options: MEETING_STATUS_OPTIONS, multiple: true },
  { id: 'timeframe', label: 'Timeframe', options: TIMEFRAME_OPTIONS, multiple: true },
];

const ClientsMeetingsSection = ({ onViewDetails }: ClientsMeetingsSectionProps) => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 250);

  const {
    values: filterValues,
    hasActive,
    setFilter,
    clearAll,
  } = useFilters(FILTER_IDS);

  const statusFilter = filterValues.status ?? [];
  const timeframeFilter = filterValues.timeframe ?? [];

  const fetchMeetings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await meetingService.getTenantMeetings();
      setMeetings(response.meetings || []);
    } catch (error: any) {
      console.error('Failed to fetch meetings:', error);
      toast.error(error.response?.data?.error || 'Failed to load meetings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const filteredMeetings = useMemo(() => {
    let result = meetings;

    if (statusFilter.length > 0) {
      const set = new Set(statusFilter);
      result = result.filter((m) => m.status && set.has(m.status));
    }

    if (timeframeFilter.length > 0) {
      const now = Date.now();
      const set = new Set(timeframeFilter);
      result = result.filter((m) => {
        const isPast = new Date(m.startTime).getTime() < now;
        return (isPast && set.has('past')) || (!isPast && set.has('upcoming'));
      });
    }

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter((m) =>
        m.title?.toLowerCase().includes(q) ||
        m.dealName?.toLowerCase().includes(q) ||
        m.dealCompany?.toLowerCase().includes(q) ||
        m.owner?.name?.toLowerCase().includes(q) ||
        m.participants?.some((p) => p.name?.toLowerCase().includes(q))
      );
    }

    return result;
  }, [meetings, statusFilter, timeframeFilter, debouncedSearch]);

  const hasAnyConstraint = hasActive || debouncedSearch.length > 0;

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-heading">Clients Meetings</h2>
          <p className="text-sm text-subtle">
            Manage meetings and trigger pre/post meeting calls.
          </p>
        </div>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-light text-brand flex-shrink-0 whitespace-nowrap">
          {filteredMeetings.length} meetings
        </span>
      </div>

      <DealsSearchBar
        onSearch={setSearchQuery}
        filters={MEETINGS_FILTERS}
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
                <Skeleton className="hidden sm:block h-6 w-20 rounded-lg flex-shrink-0" />
                <Skeleton className="hidden md:block h-4 w-16 flex-shrink-0" />
                <Skeleton className="hidden lg:block h-7 w-20 rounded-lg flex-shrink-0" />
                <Skeleton className="hidden lg:block h-8 w-28 rounded-lg flex-shrink-0" />
              </div>
            ))}
          </div>
        ) : filteredMeetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Calendar className="h-6 w-6 text-subtle" />
            </div>
            <p className="text-sm font-medium text-heading">No meetings found</p>
            <p className="text-xs text-subtle mt-1 max-w-sm">
              {hasAnyConstraint
                ? 'No meetings match your current filters. Try clearing a filter or adjusting your search.'
                : 'Meetings will appear here once synced'}
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
          <ClientsMeetingsTable meetings={filteredMeetings} onViewDetails={onViewDetails} />
        )}
      </div>
    </div>
  );
};

export default ClientsMeetingsSection;
