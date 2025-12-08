/**
 * Errors Log Component - System errors with severity levels
 */

import { AlertCircle, AlertTriangle, Info, XCircle, CheckCircle2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import * as loggingService from '../../services/loggingService';

const ErrorsLog: React.FC = () => {
  const [logs, setLogs] = useState<loggingService.ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [showResolved, setShowResolved] = useState(false);
  const limit = 20;

  useEffect(() => {
    fetchLogs();
  }, [page, showResolved]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await loggingService.getErrorLogs({
        isResolved: showResolved ? undefined : false,
        limit,
        offset: page * limit,
      });
      
      if (response.success) {
        setLogs(response.data);
        setTotal(response.total);
      }
    } catch (error: any) {
      console.error('Failed to fetch error logs:', error);
      toast.error(error.response?.data?.error || 'Failed to load error logs');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'HIGH': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'MEDIUM': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'LOW': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return <XCircle className="w-4 h-4" />;
      case 'HIGH': return <AlertCircle className="w-4 h-4" />;
      case 'MEDIUM': return <AlertTriangle className="w-4 h-4" />;
      case 'LOW': return <Info className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getErrorTypeColor = (type: string) => {
    switch (type) {
      case 'API_ERROR': return 'bg-purple-500/10 text-purple-600';
      case 'DATABASE_ERROR': return 'bg-red-500/10 text-red-600';
      case 'EXTERNAL_SERVICE': return 'bg-blue-500/10 text-blue-600';
      case 'VALIDATION_ERROR': return 'bg-yellow-500/10 text-yellow-600';
      case 'AUTHENTICATION_ERROR': return 'bg-orange-500/10 text-orange-600';
      case 'AUTHORIZATION_ERROR': return 'bg-pink-500/10 text-pink-600';
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
                <Skeleton key={i} className="h-32 w-full" />
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
              <CardTitle>Error Logs</CardTitle>
              <CardDescription>
                {total} {showResolved ? 'total' : 'unresolved'} errors • Showing {logs.length} of {total}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={showResolved ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setShowResolved(!showResolved);
                  setPage(0);
                }}
              >
                {showResolved ? 'Hide' : 'Show'} Resolved
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-4" />
              <p className="text-muted-foreground">No {showResolved ? '' : 'unresolved '}errors found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {showResolved ? 'All errors have been resolved' : 'System is running smoothly'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 rounded-lg border-2 bg-card hover:bg-muted/50 transition-colors"
                  style={{ borderLeftWidth: '4px' }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge className={getSeverityColor(log.severity)} variant="outline">
                        {getSeverityIcon(log.severity)}
                        <span className="ml-1">{log.severity}</span>
                      </Badge>
                      <Badge className={getErrorTypeColor(log.errorType)}>
                        {log.errorType.replace('_', ' ')}
                      </Badge>
                      {log.isResolved && (
                        <Badge className="bg-green-500/10 text-green-600">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          RESOLVED
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="text-sm font-medium mb-1">
                      <span className="text-muted-foreground">Source:</span>{' '}
                      <code className="text-xs bg-muted px-2 py-1 rounded">{log.source}</code>
                    </div>
                    <p className="text-sm text-foreground mt-2">{log.message}</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs mb-3">
                    {log.endpoint && (
                      <div>
                        <span className="text-muted-foreground">Endpoint:</span>{' '}
                        <code className="bg-muted px-1 rounded">{log.endpoint}</code>
                      </div>
                    )}
                    {log.method && (
                      <div>
                        <span className="text-muted-foreground">Method:</span>{' '}
                        <Badge variant="outline" className="text-xs">{log.method}</Badge>
                      </div>
                    )}
                    {log.code && (
                      <div>
                        <span className="text-muted-foreground">Code:</span>{' '}
                        <Badge variant="outline" className="text-xs">{log.code}</Badge>
                      </div>
                    )}
                  </div>

                  {log.stack && (
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                        View stack trace
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-[10px] overflow-x-auto max-h-40 overflow-y-auto">
                        {log.stack}
                      </pre>
                    </details>
                  )}

                  {log.isResolved && log.resolution && (
                    <div className="mt-3 p-2 bg-green-500/10 border border-green-500/20 rounded">
                      <p className="text-xs text-green-600 font-medium mb-1">Resolution:</p>
                      <p className="text-xs text-green-600">{log.resolution}</p>
                      {log.resolvedBy && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Resolved by {log.resolvedBy} on {new Date(log.resolvedAt!).toLocaleString()}
                        </p>
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

export default ErrorsLog;

