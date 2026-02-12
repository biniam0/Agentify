/**
 * SMS Log Component - SMS notifications sent to deal owners
 */

import { 
  MessageSquare, 
  Filter, 
  Download, 
  Phone, 
  User, 
  Building2, 
  Calendar, 
  ChevronDown, 
  ChevronUp,
  Copy,
  Check,
  Clock,
  Send,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import * as loggingService from '../../services/loggingService';
import { MetricCard } from '../../pages/User/Logs/components/AnalyticsCharts';

// Individual SMS Card Component
const SmsLogCard: React.FC<{ log: loggingService.SmsLog }> = ({ log }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFullMessage, setShowFullMessage] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'SENT': 
        return { 
          badgeColor: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/30',
          iconBg: 'bg-orange-100 dark:bg-orange-500/15 border-orange-200/60 dark:border-orange-500/20',
          iconColor: 'text-orange-600 dark:text-orange-400',
          icon: Send, label: 'Sent'
        };
      case 'DELIVERED': 
        return { 
          badgeColor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30',
          iconBg: 'bg-emerald-100 dark:bg-emerald-500/15 border-emerald-200/60 dark:border-emerald-500/20',
          iconColor: 'text-emerald-600 dark:text-emerald-400',
          icon: CheckCircle2, label: 'Delivered'
        };
      case 'QUEUED': 
        return { 
          badgeColor: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30',
          iconBg: 'bg-amber-100 dark:bg-amber-500/15 border-amber-200/60 dark:border-amber-500/20',
          iconColor: 'text-amber-600 dark:text-amber-400',
          icon: Loader2, label: 'Queued'
        };
      case 'FAILED': 
        return { 
          badgeColor: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30',
          iconBg: 'bg-red-100 dark:bg-red-500/15 border-red-200/60 dark:border-red-500/20',
          iconColor: 'text-red-600 dark:text-red-400',
          icon: AlertCircle, label: 'Failed'
        };
      default: 
        return { 
          badgeColor: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-500/30',
          iconBg: 'bg-gray-100 dark:bg-gray-500/15 border-gray-200/60 dark:border-gray-500/20',
          iconColor: 'text-gray-600 dark:text-gray-400',
          icon: MessageSquare, label: status
        };
    }
  };

  const getTriggerColor = (trigger: string) => {
    switch (trigger) {
      case 'SCHEDULED': return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30';
      case 'MANUAL': return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30';
      case 'RETRY': return 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/30';
      default: return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-500/30';
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
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

  const statusConfig = getStatusConfig(log.status);
  const StatusIcon = statusConfig.icon;

  const CopyBtn = ({ text, fieldName }: { text: string; fieldName: string }) => (
    <button
      onClick={(e) => { e.stopPropagation(); copyToClipboard(text, fieldName); }}
      className="inline-flex items-center justify-center h-6 w-6 rounded-md hover:bg-[hsl(var(--page-bg))] dark:hover:bg-muted/30 text-subtle dark:text-muted-foreground hover:text-heading dark:hover:text-foreground transition-colors flex-shrink-0"
      title="Copy to clipboard"
    >
      {copiedField === fieldName ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
    </button>
  );

  return (
    <div className="rounded-lg border border-subtle dark:border-border hover:border-[hsl(var(--text-muted)/0.3)] dark:hover:border-border bg-elevated dark:bg-card shadow-sm hover:shadow-card transition-all duration-150 overflow-hidden">
      {/* Header Row */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border ${statusConfig.iconBg}`}>
              <StatusIcon className={`w-4 h-4 ${statusConfig.iconColor}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-heading dark:text-foreground">{log.ownerName || log.userName || 'Unknown'}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${getTriggerColor(log.triggerSource)}`}>
                  {log.triggerSource}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Phone className="w-3 h-3 text-subtle dark:text-muted-foreground" />
                <code className="text-[11px] font-mono text-body dark:text-foreground">{log.toPhone}</code>
                <CopyBtn text={log.toPhone} fieldName="toPhone" />
              </div>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${statusConfig.badgeColor}`}>
              {statusConfig.label}
            </span>
            <div className="flex items-center gap-1 text-[11px] text-subtle dark:text-muted-foreground mt-1.5 justify-end">
              <Clock className="w-3 h-3" />
              <span title={new Date(log.createdAt).toLocaleString()}>
                {formatRelativeTime(log.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Message Body */}
      {log.messageBody && (
        <div className="mx-4 mb-3 rounded-lg bg-[hsl(var(--page-bg)/0.5)] dark:bg-muted/10 border border-subtle dark:border-border p-3 cursor-pointer" onClick={() => setShowFullMessage(!showFullMessage)}>
          <div className="flex items-start justify-between gap-2">
            <p className={`text-xs leading-relaxed text-body dark:text-foreground whitespace-pre-line ${showFullMessage ? '' : 'line-clamp-3'}`}>
              {log.messageBody}
            </p>
            {log.messageBody.length > 150 && (
              <button className="flex-shrink-0 text-subtle dark:text-muted-foreground hover:text-heading dark:hover:text-foreground">
                {showFullMessage ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Context Info */}
      <div className="px-4 pb-3 grid grid-cols-2 gap-3">
        {log.meetingTitle && (
          <div className="flex items-start gap-2">
            <Calendar className="w-3.5 h-3.5 text-subtle dark:text-muted-foreground shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-subtle dark:text-muted-foreground uppercase tracking-wider">Meeting</div>
              <div className="text-xs font-medium text-heading dark:text-foreground truncate mt-0.5">{log.meetingTitle}</div>
            </div>
          </div>
        )}
        {log.dealName && (
          <div className="flex items-start gap-2">
            <Building2 className="w-3.5 h-3.5 text-subtle dark:text-muted-foreground shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-subtle dark:text-muted-foreground uppercase tracking-wider">Deal</div>
              <div className="text-xs font-medium text-heading dark:text-foreground truncate mt-0.5">{log.dealName}</div>
            </div>
          </div>
        )}
        {log.userEmail && (
          <div className="flex items-start gap-2">
            <User className="w-3.5 h-3.5 text-subtle dark:text-muted-foreground shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-subtle dark:text-muted-foreground uppercase tracking-wider">User Email</div>
              <div className="text-xs font-medium text-heading dark:text-foreground truncate mt-0.5">{log.userEmail}</div>
            </div>
          </div>
        )}
        {log.fromPhone && (
          <div className="flex items-start gap-2">
            <Phone className="w-3.5 h-3.5 text-subtle dark:text-muted-foreground shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-subtle dark:text-muted-foreground uppercase tracking-wider">From</div>
              <code className="text-[11px] font-mono text-heading dark:text-foreground mt-0.5 block">{log.fromPhone}</code>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {log.errorMessage && (
        <div className="mx-4 mb-3 p-3 bg-red-50/50 dark:bg-red-950/10 border border-red-200 dark:border-red-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-[11px] font-semibold text-red-700 dark:text-red-400 mb-0.5">Error</div>
              <p className="text-xs text-red-600 dark:text-red-300">{log.errorMessage}</p>
              {log.twilioErrorCode && (
                <code className="text-[11px] text-red-500 dark:text-red-400 mt-1 block font-mono">
                  Error Code: {log.twilioErrorCode}
                </code>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expandable Technical Details */}
      <div className="px-4 pb-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between py-2 px-3 rounded-lg text-xs font-medium text-subtle dark:text-muted-foreground hover:text-heading dark:hover:text-foreground hover:bg-[hsl(var(--page-bg)/0.5)] dark:hover:bg-muted/10 transition-colors border border-transparent hover:border-subtle dark:hover:border-border"
        >
          <span className="uppercase tracking-wider text-[11px]">Technical Details</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {isExpanded && (
          <div className="mt-2 p-4 bg-[hsl(var(--page-bg)/0.5)] dark:bg-muted/10 rounded-lg border border-subtle dark:border-border overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { label: 'Log ID', value: log.id },
                { label: 'Twilio SID', value: log.messageSid },
                { label: 'AgentX User ID', value: log.userId },
                { label: 'BarrierX User ID', value: log.barrierxUserId },
                { label: 'HubSpot Owner ID', value: log.hubspotOwnerId },
                { label: 'Meeting ID', value: log.meetingId },
                { label: 'Deal ID', value: log.dealId },
              ].filter(f => f.value).map((field) => (
                <div key={field.label} className="min-w-0">
                  <div className="text-[11px] font-medium text-subtle dark:text-muted-foreground uppercase tracking-wider mb-1">{field.label}</div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <code className="text-[11px] bg-background dark:bg-card px-2 py-1 rounded border border-subtle dark:border-border font-mono truncate flex-1 min-w-0 block">
                      {field.value}
                    </code>
                    <CopyBtn text={field.value!} fieldName={field.label} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-subtle dark:border-border">
              <div className="text-[11px] text-subtle dark:text-muted-foreground uppercase tracking-wider mb-0.5">Sent At</div>
              <div className="text-[11px] font-mono text-body dark:text-foreground">{new Date(log.createdAt).toLocaleString()}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Main SMS Log Component
const SmsLog: React.FC = () => {
  const [logs, setLogs] = useState<loggingService.SmsLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const limit = 10;

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await loggingService.getSmsLogs({
        limit,
        offset: page * limit,
      });
      
      if (response.success) {
        setLogs(response.data);
        setTotal(response.total);
      }
    } catch (error: any) {
      console.error('Failed to fetch SMS logs:', error);
      toast.error(error.response?.data?.error || 'Failed to load SMS logs');
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    sent: logs.filter(l => l.status === 'SENT').length,
    delivered: logs.filter(l => l.status === 'DELIVERED').length,
    failed: logs.filter(l => l.status === 'FAILED').length,
    queued: logs.filter(l => l.status === 'QUEUED').length,
  };

  const startItem = page * limit + 1;
  const endItem = Math.min((page + 1) * limit, total);

  if (loading && logs.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg border border-subtle dark:border-border p-5">
              <div className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3 w-14" />
                  <Skeleton className="h-6 w-10" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-subtle dark:border-border p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-xl" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
              <Skeleton className="h-14 w-full rounded-lg" />
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
          <div className="h-9 w-9 rounded-xl bg-green-500/10 dark:bg-green-500/15 flex items-center justify-center shadow-sm border border-green-200/50 dark:border-green-500/20">
            <MessageSquare className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-heading dark:text-foreground">SMS Notification Logs</h2>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-light text-brand border border-[hsl(var(--app-brand-muted)/0.3)] dark:bg-primary/10 dark:text-primary dark:border-primary/20">
                {total} total SMS
              </span>
              {total > 0 && (
                <span className="text-xs text-subtle dark:text-muted-foreground">
                  Showing <span className="font-medium text-body dark:text-foreground">{startItem}–{endItem}</span> of {total}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="border-default dark:border-border text-subtle dark:text-muted-foreground hover:text-heading dark:hover:text-foreground rounded-lg h-9 text-xs font-medium">
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            Filter
          </Button>
          <Button variant="outline" size="sm" className="border-default dark:border-border text-subtle dark:text-muted-foreground hover:text-heading dark:hover:text-foreground rounded-lg h-9 text-xs font-medium">
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {logs.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Sent" value={stats.sent.toString()} icon={Send} accentColor="bg-orange-500/10" iconColor="text-orange-600 dark:text-orange-400" />
          <MetricCard label="Delivered" value={stats.delivered.toString()} icon={CheckCircle2} accentColor="bg-emerald-500/10" iconColor="text-emerald-600 dark:text-emerald-400" />
          <MetricCard label="Failed" value={stats.failed.toString()} icon={AlertCircle} accentColor="bg-red-500/10" iconColor="text-red-600 dark:text-red-400" />
          <MetricCard label="Queued" value={stats.queued.toString()} icon={Loader2} accentColor="bg-yellow-500/10" iconColor="text-yellow-600 dark:text-yellow-400" />
        </div>
      )}

      {/* Content */}
      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-12 w-12 rounded-full bg-[hsl(var(--page-bg))] flex items-center justify-center mb-3">
            <MessageSquare className="h-6 w-6 text-subtle" />
          </div>
          <p className="text-sm font-medium text-heading dark:text-foreground">No SMS notifications found</p>
          <p className="text-xs text-subtle dark:text-muted-foreground mt-1">SMS notifications sent to deal owners will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <SmsLogCard key={log.id} log={log} />
          ))}
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

export default SmsLog;
