import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
    <Card className={`bg-white shadow-sm border border-slate-100 ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-4 space-y-0">
        <div>
          <CardTitle className="text-base font-semibold text-slate-900">{title}</CardTitle>
          {description && <CardDescription className="text-slate-500 mt-1">{description}</CardDescription>}
        </div>
        {dateSelect && (
          <Select defaultValue="this-month">
            <SelectTrigger className="w-[140px] h-9 text-xs bg-white border-slate-200">
              <CalendarIcon className="w-3.5 h-3.5 mr-2 text-slate-400" />
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
export const UsageBarChart: React.FC<{ data: ChartDataPoint[]; height?: number }> = ({ data, height = 300 }) => {
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
            tickFormatter={(value) => `$${value}`}
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
export const TrendLineChart: React.FC<{ data: ChartDataPoint[]; height?: number }> = ({ data, height = 300 }) => {
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
            tickFormatter={(value) => `$${value}`}
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
    <div className={`p-6 bg-white rounded-xl border border-slate-100 shadow-sm flex items-start justify-between ${className}`}>
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <Icon className="w-4 h-4" />
          {label}
        </div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
      </div>
    </div>
  );
};

