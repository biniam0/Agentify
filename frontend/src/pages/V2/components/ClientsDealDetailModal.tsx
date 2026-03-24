import { useEffect, useState } from 'react';
import {
  X,
  Phone,
  User,
  Building2,
  Mail,
  Clock,
  Target,
  XCircle,
  TrendingUp,
  Calendar,
  Loader2,
  PhoneOutgoing,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Deal, GatheringType } from '@/services/dealService';
import * as dealService from '@/services/dealService';

// ── Gathering type configuration ────────────────────────────────

const GATHERING_CONFIG: Record<GatheringType, {
  label: string;
  shortLabel: string;
  description: string;
  icon: typeof Target;
  color: string;
  bgColor: string;
  borderColor: string;
  hoverBg: string;
}> = {
  ZERO_SCORE: {
    label: 'Zero Score Analysis',
    shortLabel: 'Zero Score',
    description: 'Gather quantified pain points, champion info & economic buyer details',
    icon: Target,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    hoverBg: 'hover:bg-blue-100',
  },
  LOST_DEAL: {
    label: 'Lost Deal Questionnaire',
    shortLabel: 'Lost Deal',
    description: 'Understand loss reasons, competitor info & lessons learned',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    hoverBg: 'hover:bg-red-100',
  },
  INACTIVITY: {
    label: 'Inactivity Check',
    shortLabel: 'Inactivity',
    description: 'Check current deal status, blockers & planned next steps',
    icon: Clock,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    hoverBg: 'hover:bg-orange-100',
  },
};

// ── Helpers ─────────────────────────────────────────────────────

const formatAmount = (amount?: number) => {
  if (!amount) return '--';
  if (amount >= 1_000_000) return `€${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `€${(amount / 1_000).toFixed(1)}K`;
  return `€${amount}`;
};

const formatDate = (ts?: string) => {
  if (!ts) return '--';
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
};

const formatStageName = (stage?: string) => {
  if (!stage) return 'Unknown';
  return stage.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim();
};

const getStageBadgeStyle = (stage?: string): string => {
  const s = stage?.toLowerCase().replace(/\s+/g, '') || '';
  if (s.includes('closedwon') || s.includes('won')) return 'bg-emerald-100 text-emerald-700';
  if (s.includes('closedlost') || s.includes('lost')) return 'bg-red-100 text-red-700';
  if (s.includes('appointment')) return 'bg-orange-100 text-orange-700';
  if (s.includes('qualified')) return 'bg-blue-100 text-blue-700';
  if (s.includes('contract')) return 'bg-teal-100 text-teal-700';
  return 'bg-gray-100 text-gray-700';
};

const hasZeroScore = (riskScores?: Deal['riskScores']) => {
  if (!riskScores) return true;
  return riskScores.arenaRisk === 0 && riskScores.controlRoomRisk === 0 &&
    riskScores.scoreCardRisk === 0 && riskScores.totalDealRisk === 0;
};

// ── Sub-components ──────────────────────────────────────────────

const ModalHeader = ({ deal, onClose }: { deal: Deal; onClose: () => void }) => (
  <div className="sticky top-0 bg-white z-10 px-6 pt-5 pb-4 border-b border-default">
    <div className="flex items-start justify-between mb-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h2 className="text-lg font-semibold text-heading truncate">
            {deal.dealName}
          </h2>
          <span className={cn(
            'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full',
            getStageBadgeStyle(deal.stage)
          )}>
            {formatStageName(deal.stage)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
        <a
          href="#"
          className="inline-flex items-center gap-1 text-sm text-subtle hover:text-heading transition-colors"
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
    <div className="flex items-center gap-3 text-sm text-subtle">
      {deal.company && (
        <span className="inline-flex items-center gap-1">
          <Building2 className="h-3.5 w-3.5" />
          {deal.company}
        </span>
      )}
      {deal.owner?.name && (
        <span className="inline-flex items-center gap-1">
          <User className="h-3.5 w-3.5" />
          {deal.owner.name}
        </span>
      )}
      {deal.tenantName && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded-md text-xs">
          {deal.tenantName}
        </span>
      )}
    </div>
  </div>
);

const DealOverviewCard = ({ deal }: { deal: Deal }) => {
  const isZero = hasZeroScore(deal.riskScores);
  const total = deal.riskScores?.totalDealRisk || 0;

  return (
    <div className="bg-white border border-default rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
            isZero ? 'bg-blue-50' : total >= 70 ? 'bg-red-50' : total >= 40 ? 'bg-amber-50' : 'bg-emerald-50'
          )}>
            <TrendingUp className={cn(
              'h-5 w-5',
              isZero ? 'text-blue-500' : total >= 70 ? 'text-red-500' : total >= 40 ? 'text-amber-500' : 'text-emerald-500'
            )} />
          </div>
          <div>
            <p className="text-base font-semibold text-heading">
              {isZero ? 'No Risk Score' : `${Math.round(total * 100) / 100}% Total Deal Risk`}
            </p>
            <p className="text-sm text-subtle">
              {deal.amount ? `Deal value: ${formatAmount(deal.amount)}` : 'No deal amount specified'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 bg-white border border-default rounded-xl px-4 py-2 shadow-sm">
          <div className={cn(
            'w-11 h-11 rounded-full flex items-center justify-center border-2',
            isZero ? 'border-blue-200 bg-blue-50 text-blue-600' :
            total >= 70 ? 'border-red-200 bg-red-50 text-red-600' :
            total >= 40 ? 'border-orange-200 bg-orange-50 text-orange-600' :
            'border-emerald-200 bg-emerald-50 text-emerald-700'
          )}>
            <span className="text-sm font-bold">{Math.round(total)}</span>
          </div>
          <div className="text-left">
            <p className="text-[10px] font-semibold text-subtle uppercase tracking-wide">AGENTX</p>
            <p className={cn(
              'text-xs font-semibold',
              isZero ? 'text-blue-600' :
              total >= 70 ? 'text-red-600' :
              total >= 40 ? 'text-orange-600' :
              'text-emerald-700'
            )}>
              {isZero ? 'No Score' : total >= 70 ? 'High Risk' : total >= 40 ? 'Medium Risk' : 'Low Risk'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const RiskBreakdownCard = ({ deal }: { deal: Deal }) => {
  const scores = deal.riskScores;
  if (!scores) return null;

  const categories = [
    { label: 'Arena Risk', value: scores.arenaRisk, color: 'bg-blue-500' },
    { label: 'Control Room Risk', value: scores.controlRoomRisk, color: 'bg-purple-500' },
    { label: 'Scorecard Risk', value: scores.scoreCardRisk, color: 'bg-amber-500' },
    { label: 'Total Deal Risk', value: scores.totalDealRisk, color: 'bg-red-500' },
  ];

  const subCategories = scores.subCategoryRisk ? Object.entries(scores.subCategoryRisk) : [];

  return (
    <div className="bg-gray-50 rounded-xl p-5">
      <p className="text-[11px] font-semibold text-subtle uppercase tracking-wider mb-4">RISK BREAKDOWN</p>
      <div className="space-y-3">
        {categories.map((cat) => (
          <div key={cat.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-body">{cat.label}</span>
              <span className="text-sm font-semibold text-heading">{Math.round(cat.value * 100) / 100}%</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', cat.color)}
                style={{ width: `${Math.min(cat.value, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {subCategories.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-[10px] font-semibold text-subtle uppercase tracking-wider mb-3">SUB-CATEGORIES</p>
          <div className="grid grid-cols-2 gap-2">
            {subCategories.map(([key, value]) => (
              <div key={key} className="flex items-center justify-between text-xs px-2 py-1.5 bg-white rounded-md">
                <span className="text-subtle truncate mr-2">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim()}
                </span>
                <span className={cn(
                  'font-semibold flex-shrink-0',
                  value === 0 ? 'text-gray-400' : value >= 70 ? 'text-red-600' : value >= 40 ? 'text-amber-600' : 'text-emerald-600'
                )}>
                  {Math.round(value)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const InfoGatheringActions = ({ deal, onCallTriggered }: { deal: Deal; onCallTriggered?: () => void }) => {
  const [triggeringType, setTriggeringType] = useState<GatheringType | null>(null);
  const [confirmType, setConfirmType] = useState<GatheringType | null>(null);
  const hasPhone = !!deal.owner?.phone;

  const handleTrigger = async (type: GatheringType) => {
    setConfirmType(null);
    setTriggeringType(type);
    try {
      const result = await dealService.triggerInfoGatheringCall(deal.id, type, deal);
      if (result.success) {
        toast.success(`${GATHERING_CONFIG[type].shortLabel} call triggered!`, {
          description: `Calling ${deal.owner?.name || 'owner'} for "${deal.dealName}"`,
        });
        onCallTriggered?.();
      } else {
        toast.error('Failed to trigger call', { description: result.error || 'Unknown error' });
      }
    } catch (err: any) {
      toast.error('Failed to trigger call', { description: err.response?.data?.message || err.message });
    } finally {
      setTriggeringType(null);
    }
  };

  return (
    <div className="bg-white border border-default rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <PhoneOutgoing className="h-4 w-4 text-brand" />
        <p className="text-[11px] font-semibold text-brand uppercase tracking-wider">
          INFO GATHERING CALLS
        </p>
      </div>

      {!hasPhone && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <p className="text-xs">No phone number available for this deal's owner. Calls cannot be triggered.</p>
        </div>
      )}

      <div className="space-y-3">
        {(Object.keys(GATHERING_CONFIG) as GatheringType[]).map((type) => {
          const config = GATHERING_CONFIG[type];
          const Icon = config.icon;
          const isTriggering = triggeringType === type;
          const isConfirming = confirmType === type;

          return (
            <div key={type} className={cn(
              'border rounded-xl overflow-hidden transition-all',
              isConfirming ? `${config.borderColor} ${config.bgColor}` : 'border-default',
            )}>
              <div className="flex items-center gap-3 p-4">
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', config.bgColor)}>
                  <Icon className={cn('h-5 w-5', config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-heading">{config.label}</p>
                  <p className="text-xs text-subtle">{config.description}</p>
                </div>
                <button
                  onClick={() => setConfirmType(isConfirming ? null : type)}
                  disabled={!hasPhone || isTriggering}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap',
                    hasPhone
                      ? `${config.bgColor} ${config.color} ${config.hoverBg} border ${config.borderColor}`
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed',
                  )}
                >
                  {isTriggering ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Phone className="h-4 w-4" />
                  )}
                  {isTriggering ? 'Calling...' : 'Trigger Call'}
                </button>
              </div>

              {isConfirming && (
                <div className={cn('px-4 pb-4 pt-0 border-t', config.borderColor)}>
                  <div className="flex items-center gap-3 mt-3 p-3 bg-white rounded-lg border border-default">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-heading mb-0.5">
                        Call {deal.owner?.name || 'deal owner'}?
                      </p>
                      <div className="flex items-center gap-3 text-xs text-subtle">
                        {deal.owner?.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {deal.owner.phone}
                          </span>
                        )}
                        {deal.owner?.email && (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {deal.owner.email}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setConfirmType(null)}
                        className="px-3 py-1.5 text-xs font-medium text-subtle bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleTrigger(type)}
                        disabled={isTriggering}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors shadow-sm',
                          type === 'ZERO_SCORE' ? 'bg-blue-600 hover:bg-blue-700' :
                          type === 'LOST_DEAL' ? 'bg-red-600 hover:bg-red-700' :
                          'bg-orange-600 hover:bg-orange-700',
                        )}
                      >
                        {isTriggering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PhoneOutgoing className="h-3.5 w-3.5" />}
                        Confirm & Call
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const DealDetailsGrid = ({ deal }: { deal: Deal }) => (
  <div className="grid grid-cols-2 gap-4">
    <div className="bg-white border border-default rounded-xl p-5">
      <p className="text-xs font-semibold text-subtle uppercase tracking-wider mb-3">Deal Owner</p>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-brand-light flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-brand leading-none">
              {deal.owner?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '?'}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-heading">{deal.owner?.name || '--'}</p>
            <p className="text-xs text-subtle">Deal Owner</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 pl-12">
          <div className="flex items-center gap-2 text-sm text-body">
            <Phone className="h-3.5 w-3.5 text-subtle" />
            {deal.owner?.phone || '--'}
          </div>
          <div className="flex items-center gap-2 text-sm text-body">
            <Mail className="h-3.5 w-3.5 text-subtle" />
            {deal.owner?.email || '--'}
          </div>
        </div>
      </div>
    </div>

    <div className="bg-white border border-default rounded-xl p-5">
      <p className="text-xs font-semibold text-subtle uppercase tracking-wider mb-3">Deal Info</p>
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-subtle">Pipeline</span>
          <span className="text-sm font-medium text-heading">{deal.pipelineName || '--'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-subtle">Amount</span>
          <span className="text-sm font-medium text-heading">{formatAmount(deal.amount)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-subtle">Created</span>
          <span className="text-sm text-body">{formatDate(deal.createdAt)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-subtle">Updated</span>
          <span className="text-sm text-body">{formatDate(deal.updatedAt)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-subtle">Tenant</span>
          <span className="text-sm text-body">{deal.tenantName || deal.tenantSlug}</span>
        </div>
      </div>
    </div>
  </div>
);

const ModalFooter = ({ deal }: { deal: Deal }) => (
  <div className="sticky bottom-0 bg-gray-50 border-t border-default px-6 py-3 flex items-center justify-between text-xs text-subtle">
    <div className="flex items-center gap-4">
      <span>Deal ID: {deal.id}</span>
      {deal.tenantSlug && <span>Tenant: {deal.tenantSlug}</span>}
    </div>
    <span className="inline-flex items-center gap-1">
      <Calendar className="h-3 w-3" />
      Last updated: {formatDate(deal.updatedAt)}
    </span>
  </div>
);

// ── Main Modal ──────────────────────────────────────────────────

interface ClientsDealDetailModalProps {
  deal: Deal;
  onClose: () => void;
}

const ClientsDealDetailModal = ({ deal, onClose }: ClientsDealDetailModalProps) => {
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
        <ModalHeader deal={deal} onClose={onClose} />

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <DealOverviewCard deal={deal} />
          <RiskBreakdownCard deal={deal} />
          <InfoGatheringActions deal={deal} />
          <DealDetailsGrid deal={deal} />
        </div>

        <ModalFooter deal={deal} />
      </div>
    </div>
  );
};

export default ClientsDealDetailModal;
