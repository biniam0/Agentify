import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import DealsSearchBar from './DealsSearchBar';
import DealsFilterTabs from './DealsFilterTabs';
import ClientsMeetingsTable from './ClientsMeetingsTable';
import * as meetingService from '@/services/meetingService';
import type { Meeting } from '@/types';

interface ClientsMeetingsSectionProps {
  onViewDetails: (meeting: Meeting) => void;
}

const ClientsMeetingsSection = ({ onViewDetails }: ClientsMeetingsSectionProps) => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredMeetings = searchQuery
    ? meetings.filter((m) => {
        const q = searchQuery.toLowerCase();
        return (
          m.title?.toLowerCase().includes(q) ||
          m.dealName?.toLowerCase().includes(q) ||
          m.dealCompany?.toLowerCase().includes(q) ||
          m.owner?.name?.toLowerCase().includes(q) ||
          m.participants?.some((p) => p.name?.toLowerCase().includes(q))
        );
      })
    : meetings;

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

      <DealsSearchBar onSearch={setSearchQuery} />
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
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Calendar className="h-6 w-6 text-subtle" />
            </div>
            <p className="text-sm font-medium text-heading">No meetings found</p>
            <p className="text-xs text-subtle mt-1">
              {searchQuery ? 'Try adjusting your search query' : 'Meetings will appear here once synced'}
            </p>
          </div>
        ) : (
          <ClientsMeetingsTable meetings={filteredMeetings} onViewDetails={onViewDetails} />
        )}
      </div>
    </div>
  );
};

export default ClientsMeetingsSection;
