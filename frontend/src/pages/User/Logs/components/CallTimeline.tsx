import React from 'react';
import { Clock, CheckCircle2, XCircle, PlayCircle } from 'lucide-react';
import { format, differenceInSeconds } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface CallTimelineProps {
  initiatedAt: string;
  answeredAt?: string;
  completedAt?: string;
  duration?: number;
}

export const CallTimeline: React.FC<CallTimelineProps> = ({
  initiatedAt,
  answeredAt,
  completedAt,
  duration
}) => {
  const calculateTimeToAnswer = () => {
    if (!answeredAt) return null;
    const seconds = differenceInSeconds(new Date(answeredAt), new Date(initiatedAt));
    return seconds > 0 ? `${seconds}s` : 'N/A';
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return null;
    return format(new Date(timestamp), 'MMM d, yyyy HH:mm:ss');
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-subtle dark:text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
        <Clock className="h-3.5 w-3.5" />
        Call Timeline
      </h4>
      
      <div className="relative pl-8">
        {/* Timeline line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-[hsl(var(--border-subtle))] dark:bg-border rounded-full" />

        {/* Initiated */}
        <div className="relative mb-5">
          <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-[hsl(var(--icon-blue))] border-2 border-white dark:border-card shadow-sm" />
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <PlayCircle className="h-3.5 w-3.5 icon-blue" />
              <span className="text-sm font-medium text-heading dark:text-foreground">Call Initiated</span>
            </div>
            <div className="text-[11px] text-subtle pl-5">{formatTime(initiatedAt)}</div>
          </div>
        </div>

        {/* Answered */}
        {answeredAt && (
          <div className="relative mb-5">
            <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-[hsl(var(--icon-green))] border-2 border-white dark:border-card shadow-sm" />
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <CheckCircle2 className="h-3.5 w-3.5 icon-green" />
                <span className="text-sm font-medium text-heading dark:text-foreground">Call Answered</span>
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 badge-success border-[hsl(var(--status-success-bg)/0.3)]">
                  {calculateTimeToAnswer()} to answer
                </Badge>
              </div>
              <div className="text-[11px] text-subtle pl-5">{formatTime(answeredAt)}</div>
            </div>
          </div>
        )}

        {/* Completed */}
        {completedAt ? (
          <div className="relative mb-1">
            <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-brand border-2 border-white dark:border-card shadow-sm" />
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <CheckCircle2 className="h-3.5 w-3.5 text-brand" />
                <span className="text-sm font-medium text-heading dark:text-foreground">Call Completed</span>
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-brand-light text-brand border-[hsl(var(--app-brand-muted)/0.3)] dark:bg-primary/10 dark:text-primary dark:border-primary/30">
                  Duration: {formatDuration(duration)}
                </Badge>
              </div>
              <div className="text-[11px] text-subtle pl-5">{formatTime(completedAt)}</div>
            </div>
          </div>
        ) : (
          <div className="relative mb-1">
            <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-[hsl(var(--status-error-bg))] border-2 border-white dark:border-card shadow-sm" />
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <XCircle className="h-3.5 w-3.5 text-[hsl(var(--status-error-text))]" />
                <span className="text-sm font-medium text-heading dark:text-foreground">Call Not Completed</span>
              </div>
              <div className="text-[11px] text-subtle pl-5">No completion timestamp</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


