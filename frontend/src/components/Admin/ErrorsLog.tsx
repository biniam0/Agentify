/**
 * Errors Log Component - System errors with severity levels
 */

import { AlertCircle, AlertTriangle, Info, XCircle, CheckCircle2, Clock, ChevronDown, ChevronUp, Copy, Check, Code, Globe, Shield } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import * as loggingService from '../../services/loggingService';

const ErrorsLog: React.FC = () => {
  const [logs, setLogs] = useState<loggingService.ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [showResolved, setShowResolved] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const limit = 10;

  useEffect(() => {
    fetchLogs();
  }, [page, showResolved]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await loggingService.getErrorLogs({
        isResolved: showResolved ? undefined : false,
        limit,
        offset: page * limit,
      });
      
      if (response.success) {
        setLogs(response.data);
        setTotal(response.total);
      }
    } catch (error: any) {
      console.error('Failed to fetch error logs:', error);
      toast.error(error.response?.data?.error || 'Failed to load error logs');
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

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return {
        badgeColor: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30',
        iconBg: 'bg-red-100 dark:bg-red-500/15 border-red-200/60 dark:border-red-500/20',
        iconColor: 'text-red-600 dark:text-red-400',
        icon: XCircle,
        accentBorder: 'border-l-red-500',
      };
      case 'HIGH': return {
        badgeColor: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/30',
        iconBg: 'bg-orange-100 dark:bg-orange-500/15 border-orange-200/60 dark:border-orange-500/20',
        iconColor: 'text-orange-600 dark:text-orange-400',
        icon: AlertCircle,
        accentBorder: 'border-l-orange-500',
      };
      case 'MEDIUM': return {
        badgeColor: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30',
        iconBg: 'bg-amber-100 dark:bg-amber-500/15 border-amber-200/60 dark:border-amber-500/20',
        iconColor: 'text-amber-600 dark:text-amber-400',
        icon: AlertTriangle,
        accentBorder: 'border-l-yellow-500',
      };
      case 'LOW': return {
        badgeColor: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',
        iconBg: 'bg-blue-100 dark:bg-blue-500/15 border-blue-200/60 dark:border-blue-500/20',
        iconColor: 'text-blue-600 dark:text-blue-400',
        icon: Info,
        accentBorder: 'border-l-blue-500',
      };
      default: return {
        badgeColor: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-500/30',
        iconBg: 'bg-gray-100 dark:bg-gray-500/15 border-gray-200/60 dark:border-gray-500/20',
        iconColor: 'text-gray-600 dark:text-gray-400',
        icon: AlertCircle,
        accentBorder: 'border-l-gray-500',
      };
    }
  };

  const getErrorTypeConfig = (type: string) => {
    switch (type) {
      case 'API_ERROR': return { color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/30', icon: Globe };
      case 'DATABASE_ERROR': return { color: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30', icon: Code };
      case 'EXTERNAL_SERVICE': return { color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30', icon: Globe };
      case 'VALIDATION_ERROR': return { color: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30', icon: AlertTriangle };
      case 'AUTHENTICATION_ERROR': return { color: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/30', icon: Shield };
      case 'AUTHORIZATION_ERROR': return { color: 'bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-200 dark:border-pink-500/30', icon: Shield };
      default: return { color: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-500/30', icon: Code };
    }
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
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg border border-subtle dark:border-border border-l-4 border-l-gray-300 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-xl" />
                <div className="flex gap-1.5">
                  <Skeleton className="h-5 w-20 rounded-md" />
                  <Skeleton className="h-5 w-24 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-10 w-full rounded-lg" />
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
          <div className="h-9 w-9 rounded-xl bg-red-100 dark:bg-red-500/15 flex items-center justify-center shadow-sm border border-red-200/60 dark:border-red-500/20">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-heading dark:text-foreground">Error Logs</h2>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-light text-brand border border-[hsl(var(--app-brand-muted)/0.3)] dark:bg-primary/10 dark:text-primary dark:border-primary/20">
                {total} {showResolved ? 'total' : 'unresolved'} errors
              </span>
              {total > 0 && (
                <span className="text-xs text-subtle dark:text-muted-foreground">
                  Showing <span className="font-medium text-body dark:text-foreground">{startItem}–{endItem}</span> of {total}
                </span>
              )}
            </div>
          </div>
        </div>
        <Button
          variant={showResolved ? 'default' : 'outline'}
          size="sm"
          onClick={() => { setShowResolved(!showResolved); setPage(0); }}
          className={`rounded-lg h-9 text-xs font-medium ${!showResolved ? 'border-default dark:border-border text-subtle dark:text-muted-foreground hover:text-heading dark:hover:text-foreground' : 'bg-brand hover:bg-brand-hover text-white'}`}
        >
          {showResolved ? 'Hide Resolved' : 'Show Resolved'}
        </Button>
      </div>

      {/* Content */}
      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-500/10 flex items-center justify-center mb-3">
            <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-sm font-medium text-heading dark:text-foreground">No {showResolved ? '' : 'unresolved '}errors found</p>
          <p className="text-xs text-subtle dark:text-muted-foreground mt-1">
            {showResolved ? 'All errors have been resolved' : 'System is running smoothly'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const severityConfig = getSeverityConfig(log.severity);
            const errorTypeConfig = getErrorTypeConfig(log.errorType);
            const SeverityIcon = severityConfig.icon;
            const isExpanded = expandedLogId === log.id;

            return (
              <div
                key={log.id}
                className={`rounded-lg border border-subtle dark:border-border border-l-[3px] ${severityConfig.accentBorder} hover:border-[hsl(var(--text-muted)/0.3)] dark:hover:border-border bg-elevated dark:bg-card shadow-sm hover:shadow-card transition-all duration-150 overflow-hidden`}
              >
                {/* Header */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border ${severityConfig.iconBg}`}>
                        <SeverityIcon className={`w-4 h-4 ${severityConfig.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* Badges */}
                        <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${severityConfig.badgeColor}`}>
                            {log.severity}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${errorTypeConfig.color}`}>
                            {log.errorType.replace(/_/g, ' ')}
                          </span>
                          {log.isResolved && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/30">
                              <CheckCircle2 className="w-3 h-3" />
                              Resolved
                            </span>
                          )}
                        </div>
                        {/* Source */}
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[11px] font-medium text-subtle dark:text-muted-foreground uppercase tracking-wider">Source:</span>
                          <code className="text-[11px] bg-[hsl(var(--page-bg))] dark:bg-muted/30 px-1.5 py-0.5 rounded font-mono text-heading dark:text-foreground">{log.source}</code>
                        </div>
                        {/* Message */}
                        <p className="text-sm text-heading dark:text-foreground leading-relaxed">{log.message}</p>
                      </div>
                    </div>
                    {/* Time */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-[11px] text-subtle dark:text-muted-foreground flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(log.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Request Info */}
                {(log.endpoint || log.method || log.code) && (
                  <div className="mx-4 mb-3 grid grid-cols-3 gap-2">
                    {log.endpoint && (
                      <div className="rounded-lg border border-subtle dark:border-border bg-[hsl(var(--page-bg)/0.5)] dark:bg-muted/10 p-2.5">
                        <div className="text-[11px] text-subtle dark:text-muted-foreground uppercase tracking-wider mb-0.5">Endpoint</div>
                        <code className="text-[11px] font-mono text-heading dark:text-foreground break-all">{log.endpoint}</code>
                      </div>
                    )}
                    {log.method && (
                      <div className="rounded-lg border border-subtle dark:border-border bg-[hsl(var(--page-bg)/0.5)] dark:bg-muted/10 p-2.5">
                        <div className="text-[11px] text-subtle dark:text-muted-foreground uppercase tracking-wider mb-0.5">Method</div>
                        <span className="text-xs font-semibold text-heading dark:text-foreground">{log.method}</span>
                      </div>
                    )}
                    {log.code && (
                      <div className="rounded-lg border border-subtle dark:border-border bg-[hsl(var(--page-bg)/0.5)] dark:bg-muted/10 p-2.5">
                        <div className="text-[11px] text-subtle dark:text-muted-foreground uppercase tracking-wider mb-0.5">Status Code</div>
                        <span className={`text-xs font-bold ${parseInt(log.code) >= 500 ? 'text-red-600 dark:text-red-400' : parseInt(log.code) >= 400 ? 'text-orange-600 dark:text-orange-400' : 'text-heading dark:text-foreground'}`}>{log.code}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Stack Trace */}
                {log.stack && (
                  <div className="mx-4 mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-medium text-subtle dark:text-muted-foreground uppercase tracking-wider">Stack Trace</span>
                      <CopyButton text={log.stack} fieldId={`${log.id}-stack`} />
                    </div>
                    <pre className="text-[11px] bg-background dark:bg-card p-3 rounded-lg border border-subtle dark:border-border overflow-auto max-h-36 font-mono leading-relaxed text-body dark:text-foreground whitespace-pre-wrap break-words">
                      {log.stack}
                    </pre>
                  </div>
                )}

                {/* Resolution */}
                {log.isResolved && log.resolution && (
                  <div className="mx-4 mb-3 rounded-lg border border-green-200 dark:border-green-500/20 p-3 bg-green-50/50 dark:bg-green-950/10">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="text-[11px] font-semibold text-green-700 dark:text-green-400 mb-0.5">Resolution</div>
                        <div className="text-xs text-green-700 dark:text-green-300">{log.resolution}</div>
                        {log.resolvedBy && (
                          <div className="text-[11px] text-subtle dark:text-muted-foreground mt-1.5">
                            Resolved by <span className="font-medium text-body dark:text-foreground">{log.resolvedBy}</span> on {new Date(log.resolvedAt!).toLocaleString()}
                          </div>
                        )}
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
                        {[
                          { label: 'Error ID', value: log.id },
                          { label: 'User ID', value: log.userId },
                          { label: 'Deal ID', value: log.dealId },
                        ].filter(f => f.value).map((field) => (
                          <div key={field.label} className="min-w-0">
                            <div className="text-[11px] font-medium text-subtle dark:text-muted-foreground uppercase tracking-wider mb-1">{field.label}</div>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <code className="text-[11px] bg-background dark:bg-card px-2 py-1 rounded border border-subtle dark:border-border font-mono truncate flex-1 min-w-0 block">
                                {field.value}
                              </code>
                              <CopyButton text={field.value!} fieldId={`${log.id}-${field.label}`} />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Request/Response Data */}
                      {log.requestData && Object.keys(log.requestData).length > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-medium text-subtle dark:text-muted-foreground uppercase tracking-wider">Request Data</span>
                            <CopyButton text={JSON.stringify(log.requestData, null, 2)} fieldId={`${log.id}-req`} />
                          </div>
                          <pre className="text-[11px] bg-background dark:bg-card p-3 rounded-lg border border-subtle dark:border-border overflow-auto max-h-32 font-mono leading-relaxed text-body dark:text-foreground whitespace-pre-wrap break-words">
                            {JSON.stringify(log.requestData, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.responseData && Object.keys(log.responseData).length > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-medium text-subtle dark:text-muted-foreground uppercase tracking-wider">Response Data</span>
                            <CopyButton text={JSON.stringify(log.responseData, null, 2)} fieldId={`${log.id}-res`} />
                          </div>
                          <pre className="text-[11px] bg-background dark:bg-card p-3 rounded-lg border border-subtle dark:border-border overflow-auto max-h-32 font-mono leading-relaxed text-body dark:text-foreground whitespace-pre-wrap break-words">
                            {JSON.stringify(log.responseData, null, 2)}
                          </pre>
                        </div>
                      )}

                      <div className="mt-3 pt-3 border-t border-subtle dark:border-border">
                        <div className="text-[11px] text-subtle dark:text-muted-foreground uppercase tracking-wider mb-0.5">Occurred At</div>
                        <div className="text-[11px] font-mono text-body dark:text-foreground">{new Date(log.createdAt).toLocaleString()}</div>
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

export default ErrorsLog;
