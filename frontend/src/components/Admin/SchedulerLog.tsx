/**
 * Scheduler Log Component - Automated job runs
 */

import { Timer, Users, AlertCircle, CheckCircle2, XCircle, Clock, Loader2, ChevronDown, ChevronUp, Copy, Check, PhoneOutgoing, PhoneIncoming, MessageSquare } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import * as loggingService from '../../services/loggingService';

const SchedulerLog: React.FC = () => {
  const [logs, setLogs] = useState<loggingService.SchedulerLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const limit = 10;

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await loggingService.getSchedulerLogs({
        limit,
        offset: page * limit,
      });
      
      if (response.success) {
        setLogs(response.data);
        setTotal(response.total);
      }
    } catch (error: any) {
      console.error('Failed to fetch scheduler logs:', error);
      toast.error(error.response?.data?.error || 'Failed to load scheduler logs');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const CopyButton = ({ text, fieldId }: { text: string; fieldId: string }) => (
    <button
      onClick={(e) => { e.stopPropagation(); copyToClipboard(text, fieldId); }}
      className="inline-flex items-center justify-center h-6 w-6 rounded-md hover:bg-[hsl(var(--page-bg))] dark:hover:bg-muted/30 text-subtle dark:text-muted-foreground hover:text-heading dark:hover:text-foreground transition-colors flex-shrink-0"
      title="Copy to clipboard"
    >
      {copiedField === fieldId ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
    </button>
  );

  const getJobTypeConfig = (type: string) => {
    switch (type) {
      case 'MEETING_AUTOMATION': return {
        badgeColor: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',
        iconBg: 'bg-blue-100 dark:bg-blue-500/15 border-blue-200/60 dark:border-blue-500/20',
        iconColor: 'text-blue-600 dark:text-blue-400',
        label: 'Meeting Automation',
      };
      case 'CLEANUP': return {
        badgeColor: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/30',
        iconBg: 'bg-purple-100 dark:bg-purple-500/15 border-purple-200/60 dark:border-purple-500/20',
        iconColor: 'text-purple-600 dark:text-purple-400',
        label: 'Cleanup',
      };
      case 'RETRY': return {
        badgeColor: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/30',
        iconBg: 'bg-orange-100 dark:bg-orange-500/15 border-orange-200/60 dark:border-orange-500/20',
        iconColor: 'text-orange-600 dark:text-orange-400',
        label: 'Retry',
      };
      case 'HEALTH_CHECK': return {
        badgeColor: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30',
        iconBg: 'bg-green-100 dark:bg-green-500/15 border-green-200/60 dark:border-green-500/20',
        iconColor: 'text-green-600 dark:text-green-400',
        label: 'Health Check',
      };
      default: return {
        badgeColor: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-500/30',
        iconBg: 'bg-gray-100 dark:bg-gray-500/15 border-gray-200/60 dark:border-gray-500/20',
        iconColor: 'text-gray-600 dark:text-gray-400',
        label: type,
      };
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'SUCCESS': return {
        badgeColor: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30',
        icon: CheckCircle2,
      };
      case 'FAILED': return {
        badgeColor: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30',
        icon: XCircle,
      };
      case 'RUNNING': return {
        badgeColor: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',
        icon: Loader2,
      };
      default: return {
        badgeColor: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-500/30',
        icon: AlertCircle,
      };
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatRelativeTime = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const startItem = page * limit + 1;
  const endItem = Math.min((page + 1) * limit, total);

  if (loading && logs.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg border border-subtle dark:border-border p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-xl" />
                <div className="flex gap-1.5">
                  <Skeleton className="h-5 w-36 rounded-md" />
                  <Skeleton className="h-5 w-20 rounded-md" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center shadow-sm border border-indigo-200/60 dark:border-indigo-500/20">
            <Timer className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-heading dark:text-foreground">Scheduler Logs</h2>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-light text-brand border border-[hsl(var(--app-brand-muted)/0.3)] dark:bg-primary/10 dark:text-primary dark:border-primary/20">
                {total} total runs
              </span>
              {total > 0 && (
                <span className="text-xs text-subtle dark:text-muted-foreground">
                  Showing <span className="font-medium text-body dark:text-foreground">{startItem}–{endItem}</span> of {total}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-12 w-12 rounded-full bg-[hsl(var(--page-bg))] flex items-center justify-center mb-3">
            <Timer className="h-6 w-6 text-subtle" />
          </div>
          <p className="text-sm font-medium text-heading dark:text-foreground">No scheduler logs found</p>
          <p className="text-xs text-subtle dark:text-muted-foreground mt-1">Automation job runs will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const jobConfig = getJobTypeConfig(log.jobType);
            const statusConfig = getStatusConfig(log.status);
            const StatusIcon = statusConfig.icon;
            const isExpanded = expandedLogId === log.id;

            return (
              <div key={log.id} className="rounded-lg border border-subtle dark:border-border hover:border-[hsl(var(--text-muted)/0.3)] dark:hover:border-border bg-elevated dark:bg-card shadow-sm hover:shadow-card transition-all duration-150 overflow-hidden">
                {/* Header */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border ${jobConfig.iconBg}`}>
                        <Timer className={`w-4 h-4 ${jobConfig.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${jobConfig.badgeColor}`}>
                            {jobConfig.label}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${statusConfig.badgeColor}`}>
                            <StatusIcon className={`w-3 h-3 ${log.status === 'RUNNING' ? 'animate-spin' : ''}`} />
                            {log.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Duration + Time */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-bold tracking-tight text-brand dark:text-primary">
                        {formatDuration(log.duration)}
                      </div>
                      <div className="text-[11px] text-subtle dark:text-muted-foreground flex items-center gap-1 justify-end mt-0.5">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(log.startedAt)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="mx-4 mb-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="rounded-lg border border-subtle dark:border-border bg-[hsl(var(--page-bg)/0.5)] dark:bg-muted/10 p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-500/15 border border-slate-200/60 dark:border-slate-500/20 flex items-center justify-center">
                        <Users className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                      </div>
                      <div>
                        <div className="text-[11px] text-subtle dark:text-muted-foreground">Users</div>
                        <div className="text-sm font-bold text-heading dark:text-foreground">{log.totalUsers ?? '—'}</div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-subtle dark:border-border bg-[hsl(var(--page-bg)/0.5)] dark:bg-muted/10 p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-500/15 border border-blue-200/60 dark:border-blue-500/20 flex items-center justify-center">
                        <PhoneOutgoing className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <div className="text-[11px] text-subtle dark:text-muted-foreground">Pre-Calls</div>
                        <div className="text-sm font-bold text-heading dark:text-foreground">{log.preCallsTriggered ?? '—'}</div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-subtle dark:border-border bg-[hsl(var(--page-bg)/0.5)] dark:bg-muted/10 p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-purple-100 dark:bg-purple-500/15 border border-purple-200/60 dark:border-purple-500/20 flex items-center justify-center">
                        <PhoneIncoming className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <div className="text-[11px] text-subtle dark:text-muted-foreground">Post-Calls</div>
                        <div className="text-sm font-bold text-heading dark:text-foreground">{log.postCallsTriggered ?? '—'}</div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-subtle dark:border-border bg-[hsl(var(--page-bg)/0.5)] dark:bg-muted/10 p-3">
                    <div className="flex items-center gap-2">
                      <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${
                        (log.errorsCount ?? 0) > 0
                          ? 'bg-red-100 dark:bg-red-500/15 border border-red-200/60 dark:border-red-500/20'
                          : 'bg-green-100 dark:bg-green-500/15 border border-green-200/60 dark:border-green-500/20'
                      }`}>
                        {(log.errorsCount ?? 0) > 0
                          ? <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                          : <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                        }
                      </div>
                      <div>
                        <div className="text-[11px] text-subtle dark:text-muted-foreground">Errors</div>
                        <div className={`text-sm font-bold ${(log.errorsCount ?? 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-heading dark:text-foreground'}`}>
                          {log.errorsCount ?? 0}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SMS notifications metadata */}
                {log.metadata && (log.metadata as any).smsNotificationsSent > 0 && (
                  <div className="mx-4 mb-3 rounded-lg border border-blue-200 dark:border-blue-500/20 p-2.5 bg-blue-50/50 dark:bg-blue-950/10">
                    <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
                      <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="font-medium">{(log.metadata as any).smsNotificationsSent} SMS notification{(log.metadata as any).smsNotificationsSent > 1 ? 's' : ''} sent</span>
                    </div>
                  </div>
                )}

                {/* Error */}
                {log.errorMessage && (
                  <div className="mx-4 mb-3 rounded-lg border border-red-200 dark:border-red-500/20 p-3 bg-red-50/50 dark:bg-red-950/10">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="text-[11px] font-semibold text-red-700 dark:text-red-400 mb-0.5">Error</div>
                        <div className="text-xs text-red-600 dark:text-red-300">{log.errorMessage}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Expandable Details */}
                <div className="px-4 pb-3">
                  <button
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="w-full flex items-center justify-between py-2 px-3 rounded-lg text-xs font-medium text-subtle dark:text-muted-foreground hover:text-heading dark:hover:text-foreground hover:bg-[hsl(var(--page-bg)/0.5)] dark:hover:bg-muted/10 transition-colors border border-transparent hover:border-subtle dark:hover:border-border"
                  >
                    <span className="uppercase tracking-wider text-[11px]">Technical Details</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-2 p-4 bg-[hsl(var(--page-bg)/0.5)] dark:bg-muted/10 rounded-lg border border-subtle dark:border-border overflow-hidden">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="min-w-0">
                          <div className="text-[11px] font-medium text-subtle dark:text-muted-foreground uppercase tracking-wider mb-1">Job ID</div>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <code className="text-[11px] bg-background dark:bg-card px-2 py-1 rounded border border-subtle dark:border-border font-mono truncate flex-1 min-w-0 block">
                              {log.id}
                            </code>
                            <CopyButton text={log.id} fieldId={`${log.id}-id`} />
                          </div>
                        </div>
                      </div>

                      {/* Metadata */}
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-medium text-subtle dark:text-muted-foreground uppercase tracking-wider">Metadata</span>
                            <CopyButton text={JSON.stringify(log.metadata, null, 2)} fieldId={`${log.id}-meta`} />
                          </div>
                          <pre className="text-[11px] bg-background dark:bg-card p-3 rounded-lg border border-subtle dark:border-border overflow-auto max-h-32 font-mono leading-relaxed text-body dark:text-foreground whitespace-pre-wrap break-words">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Timestamps */}
                      <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-subtle dark:border-border">
                        <div>
                          <div className="text-[11px] text-subtle dark:text-muted-foreground uppercase tracking-wider mb-0.5">Started At</div>
                          <div className="text-[11px] font-mono text-body dark:text-foreground">{new Date(log.startedAt).toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-[11px] text-subtle dark:text-muted-foreground uppercase tracking-wider mb-0.5">Completed At</div>
                          <div className="text-[11px] font-mono text-body dark:text-foreground">
                            {log.completedAt ? new Date(log.completedAt).toLocaleString() : <span className="italic text-subtle">Still running</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between px-1 py-3">
          <p className="text-xs text-subtle dark:text-muted-foreground">
            Showing <span className="font-medium text-heading dark:text-foreground">{startItem}–{endItem}</span> of <span className="font-medium text-heading dark:text-foreground">{total}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="h-8 px-3 text-xs rounded-lg border-default dark:border-border disabled:opacity-40"
            >
              Previous
            </Button>
            <span className="text-xs text-subtle dark:text-muted-foreground px-2">
              Page <span className="font-medium text-heading dark:text-foreground">{page + 1}</span> of {Math.ceil(total / limit)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={(page + 1) * limit >= total}
              className="h-8 px-3 text-xs rounded-lg border-default dark:border-border disabled:opacity-40"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulerLog;
