/**
 * CRM Actions Log Component - Notes, meetings, contacts created
 */

import { FileText, Filter, Download, Clock, CheckCircle2, XCircle, AlertCircle, Copy, Check, ChevronDown, ChevronUp, Calendar, Briefcase, Users, StickyNote } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import * as loggingService from '../../services/loggingService';

const CrmActionsLog: React.FC = () => {
  const [logs, setLogs] = useState<loggingService.CrmActionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [expandedBodyId, setExpandedBodyId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const limit = 10;

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await loggingService.getCrmActionLogs({
        limit,
        offset: page * limit,
      });
      
      if (response.success) {
        setLogs(response.data);
        setTotal(response.total);
      }
    } catch (error: any) {
      console.error('Failed to fetch CRM action logs:', error);
      toast.error(error.response?.data?.error || 'Failed to load CRM action logs');
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

  const getActionTypeConfig = (type: string) => {
    switch (type) {
      case 'NOTE': return {
        badgeColor: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',
        iconBg: 'bg-blue-100 dark:bg-blue-500/15 border-blue-200/60 dark:border-blue-500/20',
        iconColor: 'text-blue-600 dark:text-blue-400',
        icon: StickyNote,
      };
      case 'MEETING': return {
        badgeColor: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30',
        iconBg: 'bg-green-100 dark:bg-green-500/15 border-green-200/60 dark:border-green-500/20',
        iconColor: 'text-green-600 dark:text-green-400',
        icon: Calendar,
      };
      case 'CONTACT': return {
        badgeColor: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/30',
        iconBg: 'bg-purple-100 dark:bg-purple-500/15 border-purple-200/60 dark:border-purple-500/20',
        iconColor: 'text-purple-600 dark:text-purple-400',
        icon: Users,
      };
      case 'DEAL': return {
        badgeColor: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/30',
        iconBg: 'bg-orange-100 dark:bg-orange-500/15 border-orange-200/60 dark:border-orange-500/20',
        iconColor: 'text-orange-600 dark:text-orange-400',
        icon: Briefcase,
      };
      case 'TASK': return {
        badgeColor: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/30',
        iconBg: 'bg-cyan-100 dark:bg-cyan-500/15 border-cyan-200/60 dark:border-cyan-500/20',
        iconColor: 'text-cyan-600 dark:text-cyan-400',
        icon: CheckCircle2,
      };
      default: return {
        badgeColor: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-500/30',
        iconBg: 'bg-gray-100 dark:bg-gray-500/15 border-gray-200/60 dark:border-gray-500/20',
        iconColor: 'text-gray-600 dark:text-gray-400',
        icon: FileText,
      };
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'SUCCESS': return { badgeColor: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30', icon: CheckCircle2 };
      case 'FAILED': return { badgeColor: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30', icon: XCircle };
      case 'PENDING': return { badgeColor: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30', icon: Clock };
      default: return { badgeColor: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-500/30', icon: AlertCircle };
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
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20 rounded-lg" />
            <Skeleton className="h-9 w-20 rounded-lg" />
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg border border-subtle dark:border-border p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-xl" />
                <div className="space-y-1 flex-1">
                  <div className="flex gap-1.5">
                    <Skeleton className="h-5 w-16 rounded-md" />
                    <Skeleton className="h-5 w-20 rounded-md" />
                  </div>
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
              <Skeleton className="h-12 w-full rounded-lg" />
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
          <div className="h-9 w-9 rounded-xl bg-teal-100 dark:bg-teal-500/15 flex items-center justify-center shadow-sm border border-teal-200/60 dark:border-teal-500/20">
            <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-heading dark:text-foreground">CRM Action Logs</h2>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-light text-brand border border-[hsl(var(--app-brand-muted)/0.3)] dark:bg-primary/10 dark:text-primary dark:border-primary/20">
                {total} total actions
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

      {/* Content */}
      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-12 w-12 rounded-full bg-[hsl(var(--page-bg))] flex items-center justify-center mb-3">
            <FileText className="h-6 w-6 text-subtle" />
          </div>
          <p className="text-sm font-medium text-heading dark:text-foreground">No CRM actions found</p>
          <p className="text-xs text-subtle dark:text-muted-foreground mt-1">Notes and meetings created by AI will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const typeConfig = getActionTypeConfig(log.actionType);
            const statusConfig = getStatusConfig(log.status);
            const TypeIcon = typeConfig.icon;
            const StatusIcon = statusConfig.icon;
            const isExpanded = expandedLogId === log.id;
            const isBodyExpanded = expandedBodyId === log.id;

            return (
              <div key={log.id} className="rounded-lg border border-subtle dark:border-border hover:border-[hsl(var(--text-muted)/0.3)] dark:hover:border-border bg-elevated dark:bg-card shadow-sm hover:shadow-card transition-all duration-150 overflow-hidden">
                {/* Header */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border ${typeConfig.iconBg}`}>
                        <TypeIcon className={`w-4 h-4 ${typeConfig.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* Badges */}
                        <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${typeConfig.badgeColor}`}>
                            {log.actionType}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${statusConfig.badgeColor}`}>
                            <StatusIcon className="w-3 h-3" />
                            {log.status}
                          </span>
                          <span className="text-[11px] text-subtle dark:text-muted-foreground font-medium">
                            {log.tenantSlug}
                          </span>
                        </div>
                        {/* Title */}
                        {log.title && (
                          <p className="text-sm font-medium text-heading dark:text-foreground leading-snug">{log.title}</p>
                        )}
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

                {/* Body */}
                {log.body && (
                  <div
                    className="mx-4 mb-3 rounded-lg bg-[hsl(var(--page-bg)/0.5)] dark:bg-muted/10 border border-subtle dark:border-border p-3 cursor-pointer"
                    onClick={() => setExpandedBodyId(isBodyExpanded ? null : log.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-xs leading-relaxed text-body dark:text-foreground whitespace-pre-line ${isBodyExpanded ? '' : 'line-clamp-2'}`}>
                        {log.body}
                      </p>
                      {log.body.length > 100 && (
                        <button className="flex-shrink-0 text-subtle dark:text-muted-foreground hover:text-heading dark:hover:text-foreground mt-0.5">
                          {isBodyExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      )}
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
                        {[
                          { label: 'Action ID', value: log.id },
                          { label: 'Deal ID', value: log.dealId },
                          { label: 'Conversation ID', value: log.conversationId },
                          { label: 'Entity ID', value: log.entityId },
                          { label: 'Owner ID', value: log.ownerId },
                          { label: 'Tenant', value: log.tenantSlug },
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

                      {/* Metadata */}
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-medium text-subtle dark:text-muted-foreground uppercase tracking-wider">Metadata</span>
                            <CopyButton text={JSON.stringify(log.metadata, null, 2)} fieldId={`${log.id}-metadata`} />
                          </div>
                          <pre className="text-[11px] bg-background dark:bg-card p-3 rounded-lg border border-subtle dark:border-border overflow-auto max-h-32 font-mono leading-relaxed text-body dark:text-foreground whitespace-pre-wrap break-words">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Timestamps */}
                      <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-subtle dark:border-border">
                        <div>
                          <div className="text-[11px] text-subtle dark:text-muted-foreground uppercase tracking-wider mb-0.5">Created At</div>
                          <div className="text-[11px] font-mono text-body dark:text-foreground">{new Date(log.createdAt).toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-[11px] text-subtle dark:text-muted-foreground uppercase tracking-wider mb-0.5">Updated At</div>
                          <div className="text-[11px] font-mono text-body dark:text-foreground">{new Date(log.updatedAt).toLocaleString()}</div>
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

export default CrmActionsLog;
