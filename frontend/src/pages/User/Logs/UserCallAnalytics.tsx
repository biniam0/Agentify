import React, { useEffect, useState } from 'react';
import { Wallet, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import * as loggingService from '@/services/loggingService';
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

  // Transform timeseries data for charts
  const prepareChartData = () => {
    // Get last 12 months of data
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const last12Months: string[] = [];
    
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last12Months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    // Create a map of existing data
    const dataMap = new Map(timeseries.map(t => [t.date, t]));

    // Fill in all 12 months (with 0 for missing months)
    return last12Months.map((monthKey, idx) => {
      const data = dataMap.get(monthKey);
      const monthIndex = parseInt(monthKey.split('-')[1]) - 1;
      
      return {
        name: monthNames[monthIndex],
        value: data?.total || 0,
        total: data ? Math.max(data.total * 1.2, data.total + 5) : 0, // Background bar slightly higher
        successful: data?.successful || 0,
        failed: data?.failed || 0,
        avgDuration: data?.avgDuration || 0,
      };
    });
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

  const chartData = prepareChartData();

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
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
          <UsageBarChart data={chartData} height={350} />
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
              data={chartData.map(d => ({ name: d.name, value: d.avgDuration }))} 
              height={250} 
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
                value: d.successful,
                total: d.value 
              }))} 
              height={250} 
            />
          </div>
        </AnalyticsCard>
      </div>
    </div>
  );
};

export default UserCallAnalytics;
