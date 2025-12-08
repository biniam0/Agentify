/**
 * Scheduler Log Component - Automated job runs
 */

import { Timer, TrendingUp, Users, Phone, AlertCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import * as loggingService from '../../services/loggingService';

const SchedulerLog: React.FC = () => {
  const [logs, setLogs] = useState<loggingService.SchedulerLog[]>([]);
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
      const response = await loggingService.getSchedulerLogs({
        limit,
        offset: page * limit,
      });
      
      if (response.success) {
        setLogs(response.data);
        setTotal(response.total);
      }
    } catch (error: any) {
      console.error('Failed to fetch scheduler logs:', error);
      toast.error(error.response?.data?.error || 'Failed to load scheduler logs');
    } finally {
      setLoading(false);
    }
  };

  const getJobTypeColor = (type: string) => {
    switch (type) {
      case 'MEETING_AUTOMATION': return 'bg-blue-500/10 text-blue-600';
      case 'CLEANUP': return 'bg-purple-500/10 text-purple-600';
      case 'RETRY': return 'bg-orange-500/10 text-orange-600';
      case 'HEALTH_CHECK': return 'bg-green-500/10 text-green-600';
      default: return 'bg-gray-500/10 text-gray-600';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS': return 'bg-green-500/10 text-green-600';
      case 'FAILED': return 'bg-red-500/10 text-red-600';
      case 'RUNNING': return 'bg-blue-500/10 text-blue-600';
      default: return 'bg-gray-500/10 text-gray-600';
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
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
                <Skeleton key={i} className="h-28 w-full" />
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
              <CardTitle>Scheduler Logs</CardTitle>
              <CardDescription>
                {total} total runs • Showing {logs.length} of {total}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <Timer className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No scheduler logs found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Automation job runs will appear here
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
                      <Badge className={getJobTypeColor(log.jobType)}>
                        {log.jobType.replace('_', ' ')}
                      </Badge>
                      <Badge className={getStatusColor(log.status)} variant="secondary">
                        {log.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(log.startedAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Users</p>
                        <p className="font-semibold">{log.totalUsers || 0}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-blue-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Pre-Calls</p>
                        <p className="font-semibold">{log.preCallsTriggered || 0}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-purple-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Post-Calls</p>
                        <p className="font-semibold">{log.postCallsTriggered || 0}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Timer className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Duration</p>
                        <p className="font-semibold">{formatDuration(log.duration)}</p>
                      </div>
                    </div>
                  </div>

                  {log.errorsCount && log.errorsCount > 0 && (
                    <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <span className="text-sm text-red-600">
                        {log.errorsCount} error{log.errorsCount > 1 ? 's' : ''} occurred
                      </span>
                    </div>
                  )}

                  {log.errorMessage && (
                    <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-600">
                      Error: {log.errorMessage}
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

export default SchedulerLog;

