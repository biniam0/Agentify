/**
 * SMS Log Component - SMS notifications sent to deal owners
 * Enhanced UI with expandable details and better visual hierarchy
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import * as loggingService from '../../services/loggingService';

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
          color: 'bg-green-500/10 text-green-600 border-green-500/20', 
          icon: Send,
          label: 'Sent'
        };
      case 'DELIVERED': 
        return { 
          color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', 
          icon: CheckCircle2,
          label: 'Delivered'
        };
      case 'QUEUED': 
        return { 
          color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', 
          icon: Loader2,
          label: 'Queued'
        };
      case 'FAILED': 
        return { 
          color: 'bg-red-500/10 text-red-600 border-red-500/20', 
          icon: AlertCircle,
          label: 'Failed'
        };
      default: 
        return { 
          color: 'bg-gray-500/10 text-gray-600 border-gray-500/20', 
          icon: MessageSquare,
          label: status
        };
    }
  };

  const getTriggerColor = (trigger: string) => {
    switch (trigger) {
      case 'SCHEDULED': return 'bg-blue-500/10 text-blue-600';
      case 'MANUAL': return 'bg-purple-500/10 text-purple-600';
      case 'RETRY': return 'bg-orange-500/10 text-orange-600';
      default: return 'bg-gray-500/10 text-gray-600';
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

  const CopyButton = ({ text, fieldName }: { text: string; fieldName: string }) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        copyToClipboard(text, fieldName);
      }}
      className="ml-1 p-0.5 hover:bg-muted rounded opacity-50 hover:opacity-100 transition-opacity"
      title="Copy"
    >
      {copiedField === fieldName ? (
        <Check className="w-3 h-3 text-green-500" />
      ) : (
        <Copy className="w-3 h-3" />
      )}
    </button>
  );

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Header Row */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Status Icon */}
            <div className={`p-2 rounded-full ${statusConfig.color}`}>
              <StatusIcon className="w-4 h-4" />
            </div>
            
            {/* Recipient */}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{log.ownerName || log.userName || 'Unknown'}</span>
                <Badge className={getTriggerColor(log.triggerSource)} variant="secondary">
                  {log.triggerSource}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-3 h-3" />
                <code className="text-xs">{log.toPhone}</code>
                <CopyButton text={log.toPhone} fieldName="toPhone" />
              </div>
            </div>
          </div>

          {/* Timestamp & Status */}
          <div className="text-right">
            <Badge className={`${statusConfig.color} border`}>
              {statusConfig.label}
            </Badge>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
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
        <div className="p-4 border-b">
          <div 
            className="bg-muted/50 rounded-lg p-3 cursor-pointer"
            onClick={() => setShowFullMessage(!showFullMessage)}
          >
            <div className="flex items-start justify-between gap-2">
              <p className={`text-sm whitespace-pre-line ${showFullMessage ? '' : 'line-clamp-4'}`}>
                {log.messageBody}
              </p>
              {log.messageBody.length > 200 && (
                <Button variant="ghost" size="sm" className="shrink-0 h-6 px-2">
                  {showFullMessage ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Context Info */}
      <div className="p-4 grid grid-cols-2 gap-3 text-sm">
        {log.meetingTitle && (
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <div className="text-xs text-muted-foreground">Meeting</div>
              <div className="font-medium">{log.meetingTitle}</div>
            </div>
          </div>
        )}
        {log.dealName && (
          <div className="flex items-start gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <div className="text-xs text-muted-foreground">Deal</div>
              <div className="font-medium">{log.dealName}</div>
            </div>
          </div>
        )}
        {log.userEmail && (
          <div className="flex items-start gap-2">
            <User className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <div className="text-xs text-muted-foreground">User Email</div>
              <div className="font-medium">{log.userEmail}</div>
            </div>
          </div>
        )}
        {log.fromPhone && (
          <div className="flex items-start gap-2">
            <Phone className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <div className="text-xs text-muted-foreground">From</div>
              <code className="text-xs">{log.fromPhone}</code>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {log.errorMessage && (
        <div className="mx-4 mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-red-600">Error</div>
              <p className="text-xs text-red-600/80">{log.errorMessage}</p>
              {log.twilioErrorCode && (
                <code className="text-xs text-red-500 mt-1 block">
                  Error Code: {log.twilioErrorCode}
                </code>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expandable Technical Details */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <button className="w-full px-4 py-2 text-xs text-muted-foreground hover:bg-muted/50 flex items-center justify-center gap-1 border-t transition-colors">
            {isExpanded ? (
              <>
                <ChevronUp className="w-3 h-3" />
                Hide Technical Details
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                Show Technical Details
              </>
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-2 bg-muted/30 border-t">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground">Log ID:</span>
                <div className="flex items-center gap-1">
                  <code className="bg-muted px-1 rounded">{log.id}</code>
                  <CopyButton text={log.id} fieldName="id" />
                </div>
              </div>
              {log.messageSid && (
                <div>
                  <span className="text-muted-foreground">Twilio SID:</span>
                  <div className="flex items-center gap-1">
                    <code className="bg-muted px-1 rounded">{log.messageSid}</code>
                    <CopyButton text={log.messageSid} fieldName="messageSid" />
                  </div>
                </div>
              )}
              {log.userId && (
                <div>
                  <span className="text-muted-foreground">AgentX User ID:</span>
                  <div className="flex items-center gap-1">
                    <code className="bg-muted px-1 rounded">{log.userId}</code>
                    <CopyButton text={log.userId} fieldName="userId" />
                  </div>
                </div>
              )}
              {log.barrierxUserId && (
                <div>
                  <span className="text-muted-foreground">BarrierX User ID:</span>
                  <div className="flex items-center gap-1">
                    <code className="bg-muted px-1 rounded">{log.barrierxUserId}</code>
                    <CopyButton text={log.barrierxUserId} fieldName="barrierxUserId" />
                  </div>
                </div>
              )}
              {log.hubspotOwnerId && (
                <div>
                  <span className="text-muted-foreground">HubSpot Owner ID:</span>
                  <div className="flex items-center gap-1">
                    <code className="bg-muted px-1 rounded">{log.hubspotOwnerId}</code>
                    <CopyButton text={log.hubspotOwnerId} fieldName="hubspotOwnerId" />
                  </div>
                </div>
              )}
              {log.meetingId && (
                <div>
                  <span className="text-muted-foreground">Meeting ID:</span>
                  <div className="flex items-center gap-1">
                    <code className="bg-muted px-1 rounded">{log.meetingId}</code>
                    <CopyButton text={log.meetingId} fieldName="meetingId" />
                  </div>
                </div>
              )}
              {log.dealId && (
                <div>
                  <span className="text-muted-foreground">Deal ID:</span>
                  <div className="flex items-center gap-1">
                    <code className="bg-muted px-1 rounded">{log.dealId}</code>
                    <CopyButton text={log.dealId} fieldName="dealId" />
                  </div>
                </div>
              )}
              <div className="col-span-2">
                <span className="text-muted-foreground">Sent At:</span>
                <div className="font-mono">{new Date(log.createdAt).toLocaleString()}</div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

// Main SMS Log Component
const SmsLog: React.FC = () => {
  const [logs, setLogs] = useState<loggingService.SmsLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const limit = 20;

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

  // Stats calculation
  const stats = {
    sent: logs.filter(l => l.status === 'SENT').length,
    delivered: logs.filter(l => l.status === 'DELIVERED').length,
    failed: logs.filter(l => l.status === 'FAILED').length,
    queued: logs.filter(l => l.status === 'QUEUED').length,
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
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48 w-full rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      {logs.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/10">
                <Send className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.sent}</div>
                <div className="text-xs text-muted-foreground">Sent</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-500/10">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.delivered}</div>
                <div className="text-xs text-muted-foreground">Delivered</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-500/10">
                <AlertCircle className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.failed}</div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-yellow-500/10">
                <Loader2 className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.queued}</div>
                <div className="text-xs text-muted-foreground">Queued</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                SMS Notification Logs
              </CardTitle>
              <CardDescription>
                {total} total SMS notifications
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
              <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No SMS notifications found</p>
              <p className="text-sm text-muted-foreground mt-1">
                SMS notifications sent to deal owners will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <SmsLogCard key={log.id} log={log} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Page {page + 1} of {Math.ceil(total / limit)} • Showing {logs.length} of {total}
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

export default SmsLog;
