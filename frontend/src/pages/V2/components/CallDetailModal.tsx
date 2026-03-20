import { useEffect } from 'react';
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
        <h2 className="text-lg font-semibold text-heading truncate">
          {log.dealName || 'Unknown Deal'}
        </h2>
        <p className="text-sm text-subtle truncate">{log.meetingTitle}</p>
      </div>
      <button
        onClick={onClose}
        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors ml-4 flex-shrink-0"
      >
        <X className="h-5 w-5 text-gray-400" />
      </button>
    </div>
    <div className="flex items-center gap-3 text-sm text-subtle">
      <span className={cn('px-2.5 py-0.5 text-xs font-medium rounded-full', STATUS_STYLES[log.status] || 'bg-gray-100 text-gray-600')}>
        {log.status.replace('_', ' ')}
      </span>
      <span className={cn('px-2.5 py-0.5 text-xs font-medium rounded-full', log.callType === 'PRE_CALL' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700')}>
        {log.callType.replace('_', ' ')}
      </span>
      <span className="inline-flex items-center gap-1">
        <User className="h-3.5 w-3.5" />
        {log.userName}
      </span>
    </div>
  </div>
);

const CallOutcomeCard = ({ log }: { log: CallLog }) => {
  const isSuccess = log.callSuccessful === true;
  const isFailed = log.status === 'FAILED' || log.status === 'NO_ANSWER' || log.status === 'BUSY';

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
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-right">
          <p className="text-xl font-bold text-brand">{formatDuration(log.duration)}</p>
          <p className="text-xs text-subtle">Duration</p>
        </div>
      </div>
    </div>
  );
};

const TranscriptCard = ({ log }: { log: CallLog }) => {
  if (!log.transcriptSummary) return null;
  return (
    <div className="bg-white border border-default rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-violet-500" />
        <p className="text-xs font-semibold text-subtle uppercase tracking-wider">Transcript Summary</p>
      </div>
      <p className="text-sm text-body leading-relaxed">{log.transcriptSummary}</p>
    </div>
  );
};

const FailureCard = ({ log }: { log: CallLog }) => {
  if (!log.failureReason) return null;
  return (
    <div className="bg-red-50/50 border border-red-200 rounded-xl p-5">
      <div className="flex items-start gap-2">
        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs font-semibold text-red-700 uppercase mb-1">Failure Reason</p>
          <p className="text-sm text-red-600">{log.failureReason}</p>
        </div>
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
          <FailureCard log={log} />
          <TranscriptCard log={log} />

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
