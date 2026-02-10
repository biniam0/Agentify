/**
 * Calls Log Component - Display call logs with filtering
 */

import { Phone, Filter, Download, Clock, User, Building2, Calendar, AlertCircle, CheckCircle2, XCircle, ChevronDown, ChevronUp, MessageSquare, RotateCcw, Voicemail } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
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
  const limit = 20;

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

  const getCallTypeColor = (type: string) => {
    return type === 'PRE_CALL'
      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
      : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800';
      case 'FAILED': case 'NO_ANSWER': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800';
      case 'BUSY': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800';
      case 'INITIATED': case 'RINGING': return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
      case 'ANSWERED': return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800';
      default: return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800';
    }
  };

  const getTriggerColor = (source: string) => {
    switch (source) {
      case 'MANUAL': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'SCHEDULED': return 'bg-green-500/10 text-green-600 border-green-200';
      case 'RETRY': return 'bg-orange-500/10 text-orange-600 border-orange-200';
      case 'WEBHOOK': return 'bg-purple-500/10 text-purple-600 border-purple-200';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle2 className="w-4 h-4" />;
      case 'FAILED': case 'NO_ANSWER': case 'BUSY': return <XCircle className="w-4 h-4" />;
      case 'INITIATED': case 'RINGING': case 'ANSWERED': return <Clock className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return <span className="text-muted-foreground italic">Not recorded</span>;
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
      <div className={`flex items-start gap-2 ${className}`}>
        {Icon && <Icon className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          {hasValue ? (
            <div className="text-sm font-medium truncate">{value}</div>
          ) : (
            <div className="text-sm text-muted-foreground italic">Not available</div>
          )}
        </div>
      </div>
    );
  };

  if (loading && logs.length === 0) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Call Logs
              </CardTitle>
              <CardDescription>
                {total} total calls • Showing {logs.length} of {total}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <Phone className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No call logs found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Call logs will appear here once calls are triggered
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                return (
                  <Card
                    key={log.id}
                    className="border-2 hover:border-primary/50 transition-all duration-200"
                  >
                    <CardContent className="p-0">
                      {/* Header Section */}
                      <div className="p-4 border-b bg-muted/30">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-3">
                            {/* Status Badges Row */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={`${getCallTypeColor(log.callType)} px-3 py-1`}>
                                <Phone className="w-3 h-3 mr-1" />
                                {log.callType.replace('_', '-')}
                              </Badge>
                              <Badge className={`${getStatusColor(log.status)} px-3 py-1 flex items-center gap-1`}>
                                {getStatusIcon(log.status)}
                                {log.status}
                              </Badge>
                              <Badge className={`${getTriggerColor(log.triggerSource)} px-3 py-1`} variant="outline">
                                {log.triggerSource}
                              </Badge>
                              {log.retryAttempt > 1 && (
                                <Badge variant="outline" className="px-3 py-1 border-orange-300">
                                  <RotateCcw className="w-3 h-3 mr-1" />
                                  Retry #{log.retryAttempt}/{log.maxRetries}
                                </Badge>
                              )}
                              {typeof log.callSuccessful === 'boolean' && (
                                <Badge
                                  variant="outline"
                                  className={log.callSuccessful
                                    ? "border-green-300 text-green-700"
                                    : "border-red-300 text-red-700"
                                  }
                                >
                                  {log.callSuccessful ? '✓ Successful' : '✗ Unsuccessful'}
                                </Badge>
                              )}
                              {isVoicemailCall(log.webhookData, log.transcriptSummary) && (
                                <Badge
                                  variant="outline"
                                  className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700 px-3 py-1"
                                >
                                  <Voicemail className="w-3 h-3 mr-1" />
                                  Voicemail
                                </Badge>
                              )}
                            </div>

                            {/* Primary Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <DataField
                                label="User"
                                value={log.userName}
                                icon={User}
                              />
                              <DataField
                                label="Email"
                                value={log.userEmail}
                                icon={User}
                              />
                              <DataField
                                label="Deal"
                                value={log.dealName}
                                icon={Building2}
                              />
                              <DataField
                                label="Meeting"
                                value={log.meetingTitle}
                                icon={Calendar}
                              />
                            </div>
                          </div>

                          {/* Quick Stats */}
                          <div className="text-right space-y-2">
                            <div className="text-2xl font-bold text-primary">
                              {formatDuration(log.duration)}
                            </div>
                            <div className="text-xs text-muted-foreground">Duration</div>
                          </div>
                        </div>
                      </div>

                      {/* Main Content */}
                      <div className="p-4 space-y-4">
                        {/* Contact & Timing Info */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <DataField
                            label="Phone Number"
                            value={log.phoneNumber ? (
                              <code className="text-xs bg-muted px-2 py-1 rounded">{log.phoneNumber}</code>
                            ) : null}
                            icon={Phone}
                          />
                          <DataField
                            label="Owner"
                            value={log.ownerName}
                            icon={User}
                          />
                          <DataField
                            label="Agent ID"
                            value={log.agentId ? (
                              <code className="text-xs bg-muted px-2 py-1 rounded">{log.agentId.substring(0, 12)}...</code>
                            ) : null}
                          />
                        </div>

                        {/* Timestamps */}
                        <div className="border rounded-lg p-3 bg-muted/20">
                          <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Timeline</div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Initiated</div>
                              <div className="text-sm font-medium">{formatTimestamp(log.initiatedAt)}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Answered</div>
                              <div className="text-sm font-medium">{formatTimestamp(log.answeredAt)}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Completed</div>
                              <div className="text-sm font-medium">{formatTimestamp(log.completedAt)}</div>
                            </div>
                          </div>
                        </div>

                        {/* Failure Reason (if any) */}
                        {log.failureReason && (
                          <div className="border border-red-200 rounded-lg p-3 bg-red-50/50 dark:bg-red-950/20">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <div className="text-xs font-semibold text-red-600 mb-1">Failure Reason</div>
                                <div className="text-sm text-red-700 dark:text-red-400">{log.failureReason}</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Transcript Summary (if available) */}
                        {log.transcriptSummary && (
                          <div className="border border-blue-200 rounded-lg p-3 bg-blue-50/50 dark:bg-blue-950/20">
                            <div className="flex items-start gap-2">
                              <MessageSquare className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <div className="text-xs font-semibold text-blue-600 mb-1">Transcript Summary</div>
                                <div className="text-sm text-blue-700 dark:text-blue-400">{log.transcriptSummary}</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Expandable Technical Details */}
                        <div className="border-t pt-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="w-full justify-between"
                          >
                            <span className="text-xs font-semibold">Technical Details & IDs</span>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>

                          {isExpanded && (
                            <div className="mt-3 space-y-3 p-3 bg-muted/30 rounded-lg">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <DataField
                                  label="Conversation ID"
                                  value={log.conversationId ? (
                                    <code className="text-xs bg-background px-2 py-1 rounded break-all">
                                      {log.conversationId}
                                    </code>
                                  ) : null}
                                />
                                <DataField
                                  label="Call SID"
                                  value={log.callSid ? (
                                    <code className="text-xs bg-background px-2 py-1 rounded break-all">
                                      {log.callSid}
                                    </code>
                                  ) : null}
                                />
                                <DataField
                                  label="User ID"
                                  value={log.userId ? (
                                    <code className="text-xs bg-background px-2 py-1 rounded break-all">
                                      {log.userId}
                                    </code>
                                  ) : null}
                                />
                                <DataField
                                  label="Deal ID"
                                  value={log.dealId ? (
                                    <code className="text-xs bg-background px-2 py-1 rounded break-all">
                                      {log.dealId}
                                    </code>
                                  ) : null}
                                />
                                <DataField
                                  label="Meeting ID"
                                  value={log.meetingId ? (
                                    <code className="text-xs bg-background px-2 py-1 rounded break-all">
                                      {log.meetingId}
                                    </code>
                                  ) : null}
                                />
                                <DataField
                                  label="Parent Call ID"
                                  value={log.parentCallId ? (
                                    <code className="text-xs bg-background px-2 py-1 rounded break-all">
                                      {log.parentCallId}
                                    </code>
                                  ) : null}
                                />
                              </div>

                              {/* Dynamic Variables */}
                              {log.dynamicVariables && Object.keys(log.dynamicVariables).length > 0 && (
                                <div>
                                  <div className="text-xs font-semibold text-muted-foreground mb-2">Dynamic Variables</div>
                                  <pre className="text-xs bg-background p-2 rounded overflow-auto max-h-32">
                                    {JSON.stringify(log.dynamicVariables, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {/* Webhook Data */}
                              {log.webhookData && Object.keys(log.webhookData).length > 0 && (
                                <div>
                                  <div className="text-xs font-semibold text-muted-foreground mb-2">Webhook Data</div>
                                  <pre className="text-xs bg-background p-2 rounded overflow-auto max-h-32">
                                    {JSON.stringify(log.webhookData, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {/* Audit Info */}
                              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">Created At</div>
                                  <div className="text-xs font-mono">{formatTimestamp(log.createdAt)}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">Updated At</div>
                                  <div className="text-xs font-mono">{formatTimestamp(log.updatedAt)}</div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Page {page + 1} of {Math.ceil(total / limit)}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={(page + 1) * limit >= total}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CallsLog;

