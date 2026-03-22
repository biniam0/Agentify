import { useEffect, useMemo } from 'react';
import {
  X,
  Phone,
  User,
  Building2,
  Mail,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  Sparkles,
  Star,
  MapPin,
  Search,
  FileText,
  CalendarDays,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CallLog } from '@/services/loggingService';

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-red-100 text-red-700',
  NO_ANSWER: 'bg-orange-100 text-orange-700',
  BUSY: 'bg-amber-100 text-amber-700',
  INITIATED: 'bg-blue-100 text-blue-700',
  RINGING: 'bg-cyan-100 text-cyan-700',
  ANSWERED: 'bg-teal-100 text-teal-700',
};

const formatDuration = (seconds?: number) => {
  if (!seconds) return '--';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
};

const formatTimestamp = (ts?: string) => {
  if (!ts) return null;
  return new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

// ── Sub-components ──────────────────────────────────────────────

const ModalHeader = ({ log, onClose }: { log: CallLog; onClose: () => void }) => (
  <div className="sticky top-0 bg-white z-10 px-6 pt-5 pb-4 border-b border-default">
    <div className="flex items-start justify-between mb-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h2 className="text-lg font-semibold text-heading truncate">
            {log.dealName || 'Unknown Deal'}
          </h2>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            {log.callType === 'POST_CALL' ? 'Post Call Analysis' : 'Pre Call Prep'}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
        <a
          href="#"
          className="inline-flex items-center gap-1 text-sm text-subtle hover:text-heading transition-colors"
        >
          Open in HubSpot
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
        </a>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X className="h-5 w-5 text-gray-400" />
        </button>
      </div>
    </div>
    <div className="flex items-center gap-3 text-sm text-subtle">
      <span className={cn('px-2.5 py-0.5 text-xs font-medium rounded-full', STATUS_STYLES[log.status] || 'bg-gray-100 text-gray-600')}>
        {log.status.replace('_', ' ')}
      </span>
      <span className="inline-flex items-center gap-1">
        <Building2 className="h-3.5 w-3.5" />
        {log.dealName ? log.dealName.split(',')[0] : 'Unknown Company'}
      </span>
      <span className="inline-flex items-center gap-1">
        <User className="h-3.5 w-3.5" />
        {log.ownerName || log.userName}
      </span>
    </div>
  </div>
);

const CallOutcomeCard = ({ log }: { log: CallLog }) => {
  const isSuccess = log.callSuccessful === true;
  const isFailed = log.status === 'FAILED' || log.status === 'NO_ANSWER' || log.status === 'BUSY';

  // Mock barrier score for now
  const barrierScore = 12;
  const riskLevel = 'High Risk';
  const isHighRisk = barrierScore < 30;

  return (
    <div className="flex items-start justify-between bg-white border border-default rounded-xl p-5">
      <div className="flex items-start gap-3">
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
          isSuccess ? 'bg-emerald-100' : isFailed ? 'bg-red-100' : 'bg-gray-100'
        )}>
          {isSuccess ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : isFailed ? (
            <X className="h-5 w-5 text-red-500" />
          ) : (
            <Phone className="h-5 w-5 text-gray-500" />
          )}
        </div>
        <div>
          <p className="text-base font-semibold text-heading">
            {isSuccess ? 'Call Completed' : isFailed ? 'Call Failed' : log.status.replace('_', ' ')}
          </p>
          <p className="text-sm text-subtle">
            {log.failureReason || `${log.triggerSource} trigger via ${log.callType.replace('_', ' ').toLowerCase()}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0 bg-white border border-default rounded-xl px-4 py-2 shadow-sm">
        <div className={cn(
          'w-11 h-11 rounded-full flex items-center justify-center border-2',
          isHighRisk ? 'border-red-200 bg-red-50 text-red-600' : 
          isLowRisk ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 
          'border-orange-200 bg-orange-50 text-orange-600'
        )}>
          <span className="text-sm font-bold">{barrierScore}</span>
        </div>
        <div className="text-left">
          <p className="text-[10px] font-semibold text-subtle uppercase tracking-wide">BARRIERX</p>
          <p className={cn(
            'text-xs font-semibold', 
            isHighRisk ? 'text-red-600' : 
            isLowRisk ? 'text-emerald-700' : 
            'text-orange-600'
          )}>
            {riskLevel}
          </p>
        </div>
      </div>
    </div>
  );
};

const AiAnalysisCard = ({ log }: { log: CallLog }) => {
  if (!log.transcriptSummary) return null;
  
  // Try to parse webhookData to extract impact/recommendation if available
  let impact = "Missed opportunity to educate the economic buyer early — similar pattern seen in 3 other lost deals this quarter.";
  let recommendation = "Introduce an executive briefing step before proposal stage to align economic buyers on platform value.";
  
  try {
    if (log.webhookData) {
      const parsed = typeof log.webhookData === 'string' ? JSON.parse(log.webhookData) : log.webhookData;
      if (parsed?.data?.analysis?.data_collection_results) {
        const results = parsed.data.analysis.data_collection_results;
        if (results.impact) impact = results.impact;
        if (results.recommendation) recommendation = results.recommendation;
      }
    }
  } catch (e) {
    // Ignore parse errors
  }

  return (
    <div className="bg-white border border-default rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-brand" />
        <p className="text-xs font-semibold text-subtle uppercase tracking-wider">AI Analysis</p>
      </div>
      <p className="text-sm text-body leading-relaxed mb-4">{log.transcriptSummary}</p>
      
      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <div className="w-5 h-5 rounded flex items-center justify-center bg-orange-100 flex-shrink-0 mt-0.5">
            <AlertCircle className="h-3 w-3 text-orange-500" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-orange-600 uppercase mb-0.5">Impact</p>
            <p className="text-sm text-body">{impact}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="w-5 h-5 rounded flex items-center justify-center bg-orange-100 flex-shrink-0 mt-0.5">
            <Star className="h-3 w-3 text-orange-500" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-orange-600 uppercase mb-0.5">Recommendation</p>
            <p className="text-sm text-body">{recommendation}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const RecommendedNextSteps = ({ log }: { log: CallLog }) => {
  // Mock data for now since this isn't in the CallLog API
  const steps = [
    { id: '1', title: 'Review Similar Deal', description: 'Find deals lost to internal decisions', icon: Search },
    { id: '2', title: 'Update Sales Playbook', description: 'Add executive briefing step', icon: FileText },
    { id: '3', title: 'Schedule Team Review', description: 'Discuss pattern with sales team', icon: CalendarDays },
  ];

  return (
    <div>
      <p className="text-[11px] font-semibold text-brand uppercase tracking-wider mb-3">
        RECOMMENDED NEXT STEPS
      </p>
      <div className="grid grid-cols-3 gap-3">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <button
              key={step.id}
              className="flex flex-col items-start gap-2 p-4 bg-white border border-default rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-colors text-left"
            >
              <Icon className="h-4 w-4 text-subtle" />
              <div>
                <p className="text-sm font-medium text-heading">{step.title}</p>
                <p className="text-xs text-subtle">{step.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const CallTimelineCard = ({ log }: { log: CallLog }) => {
  const events = [
    { id: '1', title: 'Call Initiated', description: formatTimestamp(log.initiatedAt), completed: true },
    ...(log.answeredAt ? [{ id: '2', title: 'Call Answered', description: formatTimestamp(log.answeredAt), completed: true }] : []),
    ...(log.completedAt ? [{ id: '3', title: 'Call Completed', description: formatTimestamp(log.completedAt), completed: true }] : []),
    ...(log.status === 'FAILED' ? [{ id: '4', title: 'Call Failed', description: log.failureReason || 'Unknown error', completed: false }] : []),
  ];

  return (
    <div className="bg-white border border-default rounded-xl p-5">
      <p className="text-xs font-semibold text-subtle uppercase tracking-wider mb-3">Call Timeline</p>
      <div className="space-y-3">
        {events.map((event) => (
          <div key={event.id} className="flex items-start gap-3">
            {event.completed ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            ) : (
              <Circle className="h-5 w-5 text-red-300 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-sm font-medium text-heading">{event.title}</p>
              <p className="text-xs text-subtle">{event.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ContactDetails = ({ log }: { log: CallLog }) => (
  <div className="bg-white border border-default rounded-xl p-5">
    <p className="text-xs font-semibold text-subtle uppercase tracking-wider mb-3">Contact Details</p>
    <div className="grid grid-cols-2 gap-3">
      <div className="flex items-center gap-2 text-sm text-body">
        <User className="h-4 w-4 text-subtle" />
        {log.userName}
      </div>
      <div className="flex items-center gap-2 text-sm text-body">
        <Building2 className="h-4 w-4 text-subtle" />
        {log.dealName || 'Unknown Deal'}
      </div>
      <div className="flex items-center gap-2 text-sm text-body">
        <Phone className="h-4 w-4 text-subtle" />
        {log.phoneNumber || '--'}
      </div>
      <div className="flex items-center gap-2 text-sm text-body">
        <Mail className="h-4 w-4 text-subtle" />
        {log.userEmail}
      </div>
    </div>
  </div>
);

const ModalFooter = ({ log }: { log: CallLog }) => (
  <div className="sticky bottom-0 bg-gray-50 border-t border-default px-6 py-3 flex items-center justify-between text-xs text-subtle">
    <div className="flex items-center gap-4">
      {log.conversationId && <span>Conv ID: {log.conversationId}</span>}
      {log.callSid && <span>Call SID: {log.callSid}</span>}
    </div>
    <span className="inline-flex items-center gap-1">
      <Clock className="h-3 w-3" />
      Duration: {formatDuration(log.duration)}
    </span>
  </div>
);

// ── Main Modal ──────────────────────────────────────────────────

interface CallDetailModalProps {
  log: CallLog;
  onClose: () => void;
}

const CallDetailModal = ({ log, onClose }: CallDetailModalProps) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-[780px] max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <ModalHeader log={log} onClose={onClose} />

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <CallOutcomeCard log={log} />
          <AiAnalysisCard log={log} />
          <RecommendedNextSteps log={log} />

          <div className="grid grid-cols-2 gap-4">
            <ContactDetails log={log} />
            <CallTimelineCard log={log} />
          </div>
        </div>

        <ModalFooter log={log} />
      </div>
    </div>
  );
};

export default CallDetailModal;
