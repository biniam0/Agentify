import { Play, Plus, Info, Target, XCircle, Clock, Loader2, Square, X } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '@/config/api';
import { getAuthHeader } from '@/services/authService';
import { toast } from 'sonner';

export interface JobStatus {
  isRunning: boolean;
  type?: 'ZERO_SCORE' | 'LOST_DEAL' | 'INACTIVITY' | null;
  startedAt: string | null;
  eligibleDeals: number;
  completedCalls: number;
  failedCalls: number;
  lastError: string | null;
  recentOutput: string[];
  dbStats: {
    pending: number;
    inProgress: number;
    completed: number;
    failed: number;
    total: number;
  };
}

type GatheringType = 'ZERO_SCORE' | 'LOST_DEAL' | 'INACTIVITY';

interface GatheringCard {
  id: GatheringType;
  title: string;
  description: string;
  subtitle: string;
  icon: React.ReactNode;
}

const GATHERING_CARDS: GatheringCard[] = [
  {
    id: 'ZERO_SCORE',
    title: 'Zero Score Calls',
    description: 'Gather pain points, champion & economic buyer',
    subtitle: '',
    icon: <Target className="h-4 w-4 text-brand" />,
  },
  {
    id: 'LOST_DEAL',
    title: 'Lost Deal Questionnaire',
    description: 'Gather loss reasons from Lost deals',
    subtitle: 'Calls "Lost" deal owners',
    icon: <XCircle className="h-4 w-4 text-brand" />,
  },
  {
    id: 'INACTIVITY',
    title: 'Inactivity Check',
    description: 'Follow up on stale deals (2+ weeks)',
    subtitle: 'Check status & next steps',
    icon: <Clock className="h-4 w-4 text-brand" />,
  },
];

const TRIGGER_ENDPOINTS: Record<GatheringType, string> = {
  ZERO_SCORE: '/logs/barrierx-info/trigger-zero-score',
  LOST_DEAL: '/logs/barrierx-info/trigger-lost-deal',
  INACTIVITY: '/logs/barrierx-info/trigger-inactivity',
};

const TYPE_LABELS: Record<GatheringType, string> = {
  ZERO_SCORE: 'Zero Score',
  LOST_DEAL: 'Lost Deal',
  INACTIVITY: 'Inactivity',
};

interface WorkflowCardProps {
  card: GatheringCard;
  jobStatus: JobStatus | null;
  onTrigger: (type: GatheringType) => void;
  onStop: () => void;
  triggering: boolean;
}

const WorkflowCard = ({ card, jobStatus, onTrigger, onStop, triggering }: WorkflowCardProps) => {
  const isThisRunning = jobStatus?.isRunning && jobStatus.type === card.id;
  const anyRunning = jobStatus?.isRunning;

  const getStatusText = () => {
    if (isThisRunning) {
      return `${jobStatus!.completedCalls}/${jobStatus!.eligibleDeals || '?'} completed`;
    }
    if (card.id === 'ZERO_SCORE' && jobStatus?.dbStats) {
      return `${jobStatus.dbStats.total} calls logged`;
    }
    return card.subtitle;
  };

  return (
    <div className="bg-white rounded-xl border border-default p-5 flex flex-col">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-4 bg-brand-light">
        {card.icon}
      </div>

      <h3 className="text-sm font-semibold text-heading mb-1">{card.title}</h3>
      <p className="text-sm text-subtle mb-4 flex-1">{card.description}</p>

      <p className="text-xs font-medium text-brand mb-3">
        {isThisRunning && <Loader2 className="inline h-3 w-3 animate-spin mr-1 align-text-bottom" />}
        {getStatusText()}
      </p>

      {isThisRunning ? (
        <button
          onClick={onStop}
          className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
        >
          <Square className="h-3.5 w-3.5" />
          Stop
        </button>
      ) : (
        <button
          onClick={() => onTrigger(card.id)}
          disabled={triggering || !!anyRunning}
          className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-hover text-white text-sm font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {triggering ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          Start Calls
        </button>
      )}
    </div>
  );
};

interface WorkflowActionsProps {
  onAddWorkflow?: () => void;
  onJobStatusChange?: (status: JobStatus | null) => void;
}

const WorkflowActions = ({ onAddWorkflow, onJobStatusChange }: WorkflowActionsProps) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [triggeringType, setTriggeringType] = useState<GatheringType | null>(null);
  const [isStopping, setIsStopping] = useState(false);
  const [dismissedError, setDismissedError] = useState(false);

  const fetchJobStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/logs/barrierx-info/zero-score-status`, {
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      });
      if (!response.ok) return;
      const data = await response.json();
      setJobStatus(data);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchJobStatus();
  }, [fetchJobStatus]);

  useEffect(() => {
    onJobStatusChange?.(jobStatus);
  }, [jobStatus, onJobStatusChange]);

  useEffect(() => {
    if (!jobStatus?.isRunning) return;
    const interval = setInterval(fetchJobStatus, 5000);
    return () => clearInterval(interval);
  }, [jobStatus?.isRunning, fetchJobStatus]);

  const handleTrigger = async (type: GatheringType) => {
    if (triggeringType || jobStatus?.isRunning) return;
    setTriggeringType(type);
    setDismissedError(false);

    setJobStatus(prev => ({
      ...prev,
      isRunning: true,
      type,
      startedAt: new Date().toISOString(),
      eligibleDeals: 0,
      completedCalls: 0,
      failedCalls: 0,
      lastError: null,
      recentOutput: [],
      dbStats: prev?.dbStats || { pending: 0, inProgress: 0, completed: 0, failed: 0, total: 0 },
    }));

    try {
      const response = await fetch(`${API_BASE_URL}${TRIGGER_ENDPOINTS[type]}`, {
        method: 'POST',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const error = await response.json();
        setJobStatus(prev => prev ? { ...prev, isRunning: false, lastError: error.message } : null);
        toast.error('Failed to start calls', { description: error.message });
      } else {
        const label = GATHERING_CARDS.find(c => c.id === type)?.title || type;
        toast.success(`${label} started!`);
        setTimeout(fetchJobStatus, 1000);
      }
    } catch {
      setJobStatus(prev => prev ? { ...prev, isRunning: false } : null);
      toast.error('Failed to start calls');
    } finally {
      setTriggeringType(null);
    }
  };

  const handleStop = async () => {
    if (isStopping || !jobStatus?.isRunning) return;
    setIsStopping(true);
    setJobStatus(prev => prev ? { ...prev, isRunning: false } : null);

    try {
      const response = await fetch(`${API_BASE_URL}/logs/barrierx-info/stop-zero-score`, {
        method: 'POST',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        setJobStatus(prev => prev ? { ...prev, isRunning: true } : null);
        toast.error('Failed to stop calls');
      } else {
        toast.success('Calls stopped');
        await fetchJobStatus();
      }
    } catch {
      setJobStatus(prev => prev ? { ...prev, isRunning: true } : null);
      toast.error('Failed to stop calls');
    } finally {
      setIsStopping(false);
    }
  };

  const showError = jobStatus?.lastError && !jobStatus.isRunning && !dismissedError;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-heading">Workflow Actions</h2>
          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="p-0.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              <Info className="h-4 w-4 text-gray-400" />
            </button>
            {showTooltip && (
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg z-10">
                Trigger automated info gathering calls to deal owners. Only one campaign can run at a time.
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
              </div>
            )}
          </div>
        </div>
        <button
          onClick={onAddWorkflow}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-brand hover:bg-brand-hover px-3.5 py-2 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add workflow
        </button>
      </div>

      {/* Running Job Status Bar */}
      {jobStatus?.isRunning && jobStatus.type && (
        <div className="mb-4 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
            <div className="text-sm">
              <span className="font-semibold text-amber-800">
                {TYPE_LABELS[jobStatus.type]} calls in progress
              </span>
              <span className="text-amber-600 ml-2">
                &bull; {jobStatus.completedCalls}/{jobStatus.eligibleDeals || '?'} completed
                {jobStatus.failedCalls > 0 && (
                  <span className="text-red-500 ml-1">
                    &bull; {jobStatus.failedCalls} failed
                  </span>
                )}
              </span>
            </div>
          </div>
          <button
            onClick={handleStop}
            disabled={isStopping}
            className="inline-flex items-center gap-1.5 text-sm font-medium border border-amber-300 text-amber-700 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {isStopping ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Square className="h-3.5 w-3.5" />
            )}
            Stop All
          </button>
        </div>
      )}

      {/* Persistent Error Banner */}
      {showError && (
        <div className="mb-4 flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <XCircle className="h-4 w-4 text-red-500 shrink-0" />
            <span className="font-medium text-red-700">Last Error:</span>
            <span className="text-red-600">{jobStatus!.lastError}</span>
          </div>
          <button
            onClick={() => setDismissedError(true)}
            className="p-1 rounded-md hover:bg-red-100 transition-colors"
          >
            <X className="h-3.5 w-3.5 text-red-400" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {GATHERING_CARDS.map((card) => (
          <WorkflowCard
            key={card.id}
            card={card}
            jobStatus={jobStatus}
            onTrigger={handleTrigger}
            onStop={handleStop}
            triggering={triggeringType === card.id}
          />
        ))}
      </div>
    </div>
  );
};

export default WorkflowActions;
