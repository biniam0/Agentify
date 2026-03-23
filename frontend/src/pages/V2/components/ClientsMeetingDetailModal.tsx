import { useEffect, useState } from 'react';
import {
  X,
  Phone,
  User,
  Building2,
  Mail,
  Clock,
  Calendar,
  PhoneOutgoing,
  Loader2,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import * as meetingService from '@/services/meetingService';
import type { Meeting } from '@/types';

// ── Helpers ─────────────────────────────────────────────────────

const formatDate = (ts: string) =>
  new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const formatTime = (ts: string) =>
  new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

const getDuration = (start: string, end: string) => {
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  if (mins <= 0) return '--';
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`;
};

const formatAmount = (amount?: number) => {
  if (!amount) return '--';
  if (amount >= 1_000_000) return `€${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `€${(amount / 1_000).toFixed(1)}K`;
  return `€${amount}`;
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

const getTimeUntil = (startTime: string) => {
  const diff = new Date(startTime).getTime() - Date.now();
  const hours = Math.floor(Math.abs(diff) / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (diff < 0) {
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return 'Just now';
  }
  if (days > 0) return `In ${days} day${days > 1 ? 's' : ''}`;
  if (hours > 0) return `In ${hours} hour${hours > 1 ? 's' : ''}`;
  return 'Starting soon';
};

const isMeetingPast = (startTime: string) => new Date(startTime).getTime() < Date.now();

// ── Sub-components ──────────────────────────────────────────────

const ModalHeader = ({ meeting, onClose }: { meeting: Meeting; onClose: () => void }) => (
  <div className="sticky top-0 bg-white z-10 px-6 pt-5 pb-4 border-b border-default">
    <div className="flex items-start justify-between mb-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h2 className="text-lg font-semibold text-heading truncate">{meeting.title}</h2>
          <span className={cn(
            'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full capitalize',
            meeting.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
            meeting.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
            'bg-blue-100 text-blue-700'
          )}>
            {meeting.status.replace('_', ' ')}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
        <a href="#" className="inline-flex items-center gap-1 text-sm text-subtle hover:text-heading transition-colors">
          Open in HubSpot
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <X className="h-5 w-5 text-gray-400" />
        </button>
      </div>
    </div>
    <div className="flex items-center gap-3 text-sm text-subtle flex-wrap">
      {meeting.dealCompany && (
        <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{meeting.dealCompany}</span>
      )}
      {meeting.owner?.name && (
        <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" />{meeting.owner.name}</span>
      )}
      {meeting.dealStage && (
        <span className={cn('inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full', getStageBadgeStyle(meeting.dealStage))}>
          {formatStageName(meeting.dealStage)}
        </span>
      )}
    </div>
  </div>
);

const MeetingOverviewCard = ({ meeting }: { meeting: Meeting }) => {
  const past = isMeetingPast(meeting.startTime);
  return (
    <div className="bg-white border border-default rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
            past ? 'bg-gray-100' : 'bg-blue-50'
          )}>
            <Calendar className={cn('h-5 w-5', past ? 'text-gray-500' : 'text-blue-500')} />
          </div>
          <div>
            <p className="text-base font-semibold text-heading">
              {formatDate(meeting.startTime)}
            </p>
            <p className="text-sm text-subtle">
              {formatTime(meeting.startTime)} – {formatTime(meeting.endTime)} · {getDuration(meeting.startTime, meeting.endTime)}
            </p>
          </div>
        </div>
        <div className={cn(
          'px-3 py-1.5 rounded-lg text-sm font-semibold',
          past ? 'bg-gray-100 text-gray-600' : 'bg-brand-light text-brand'
        )}>
          {getTimeUntil(meeting.startTime)}
        </div>
      </div>

      {meeting.agenda && (
        <div className="mt-4 pt-4 border-t border-default">
          <p className="text-[11px] font-semibold text-subtle uppercase tracking-wider mb-2">AGENDA</p>
          <p className="text-sm text-body leading-relaxed">{meeting.agenda}</p>
        </div>
      )}
    </div>
  );
};

const CallActionsCard = ({ meeting }: { meeting: Meeting }) => {
  const [triggeringType, setTriggeringType] = useState<'pre' | 'post' | null>(null);
  const [confirmType, setConfirmType] = useState<'pre' | 'post' | null>(null);
  const hasPhone = !!meeting.owner?.phone;

  const handleTrigger = async (type: 'pre' | 'post') => {
    setConfirmType(null);
    setTriggeringType(type);
    try {
      const meetingData = {
        id: meeting.id, title: meeting.title, agenda: meeting.agenda,
        startTime: meeting.startTime, endTime: meeting.endTime,
      };
      const dealData = {
        id: meeting.dealId, name: meeting.dealName, company: meeting.dealCompany,
        stage: meeting.dealStage, amount: meeting.dealAmount, summary: meeting.dealSummary,
        userDealRiskScores: meeting.dealRisks, ownerName: meeting.owner?.name,
        ownerPhone: meeting.owner?.phone, ownerEmail: meeting.owner?.email,
        ownerBarrierxUserId: meeting.ownerBarrierxUserId, ownerId: meeting.ownerBarrierxUserId,
        ownerHubspotId: meeting.ownerHubspotId, tenantSlug: meeting.ownerTenantSlug,
        contacts: meeting.participants || [], owner: meeting.owner,
      };
      const result = type === 'pre'
        ? await meetingService.adminTriggerPreCall(meetingData, dealData)
        : await meetingService.adminTriggerPostCall(meetingData, dealData);
      toast.success(`${type === 'pre' ? 'Pre' : 'Post'}-meeting call triggered!`, { description: result.message });
    } catch (err: any) {
      toast.error('Failed to trigger call', { description: err.response?.data?.error || err.message });
    } finally {
      setTriggeringType(null);
    }
  };

  const CALL_TYPES = [
    {
      type: 'pre' as const,
      label: 'Pre-Meeting Call',
      description: 'Brief the deal owner before the meeting with key talking points and risk areas',
      color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200',
      hoverBg: 'hover:bg-blue-100', btnBg: 'bg-blue-600 hover:bg-blue-700',
    },
    {
      type: 'post' as const,
      label: 'Post-Meeting Call',
      description: 'Capture meeting outcomes, next steps, and update deal status automatically',
      color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200',
      hoverBg: 'hover:bg-purple-100', btnBg: 'bg-purple-600 hover:bg-purple-700',
    },
  ];

  return (
    <div className="bg-white border border-default rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <PhoneOutgoing className="h-4 w-4 text-brand" />
        <p className="text-[11px] font-semibold text-brand uppercase tracking-wider">MEETING CALLS</p>
      </div>

      {!hasPhone && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <p className="text-xs">No phone number available for this meeting's owner.</p>
        </div>
      )}

      <div className="space-y-3">
        {CALL_TYPES.map((ct) => {
          const isTriggering = triggeringType === ct.type;
          const isConfirming = confirmType === ct.type;
          return (
            <div key={ct.type} className={cn(
              'border rounded-xl overflow-hidden transition-all',
              isConfirming ? `${ct.borderColor} ${ct.bgColor}` : 'border-default',
            )}>
              <div className="flex items-center gap-3 p-4">
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', ct.bgColor)}>
                  <PhoneOutgoing className={cn('h-5 w-5', ct.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-heading">{ct.label}</p>
                  <p className="text-xs text-subtle">{ct.description}</p>
                </div>
                <button
                  onClick={() => setConfirmType(isConfirming ? null : ct.type)}
                  disabled={!hasPhone || isTriggering}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap',
                    hasPhone
                      ? `${ct.bgColor} ${ct.color} ${ct.hoverBg} border ${ct.borderColor}`
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed',
                  )}
                >
                  {isTriggering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
                  {isTriggering ? 'Calling...' : 'Trigger Call'}
                </button>
              </div>

              {isConfirming && (
                <div className={cn('px-4 pb-4 pt-0 border-t', ct.borderColor)}>
                  <div className="flex items-center gap-3 mt-3 p-3 bg-white rounded-lg border border-default">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-heading mb-0.5">
                        Call {meeting.owner?.name || 'deal owner'}?
                      </p>
                      <div className="flex items-center gap-3 text-xs text-subtle">
                        {meeting.owner?.phone && (
                          <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{meeting.owner.phone}</span>
                        )}
                        {meeting.owner?.email && (
                          <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{meeting.owner.email}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setConfirmType(null)}
                        className="px-3 py-1.5 text-xs font-medium text-subtle bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >Cancel</button>
                      <button
                        onClick={() => handleTrigger(ct.type)}
                        disabled={isTriggering}
                        className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors shadow-sm', ct.btnBg)}
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

const DealRiskCard = ({ meeting }: { meeting: Meeting }) => {
  const risks = meeting.dealRisks;
  if (!risks) return null;

  const categories = [
    { label: 'Arena Risk', value: risks.arenaRisk || 0, color: 'bg-blue-500' },
    { label: 'Control Room', value: risks.controlRoomRisk || 0, color: 'bg-purple-500' },
    { label: 'Scorecard', value: risks.scoreCardRisk || 0, color: 'bg-amber-500' },
    { label: 'Total Deal Risk', value: risks.totalDealRisk || 0, color: 'bg-red-500' },
  ];

  return (
    <div className="bg-gray-50 rounded-xl p-5">
      <p className="text-[11px] font-semibold text-subtle uppercase tracking-wider mb-4">DEAL RISK</p>
      <div className="space-y-3">
        {categories.map((cat) => (
          <div key={cat.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-body">{cat.label}</span>
              <span className="text-sm font-semibold text-heading">{Math.round(cat.value * 100) / 100}%</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full transition-all', cat.color)} style={{ width: `${Math.min(cat.value, 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const MeetingDetailsGrid = ({ meeting }: { meeting: Meeting }) => (
  <div className="grid grid-cols-2 gap-4">
    <div className="bg-white border border-default rounded-xl p-5">
      <p className="text-xs font-semibold text-subtle uppercase tracking-wider mb-3">Deal Owner</p>
      {meeting.owner ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-brand-light flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-brand leading-none">
                {meeting.owner.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-heading">{meeting.owner.name}</p>
              <p className="text-xs text-subtle">Deal Owner</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 pl-12">
            <div className="flex items-center gap-2 text-sm text-body">
              <Phone className="h-3.5 w-3.5 text-subtle" />{meeting.owner.phone || '--'}
            </div>
            <div className="flex items-center gap-2 text-sm text-body">
              <Mail className="h-3.5 w-3.5 text-subtle" />{meeting.owner.email || '--'}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-subtle">No owner information</p>
      )}
    </div>

    <div className="bg-white border border-default rounded-xl p-5">
      <p className="text-xs font-semibold text-subtle uppercase tracking-wider mb-3">Deal Info</p>
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-subtle">Deal</span>
          <span className="text-sm font-medium text-heading truncate ml-2 max-w-[200px]">{meeting.dealName}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-subtle">Amount</span>
          <span className="text-sm font-medium text-heading">{formatAmount(meeting.dealAmount)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-subtle">Stage</span>
          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', getStageBadgeStyle(meeting.dealStage))}>
            {formatStageName(meeting.dealStage)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-subtle">Company</span>
          <span className="text-sm text-body">{meeting.dealCompany || '--'}</span>
        </div>
      </div>
    </div>
  </div>
);

const ParticipantsList = ({ meeting }: { meeting: Meeting }) => {
  if (!meeting.participants || meeting.participants.length === 0) return null;

  return (
    <div className="bg-white border border-default rounded-xl p-5">
      <p className="text-xs font-semibold text-subtle uppercase tracking-wider mb-3">
        PARTICIPANTS ({meeting.participants.length})
      </p>
      <div className="grid grid-cols-2 gap-3">
        {meeting.participants.map((p) => (
          <div key={p.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-blue-700 leading-none">
                {p.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-heading truncate">{p.name}</p>
              <p className="text-xs text-subtle truncate">{p.email}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const MeetingTimelineCard = ({ meeting }: { meeting: Meeting }) => {
  const past = isMeetingPast(meeting.startTime);
  const events = [
    { id: '1', title: 'Meeting Scheduled', description: formatDate(meeting.startTime), completed: true },
    ...(past ? [{ id: '2', title: 'Meeting Started', description: formatTime(meeting.startTime), completed: true }] : []),
    ...(meeting.status === 'completed'
      ? [{ id: '3', title: 'Meeting Completed', description: formatTime(meeting.endTime), completed: true }]
      : !past ? [{ id: '3', title: 'Upcoming', description: getTimeUntil(meeting.startTime), completed: false }] : []),
  ];

  return (
    <div className="bg-white border border-default rounded-xl p-5">
      <p className="text-xs font-semibold text-subtle uppercase tracking-wider mb-3">Timeline</p>
      <div className="space-y-3">
        {events.map((event) => (
          <div key={event.id} className="flex items-start gap-3">
            {event.completed ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            ) : (
              <Circle className="h-5 w-5 text-blue-300 flex-shrink-0 mt-0.5" />
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

const ModalFooter = ({ meeting }: { meeting: Meeting }) => (
  <div className="sticky bottom-0 bg-gray-50 border-t border-default px-6 py-3 flex items-center justify-between text-xs text-subtle">
    <div className="flex items-center gap-4">
      <span>Meeting ID: {meeting.id}</span>
      <span>Deal ID: {meeting.dealId}</span>
    </div>
    <span className="inline-flex items-center gap-1">
      <Clock className="h-3 w-3" />
      Duration: {getDuration(meeting.startTime, meeting.endTime)}
    </span>
  </div>
);

// ── Main Modal ──────────────────────────────────────────────────

interface ClientsMeetingDetailModalProps {
  meeting: Meeting;
  onClose: () => void;
}

const ClientsMeetingDetailModal = ({ meeting, onClose }: ClientsMeetingDetailModalProps) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
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
        <ModalHeader meeting={meeting} onClose={onClose} />
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <MeetingOverviewCard meeting={meeting} />
          <CallActionsCard meeting={meeting} />
          <DealRiskCard meeting={meeting} />
          <MeetingDetailsGrid meeting={meeting} />
          <ParticipantsList meeting={meeting} />
          <MeetingTimelineCard meeting={meeting} />
        </div>
        <ModalFooter meeting={meeting} />
      </div>
    </div>
  );
};

export default ClientsMeetingDetailModal;
