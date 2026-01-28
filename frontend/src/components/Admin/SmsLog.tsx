/**
 * SMS Log Component - SMS notifications sent to deal owners
 */

import { MessageSquare, Filter, Download } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import * as loggingService from '../../services/loggingService';

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SENT': return 'bg-green-500/10 text-green-600';
      case 'DELIVERED': return 'bg-emerald-500/10 text-emerald-600';
      case 'QUEUED': return 'bg-yellow-500/10 text-yellow-600';
      case 'FAILED': return 'bg-red-500/10 text-red-600';
      default: return 'bg-gray-500/10 text-gray-600';
    }
  };

  const getTriggerColor = (trigger: string) => {
    switch (trigger) {
      case 'SCHEDULED': return 'bg-blue-500/10 text-blue-600';
      case 'MANUAL': return 'bg-purple-500/10 text-purple-600';
      default: return 'bg-gray-500/10 text-gray-600';
    }
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
                <Skeleton key={i} className="h-24 w-full" />
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
                <MessageSquare className="w-5 h-5" />
                SMS Notification Logs
              </CardTitle>
              <CardDescription>
                {total} total SMS • Showing {logs.length} of {total}
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
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(log.status)}>
                        {log.status}
                      </Badge>
                      <Badge className={getTriggerColor(log.triggerSource)} variant="secondary">
                        {log.triggerSource}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </div>
                  </div>

                  {/* Recipient Info */}
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{log.ownerName || log.userName || 'Unknown'}</span>
                      <span className="text-muted-foreground text-sm">→</span>
                      <code className="text-xs bg-muted px-1 rounded">{log.toPhone}</code>
                    </div>
                    {log.userEmail && (
                      <div className="text-xs text-muted-foreground">{log.userEmail}</div>
                    )}
                  </div>

                  {/* Message Preview */}
                  {log.messageBody && (
                    <div className="mb-3 p-2 bg-muted/50 rounded text-xs">
                      <p className="line-clamp-3 text-muted-foreground whitespace-pre-line">{log.messageBody}</p>
                    </div>
                  )}
                  
                  {/* Context Info */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {log.meetingTitle && (
                      <div>
                        <span className="text-muted-foreground">Meeting:</span>{' '}
                        <span className="font-medium">{log.meetingTitle}</span>
                      </div>
                    )}
                    {log.dealName && (
                      <div>
                        <span className="text-muted-foreground">Deal:</span>{' '}
                        <span className="font-medium">{log.dealName}</span>
                      </div>
                    )}
                    {log.messageSid && (
                      <div>
                        <span className="text-muted-foreground">Twilio SID:</span>{' '}
                        <code className="text-xs bg-muted px-1 rounded">{log.messageSid.substring(0, 16)}...</code>
                      </div>
                    )}
                    {log.hubspotOwnerId && (
                      <div>
                        <span className="text-muted-foreground">HubSpot Owner:</span>{' '}
                        <code className="text-xs bg-muted px-1 rounded">{log.hubspotOwnerId}</code>
                      </div>
                    )}
                  </div>

                  {/* Error Message */}
                  {log.errorMessage && (
                    <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-600">
                      <strong>Error:</strong> {log.errorMessage}
                      {log.twilioErrorCode && (
                        <span className="ml-2">(Code: {log.twilioErrorCode})</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
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

export default SmsLog;
