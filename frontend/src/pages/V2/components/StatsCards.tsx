import { MoreVertical, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import {
  getCallAnalytics,
  getCallLogs,
  getSmsLogs,
  getCrmActionLogs,
  type CallAnalytics,
} from '@/services/loggingService';

interface StatCard {
  title: string;
  value: string;
  change: number | null;
  changeLabel: string;
  sparkline: number[];
  loading?: boolean;
}

const SPARKLINE_DAYS = 12;

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function groupByDay<T extends { createdAt: string }>(
  logs: T[],
  days: number,
  filterFn?: (log: T) => boolean,
): number[] {
  const counts: Record<string, number> = {};
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    counts[d.toISOString().split('T')[0]] = 0;
  }

  for (const log of logs) {
    if (filterFn && !filterFn(log)) continue;
    const day = log.createdAt?.split('T')[0];
    if (day && day in counts) {
      counts[day]++;
    }
  }

  return Object.values(counts);
}

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

function formatNumber(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

interface SparklineData {
  totalCalls: number[];
  completedCalls: number[];
  sms: number[];
  crm: number[];
}

interface CountData {
  smsTotal: number;
  smsPrev: number;
  smsDelivered: number;
  crmTotal: number;
  crmPrev: number;
  crmSuccess: number;
}

function buildCards(
  current: CallAnalytics | null,
  previous: CallAnalytics | null,
  sparklines: SparklineData,
  counts: CountData,
  loading: boolean,
): StatCard[] {
  const totalCalls = current?.total ?? 0;
  const completedCalls = current?.byStatus?.completed ?? current?.successful ?? 0;

  const prevTotal = previous ? previous.total : 0;
  const prevCompleted = previous ? (previous.byStatus?.completed ?? previous.successful ?? 0) : 0;

  const totalChange = prevTotal > 0
    ? Math.round(((totalCalls - prevTotal) / prevTotal) * 100)
    : null;
  const completedChange = prevCompleted > 0
    ? Math.round(((completedCalls - prevCompleted) / prevCompleted) * 100)
    : null;
  const smsChange = counts.smsPrev > 0
    ? Math.round(((counts.smsTotal - counts.smsPrev) / counts.smsPrev) * 100)
    : null;
  const crmChange = counts.crmPrev > 0
    ? Math.round(((counts.crmTotal - counts.crmPrev) / counts.crmPrev) * 100)
    : null;

  const ensureSparkline = (data: number[]) => data.length > 1 ? data : [0, 0];

  return [
    {
      title: 'Total Calls',
      value: loading ? '—' : formatNumber(totalCalls),
      change: totalChange,
      changeLabel: loading ? 'Loading...' : 'vs last month',
      sparkline: ensureSparkline(sparklines.totalCalls),
      loading,
    },
    {
      title: 'Completed Workflows',
      value: loading ? '—' : formatNumber(completedCalls),
      change: completedChange,
      changeLabel: loading ? 'Loading...' : 'vs last month',
      sparkline: ensureSparkline(sparklines.completedCalls),
      loading,
    },
    {
      title: 'SMS Sent',
      value: loading ? '—' : formatNumber(counts.smsTotal),
      change: smsChange,
      changeLabel: loading ? 'Loading...' : `${counts.smsDelivered} delivered`,
      sparkline: ensureSparkline(sparklines.sms),
      loading,
    },
    {
      title: 'CRM Actions',
      value: loading ? '—' : formatNumber(counts.crmTotal),
      change: crmChange,
      changeLabel: loading ? 'Loading...' : `${counts.crmSuccess} successful`,
      sparkline: ensureSparkline(sparklines.crm),
      loading,
    },
  ];
}

const StatsCards = () => {
  const [currentAnalytics, setCurrentAnalytics] = useState<CallAnalytics | null>(null);
  const [previousAnalytics, setPreviousAnalytics] = useState<CallAnalytics | null>(null);
  const [sparklines, setSparklines] = useState<SparklineData>({
    totalCalls: [], completedCalls: [], sms: [], crm: [],
  });
  const [counts, setCounts] = useState<CountData>({
    smsTotal: 0, smsPrev: 0, smsDelivered: 0,
    crmTotal: 0, crmPrev: 0, crmSuccess: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const startDate30 = daysAgo(30);
        const startDate60 = daysAgo(60);
        const startDateSparkline = daysAgo(SPARKLINE_DAYS);

        const [
          currentRes, fullRes,
          callLogsRes,
          smsCurrentRes, smsPrevRes,
          crmCurrentRes, crmPrevRes,
        ] = await Promise.all([
          getCallAnalytics(undefined, 30),
          getCallAnalytics(undefined, 60),
          getCallLogs({ startDate: startDateSparkline, limit: 5000 }),
          getSmsLogs({ startDate: startDate30, limit: 5000 }),
          getSmsLogs({ startDate: startDate60, limit: 5000 }),
          getCrmActionLogs({ startDate: startDate30, limit: 5000 }),
          getCrmActionLogs({ startDate: startDate60, limit: 5000 }),
        ]);

        // Call analytics
        const current = currentRes.success ? currentRes.data : null;
        const full60 = fullRes.success ? fullRes.data : null;
        setCurrentAnalytics(current);

        if (current && full60) {
          setPreviousAnalytics({
            total: full60.total - current.total,
            successful: full60.successful - current.successful,
            failed: full60.failed - current.failed,
            successRate: 0,
            avgDuration: full60.avgDuration,
            byType: {
              preCalls: full60.byType.preCalls - current.byType.preCalls,
              postCalls: full60.byType.postCalls - current.byType.postCalls,
            },
            byTrigger: {
              manual: full60.byTrigger.manual - current.byTrigger.manual,
              scheduled: full60.byTrigger.scheduled - current.byTrigger.scheduled,
              retry: full60.byTrigger.retry - current.byTrigger.retry,
            },
            byStatus: {
              completed: full60.byStatus.completed - current.byStatus.completed,
              failed: full60.byStatus.failed - current.byStatus.failed,
              pending: full60.byStatus.pending - current.byStatus.pending,
            },
          });
        }

        // Call sparklines
        const callLogs = callLogsRes.data ?? [];
        const totalCallsSpark = groupByDay(callLogs, SPARKLINE_DAYS);
        const completedCallsSpark = groupByDay(callLogs, SPARKLINE_DAYS, (l) => l.status === 'COMPLETED' || l.callSuccessful === true);

        // SMS data
        const smsCurrent = smsCurrentRes.data ?? [];
        const smsAll60 = smsPrevRes.data ?? [];
        const smsPrevOnly = smsAll60.filter((s) => {
          const d = s.createdAt?.split('T')[0];
          return d && d < startDate30;
        });
        const smsSpark = groupByDay(smsCurrent, SPARKLINE_DAYS);

        // CRM data
        const crmCurrent = crmCurrentRes.data ?? [];
        const crmAll60 = crmPrevRes.data ?? [];
        const crmPrevOnly = crmAll60.filter((c) => {
          const d = c.createdAt?.split('T')[0];
          return d && d < startDate30;
        });
        const crmSpark = groupByDay(crmCurrent, SPARKLINE_DAYS);

        setSparklines({
          totalCalls: totalCallsSpark,
          completedCalls: completedCallsSpark,
          sms: smsSpark,
          crm: crmSpark,
        });

        setCounts({
          smsTotal: smsCurrent.length,
          smsPrev: smsPrevOnly.length,
          smsDelivered: smsCurrent.filter((s) => s.status === 'DELIVERED' || s.status === 'SENT').length,
          crmTotal: crmCurrent.length,
          crmPrev: crmPrevOnly.length,
          crmSuccess: crmCurrent.filter((c) => c.status === 'SUCCESS').length,
        });
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const cards = buildCards(currentAnalytics, previousAnalytics, sparklines, counts, loading);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((stat) => {
        const isPositive = (stat.change ?? 0) >= 0;
        const hasChange = stat.change !== null;

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
                  {stat.loading ? (
                    <Loader2 className="h-7 w-7 animate-spin text-gray-300" />
                  ) : (
                    <span className="text-3xl font-bold text-gray-900 tracking-tight">
                      {stat.value}
                    </span>
                  )}
                  {hasChange && !stat.loading && (
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
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">{stat.changeLabel}</p>
              </div>

              {!stat.loading && (
                <Sparkline data={stat.sparkline} positive={isPositive} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatsCards;
