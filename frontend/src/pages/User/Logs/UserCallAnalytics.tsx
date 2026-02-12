import React, { useEffect, useState } from 'react';
import { Phone, Clock, CheckCircle2, XCircle, PhoneOutgoing, PhoneIncoming } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import * as loggingService from '@/services/loggingService';
import { transformTimeseriesForCharts, extractMetricForChart } from '@/utils/chartUtils';
import {
  AnalyticsCard,
  UsageBarChart,
  TrendLineChart,
  MetricCard,
  DonutChart
} from './components/AnalyticsCharts';

const UserCallAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<loggingService.CallAnalytics | null>(null);
  const [timeseries, setTimeseries] = useState<loggingService.TimeseriesDataPoint[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      const [analyticsResponse, timeseriesResponse] = await Promise.all([
        loggingService.getUserCallAnalytics(30),
        loggingService.getUserCallAnalyticsTimeseries(365, 'month'),
      ]);

      if (analyticsResponse.success) {
        setAnalytics(analyticsResponse.data);
      }

      if (timeseriesResponse.success) {
        setTimeseries(timeseriesResponse.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch call analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !analytics) {
    return (
      <div className="space-y-6">
        <div className="space-y-2.5 pl-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-[100px] w-full rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-[420px] w-full rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Skeleton className="h-[340px] w-full rounded-lg" />
          <Skeleton className="h-[340px] w-full rounded-lg" />
        </div>
      </div>
    );
  }

  const chartData = transformTimeseriesForCharts(timeseries, 12);

  // Derived metrics
  const successRate = analytics.total > 0 ? Math.round(analytics.successRate) : 0;
  const failRate = analytics.total > 0 ? Math.round((analytics.failed / analytics.total) * 100) : 0;

  // Donut chart data for call type breakdown
  const callTypeData = [
    { name: 'Pre-Call', value: analytics.byType.preCalls, color: 'hsl(25, 95%, 53%)' },
    { name: 'Post-Call', value: analytics.byType.postCalls, color: 'hsl(160, 84%, 39%)' },
  ];

  // Donut chart data for call status breakdown
  const callStatusData = [
    { name: 'Completed', value: analytics.byStatus.completed, color: 'hsl(142, 76%, 36%)' },
    { name: 'Failed', value: analytics.byStatus.failed, color: 'hsl(0, 84%, 60%)' },
    { name: 'Pending', value: analytics.byStatus.pending, color: 'hsl(38, 92%, 50%)' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-2 pl-2">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold tracking-tight text-heading dark:text-foreground">Call Analytics</h2>
          <span className="px-2.5 py-0.5 text-xs font-medium bg-orange-50 text-orange-600 rounded-full border border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20">
            Last 30 days
          </span>
        </div>
        <p className="text-sm text-body dark:text-muted-foreground leading-relaxed">
          Track your call volume, duration, and success rate over time.
        </p>
      </div>

      {/* 6-Card Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <MetricCard
          label="Total Calls"
          value={analytics.total.toLocaleString()}
          icon={Phone}
          accentColor="bg-blue-50 dark:bg-blue-500/10"
          iconColor="text-blue-600 dark:text-blue-400"
        />
        <MetricCard
          label="Success Rate"
          value={`${successRate}%`}
          icon={CheckCircle2}
          trend={successRate >= 50 ? { value: `${successRate}%`, positive: true } : { value: `${failRate}% fail`, positive: false }}
          accentColor="bg-green-50 dark:bg-green-500/10"
          iconColor="text-green-600 dark:text-green-400"
        />
        <MetricCard
          label="Avg. Duration"
          value={`${Math.floor(analytics.avgDuration / 60)}m ${Math.round(analytics.avgDuration % 60)}s`}
          icon={Clock}
          accentColor="bg-purple-50 dark:bg-purple-500/10"
          iconColor="text-purple-600 dark:text-purple-400"
        />
        <MetricCard
          label="Pre-Calls"
          value={analytics.byType.preCalls.toLocaleString()}
          icon={PhoneOutgoing}
          accentColor="bg-orange-50 dark:bg-orange-500/10"
          iconColor="text-orange-600 dark:text-orange-400"
        />
        <MetricCard
          label="Post-Calls"
          value={analytics.byType.postCalls.toLocaleString()}
          icon={PhoneIncoming}
          accentColor="bg-teal-50 dark:bg-teal-500/10"
          iconColor="text-teal-600 dark:text-teal-400"
        />
        <MetricCard
          label="Failed Calls"
          value={analytics.failed.toLocaleString()}
          icon={XCircle}
          trend={analytics.failed > 0 ? { value: `${failRate}%`, positive: false } : undefined}
          accentColor="bg-red-50 dark:bg-red-500/10"
          iconColor="text-red-600 dark:text-red-400"
        />
      </div>

      {/* Main Bar Chart */}
      <AnalyticsCard 
        title="Monthly Call Volume" 
        description="Track your call volume over the last 12 months."
        dateSelect
      >
        <div className="mt-4">
          <UsageBarChart 
            data={chartData} 
            height={350}
            yAxisFormatter={(value) => value.toString()} 
          />
        </div>
      </AnalyticsCard>

      {/* Middle Row: Donut Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <AnalyticsCard 
          title="Call Type Breakdown" 
          description="Pre-call vs post-call distribution."
        >
          <div className="flex items-center gap-6 mt-2">
            <DonutChart data={callTypeData} height={180} innerRadius={45} outerRadius={75} />
            <div className="space-y-3 flex-1">
              {callTypeData.map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-body dark:text-foreground whitespace-nowrap">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold tracking-tight text-heading dark:text-foreground">{item.value}</span>
                    <span className="text-[11px] text-subtle ml-1.5">
                      ({analytics.total > 0 ? Math.round((item.value / analytics.total) * 100) : 0}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AnalyticsCard>

        <AnalyticsCard 
          title="Call Status Overview" 
          description="Breakdown by completion status."
        >
          <div className="flex items-center gap-6 mt-2">
            <DonutChart data={callStatusData} height={180} innerRadius={45} outerRadius={75} />
            <div className="space-y-3 flex-1">
              {callStatusData.map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-body dark:text-foreground whitespace-nowrap">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold tracking-tight text-heading dark:text-foreground">{item.value}</span>
                    <span className="text-[11px] text-subtle ml-1.5">
                      ({analytics.total > 0 ? Math.round((item.value / analytics.total) * 100) : 0}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AnalyticsCard>
      </div>

      {/* Bottom Row: Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <AnalyticsCard 
          title="Call Duration Trends" 
          description="Average call duration over time."
          dateSelect
        >
          <div className="mt-4">
            <TrendLineChart 
              data={extractMetricForChart(chartData, 'avgDuration')} 
              height={250}
              yAxisFormatter={(value) => {
                const mins = Math.floor(value / 60);
                return mins > 0 ? `${mins}m` : `${value}s`;
              }}
            />
          </div>
        </AnalyticsCard>

        <AnalyticsCard 
          title="Successful Connections" 
          description="Successful calls compared to total attempts."
          dateSelect
        >
          <div className="mt-4">
            <UsageBarChart 
              data={chartData.map(d => ({ 
                name: d.name, 
                value: d.successful || 0,
                total: d.value 
              }))} 
              height={250}
              yAxisFormatter={(value) => value.toString()}
            />
          </div>
        </AnalyticsCard>
      </div>
    </div>
  );
};

export default UserCallAnalytics;
