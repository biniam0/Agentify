/**
 * Webhooks Log Component - Display webhook history
 */

import { Webhook, Search, Filter, Download, CheckCircle2, XCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import * as loggingService from '../../services/loggingService';

const WebhooksLog: React.FC = () => {
  const [logs, setLogs] = useState<loggingService.WebhookLog[]>([]);
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
      const response = await loggingService.getWebhookLogs({
        limit,
        offset: page * limit,
      });
      
      if (response.success) {
        setLogs(response.data);
        setTotal(response.total);
      }
    } catch (error: any) {
      console.error('Failed to fetch webhook logs:', error);
      toast.error(error.response?.data?.error || 'Failed to load webhook logs');
    } finally {
      setLoading(false);
    }
  };

  const getWebhookTypeColor = (type: string) => {
    switch (type) {
      case 'ELEVENLABS_CALL': return 'bg-purple-500/10 text-purple-600';
      case 'ELEVENLABS_TOOL': return 'bg-blue-500/10 text-blue-600';
      case 'BARRIERX': return 'bg-green-500/10 text-green-600';
      default: return 'bg-gray-500/10 text-gray-600';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS': return 'bg-green-500/10 text-green-600';
      case 'FAILED': return 'bg-red-500/10 text-red-600';
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
                <Skeleton key={i} className="h-20 w-full" />
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
              <CardTitle>Webhook Logs</CardTitle>
              <CardDescription>
                {total} total webhooks • Showing {logs.length} of {total}
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
              <Webhook className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No webhook logs found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Webhooks will appear here when received
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getWebhookTypeColor(log.webhookType)}>
                        {log.webhookType.replace('_', ' ')}
                      </Badge>
                      <Badge className={getStatusColor(log.status)} variant="secondary">
                        {log.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {log.eventType}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {log.conversationId && (
                        <div>
                          <span className="text-muted-foreground">Conversation:</span>{' '}
                          <code className="text-xs bg-muted px-1 rounded">{log.conversationId.substring(0, 12)}...</code>
                        </div>
                      )}
                      {log.agentId && (
                        <div>
                          <span className="text-muted-foreground">Agent:</span>{' '}
                          <code className="text-xs bg-muted px-1 rounded">{log.agentId.substring(0, 12)}...</code>
                        </div>
                      )}
                      {log.processingTime && (
                        <div>
                          <span className="text-muted-foreground">Processing:</span>{' '}
                          <span className="font-medium">{log.processingTime}ms</span>
                        </div>
                      )}
                      {log.signatureValid !== null && log.signatureValid !== undefined && (
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">Signature:</span>{' '}
                          {log.signatureValid ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
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

export default WebhooksLog;

