import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon } from 'lucide-react';

// --- Types ---
interface ChartDataPoint {
  name: string;
  value: number;
  secondaryValue?: number; // For stacked or comparison
}

interface AnalyticsCardProps {
  title: string;
  description?: string;
  dateSelect?: boolean;
  children: React.ReactNode;
  className?: string;
}

// --- Wrapper Component ---
export const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  title,
  description,
  dateSelect,
  children,
  className
}) => {
  return (
    <Card className={`bg-elevated dark:bg-card shadow-card border border-subtle dark:border-border ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-4 space-y-0">
        <div>
          <CardTitle className="text-base font-semibold text-heading dark:text-foreground">{title}</CardTitle>
          {description && <CardDescription className="text-subtle dark:text-muted-foreground mt-1">{description}</CardDescription>}
        </div>
        {dateSelect && (
          <Select defaultValue="this-month">
            <SelectTrigger className="w-[140px] h-9 text-xs bg-elevated dark:bg-card border-default dark:border-border">
              <CalendarIcon className="w-3.5 h-3.5 mr-2 text-subtle" />
              <SelectValue placeholder="Select date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="this-year">This Year</SelectItem>
            </SelectContent>
          </Select>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
};

// --- Bar Chart Component ---
interface BarChartProps {
  data: ChartDataPoint[];
  height?: number;
  yAxisFormatter?: (value: number) => string;
}

export const UsageBarChart: React.FC<BarChartProps> = ({ 
  data, 
  height = 300, 
  yAxisFormatter = (value) => value.toString() 
}) => {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={32}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748b', fontSize: 12 }} 
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748b', fontSize: 12 }} 
            tickFormatter={yAxisFormatter}
          />
          <Tooltip
            cursor={{ fill: '#f8fafc' }}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          {/* Background Bar (Light) */}
          <Bar dataKey="total" stackId="a" fill="#ecfdf5" radius={[4, 4, 0, 0]} />
          {/* Foreground Bar (Dark) */}
          <Bar dataKey="value" stackId="a" fill="#34d399" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// --- Line/Area Chart Component ---
interface TrendLineChartProps {
  data: ChartDataPoint[];
  height?: number;
  yAxisFormatter?: (value: number) => string;
}

export const TrendLineChart: React.FC<TrendLineChartProps> = ({ 
  data, 
  height = 300,
  yAxisFormatter = (value) => value.toString()
}) => {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748b', fontSize: 12 }} 
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748b', fontSize: 12 }}
            tickFormatter={yAxisFormatter}
          />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke="#10b981" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorValue)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// --- Simple Metric Card ---
export const MetricCard: React.FC<{
  label: string;
  value: string;
  icon: React.ElementType;
  className?: string;
}> = ({ label, value, icon: Icon, className }) => {
  return (
    <div className={`p-6 bg-elevated dark:bg-card rounded-xl border border-subtle dark:border-border shadow-card flex items-start justify-between ${className}`}>
      <div>
        <div className="flex items-center gap-2 text-sm text-subtle dark:text-muted-foreground mb-2">
          <Icon className="w-4 h-4" />
          {label}
        </div>
        <div className="text-2xl font-bold text-heading dark:text-foreground">{value}</div>
      </div>
    </div>
  );
};

