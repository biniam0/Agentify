/**
 * User Logs Component - Professional view of user-specific logs
 * Displays Calls, Activity, and CRM Actions with admin-level polish
 */

import React, { useState, useEffect } from 'react';
import {
  Phone,
  Activity,
  FileEdit,
  X,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  Building2,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCcw,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import * as loggingService from '../services/loggingService';
import { toast } from 'sonner';

interface UserLogsProps {
  onClose: () => void;
}

type TabType = 'calls' | 'activity' | 'crm-actions';

const UserLogs: React.FC<UserLogsProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('calls');
  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [crmActionLogs, setCrmActionLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const limit = 10;

  useEffect(() => {
    fetchLogs();
  }, [activeTab, page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      if (activeTab === 'calls') {
        const result = await loggingService.getUserCallLogs({ limit, offset: page * limit });
        setCallLogs(result.data || []);
        setTotal(result.total || 0);
      } else if (activeTab === 'activity') {
        const result = await loggingService.getUserActivityLogs({ limit, offset: page * limit });
        setActivityLogs(result.data || []);
        setTotal(result.total || 0);
      } else if (activeTab === 'crm-actions') {
        const result = await loggingService.getUserCrmActionLogs({ limit, offset: page * limit });
        setCrmActionLogs(result.data || []);
        setTotal(result.total || 0);
      }
    } catch (error: any) {
      console.error('Failed to fetch logs:', error);
      toast.error('Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  // Color helpers
  const getCallTypeColor = (type: string) => {
    return type === 'PRE_CALL'
      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
      : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS':
      case 'COMPLETED':
      case 'ANSWERED':
        return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800';
      case 'FAILED':
      case 'NO_ANSWER':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800';
      case 'BUSY':
        return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800';
      case 'PENDING':
        return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
      case 'INITIATED':
      case 'RINGING':
      case 'RUNNING':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800';
    }
  };

  const getTriggerColor = (source: string) => {
    switch (source) {
      case 'MANUAL':
        return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'SCHEDULED':
        return 'bg-green-500/10 text-green-600 border-green-200';
      case 'RETRY':
        return 'bg-orange-500/10 text-orange-600 border-orange-200';
      case 'WEBHOOK':
        return 'bg-purple-500/10 text-purple-600 border-purple-200';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS':
      case 'COMPLETED':
      case 'ANSWERED':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'FAILED':
      case 'NO_ANSWER':
      case 'BUSY':
        return <XCircle className="w-4 h-4" />;
      case 'INITIATED':
      case 'RINGING':
      case 'RUNNING':
      case 'PENDING':
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  // Formatting helpers
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
      second: '2-digit',
    });
  };

  const formatActivityType = (type: string) => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatActionType = (type: string) => {
    return type.charAt(0) + type.slice(1).toLowerCase();
  };

  // Data field component
  const DataField = ({
    label,
    value,
    icon: Icon,
    className = '',
  }: {
    label: string;
    value: any;
    icon?: any;
    className?: string;
  }) => {
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

  // Pagination controls
  const totalPages = Math.ceil(total / limit);
  const canGoPrev = page > 0;
  const canGoNext = page < totalPages - 1;

  const PaginationControls = () => (
    <div className="flex items-center justify-between pt-4 border-t">
      <div className="text-sm text-muted-foreground">
        Showing {page * limit + 1} - {Math.min((page + 1) * limit, total)} of {total}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(page - 1)}
          disabled={!canGoPrev || loading}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </Button>
        <div className="text-sm font-medium px-3">
          Page {page + 1} of {totalPages || 1}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(page + 1)}
          disabled={!canGoNext || loading}
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between border-b flex-shrink-0">
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Activity className="w-6 h-6" />
              My Activity Logs
            </CardTitle>
            <CardDescription>
              {total} total {activeTab === 'calls' ? 'calls' : activeTab === 'activity' ? 'activities' : 'CRM actions'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={fetchLogs} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4 border-b flex-shrink-0">
          <Button
            variant={activeTab === 'calls' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              setActiveTab('calls');
              setPage(0);
              setExpandedLogId(null);
            }}
            className="rounded-b-none"
          >
            <Phone className="h-4 w-4 mr-2" />
            Calls
          </Button>
          <Button
            variant={activeTab === 'activity' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              setActiveTab('activity');
              setPage(0);
              setExpandedLogId(null);
            }}
            className="rounded-b-none"
          >
            <Activity className="h-4 w-4 mr-2" />
            Activity
          </Button>
          <Button
            variant={activeTab === 'crm-actions' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              setActiveTab('crm-actions');
              setPage(0);
              setExpandedLogId(null);
            }}
            className="rounded-b-none"
          >
            <FileEdit className="h-4 w-4 mr-2" />
            CRM Actions
          </Button>
        </div>

        {/* Content */}
        <CardContent className="flex-1 overflow-auto p-6">
          {loading && (callLogs.length === 0 && activityLogs.length === 0 && crmActionLogs.length === 0) ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : (
            <>
              {/* Calls Tab */}
              {activeTab === 'calls' && (
                <>
                  {callLogs.length === 0 ? (
                    <div className="text-center py-12">
                      <Phone className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground font-medium">No call logs found</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Call logs will appear here once calls are triggered
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {callLogs.map((log) => {
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
                                      <Badge
                                        className={`${getStatusColor(log.status)} px-3 py-1 flex items-center gap-1`}
                                      >
                                        {getStatusIcon(log.status)}
                                        {log.status}
                                      </Badge>
                                      <Badge
                                        className={`${getTriggerColor(log.triggerSource)} px-3 py-1`}
                                        variant="outline"
                                      >
                                        {log.triggerSource}
                                      </Badge>
                                      {log.retryAttempt > 1 && (
                                        <Badge variant="outline" className="px-3 py-1 border-orange-300">
                                          <RotateCcw className="w-3 h-3 mr-1" />
                                          Retry #{log.retryAttempt}/{log.maxRetries}
                                        </Badge>
                                      )}
                                    </div>

                                    {/* Primary Info */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      <DataField label="Deal" value={log.dealName} icon={Building2} />
                                      <DataField label="Meeting" value={log.meetingTitle} icon={Calendar} />
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
                                {/* Contact Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <DataField
                                    label="Phone Number"
                                    value={
                                      log.phoneNumber ? (
                                        <code className="text-xs bg-muted px-2 py-1 rounded">
                                          {log.phoneNumber}
                                        </code>
                                      ) : null
                                    }
                                    icon={Phone}
                                  />
                                  <DataField label="Owner" value={log.ownerName} icon={User} />
                                </div>

                                {/* Timestamps */}
                                <div className="border rounded-lg p-3 bg-muted/20">
                                  <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                                    Timeline
                                  </div>
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

                                {/* Failure Reason */}
                                {log.failureReason && (
                                  <div className="border border-red-200 rounded-lg p-3 bg-red-50/50 dark:bg-red-950/20">
                                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                      <span className="text-sm font-medium">Failure Reason:</span>
                                      <span className="text-sm">{log.failureReason}</span>
                                    </div>
                                  </div>
                                )}

                                {/* Expand for more */}
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

                                {/* Expanded Details */}
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
                      {total > limit && <PaginationControls />}
                    </div>
                  )}
                </>
              )}

              {/* Activity Tab */}
              {activeTab === 'activity' && (
                <>
                  {activityLogs.length === 0 ? (
                    <div className="text-center py-12">
                      <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground font-medium">No activity logs found</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Activity logs will appear here once you perform actions
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activityLogs.map((log) => (
                        <Card key={log.id} className="border-2 hover:border-primary/50 transition-all duration-200">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-3">
                                {/* Status Badges */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge className={`${getStatusColor(log.status)} px-3 py-1 flex items-center gap-1`}>
                                    {getStatusIcon(log.status)}
                                    {log.status}
                                  </Badge>
                                  <Badge variant="outline" className="px-3 py-1">
                                    {formatActivityType(log.activityType)}
                                  </Badge>
                                </div>

                                {/* Content */}
                                <div className="space-y-2">
                                  {log.meetingTitle && (
                                    <DataField label="Meeting" value={log.meetingTitle} icon={Calendar} />
                                  )}
                                  {log.dealName && <DataField label="Deal" value={log.dealName} icon={Building2} />}
                                  {log.duration && (
                                    <DataField
                                      label="Duration"
                                      value={`${(log.duration / 1000).toFixed(2)}s`}
                                      icon={Clock}
                                    />
                                  )}
                                </div>

                                {/* Error Message */}
                                {log.errorMessage && (
                                  <div className="border border-red-200 rounded-lg p-2 bg-red-50/50 dark:bg-red-950/20">
                                    <div className="flex items-start gap-2 text-red-600 dark:text-red-400">
                                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                      <span className="text-xs">{log.errorMessage}</span>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Timestamp */}
                              <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                                {formatTimestamp(log.createdAt)}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {total > limit && <PaginationControls />}
                    </div>
                  )}
                </>
              )}

              {/* CRM Actions Tab */}
              {activeTab === 'crm-actions' && (
                <>
                  {crmActionLogs.length === 0 ? (
                    <div className="text-center py-12">
                      <FileEdit className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground font-medium">No CRM action logs found</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        CRM actions will appear here once created by AI during calls
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {crmActionLogs.map((log) => (
                        <Card key={log.id} className="border-2 hover:border-primary/50 transition-all duration-200">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-3">
                                {/* Status Badges */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge className={`${getStatusColor(log.status)} px-3 py-1 flex items-center gap-1`}>
                                    {getStatusIcon(log.status)}
                                    {log.status}
                                  </Badge>
                                  <Badge variant="outline" className="px-3 py-1">
                                    {formatActionType(log.actionType)}
                                  </Badge>
                                </div>

                                {/* Content */}
                                <div className="space-y-2">
                                  {log.title && (
                                    <div>
                                      <div className="text-xs text-muted-foreground mb-1">Title</div>
                                      <div className="text-sm font-medium">{log.title}</div>
                                    </div>
                                  )}
                                  {log.body && (
                                    <div>
                                      <div className="text-xs text-muted-foreground mb-1">Content</div>
                                      <div className="text-sm text-muted-foreground line-clamp-2 bg-muted/30 p-2 rounded">
                                        {log.body}
                                      </div>
                                    </div>
                                  )}
                                  {log.conversationId && (
                                    <DataField
                                      label="Conversation ID"
                                      value={
                                        <code className="text-xs bg-muted px-2 py-1 rounded">
                                          {log.conversationId.substring(0, 16)}...
                                        </code>
                                      }
                                      icon={MessageSquare}
                                    />
                                  )}
                                </div>

                                {/* Error Message */}
                                {log.errorMessage && (
                                  <div className="border border-red-200 rounded-lg p-2 bg-red-50/50 dark:bg-red-950/20">
                                    <div className="flex items-start gap-2 text-red-600 dark:text-red-400">
                                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                      <span className="text-xs">{log.errorMessage}</span>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Timestamp */}
                              <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                                {formatTimestamp(log.createdAt)}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {total > limit && <PaginationControls />}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserLogs;
