/**
 * Calls Log Component - Display call logs with filtering
 */

import { Phone, Filter, Download, Clock, User, Building2, Calendar, AlertCircle, CheckCircle2, XCircle, ChevronDown, ChevronUp, MessageSquare, RotateCcw, Voicemail, Copy, Check } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import * as loggingService from '../../services/loggingService';
import { isVoicemailCall } from '../../utils/callUtils';

const CallsLog: React.FC = () => {
  const [logs, setLogs] = useState<loggingService.CallLog[]>([]);
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
      const response = await loggingService.getCallLogs({
        limit,
        offset: page * limit,
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
  };

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getCallTypeColor = (type: string) => {
    return type === 'PRE_CALL'
      ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30'
      : 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/30';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30';
      case 'FAILED': case 'NO_ANSWER': return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30';
      case 'BUSY': return 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/30';
      case 'INITIATED': case 'RINGING': return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30';
      case 'ANSWERED': return 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/30';
      default: return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-500/30';
    }
  };

  const getTriggerColor = (source: string) => {
    switch (source) {
      case 'MANUAL': return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30';
      case 'SCHEDULED': return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30';
      case 'RETRY': return 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/30';
      case 'WEBHOOK': return 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/30';
      default: return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle2 className="w-3.5 h-3.5" />;
      case 'FAILED': case 'NO_ANSWER': case 'BUSY': return <XCircle className="w-3.5 h-3.5" />;
      case 'INITIATED': case 'RINGING': case 'ANSWERED': return <Clock className="w-3.5 h-3.5" />;
      default: return <AlertCircle className="w-3.5 h-3.5" />;
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return <span className="text-subtle dark:text-muted-foreground italic text-[11px]">Not recorded</span>;
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const DataField = ({ label, value, icon: Icon, className = "" }: { label: string; value: any; icon?: any; className?: string }) => {
    const hasValue = value !== null && value !== undefined && value !== '';
    return (
      <div className={`flex items-start gap-2.5 ${className}`}>
        {Icon && <Icon className="w-3.5 h-3.5 mt-0.5 text-subtle dark:text-muted-foreground flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-medium text-subtle dark:text-muted-foreground uppercase tracking-wider">{label}</div>
          {hasValue ? (
            <div className="text-sm font-medium text-heading dark:text-foreground truncate mt-0.5">{value}</div>
          ) : (
            <div className="text-sm text-subtle dark:text-muted-foreground italic mt-0.5">Not available</div>
          )}
        </div>
      </div>
    );
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

  const startItem = page * limit + 1;
  const endItem = Math.min((page + 1) * limit, total);

  if (loading && logs.length === 0) {
    return (
      <div className="space-y-4">
        {/* Skeleton Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-44" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20 rounded-lg" />
            <Skeleton className="h-9 w-20 rounded-lg" />
          </div>
        </div>
        {/* Skeleton Cards */}
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg border border-subtle dark:border-border p-4 space-y-3">
              <div className="flex gap-1.5">
                <Skeleton className="h-5 w-20 rounded-md" />
                <Skeleton className="h-5 w-24 rounded-md" />
                <Skeleton className="h-5 w-20 rounded-md" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-10 w-full rounded" />
                <Skeleton className="h-10 w-full rounded" />
              </div>
              <Skeleton className="h-16 w-full rounded-lg" />
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
          <div className="h-9 w-9 rounded-xl bg-blue-500/10 dark:bg-blue-500/15 flex items-center justify-center shadow-sm border border-blue-200/50 dark:border-blue-500/20">
            <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-heading dark:text-foreground">Call Logs</h2>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-light text-brand border border-[hsl(var(--app-brand-muted)/0.3)] dark:bg-primary/10 dark:text-primary dark:border-primary/20">
                {total} total calls
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
            <Phone className="h-6 w-6 text-subtle" />
          </div>
          <p className="text-sm font-medium text-heading dark:text-foreground">No call logs found</p>
          <p className="text-xs text-subtle dark:text-muted-foreground mt-1">Call logs will appear here once calls are triggered</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            return (
              <div key={log.id} className="rounded-lg border border-subtle dark:border-border hover:border-[hsl(var(--text-muted)/0.3)] dark:hover:border-border bg-elevated dark:bg-card shadow-sm hover:shadow-card transition-all duration-150 overflow-hidden">
                {/* Header Section */}
                <div className="p-4 pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3 min-w-0">
                      {/* Status Badges Row */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getCallTypeColor(log.callType)}`}>
                          <Phone className="w-3 h-3" />
                          {log.callType.replace('_', '-')}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getStatusColor(log.status)}`}>
                          {getStatusIcon(log.status)}
                          {log.status}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${getTriggerColor(log.triggerSource)}`}>
                          {log.triggerSource}
                        </span>
                        {log.retryAttempt > 1 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border border-orange-200 dark:border-orange-500/30 text-orange-700 dark:text-orange-400 bg-orange-500/10">
                            <RotateCcw className="w-3 h-3" />
                            Retry #{log.retryAttempt}/{log.maxRetries}
                          </span>
                        )}
                        {typeof log.callSuccessful === 'boolean' && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                            log.callSuccessful
                              ? 'border-green-200 dark:border-green-500/30 text-green-700 dark:text-green-400 bg-green-500/10'
                              : 'border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 bg-red-500/10'
                          }`}>
                            {log.callSuccessful ? '✓ Successful' : '✗ Unsuccessful'}
                          </span>
                        )}
                        {isVoicemailCall(log.webhookData, log.transcriptSummary) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
                            <Voicemail className="w-3 h-3" />
                            Voicemail
                          </span>
                        )}
                      </div>

                      {/* Primary Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <DataField label="User" value={log.userName} icon={User} />
                        <DataField label="Email" value={log.userEmail} icon={User} />
                        <DataField label="Deal" value={log.dealName} icon={Building2} />
                        <DataField label="Meeting" value={log.meetingTitle} icon={Calendar} />
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-xl font-bold tracking-tight text-brand dark:text-primary">
                        {formatDuration(log.duration)}
                      </div>
                      <div className="text-[11px] text-subtle dark:text-muted-foreground mt-0.5">Duration</div>
                    </div>
                  </div>
                </div>

                {/* Contact & Timing Info */}
                <div className="px-4 pb-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <DataField
                      label="Phone Number"
                      value={log.phoneNumber ? (
                        <code className="text-xs bg-[hsl(var(--page-bg))] dark:bg-muted/30 px-1.5 py-0.5 rounded font-mono">{log.phoneNumber}</code>
                      ) : null}
                      icon={Phone}
                    />
                    <DataField label="Owner" value={log.ownerName} icon={User} />
                    <DataField
                      label="Agent ID"
                      value={log.agentId ? (
                        <code className="text-xs bg-[hsl(var(--page-bg))] dark:bg-muted/30 px-1.5 py-0.5 rounded font-mono">{log.agentId.substring(0, 16)}...</code>
                      ) : null}
                    />
                  </div>
                </div>

                {/* Timestamps */}
                <div className="mx-4 mb-3 rounded-lg border border-subtle dark:border-border p-3 bg-[hsl(var(--page-bg)/0.5)] dark:bg-muted/10">
                  <div className="text-[10px] font-semibold text-subtle dark:text-muted-foreground mb-2 uppercase tracking-widest">Timeline</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <div className="text-[11px] text-subtle dark:text-muted-foreground mb-0.5">Initiated</div>
                      <div className="text-xs font-medium text-heading dark:text-foreground">{formatTimestamp(log.initiatedAt)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-subtle dark:text-muted-foreground mb-0.5">Answered</div>
                      <div className="text-xs font-medium text-heading dark:text-foreground">{formatTimestamp(log.answeredAt)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-subtle dark:text-muted-foreground mb-0.5">Completed</div>
                      <div className="text-xs font-medium text-heading dark:text-foreground">{formatTimestamp(log.completedAt)}</div>
                    </div>
                  </div>
                </div>

                {/* Failure Reason */}
                {log.failureReason && (
                  <div className="mx-4 mb-3 rounded-lg border border-red-200 dark:border-red-500/20 p-3 bg-red-50/50 dark:bg-red-950/10">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="text-[11px] font-semibold text-red-700 dark:text-red-400 mb-0.5">Failure Reason</div>
                        <div className="text-xs text-red-600 dark:text-red-300">{log.failureReason}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Transcript Summary */}
                {log.transcriptSummary && (
                  <div className="mx-4 mb-3 rounded-lg border border-blue-200 dark:border-blue-500/20 p-3 bg-blue-50/50 dark:bg-blue-950/10">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 mb-0.5">Transcript Summary</div>
                        <div className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">{log.transcriptSummary}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Expandable Technical Details */}
                <div className="px-4 pb-3">
                  <button
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="w-full flex items-center justify-between py-2 px-3 rounded-lg text-xs font-medium text-subtle dark:text-muted-foreground hover:text-heading dark:hover:text-foreground hover:bg-[hsl(var(--page-bg)/0.5)] dark:hover:bg-muted/10 transition-colors border border-transparent hover:border-subtle dark:hover:border-border"
                  >
                    <span className="uppercase tracking-wider text-[11px]">Technical Details & IDs</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-2 space-y-3 p-4 bg-[hsl(var(--page-bg)/0.5)] dark:bg-muted/10 rounded-lg border border-subtle dark:border-border overflow-hidden">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                          { label: 'Conversation ID', value: log.conversationId },
                          { label: 'Call SID', value: log.callSid },
                          { label: 'User ID', value: log.userId },
                          { label: 'Deal ID', value: log.dealId },
                          { label: 'Meeting ID', value: log.meetingId },
                          { label: 'Parent Call ID', value: log.parentCallId },
                        ].map((field) => (
                          <div key={field.label} className="min-w-0">
                            <div className="text-[11px] font-medium text-subtle dark:text-muted-foreground uppercase tracking-wider mb-1">{field.label}</div>
                            {field.value ? (
                              <div className="flex items-center gap-1.5 min-w-0">
                                <code className="text-[11px] bg-background dark:bg-card px-2 py-1 rounded border border-subtle dark:border-border font-mono truncate flex-1 min-w-0 block">
                                  {field.value}
                                </code>
                                <CopyButton text={field.value} fieldId={`${log.id}-${field.label}`} />
                              </div>
                            ) : (
                              <span className="text-xs text-subtle dark:text-muted-foreground italic">Not available</span>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Dynamic Variables */}
                      {log.dynamicVariables && Object.keys(log.dynamicVariables).length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-medium text-subtle dark:text-muted-foreground uppercase tracking-wider">Dynamic Variables</span>
                            <CopyButton text={JSON.stringify(log.dynamicVariables, null, 2)} fieldId={`${log.id}-dynvars`} />
                          </div>
                          <pre className="text-[11px] bg-background dark:bg-card p-3 rounded-lg border border-subtle dark:border-border overflow-auto max-h-32 font-mono leading-relaxed text-body dark:text-foreground whitespace-pre-wrap break-words">
                            {JSON.stringify(log.dynamicVariables, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Webhook Data */}
                      {log.webhookData && Object.keys(log.webhookData).length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-medium text-subtle dark:text-muted-foreground uppercase tracking-wider">Webhook Data</span>
                            <CopyButton text={JSON.stringify(log.webhookData, null, 2)} fieldId={`${log.id}-webhook`} />
                          </div>
                          <pre className="text-[11px] bg-background dark:bg-card p-3 rounded-lg border border-subtle dark:border-border overflow-auto max-h-32 font-mono leading-relaxed text-body dark:text-foreground whitespace-pre-wrap break-words">
                            {JSON.stringify(log.webhookData, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Audit Info */}
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-subtle dark:border-border">
                        <div>
                          <div className="text-[11px] text-subtle dark:text-muted-foreground mb-0.5 uppercase tracking-wider">Created At</div>
                          <div className="text-[11px] font-mono text-body dark:text-foreground">{formatTimestamp(log.createdAt)}</div>
                        </div>
                        <div>
                          <div className="text-[11px] text-subtle dark:text-muted-foreground mb-0.5 uppercase tracking-wider">Updated At</div>
                          <div className="text-[11px] font-mono text-body dark:text-foreground">{formatTimestamp(log.updatedAt)}</div>
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

export default CallsLog;
