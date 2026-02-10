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
  AreaChart,
  Cell,
  Pie,
  PieChart
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon } from 'lucide-react';

// --- Types ---
interface ChartDataPoint {
  name: string;
  value: number;
  secondaryValue?: number;
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
    <Card className={`bg-elevated dark:bg-card shadow-card border border-subtle dark:border-border rounded-lg overflow-hidden ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
        <div>
          <CardTitle className="text-sm font-semibold tracking-tight text-heading dark:text-foreground">{title}</CardTitle>
          {description && <CardDescription className="text-xs text-subtle dark:text-muted-foreground mt-0.5">{description}</CardDescription>}
        </div>
        {dateSelect && (
          <Select defaultValue="this-month">
            <SelectTrigger className="w-[130px] h-8 text-[11px] bg-elevated dark:bg-card border-default dark:border-border rounded-lg">
              <CalendarIcon className="w-3 h-3 mr-1.5 text-subtle" />
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
        <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} barSize={28} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border-subtle))" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'hsl(var(--text-muted))', fontSize: 11 }} 
            dy={8}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'hsl(var(--text-muted))', fontSize: 11 }} 
            tickFormatter={yAxisFormatter}
          />
          <Tooltip
            cursor={{ fill: 'hsl(var(--page-bg))', opacity: 0.5 }}
            contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border-subtle))', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.08)', fontSize: '12px' }}
          />
          <Bar dataKey="total" stackId="a" fill="hsl(var(--app-brand-light))" radius={[4, 4, 0, 0]} />
          <Bar dataKey="value" stackId="a" fill="hsl(var(--app-brand))" radius={[4, 4, 0, 0]} />
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
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--app-brand))" stopOpacity={0.12}/>
              <stop offset="95%" stopColor="hsl(var(--app-brand))" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border-subtle))" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'hsl(var(--text-muted))', fontSize: 11 }} 
            dy={8}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'hsl(var(--text-muted))', fontSize: 11 }}
            tickFormatter={yAxisFormatter}
          />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border-subtle))', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.08)', fontSize: '12px' }}
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke="hsl(var(--app-brand))" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorValue)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// --- Enhanced Metric Card ---
export const MetricCard: React.FC<{
  label: string;
  value: string;
  icon: React.ElementType;
  trend?: { value: string; positive: boolean };
  accentColor?: string;
  iconColor?: string;
  className?: string;
}> = ({ label, value, icon: Icon, trend, accentColor = 'bg-brand-light dark:bg-primary/10', iconColor = 'text-brand dark:text-primary', className }) => {
  return (
    <Card className={`bg-elevated dark:bg-card border border-subtle dark:border-border shadow-card rounded-lg overflow-hidden ${className}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-subtle dark:text-muted-foreground mb-1.5">{label}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-heading dark:text-foreground">{value}</span>
              {trend && (
                <span className={`text-[11px] font-medium ${trend.positive ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                  {trend.positive ? '↗' : '↘'} {trend.value}
                </span>
              )}
            </div>
          </div>
          <div className={`h-9 w-9 rounded-lg ${accentColor} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`h-4.5 w-4.5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// --- Donut/Pie Chart Component ---
interface DonutChartProps {
  data: { name: string; value: number; color: string }[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  height = 200,
  innerRadius = 50,
  outerRadius = 80
}) => {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={3}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

