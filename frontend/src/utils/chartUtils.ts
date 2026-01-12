/**
 * Chart Data Transformation Utilities
 * Reusable functions for preparing analytics data for visualization
 */

import { TimeseriesDataPoint } from '@/services/loggingService';

export interface ChartDataPoint {
  name: string;
  value: number;
  total?: number;
  successful?: number;
  failed?: number;
  avgDuration?: number;
}

/**
 * Transform timeseries data into chart-ready format with month names
 * Fills in missing months with zeros for consistent visualization
 * 
 * @param timeseries - Raw timeseries data from API
 * @param monthsCount - Number of months to display (default: 12)
 * @returns Array of chart data points with month names
 */
export const transformTimeseriesForCharts = (
  timeseries: TimeseriesDataPoint[],
  monthsCount: number = 12
): ChartDataPoint[] => {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const lastNMonths: string[] = [];
  
  // Generate last N months keys
  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    lastNMonths.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  // Create a map of existing data
  const dataMap = new Map(timeseries.map(t => [t.date, t]));

  // Fill in all months (with 0 for missing months)
  return lastNMonths.map((monthKey) => {
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

/**
 * Extract specific metric from chart data for single-metric charts
 * 
 * @param chartData - Transformed chart data
 * @param metric - Which metric to extract
 * @returns Simplified data array for single-metric charts
 */
export const extractMetricForChart = (
  chartData: ChartDataPoint[],
  metric: 'value' | 'successful' | 'failed' | 'avgDuration'
): Array<{ name: string; value: number }> => {
  return chartData.map(d => ({
    name: d.name,
    value: d[metric] || 0,
  }));
};

/**
 * Calculate percentage change between two values
 * 
 * @param current - Current value
 * @param previous - Previous value
 * @returns Percentage change (positive or negative)
 */
export const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

