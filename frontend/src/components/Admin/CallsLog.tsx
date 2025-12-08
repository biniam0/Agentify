/**
 * Calls Log Component - Display call logs with filtering
 */

import { Phone, Filter, Download } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import * as loggingService from '../../services/loggingService';

const CallsLog: React.FC = () => {
  const [logs, setLogs] = useState<loggingService.CallLog[]>([]);
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
      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
      : 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-500/10 text-green-600 dark:text-green-400';
      case 'FAILED': case 'NO_ANSWER': return 'bg-red-500/10 text-red-600 dark:text-red-400';
      case 'INITIATED': case 'RINGING': return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
      default: return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
    }
  };

  const getTriggerColor = (source: string) => {
    switch (source) {
      case 'MANUAL': return 'bg-blue-500/10 text-blue-600';
      case 'SCHEDULED': return 'bg-green-500/10 text-green-600';
      case 'RETRY': return 'bg-orange-500/10 text-orange-600';
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
              <CardTitle>Call Logs</CardTitle>
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
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getCallTypeColor(log.callType)}>
                        {log.callType.replace('_', '-')}
                      </Badge>
                      <Badge className={getStatusColor(log.status)} variant="secondary">
                        {log.status}
                      </Badge>
                      <Badge className={getTriggerColor(log.triggerSource)} variant="secondary">
                        {log.triggerSource}
                      </Badge>
                      {log.retryAttempt > 1 && (
                        <Badge variant="outline" className="text-xs">
                          Retry #{log.retryAttempt}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">User:</span>{' '}
                        <span className="font-medium">{log.userName}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Deal:</span>{' '}
                        <span className="font-medium">{log.dealName}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Phone:</span>{' '}
                        <span className="font-mono text-xs">{log.phoneNumber}</span>
                      </div>
                      {log.duration && (
                        <div>
                          <span className="text-muted-foreground">Duration:</span>{' '}
                          <span className="font-medium">{log.duration}s</span>
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {new Date(log.initiatedAt).toLocaleString()}
                      {log.conversationId && (
                        <span className="ml-4">
                          ID: <code className="text-[10px]">{log.conversationId.substring(0, 8)}...</code>
                        </span>
                      )}
                    </div>
                  </div>
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

export default CallsLog;

