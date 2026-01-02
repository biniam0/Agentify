/**
 * User Logs Overview - Dashboard with stats and recent activity
 */

import { Activity, Phone, TrendingUp, FileEdit } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Skeleton } from '../../../components/ui/skeleton';
import * as loggingService from '../../../services/loggingService';

const UserLogsOverview: React.FC = () => {
  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [crmLogs, setCrmLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [callsRes, activityRes, crmRes] = await Promise.all([
        loggingService.getUserCallLogs({ limit: 5 }),
        loggingService.getUserActivityLogs({ limit: 5 }),
        loggingService.getUserCrmActionLogs({ limit: 5 }),
      ]);

      setCallLogs(callsRes.data || []);
      setActivityLogs(activityRes.data || []);
      setCrmLogs(crmRes.data || []);
    } catch (error: any) {
      console.error('Failed to fetch overview data:', error);
      toast.error('Failed to load overview');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'SUCCESS':
      case 'COMPLETED':
      case 'ANSWERED':
        return 'bg-green-500/10 text-green-600 dark:text-green-400';
      case 'FAILED':
      case 'NO_ANSWER':
        return 'bg-red-500/10 text-red-600 dark:text-red-400';
      case 'PENDING':
        return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
      case 'RUNNING':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      default:
        return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Calculate stats
  const totalCalls = callLogs.length;
  const successfulCalls = callLogs.filter(
    (log) => log.status === 'COMPLETED' || log.status === 'ANSWERED'
  ).length;
  const successRate = totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Overview</h1>
          <p className="text-muted-foreground">Your activity summary and recent logs</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-2">Overview</h1>
        <p className="text-muted-foreground">Your activity summary and recent logs</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Total Calls</CardDescription>
              <Phone className="w-4 h-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalCalls}</div>
            <p className="text-xs text-muted-foreground mt-1">Recent activity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Success Rate</CardDescription>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{successRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {successfulCalls} of {totalCalls} calls
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Activities</CardDescription>
              <Activity className="w-4 h-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activityLogs.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Recent actions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>CRM Actions</CardDescription>
              <FileEdit className="w-4 h-4 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{crmLogs.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Created by AI</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Calls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Recent Calls
            </CardTitle>
            <CardDescription>Your latest call activity</CardDescription>
          </CardHeader>
          <CardContent>
            {callLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No recent calls</p>
            ) : (
              <div className="space-y-3">
                {callLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{log.meetingTitle}</p>
                      <p className="text-xs text-muted-foreground truncate">{log.dealName}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-3">
                      <Badge className={getStatusColor(log.status)} variant="outline">
                        {log.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(log.initiatedAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent CRM Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileEdit className="w-5 h-5" />
              Recent CRM Actions
            </CardTitle>
            <CardDescription>AI-created notes, tasks, and meetings</CardDescription>
          </CardHeader>
          <CardContent>
            {crmLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No recent CRM actions</p>
            ) : (
              <div className="space-y-3">
                {crmLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{log.title || log.actionType}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {log.body?.substring(0, 50)}...
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-3">
                      <Badge className={getStatusColor(log.status)} variant="outline">
                        {log.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserLogsOverview;

