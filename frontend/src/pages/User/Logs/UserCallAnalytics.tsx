import React, { useEffect, useState } from 'react';
import { Wallet, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import * as loggingService from '@/services/loggingService';
import { transformTimeseriesForCharts, extractMetricForChart } from '@/utils/chartUtils';
import {
  AnalyticsCard,
  UsageBarChart,
  TrendLineChart,
  MetricCard
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

      // Fetch both summary analytics and timeseries data
      const [analyticsResponse, timeseriesResponse] = await Promise.all([
        loggingService.getUserCallAnalytics(30),
        loggingService.getUserCallAnalyticsTimeseries(365, 'month'), // Last 12 months
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
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
        <Skeleton className="h-[400px] w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-[300px] w-full rounded-xl" />
          <Skeleton className="h-[300px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // Use utility function to transform data for charts
  const chartData = transformTimeseriesForCharts(timeseries, 12);

  return (
    <div className="space-y-8 content-container">
      {/* Call Analytics Page Header Card */}
      <div className="flex flex-col gap-2 pl-2">
        <h2 className="text-2xl font-bold text-heading dark:text-foreground">Call Analytics</h2>
        <p className="text-body dark:text-muted-foreground">Track your call volume, duration, and success rate over time.</p>
      </div>
      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MetricCard
          label="Total Call Volume"
          value={analytics.total.toLocaleString()}
          icon={Wallet}
        />
        <MetricCard
          label="Avg. Call Duration"
          value={`${Math.floor(analytics.avgDuration / 60)}m ${Math.round(analytics.avgDuration % 60)}s`}
          icon={CreditCard}
        />
      </div>

      {/* Main Chart Section */}
      <AnalyticsCard 
        title="Monthly Call Volume" 
        description="Track your call volume over the last 12 months."
        dateSelect
        className="h-[500px]"
      >
        <div className="mt-8">
          <UsageBarChart 
            data={chartData} 
            height={350}
            yAxisFormatter={(value) => value.toString()} 
          />
        </div>
      </AnalyticsCard>

      {/* Bottom Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
