/**
 * User Activity Log - Shows only current user's activities
 */

import { Activity, Clock, Building2, Calendar, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import * as loggingService from '../../../services/loggingService';

const UserActivityLog: React.FC = () => {
  const [logs, setLogs] = useState<loggingService.ActivityLog[]>([]);
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
      const response = await loggingService.getUserActivityLogs({
        limit,
        offset: page * limit,
      });
      
      if (response.success) {
        setLogs(response.data);
        setTotal(response.total);
      }
    } catch (error: any) {
      console.error('Failed to fetch activity logs:', error);
      toast.error('Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS': return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-200';
      case 'FAILED': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200';
      case 'PENDING': return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-200';
      case 'RUNNING': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200';
      default: return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS': return <CheckCircle2 className="w-4 h-4" />;
      case 'FAILED': return <XCircle className="w-4 h-4" />;
      case 'PENDING': case 'RUNNING': return <Clock className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const formatActivityType = (type: string) => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
                <Activity className="w-5 h-5" />
                My Activity Logs
              </CardTitle>
              <CardDescription>
                {total} total activities • Showing {logs.length} of {total}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No activity logs found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <Card key={log.id} className="border-2 hover:border-primary/50 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
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

                        {/* Details */}
                        <div className="space-y-1">
                          {log.meetingTitle && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{log.meetingTitle}</span>
                            </div>
                          )}
                          {log.dealName && (
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">{log.dealName}</span>
                            </div>
                          )}
                          {log.duration && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                Duration: {(log.duration / 1000).toFixed(2)}s
                              </span>
                            </div>
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

export default UserActivityLog;

