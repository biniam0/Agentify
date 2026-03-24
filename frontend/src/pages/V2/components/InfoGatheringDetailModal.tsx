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
  Star,
  MapPin,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BarrierXInfoRecord } from './InfoGatheringTable';

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-red-100 text-red-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  SKIPPED: 'bg-gray-100 text-gray-700',
};

const formatDuration = (seconds?: number | null) => {
  if (!seconds) return '--';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
};

const formatTimestamp = (ts?: string | null) => {
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

const ModalHeader = ({ record, onClose }: { record: BarrierXInfoRecord; onClose: () => void }) => (
  <div className="sticky top-0 bg-white z-10 px-6 pt-5 pb-4 border-b border-default">
    <div className="flex items-start justify-between mb-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h2 className="text-lg font-semibold text-heading truncate">
            {record.dealName || 'Unknown Deal'}
          </h2>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            {record.gatheringType.replace('_', ' ')}
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
      <span className={cn('px-2.5 py-0.5 text-xs font-medium rounded-full', STATUS_STYLES[record.status] || 'bg-gray-100 text-gray-600')}>
        {record.status.replace('_', ' ')}
      </span>
      <span className="inline-flex items-center gap-1">
        <Building2 className="h-3.5 w-3.5" />
        {record.companyName || 'Unknown Company'}
      </span>
      <span className="inline-flex items-center gap-1">
        <User className="h-3.5 w-3.5" />
        {record.ownerName}
      </span>
    </div>
  </div>
);

const CallOutcomeCard = ({ record }: { record: BarrierXInfoRecord }) => {
  const isSuccess = record.status === 'COMPLETED';
  const isFailed = record.status === 'FAILED' || record.status === 'SKIPPED';

  // Mock barrier score for now
  const barrierScore = isFailed ? 82 : isSuccess ? 12 : 45;
  const riskLevel = isFailed ? 'High Risk' : isSuccess ? 'Low Risk' : 'Medium Risk';
  const isHighRisk = barrierScore >= 80;
  const isLowRisk = barrierScore <= 30;

  return (
    <div className="flex items-start justify-between bg-white border border-default rounded-xl p-5 shadow-sm relative overflow-hidden">
      {isFailed && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#DB475D]" />}
      
      <div className="flex items-start gap-3">
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
          isSuccess ? 'bg-emerald-100' : isFailed ? 'bg-red-50' : 'bg-gray-100'
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
            {isSuccess ? 'Deal Won' : isFailed ? 'Deal Lost' : record.status.replace('_', ' ')}
          </p>
          <p className="text-sm text-subtle">
            {record.lossReason || `Automated info gathering via ${record.gatheringType.replace('_', ' ').toLowerCase()}`}
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

const GATHERING_TYPE_CONFIG: Record<string, { title: string; fields: { key: keyof BarrierXInfoRecord; label: string; icon: React.ReactNode; iconBg: string; highlighted?: boolean }[] }> = {
  LOST_DEAL: {
    title: 'LOST DEAL INSIGHT',
    fields: [
      { key: 'lossReason', label: 'Loss Reason', icon: <AlertCircle className="h-4 w-4 text-red-500" />, iconBg: 'bg-red-100' },
      { key: 'competitorName', label: 'Lost To (Competitor)', icon: <Star className="h-4 w-4 text-orange-500" />, iconBg: 'bg-orange-100' },
      { key: 'lessonsLearned', label: 'Lessons Learned', icon: <MapPin className="h-4 w-4 text-emerald-600" />, iconBg: 'bg-emerald-100', highlighted: true },
    ],
  },
  ZERO_SCORE: {
    title: 'ZERO SCORE INSIGHT',
    fields: [
      { key: 'quantifiedPainPoints', label: 'Quantified Pain Points', icon: <Target className="h-4 w-4 text-blue-500" />, iconBg: 'bg-blue-100' },
      { key: 'championInfo', label: 'Champion', icon: <User className="h-4 w-4 text-emerald-600" />, iconBg: 'bg-emerald-100' },
      { key: 'economicBuyerInfo', label: 'Economic Buyer', icon: <Building2 className="h-4 w-4 text-purple-600" />, iconBg: 'bg-purple-100', highlighted: true },
    ],
  },
  INACTIVITY: {
    title: 'INACTIVITY INSIGHT',
    fields: [
      { key: 'inactivityStatus', label: 'Current Status', icon: <Clock className="h-4 w-4 text-blue-500" />, iconBg: 'bg-blue-100' },
      { key: 'inactivityBlockers', label: 'Blockers', icon: <AlertCircle className="h-4 w-4 text-orange-500" />, iconBg: 'bg-orange-100' },
      { key: 'inactivityNextSteps', label: 'Next Steps', icon: <MapPin className="h-4 w-4 text-emerald-600" />, iconBg: 'bg-emerald-100', highlighted: true },
    ],
  },
};

const DealInsightCard = ({ record }: { record: BarrierXInfoRecord }) => {
  const config = GATHERING_TYPE_CONFIG[record.gatheringType];
  if (!config) return null;

  return (
    <div className="bg-gray-50 rounded-xl p-5">
      <p className="text-[11px] font-semibold text-subtle uppercase tracking-wider mb-4">{config.title}</p>
      <div className="space-y-4">
        {config.fields.map((field) => (
          <InsightRow
            key={field.key}
            icon={field.icon}
            iconBg={field.iconBg}
            label={field.label}
            value={(record[field.key] as string) || 'Not captured'}
            highlighted={field.highlighted}
            empty={!record[field.key]}
          />
        ))}
      </div>
    </div>
  );
};

const InsightRow = ({ icon, iconBg, label, value, highlighted, empty }: { icon: React.ReactNode; iconBg: string; label: string; value: string; highlighted?: boolean; empty?: boolean }) => (
  <div className="flex items-start gap-3">
    <div className={cn('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0', iconBg)}>
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-xs font-semibold text-gray-400 mb-0.5">{label}</p>
      <p className={cn(
        'text-sm whitespace-pre-wrap',
        empty ? 'text-gray-400 italic' : 'text-gray-700',
        highlighted && !empty && 'bg-emerald-50 px-2 py-1 rounded-md font-medium',
      )}>
        {value}
      </p>
    </div>
  </div>
);

const AiAnalysisCard = ({ record }: { record: BarrierXInfoRecord }) => {
  if (!record.transcriptSummary) return null;

  return (
    <div className="bg-white border border-default rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-brand" />
        <p className="text-xs font-semibold text-subtle uppercase tracking-wider">AI Analysis</p>
      </div>
      <p className="text-sm text-body leading-relaxed mb-4">{record.transcriptSummary}</p>
    </div>
  );
};


const ClientDetails = ({ record }: { record: BarrierXInfoRecord }) => (
  <div className="bg-white border border-default rounded-xl p-5">
    <p className="text-xs font-semibold text-subtle uppercase tracking-wider mb-3">Client Details</p>
    <div className="grid grid-cols-2 gap-3">
      <div className="flex items-center gap-2 text-sm text-body">
        <User className="h-4 w-4 text-subtle" />
        {record.ownerName}
      </div>
      <div className="flex items-center gap-2 text-sm text-body">
        <Building2 className="h-4 w-4 text-subtle" />
        {record.companyName || 'Unknown Company'}
      </div>
      <div className="flex items-center gap-2 text-sm text-body">
        <Phone className="h-4 w-4 text-subtle" />
        {record.ownerPhone || '--'}
      </div>
      <div className="flex items-center gap-2 text-sm text-body">
        <Mail className="h-4 w-4 text-subtle" />
        {record.ownerEmail}
      </div>
    </div>
  </div>
);

const CallTimelineCard = ({ record }: { record: BarrierXInfoRecord }) => {
  const events = [
    { id: '1', title: 'Call Initiated', description: formatTimestamp(record.initiatedAt), completed: true },
    ...(record.answeredAt ? [{ id: '2', title: 'Call Answered', description: formatTimestamp(record.answeredAt), completed: true }] : []),
    ...(record.completedAt ? [{ id: '3', title: 'Call Completed', description: formatTimestamp(record.completedAt), completed: true }] : []),
    ...(record.status === 'FAILED' ? [{ id: '4', title: 'Call Failed', description: record.lossReason || 'Unknown error', completed: false }] : []),
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

const ModalFooter = ({ record }: { record: BarrierXInfoRecord }) => (
  <div className="sticky bottom-0 bg-gray-50 border-t border-default px-6 py-3 flex items-center justify-between text-xs text-subtle">
    <div className="flex items-center gap-4">
      {record.conversationId && <span>Conv ID: {record.conversationId}</span>}
      {record.callSid && <span>Call SID: {record.callSid}</span>}
    </div>
    <span className="inline-flex items-center gap-1">
      <Clock className="h-3 w-3" />
      Duration: {formatDuration(record.callDuration)}
    </span>
  </div>
);

// ── Main Modal ──────────────────────────────────────────────────

interface InfoGatheringDetailModalProps {
  record: BarrierXInfoRecord;
  onClose: () => void;
}

const InfoGatheringDetailModal = ({ record, onClose }: InfoGatheringDetailModalProps) => {
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
        <ModalHeader record={record} onClose={onClose} />

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <CallOutcomeCard record={record} />
          <DealInsightCard record={record} />
          <AiAnalysisCard record={record} />

          <div className="grid grid-cols-2 gap-4">
            <ClientDetails record={record} />
            <CallTimelineCard record={record} />
          </div>
        </div>

        <ModalFooter record={record} />
      </div>
    </div>
  );
};

export default InfoGatheringDetailModal;
