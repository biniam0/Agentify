import { useEffect } from 'react';
import {
  X,
  ExternalLink,
  Building2,
  User,
  Phone,
  Mail,
  Clock,
  Search,
  FileText,
  CalendarDays,
  CheckCircle2,
  Circle,
  Sparkles,
  AlertCircle,
  Star,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { V2Deal, RiskLevel } from '../data/types';

const RISK_COLOR: Record<RiskLevel, { bg: string; text: string; border: string }> = {
  'Low risk': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Medium risk': { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
  'High risk': { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
};

const STATUS_BADGE: Record<string, string> = {
  'Closed Lost': 'bg-red-100 text-red-700',
  'Budgetary Letter': 'bg-orange-100 text-orange-700',
  'Negotiation': 'bg-blue-100 text-blue-700',
  'Proposal': 'bg-purple-100 text-purple-700',
  'Verbal Agreement': 'bg-emerald-100 text-emerald-700',
  'Closed Won': 'bg-green-100 text-green-700',
};

const NEXT_STEP_ICONS = {
  search: Search,
  document: FileText,
  calendar: CalendarDays,
} as const;

// ── Sub-components ──────────────────────────────────────────────

const ModalHeader = ({ deal, onClose }: { deal: V2Deal; onClose: () => void }) => (
  <div className="sticky top-0 bg-white z-10 px-6 pt-5 pb-4 border-b border-gray-200">
    <div className="flex items-start justify-between mb-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-lg font-semibold text-gray-900 truncate">
            {deal.companyName}, {deal.companySubtitle}
          </h2>
          {deal.analysisTag && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-600">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              {deal.analysisTag}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
        <a
          href="#"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Open in HubSpot
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X className="h-5 w-5 text-gray-400" />
        </button>
      </div>
    </div>
    <div className="flex items-center gap-3 text-sm text-gray-500">
      <span className={cn('px-2.5 py-0.5 text-xs font-medium rounded-full', STATUS_BADGE[deal.status] || 'bg-gray-100 text-gray-600')}>
        {deal.status}
      </span>
      <span className="inline-flex items-center gap-1">
        <Building2 className="h-3.5 w-3.5" />
        {deal.companyName}
      </span>
      <span className="inline-flex items-center gap-1">
        <User className="h-3.5 w-3.5" />
        {deal.contact.name}
      </span>
    </div>
  </div>
);

const DealOutcomeCard = ({ deal }: { deal: V2Deal }) => {
  const risk = RISK_COLOR[deal.riskLevel];
  return (
    <div className="flex items-start justify-between bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
          <X className="h-5 w-5 text-red-500" />
        </div>
        <div>
          <p className="text-base font-semibold text-gray-900">{deal.dealOutcome || 'Deal Lost'}</p>
          <p className="text-sm text-gray-500">{deal.dealOutcomeReason || 'Unknown reason'}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className={cn('w-11 h-11 rounded-full flex items-center justify-center border-2', risk.border, risk.bg)}>
          <span className={cn('text-sm font-bold', risk.text)}>{deal.barrierScore}</span>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">BarrierX</p>
          <p className={cn('text-xs font-semibold', risk.text)}>{deal.riskLevel}</p>
        </div>
      </div>
    </div>
  );
};

const DealInsightCard = ({ deal }: { deal: V2Deal }) => {
  if (!deal.insight) return null;
  return (
    <div className="bg-gray-50 rounded-xl p-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Deal Insight</p>
      <div className="space-y-4">
        <InsightRow
          icon={<AlertCircle className="h-4 w-4 text-red-500" />}
          iconBg="bg-red-100"
          label="Why Lost"
          value={deal.insight.whyLost}
        />
        <InsightRow
          icon={<Star className="h-4 w-4 text-orange-500" />}
          iconBg="bg-orange-100"
          label="Competitor"
          value={deal.insight.competitor}
        />
        <InsightRow
          icon={<MapPin className="h-4 w-4 text-emerald-600" />}
          iconBg="bg-emerald-100"
          label="What To Do Next"
          value={deal.insight.whatToDoNext}
          highlighted
        />
      </div>
    </div>
  );
};

const InsightRow = ({
  icon,
  iconBg,
  label,
  value,
  highlighted,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  highlighted?: boolean;
}) => (
  <div className="flex items-start gap-3">
    <div className={cn('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0', iconBg)}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-xs font-semibold text-gray-400 mb-0.5">{label}</p>
      <p className={cn('text-sm text-gray-700', highlighted && 'bg-emerald-50 px-2 py-1 rounded-md font-medium')}>
        {value}
      </p>
    </div>
  </div>
);

const AiAnalysisCard = ({ deal }: { deal: V2Deal }) => {
  if (!deal.aiAnalysis) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-violet-500" />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">AI Analysis</p>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed mb-4">{deal.aiAnalysis.summary}</p>
      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <div className="w-5 h-5 rounded flex items-center justify-center bg-red-100 flex-shrink-0 mt-0.5">
            <AlertCircle className="h-3 w-3 text-red-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-red-600 uppercase mb-0.5">Impact</p>
            <p className="text-sm text-gray-600">{deal.aiAnalysis.impact}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="w-5 h-5 rounded flex items-center justify-center bg-orange-100 flex-shrink-0 mt-0.5">
            <AlertCircle className="h-3 w-3 text-orange-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-orange-600 uppercase mb-0.5">Recommendation</p>
            <p className="text-sm text-gray-600">{deal.aiAnalysis.recommendation}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const RecommendedNextSteps = ({ deal }: { deal: V2Deal }) => {
  if (!deal.recommendedNextSteps?.length) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider mb-3">
        Recommended Next Steps
      </p>
      <div className="grid grid-cols-3 gap-3">
        {deal.recommendedNextSteps.map((step) => {
          const Icon = NEXT_STEP_ICONS[step.icon];
          return (
            <button
              key={step.id}
              className="flex flex-col items-start gap-2 p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-colors text-left"
            >
              <Icon className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">{step.title}</p>
                <p className="text-xs text-gray-500">{step.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const ClientDetails = ({ deal }: { deal: V2Deal }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-5">
    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Client Details</p>
    <div className="grid grid-cols-2 gap-3">
      <div className="flex items-center gap-2 text-sm text-gray-700">
        <User className="h-4 w-4 text-gray-400" />
        {deal.contact.name}
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-700">
        <Building2 className="h-4 w-4 text-gray-400" />
        {deal.companyName}
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-700">
        <Phone className="h-4 w-4 text-gray-400" />
        {deal.contact.phone}
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-700">
        <Mail className="h-4 w-4 text-gray-400" />
        {deal.contact.email}
      </div>
    </div>
  </div>
);

const CallTimeline = ({ deal }: { deal: V2Deal }) => {
  if (!deal.timeline?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Call timeline</p>
        <span className="text-xs text-gray-400">{deal.totalTimelineEvents || deal.timeline.length} events</span>
      </div>
      <div className="space-y-3">
        {deal.timeline.map((event) => (
          <div key={event.id} className="flex items-start gap-3">
            {event.completed ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            ) : (
              <Circle className="h-5 w-5 text-gray-300 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">{event.title}</p>
              <p className="text-xs text-gray-500">{event.description}</p>
            </div>
          </div>
        ))}
      </div>
      <button className="mt-3 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
        View all timeline
      </button>
    </div>
  );
};

const ModalFooter = ({ deal }: { deal: V2Deal }) => (
  <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-3 flex items-center justify-between text-xs text-gray-400">
    <div className="flex items-center gap-4">
      <span>Deal ID: {deal.dealExternalId || deal.id}</span>
      {deal.conversationId && <span>Conv ID: {deal.conversationId}</span>}
    </div>
    {deal.duration && (
      <span className="inline-flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Duration: {deal.duration}
      </span>
    )}
  </div>
);

// ── Main Modal ──────────────────────────────────────────────────

interface DealDetailModalProps {
  deal: V2Deal;
  onClose: () => void;
}

const DealDetailModal = ({ deal, onClose }: DealDetailModalProps) => {
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
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-[780px] max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <ModalHeader deal={deal} onClose={onClose} />

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <DealOutcomeCard deal={deal} />
          <DealInsightCard deal={deal} />
          <AiAnalysisCard deal={deal} />
          <RecommendedNextSteps deal={deal} />

          <div className="grid grid-cols-2 gap-4">
            <ClientDetails deal={deal} />
            <CallTimeline deal={deal} />
          </div>
        </div>

        <ModalFooter deal={deal} />
      </div>
    </div>
  );
};

export default DealDetailModal;
