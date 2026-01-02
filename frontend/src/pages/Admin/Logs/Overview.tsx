/**
 * Logs Overview - Dashboard with key metrics
 */

import { Activity, AlertCircle, Clock, Phone, TrendingUp } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Skeleton } from '../../../components/ui/skeleton';
import * as loggingService from '../../../services/loggingService';

const Overview: React.FC = () => {
  const [stats, setStats] = useState<loggingService.DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<loggingService.CallAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, analyticsRes] = await Promise.all([
        loggingService.getDashboardStats(),
        loggingService.getCallAnalytics(undefined, 7),
      ]);
      
      if (statsRes.success) {
        setStats(statsRes.data);
      }
      if (analyticsRes.success) {
        setAnalytics(analyticsRes.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error(error.response?.data?.error || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const formatActivityType = (type: string): string => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'SUCCESS': return 'bg-green-500/10 text-green-600 dark:text-green-400';
      case 'FAILED': return 'bg-red-500/10 text-red-600 dark:text-red-400';
      case 'PENDING': return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
      case 'RUNNING': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      default: return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Logs Overview</h1>
          <p className="text-gray-600 dark:text-gray-400">System activity and performance metrics</p>
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
        <h1 className="text-2xl font-bold mb-2">Logs Overview</h1>
        <p className="text-gray-600 dark:text-gray-400">System activity and performance metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Today's Calls</CardDescription>
              <Phone className="w-4 h-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalCallsToday || 0}</div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Pre + Post meeting calls
            </p>
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
            <div className="text-3xl font-bold">{stats?.successRate.toFixed(1) || 0}%</div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Completed calls
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Critical Errors</CardDescription>
              <AlertCircle className="w-4 h-4 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">
              {stats?.criticalErrors || 0}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Unresolved issues
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Total Calls (7d)</CardDescription>
              <Activity className="w-4 h-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics?.total || 0}</div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Last 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Call Analytics */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Call Distribution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Pre-calls</span>
                <span className="font-semibold">{analytics.byType.preCalls}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Post-calls</span>
                <span className="font-semibold">{analytics.byType.postCalls}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Trigger Sources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Manual</span>
                <span className="font-semibold">{analytics.byTrigger.manual}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Scheduled</span>
                <span className="font-semibold">{analytics.byTrigger.scheduled}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Retry</span>
                <span className="font-semibold">{analytics.byTrigger.retry}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Call Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-600 dark:text-green-400">Completed</span>
                <span className="font-semibold">{analytics.byStatus.completed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-red-600 dark:text-red-400">Failed</span>
                <span className="font-semibold">{analytics.byStatus.failed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-yellow-600 dark:text-yellow-400">Pending</span>
                <span className="font-semibold">{analytics.byStatus.pending}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest system events and actions</CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.recentActivity && stats.recentActivity.length > 0 ? (
            <div className="space-y-3">
              {stats.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {formatActivityType(activity.activityType)}
                      </span>
                      <Badge className={getStatusColor(activity.status)} variant="secondary">
                        {activity.status}
                      </Badge>
                    </div>
                    {activity.userName && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        User: {activity.userName}
                      </p>
                    )}
                    {activity.dealName && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Deal: {activity.dealName}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(activity.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              No recent activity
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Overview;

