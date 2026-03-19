import { MoreVertical, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCard {
  title: string;
  value: string;
  change: number;
  changeLabel: string;
  sparkline: number[];
}

const STATS: StatCard[] = [
  {
    title: 'Total Active Deals',
    value: '142',
    change: 12,
    changeLabel: 'vs last month',
    sparkline: [30, 45, 35, 50, 40, 55, 60, 50, 65, 70, 60, 75],
  },
  {
    title: 'Completed Workflows',
    value: '26.4k',
    change: 24,
    changeLabel: 'vs last month',
    sparkline: [20, 25, 30, 28, 35, 40, 38, 45, 50, 55, 60, 65],
  },
  {
    title: 'Pending Actions',
    value: '28',
    change: -5,
    changeLabel: '12 overdue this week',
    sparkline: [60, 55, 50, 52, 48, 45, 47, 42, 40, 38, 35, 30],
  },
  {
    title: 'Avg. Barrier Score',
    value: '42',
    change: 8,
    changeLabel: '3 deals at high risk',
    sparkline: [35, 38, 32, 40, 37, 42, 39, 44, 41, 46, 43, 48],
  },
];

const Sparkline = ({ data, positive }: { data: number[]; positive: boolean }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const height = 40;
  const width = 80;
  const step = width / (data.length - 1);

  const points = data
    .map((v, i) => `${i * step},${height - ((v - min) / range) * height}`)
    .join(' ');

  const color = positive ? '#10b981' : '#ef4444';

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const StatsCards = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {STATS.map((stat) => {
        const isPositive = stat.change >= 0;

        return (
          <div
            key={stat.title}
            className="bg-white rounded-xl border border-gray-200 p-5 relative"
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">{stat.title}</span>
              <button className="p-0.5 -mr-1 -mt-0.5 rounded hover:bg-gray-100 transition-colors">
                <MoreVertical className="h-4 w-4 text-gray-400" />
              </button>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-baseline gap-2.5">
                  <span className="text-3xl font-bold text-gray-900 tracking-tight">
                    {stat.value}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-0.5 text-xs font-semibold',
                      isPositive ? 'text-emerald-600' : 'text-red-500'
                    )}
                  >
                    {isPositive ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {isPositive ? '+' : ''}
                    {stat.change}%
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{stat.changeLabel}</p>
              </div>

              <Sparkline data={stat.sparkline} positive={isPositive} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatsCards;
