import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import * as loggingService from '@/services/loggingService';
import { StatsHeader, FilterTabs, SearchBar } from './components/LogListComponents';
import { LogTableRow, LogItem } from './components/LogTableRow';
import { isVoicemailCall } from '@/utils/callUtils';

const UserCallsLog: React.FC = () => {
  const [logs, setLogs] = useState<loggingService.CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const limit = 20;

  const fetchLogs = async () => {
    try {
      setLoading(true);

      // Map tab to status filter
      let statusFilter: string | undefined;
      if (activeTab === 'open') statusFilter = 'INITIATED'; // Approx mapping
      if (activeTab === 'completed') statusFilter = 'COMPLETED';

      const response = await loggingService.getUserCallLogs({
        limit,
        offset: page * limit,
        status: statusFilter
      });

      if (response.success) {
        setLogs(response.data);
        setTotal(response.total);
      }
    } catch (error) {
      console.error('Failed to fetch call logs:', error);
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to load call logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, activeTab]);

  const handleToggle = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  // Transform API data to UI model
  const mapLogToItem = (log: loggingService.CallLog): LogItem => ({
    id: log.id,
    activityType: log.callType.toLowerCase().replace('_', '-'),
    dealName: log.dealName || 'Unknown Deal',
    dealId: log.dealId,
    companyName: log.phoneNumber, // Fallback as we don't have company name in logs
    ownerName: log.userName || 'Unknown User',
    date: log.initiatedAt,
    status: log.status, // Use real status from API
    description: log.transcriptSummary || log.failureReason || `Call to ${log.phoneNumber} regarding ${log.meetingTitle}`,

    // Tier 1: Timeline data
    initiatedAt: log.initiatedAt,
    answeredAt: log.answeredAt,
    completedAt: log.completedAt,
    duration: log.duration,

    // Tier 1: Retry info
    retryAttempt: log.retryAttempt,
    maxRetries: log.maxRetries,
    parentCallId: log.parentCallId,

    // Tier 1: Meeting/Deal context
    meetingId: log.meetingId,
    meetingTitle: log.meetingTitle,

    // Tier 1: Call direction
    callDirection: log.callDirection || 'OUTBOUND',

    // Tier 1: Voicemail detection
    wasVoicemail: isVoicemailCall(log.webhookData, log.transcriptSummary),

    details: log.callSuccessful ? [] : [
      {
        action: 'Review Failure',
        contact: log.phoneNumber,
        role: log.failureReason || 'Unknown Error',
        companyName: 'System'
      }
    ]
  });

  // Calculate mock stats from loaded data (in real app, fetch these separately)
  const failedCount = logs.filter(l => l.status === 'FAILED' || l.status === 'NO_ANSWER').length;
  const completedCount = logs.filter(l => l.status === 'COMPLETED').length;

  if (loading && logs.length === 0) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="space-y-2.5 pl-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-96" />
        </div>
        {/* Stats skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-36 rounded-lg" />
          ))}
        </div>
        {/* Table skeleton */}
        <Skeleton className="h-[500px] w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Call History Page Header */}
      <div className="flex flex-col gap-2 pl-2">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold tracking-tight text-heading dark:text-foreground">Call History</h2>
          <span className="px-2.5 py-0.5 text-xs font-medium bg-orange-50 text-orange-600 rounded-full border border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20">
            {total} total
          </span>
        </div>
        <p className="text-sm text-body dark:text-muted-foreground leading-relaxed">
          Review your calls in depth, track performance, and analyze communication patterns with your clients.
        </p>
      </div>

      {/* Stats Section */}
      <StatsHeader
        atRiskCount={failedCount}
        atRiskLabel="Calls at Risk"
        targetCurrent={completedCount}
        targetMax={completedCount + failedCount + 10} // Mock target
        criticalCount={failedCount}
      />

      {/* Main Content Card */}
      <Card className="bg-elevated dark:bg-card border border-default dark:border-border shadow-card overflow-hidden rounded-lg">
        {/* Toolbar */}
        <div className="px-5 py-4 border-b border-subtle dark:border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <FilterTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            counts={{
              open: total - completedCount,
              completed: completedCount,
              all: total
            }}
          />
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-2.5 bg-table-header dark:bg-muted border-b border-subtle dark:border-border text-[11px] font-semibold text-subtle uppercase tracking-wider">
          <div className="col-span-2">Activity</div>
          <div className="col-span-3">Deal name</div>
          <div className="col-span-2">Phone / Company</div>
          <div className="col-span-2">Owner</div>
          <div className="col-span-2">Date</div>
          <div className="col-span-1 text-right">Status</div>
        </div>

        {/* List */}
        <div>
          {logs.length === 0 ? (
            <div className="py-16 px-6 text-center">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-[hsl(var(--page-bg))] dark:bg-muted mb-4">
                <Search className="h-6 w-6 text-subtle" />
              </div>
              <p className="text-sm font-medium text-heading dark:text-foreground mb-1">No calls found</p>
              <p className="text-xs text-subtle dark:text-muted-foreground">No logs match the current filter. Try a different selection.</p>
            </div>
          ) : (
            logs.map(log => (
              <LogTableRow
                key={log.id}
                item={mapLogToItem(log)}
                isExpanded={expandedId === log.id}
                onToggle={handleToggle}
              />
            ))
          )}
        </div>

        {/* Pagination Footer */}
        {total > limit && (
          <div className="px-5 py-3 border-t border-subtle dark:border-border bg-table-header dark:bg-muted flex items-center justify-between">
            <p className="text-xs text-subtle">
              Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="text-xs border-default dark:border-border hover:bg-page hover:text-heading dark:hover:bg-muted dark:hover:text-foreground"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={(page + 1) * limit >= total}
                onClick={() => setPage(p => p + 1)}
                className="text-xs border-default dark:border-border hover:bg-page hover:text-heading dark:hover:bg-muted dark:hover:text-foreground"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default UserCallsLog;
