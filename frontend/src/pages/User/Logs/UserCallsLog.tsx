/**
 * User Calls Log - Shows only current user's calls
 * Reuses admin CallsLog component with user filtering
 */

import { Phone, Filter, Clock, Building2, Calendar, AlertCircle, CheckCircle2, XCircle, ChevronDown, ChevronUp, MessageSquare, RotateCcw } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import * as loggingService from '../../../services/loggingService';

const UserCallsLog: React.FC = () => {
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
      const response = await loggingService.getUserCallLogs({
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
                My Call Logs
              </CardTitle>
              <CardDescription>
                {total} total calls • Showing {logs.length} of {total}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
                <Filter className="w-4 h-4 mr-2" />
                Refresh
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
                            </div>

                            {/* Primary Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                              <AlertCircle className="w-4 h-4 flex-shrink-0" />
                              <span className="text-sm font-medium">Failure Reason:</span>
                              <span className="text-sm">{log.failureReason}</span>
                            </div>
                          </div>
                        )}

                        {/* Expand for more details */}
                        {log.conversationId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="w-full"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-4 h-4 mr-2" />
                                Show Less
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4 mr-2" />
                                Show More Details
                              </>
                            )}
                          </Button>
                        )}

                        {/* Expanded Technical Details */}
                        {isExpanded && (
                          <div className="space-y-3 pt-3 border-t">
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Technical Details
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                              {log.conversationId && (
                                <DataField
                                  label="Conversation ID"
                                  value={
                                    <code className="text-xs bg-muted px-2 py-1 rounded">
                                      {log.conversationId}
                                    </code>
                                  }
                                  icon={MessageSquare}
                                />
                              )}
                              {log.callSid && (
                                <DataField
                                  label="Call SID"
                                  value={
                                    <code className="text-xs bg-muted px-2 py-1 rounded">{log.callSid}</code>
                                  }
                                />
                              )}
                              {log.agentId && (
                                <DataField
                                  label="Agent ID"
                                  value={
                                    <code className="text-xs bg-muted px-2 py-1 rounded">{log.agentId}</code>
                                  }
                                />
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Pagination */}
              {total > limit && (
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {page + 1} of {Math.ceil(total / limit)}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0 || loading}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => p + 1)}
                      disabled={page >= Math.ceil(total / limit) - 1 || loading}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserCallsLog;

