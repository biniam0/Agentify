/**
 * Logs Overview - Dashboard with key metrics
 * Shows data across ALL users (admin-level view)
 */

import { Activity, AlertCircle, Clock, Phone, TrendingUp, PhoneOutgoing, PhoneIncoming, User as UserIcon } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Skeleton } from '../../../components/ui/skeleton';
import * as loggingService from '../../../services/loggingService';
import { MetricCard, AnalyticsCard, DonutChart } from '../../User/Logs/components/AnalyticsCharts';

const Overview: React.FC = () => {
  const [stats, setStats] = useState<loggingService.DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<loggingService.CallAnalytics | null>(null);
  const [recentCalls, setRecentCalls] = useState<loggingService.CallLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, analyticsRes, recentCallsRes] = await Promise.all([
        loggingService.getDashboardStats(),
        loggingService.getCallAnalytics(undefined, 7),
        // Fetch recent calls across ALL users for the admin overview
        loggingService.getCallLogs({ limit: 15, offset: 0 }),
      ]);
      
      if (statsRes.success) {
        setStats(statsRes.data);
      }
      if (analyticsRes.success) {
        setAnalytics(analyticsRes.data);
      }
      if (recentCallsRes.success) {
        setRecentCalls(recentCallsRes.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error(error.response?.data?.error || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'SUCCESS': case 'COMPLETED':
        return 'bg-green-500/10 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20';
      case 'FAILED': case 'NO_ANSWER':
        return 'bg-red-500/10 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20';
      case 'PENDING': case 'INITIATED': case 'RINGING':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20';
      case 'RUNNING': case 'ANSWERED':
        return 'bg-blue-500/10 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-200 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/20';
    }
  };

  const formatTimeAgo = (dateStr: string): string => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-heading dark:text-foreground">Logs Overview</h1>
          <p className="text-sm text-subtle dark:text-muted-foreground leading-relaxed">System-wide activity and performance metrics across all users</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-elevated dark:bg-card border border-subtle dark:border-border shadow-card rounded-lg">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-7 w-14" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-elevated dark:bg-card border border-subtle dark:border-border shadow-card rounded-lg">
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-28" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-40 w-full rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Prepare data for charts
  const callDistributionData = analytics ? [
    { name: 'Pre-calls', value: analytics.byType.preCalls, color: 'hsl(var(--icon-blue))' },
    { name: 'Post-calls', value: analytics.byType.postCalls, color: 'hsl(var(--icon-purple))' },
  ] : [];

  const triggerSourceData = analytics ? [
    { name: 'Manual', value: analytics.byTrigger.manual, color: 'hsl(var(--icon-blue))' },
    { name: 'Scheduled', value: analytics.byTrigger.scheduled, color: 'hsl(var(--icon-green))' },
    { name: 'Retry', value: analytics.byTrigger.retry, color: 'hsl(var(--icon-orange))' },
  ] : [];

  const callStatusData = analytics ? [
    { name: 'Completed', value: analytics.byStatus.completed, color: 'hsl(var(--icon-green))' },
    { name: 'Failed', value: analytics.byStatus.failed, color: 'hsl(var(--status-error-text))' },
    { name: 'Pending', value: analytics.byStatus.pending, color: 'hsl(var(--status-warning-text))' },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-heading dark:text-foreground">Logs Overview</h1>
        <p className="text-sm text-subtle dark:text-muted-foreground leading-relaxed">System-wide activity and performance metrics across all users</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Today's Calls (All Users)"
          value={stats?.totalCallsToday.toString() || "0"}
          icon={Phone}
          accentColor="bg-blue-500/10"
          iconColor="text-blue-600 dark:text-blue-400"
        />
        <MetricCard
          label="Success Rate (All Users)"
          value={`${stats?.successRate.toFixed(1) || 0}%`}
          icon={TrendingUp}
          accentColor="bg-green-500/10"
          iconColor="text-green-600 dark:text-green-400"
        />
        <MetricCard
          label="Critical Errors"
          value={stats?.criticalErrors.toString() || "0"}
          icon={AlertCircle}
          accentColor="bg-red-500/10"
          iconColor="text-red-600 dark:text-red-400"
        />
        <MetricCard
          label="Total Calls 7d (All Users)"
          value={analytics?.total.toString() || "0"}
          icon={Activity}
          accentColor="bg-purple-500/10"
          iconColor="text-purple-600 dark:text-purple-400"
        />
      </div>

      {/* Call Analytics */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AnalyticsCard title="Call Distribution" description="Pre vs Post calls (all users)">
            <div className="flex items-center">
              <div className="flex-1">
                <DonutChart data={callDistributionData} height={160} innerRadius={40} outerRadius={65} />
              </div>
              <div className="w-32 space-y-2">
                {callDistributionData.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-subtle dark:text-muted-foreground whitespace-nowrap">{item.name}</span>
                    <span className="font-medium ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </AnalyticsCard>

          <AnalyticsCard title="Trigger Sources" description="How calls were initiated">
            <div className="flex items-center">
              <div className="flex-1">
                <DonutChart data={triggerSourceData} height={160} innerRadius={40} outerRadius={65} />
              </div>
              <div className="w-32 space-y-2">
                {triggerSourceData.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-subtle dark:text-muted-foreground whitespace-nowrap">{item.name}</span>
                    <span className="font-medium ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </AnalyticsCard>

          <AnalyticsCard title="Call Status" description="Outcome across all users">
            <div className="flex items-center">
              <div className="flex-1">
                <DonutChart data={callStatusData} height={160} innerRadius={40} outerRadius={65} />
              </div>
              <div className="w-32 space-y-2">
                {callStatusData.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-subtle dark:text-muted-foreground whitespace-nowrap">{item.name}</span>
                    <span className="font-medium ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </AnalyticsCard>
        </div>
      )}

      {/* Recent Calls - ALL USERS */}
      <Card className="bg-elevated dark:bg-card border border-subtle dark:border-border shadow-card rounded-lg overflow-hidden">
        <CardHeader className="pb-3 border-b border-subtle dark:border-border">
          <CardTitle className="text-base font-semibold tracking-tight text-heading dark:text-foreground">Recent Calls (All Users)</CardTitle>
          <CardDescription className="text-sm text-subtle dark:text-muted-foreground">Latest calls across all users in the system</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {recentCalls.length > 0 ? (
            <div className="divide-y divide-subtle dark:divide-border">
              {recentCalls.map((call) => (
                <div
                  key={call.id}
                  className="flex items-center justify-between p-4 hover:bg-[hsl(var(--page-bg)/0.5)] dark:hover:bg-muted/10 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Call type icon */}
                    <div className={`mt-0.5 h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      call.callType === 'PRE_CALL'
                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                        : 'bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400'
                    }`}>
                      {call.callType === 'PRE_CALL' ? <PhoneOutgoing className="w-3.5 h-3.5" /> : <PhoneIncoming className="w-3.5 h-3.5" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Row 1: Call type + status */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-heading dark:text-foreground">
                          {call.callType === 'PRE_CALL' ? 'Pre-Call' : 'Post-Call'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${getStatusColor(call.status)}`}>
                          {call.status}
                        </span>
                        {call.duration != null && call.duration > 0 && (
                          <span className="text-[10px] text-subtle dark:text-muted-foreground flex items-center gap-0.5">
                            <Clock className="w-3 h-3" /> {call.duration}s
                          </span>
                        )}
                      </div>

                      {/* Row 2: User + Deal info */}
                      <div className="flex items-center gap-x-4 gap-y-0.5 mt-1 flex-wrap">
                        {call.userName && (
                          <span className="text-xs text-subtle dark:text-muted-foreground flex items-center gap-1">
                            <UserIcon className="w-3 h-3 flex-shrink-0" />
                            <span className="font-medium text-body dark:text-foreground">{call.userName}</span>
                          </span>
                        )}
                        {call.meetingTitle && (
                          <span className="text-xs text-subtle dark:text-muted-foreground truncate max-w-[200px]">
                            {call.meetingTitle}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Time */}
                  <div className="text-xs font-medium text-subtle dark:text-muted-foreground flex items-center gap-1.5 whitespace-nowrap ml-3">
                    <Clock className="w-3.5 h-3.5" />
                    {formatTimeAgo(call.initiatedAt)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-[hsl(var(--page-bg))] flex items-center justify-center mb-3">
                <Phone className="h-6 w-6 text-subtle" />
              </div>
              <p className="text-sm font-medium text-heading dark:text-foreground">No recent calls</p>
              <p className="text-xs text-subtle dark:text-muted-foreground mt-1">Calls from all users will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
};

export default Overview;
