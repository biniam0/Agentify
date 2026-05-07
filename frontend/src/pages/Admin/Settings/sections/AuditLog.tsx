import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import * as loggingService from '@/services/loggingService';

const scopeBadgeClass =
  'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900';

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

const severityConfig: Record<Severity, {
  icon: typeof AlertCircle;
  iconClass: string;
  badgeClass: string;
}> = {
  CRITICAL: {
    icon: XCircle,
    iconClass: 'text-red-600 dark:text-red-400',
    badgeClass: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900',
  },
  HIGH: {
    icon: AlertCircle,
    iconClass: 'text-orange-600 dark:text-orange-400',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900',
  },
  MEDIUM: {
    icon: AlertTriangle,
    iconClass: 'text-amber-600 dark:text-amber-400',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
  },
  LOW: {
    icon: AlertCircle,
    iconClass: 'text-blue-600 dark:text-blue-400',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
  },
};

const PAGE_SIZE = 10;

const AuditLog = () => {
  const [logs, setLogs] = useState<loggingService.ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const response = await loggingService.getErrorLogs({
          errorType: 'AUTHORIZATION_ERROR',
          limit: PAGE_SIZE,
          offset: 0,
        });
        if (cancelled) return;
        if (response.success) {
          setLogs(response.data);
          setTotal(response.total);
        }
      } catch (err) {
        console.error('Failed to load audit log:', err);
        const message =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Failed to load audit log';
        if (!cancelled) toast.error(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const getUserEmail = (log: loggingService.ErrorLog): string | undefined => {
    const data = log.requestData as { userEmail?: string } | undefined;
    return data?.userEmail;
  };

  return (
    <section className="py-1 space-y-6">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-lg font-semibold text-foreground">Audit Log</h2>
          <Badge
            variant="outline"
            className={cn('text-[10px] uppercase tracking-wide', scopeBadgeClass)}
          >
            Read-only
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Recent admin and super-admin access attempts. Source:{' '}
          <span className="font-medium text-foreground">authorization errors</span>.
        </p>
      </div>

      <div className="rounded-xl border border-default bg-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-default">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldAlert className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium text-foreground truncate">
              Recent events
            </span>
            {!loading && (
              <span className="text-xs text-muted-foreground shrink-0">
                {logs.length} of {total}
              </span>
            )}
          </div>
          <Link
            to="/app/admin/logs/errors"
            className="text-xs font-medium text-foreground hover:underline inline-flex items-center gap-1 shrink-0"
          >
            View all errors
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {loading ? (
          <div className="divide-y divide-default">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="px-4 py-3 flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="px-4 py-10 flex flex-col items-center text-center gap-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-500/80" />
            <p className="text-sm font-medium text-foreground">No recent admin access issues</p>
            <p className="text-xs text-muted-foreground">
              Unauthorized admin and super-admin attempts will appear here.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-2">
              <Link to="/app/admin/logs/errors">Open full error log</Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-default">
            {logs.map((log) => {
              const sev = (log.severity as Severity) ?? 'LOW';
              const cfg = severityConfig[sev] ?? severityConfig.LOW;
              const Icon = cfg.icon;
              const email = getUserEmail(log);
              const when = (() => {
                try {
                  return formatDistanceToNow(new Date(log.createdAt), { addSuffix: true });
                } catch {
                  return log.createdAt;
                }
              })();
              return (
                <li key={log.id} className="px-4 py-3 flex items-start gap-3">
                  <div className="shrink-0">
                    <Icon className={cn('h-5 w-5', cfg.iconClass)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={cn('text-[10px] uppercase tracking-wide', cfg.badgeClass)}
                      >
                        {sev}
                      </Badge>
                      <span className="text-sm font-medium text-foreground truncate">
                        {log.message}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      {email && <span className="truncate">{email}</span>}
                      {log.endpoint && (
                        <span className="font-mono truncate">
                          {log.method ? `${log.method} ` : ''}
                          {log.endpoint}
                        </span>
                      )}
                      <span className="ml-auto shrink-0">{when}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
};

export default AuditLog;
