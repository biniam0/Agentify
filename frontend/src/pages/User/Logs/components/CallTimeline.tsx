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
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Call Timeline
      </h4>
      
      <div className="relative pl-8">
        {/* Timeline line */}
        <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-slate-200" />

        {/* Initiated */}
        <div className="relative mb-6">
          <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <PlayCircle className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-sm font-medium text-slate-900">Call Initiated</span>
            </div>
            <div className="text-xs text-slate-500">{formatTime(initiatedAt)}</div>
          </div>
        </div>

        {/* Answered */}
        {answeredAt && (
          <div className="relative mb-6">
            <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                <span className="text-sm font-medium text-slate-900">Call Answered</span>
                <Badge variant="outline" className="text-xs bg-green-50 text-green-600 border-green-200">
                  {calculateTimeToAnswer()} to answer
                </Badge>
              </div>
              <div className="text-xs text-slate-500">{formatTime(answeredAt)}</div>
            </div>
          </div>
        )}

        {/* Completed */}
        {completedAt ? (
          <div className="relative mb-2">
            <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-sm font-medium text-slate-900">Call Completed</span>
                <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-600 border-emerald-200">
                  Duration: {formatDuration(duration)}
                </Badge>
              </div>
              <div className="text-xs text-slate-500">{formatTime(completedAt)}</div>
            </div>
          </div>
        ) : (
          <div className="relative mb-2">
            <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <XCircle className="h-3.5 w-3.5 text-red-500" />
                <span className="text-sm font-medium text-slate-900">Call Not Completed</span>
              </div>
              <div className="text-xs text-slate-500">No completion timestamp</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


