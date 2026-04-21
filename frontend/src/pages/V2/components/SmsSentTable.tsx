import { useState } from 'react';
import {
  ChevronDown,
  ArrowRight,
  ArrowDown,
  Phone,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { SmsLog } from '@/services/loggingService';

const STATUS_CONFIG: Record<string, { label: string; style: string; icon: React.ElementType }> = {
  SENT: { label: 'Sent', style: 'bg-orange-50 text-orange-600', icon: Send },
  DELIVERED: { label: 'Delivered', style: 'bg-emerald-50 text-emerald-600', icon: CheckCircle2 },
  QUEUED: { label: 'Queued', style: 'bg-amber-50 text-amber-600', icon: Loader2 },
  FAILED: { label: 'Failed', style: 'bg-red-50 text-red-600', icon: AlertCircle },
};

const TRIGGER_STYLES: Record<string, string> = {
  SCHEDULED: 'bg-emerald-50 text-emerald-600',
  MANUAL: 'bg-blue-50 text-blue-600',
  RETRY: 'bg-orange-50 text-orange-600',
  WEBHOOK: 'bg-purple-50 text-purple-600',
};

const formatDate = (ts: string) =>
  new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const formatRelativeTime = (dateStr: string) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
};

const SmsAvatar = ({ status }: { status: string }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.SENT;
  const bgMap: Record<string, string> = {
    SENT: 'bg-orange-50',
    DELIVERED: 'bg-emerald-50',
    QUEUED: 'bg-amber-50',
    FAILED: 'bg-red-50',
  };
  const colorMap: Record<string, string> = {
    SENT: 'text-orange-500',
    DELIVERED: 'text-emerald-500',
    QUEUED: 'text-amber-500',
    FAILED: 'text-red-500',
  };
  const Icon = cfg.icon;
  return (
    <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', bgMap[status] || 'bg-gray-50')}>
      <Icon className={cn('h-4 w-4', colorMap[status] || 'text-gray-500')} />
    </div>
  );
};

const SmsDetailsContent = ({ sms }: { sms: SmsLog }) => (
  <>
    <p className="text-[11px] font-semibold text-subtle uppercase tracking-wider mb-2">SMS DETAILS</p>

    {sms.messageBody && (
      <div className="bg-gray-50 rounded-lg p-3 mb-3">
        <p className="text-sm text-heading whitespace-pre-line line-clamp-4">{sms.messageBody}</p>
      </div>
    )}

    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-subtle">
      <span className="inline-flex items-center gap-1 min-w-0">
        <Phone className="h-3 w-3 flex-shrink-0" />
        To: <code className="font-mono text-heading truncate">{sms.toPhone}</code>
      </span>
      {sms.fromPhone && (
        <span className="inline-flex items-center gap-1 min-w-0">
          <Phone className="h-3 w-3 flex-shrink-0" />
          From: <code className="font-mono text-heading truncate">{sms.fromPhone}</code>
        </span>
      )}
      {sms.meetingTitle && (
        <span className="inline-flex items-center gap-1 min-w-0">
          <Calendar className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{sms.meetingTitle}</span>
        </span>
      )}
      {sms.dealName && (
        <span className="inline-flex items-center gap-1 min-w-0">
          <Building2 className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{sms.dealName}</span>
        </span>
      )}
    </div>

    {sms.errorMessage && (
      <div className="mt-3 flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
        <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
        <p className="text-xs text-red-600">{sms.errorMessage}</p>
      </div>
    )}
  </>
);

const ExpandedSmsRow = ({ sms, onViewDetails }: { sms: SmsLog; onViewDetails: (s: SmsLog) => void }) => (
  <TableRow className="bg-white hover:bg-white border-b-0">
    <TableCell colSpan={6} className="p-0 border-b border-default">
      <div className="relative px-5 pb-5 pt-2">
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#DB475D]" />

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 pl-4 border border-default rounded-lg p-5 shadow-sm ml-2">
          <div className="flex-1 min-w-0 lg:mr-4">
            <SmsDetailsContent sms={sms} />
          </div>

          <button
            onClick={() => onViewDetails(sms)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-brand hover:bg-brand-hover rounded-lg transition-colors shadow-sm whitespace-nowrap self-start lg:self-auto"
          >
            View full details
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </TableCell>
  </TableRow>
);

const MobileField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="min-w-0">
    <p className="text-[10px] font-semibold text-subtle uppercase tracking-wider mb-1">{label}</p>
    <div className="truncate">{children}</div>
  </div>
);

interface MobileSmsCardProps {
  sms: SmsLog;
  isExpanded: boolean;
  onToggle: () => void;
  onViewDetails: (sms: SmsLog) => void;
}

const MobileSmsCard = ({ sms, isExpanded, onToggle, onViewDetails }: MobileSmsCardProps) => {
  const statusCfg = STATUS_CONFIG[sms.status] || { label: sms.status, style: 'bg-gray-50 text-gray-600', icon: AlertCircle };
  const triggerStyle = TRIGGER_STYLES[sms.triggerSource] || 'bg-gray-50 text-gray-600';
  return (
    <div
      className={cn(
        'relative border-b border-default last:border-b-0 transition-colors',
        isExpanded ? 'bg-white' : 'hover:bg-gray-50/50'
      )}
    >
      {isExpanded && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#DB475D]" />}
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-4 flex items-start gap-3"
      >
        <SmsAvatar status={sms.status} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-heading truncate">
                {sms.ownerName || sms.userName || 'Unknown'}
              </p>
              <p className="text-xs text-subtle font-mono truncate">{sms.toPhone}</p>
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-subtle transition-transform flex-shrink-0 mt-0.5',
                isExpanded && 'rotate-180'
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-3">
            <MobileField label="Status">
              <span className={cn('inline-flex px-2 py-0.5 text-xs font-medium rounded-md', statusCfg.style)}>
                {statusCfg.label}
              </span>
            </MobileField>
            <MobileField label="Trigger">
              <span className={cn('inline-flex px-2 py-0.5 text-xs font-medium rounded-md capitalize', triggerStyle)}>
                {sms.triggerSource.toLowerCase()}
              </span>
            </MobileField>
            <MobileField label="Date">
              <span className="text-sm font-medium text-heading">{formatRelativeTime(sms.createdAt)}</span>
            </MobileField>
            <MobileField label="Action">
              <button
                onClick={(e) => { e.stopPropagation(); onViewDetails(sms); }}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
              >
                View details
                <ArrowRight className="h-3 w-3" />
              </button>
            </MobileField>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4">
          <div className="border border-default rounded-lg p-4 shadow-sm ml-2">
            <SmsDetailsContent sms={sms} />
            <button
              onClick={() => onViewDetails(sms)}
              className="mt-4 w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-brand hover:bg-brand-hover rounded-lg transition-colors shadow-sm"
            >
              View full details
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface SmsSentTableProps {
  logs: SmsLog[];
  onViewDetails: (sms: SmsLog) => void;
}

const SmsSentTable = ({ logs, onViewDetails }: SmsSentTableProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'date' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const toggleExpand = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  const handleSort = (field: 'date') => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('desc'); }
  };

  const sorted = [...logs].sort((a, b) => {
    if (!sortField) return 0;
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return sortDir === 'asc' ? aTime - bTime : bTime - aTime;
  });

  return (
    <>
      <div className="hidden md:block overflow-x-auto">
        <Table className="w-full min-w-[840px]">
          <TableHeader>
            <TableRow className="border-b border-default bg-[#F9FAFB] hover:bg-[#F9FAFB]">
              <TableHead className="w-10 rounded-tl-xl" />
              <TableHead className="text-left py-3 px-3 text-[11px] font-semibold text-subtle tracking-wider whitespace-nowrap">
                Recipient
              </TableHead>
              <TableHead className="text-left py-3 px-3 text-[11px] font-semibold text-subtle tracking-wider whitespace-nowrap">
                Status
              </TableHead>
              <TableHead className="text-left py-3 px-3 text-[11px] font-semibold text-subtle tracking-wider whitespace-nowrap">
                Trigger
              </TableHead>
              <TableHead className="text-left py-3 px-3 text-[11px] font-semibold text-subtle tracking-wider whitespace-nowrap">
                <button
                  onClick={() => handleSort('date')}
                  className="inline-flex items-center gap-1 hover:text-heading transition-colors"
                >
                  Date
                  <ArrowDown className={cn('h-3 w-3', sortField === 'date' && sortDir === 'asc' && 'rotate-180')} />
                </button>
              </TableHead>
              <TableHead className="text-left py-3 px-3 text-[11px] font-semibold text-subtle tracking-wider rounded-tr-xl whitespace-nowrap">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((sms) => {
              const isExpanded = expandedId === sms.id;
              return (
                <SmsRow
                  key={sms.id}
                  sms={sms}
                  isExpanded={isExpanded}
                  onToggle={() => toggleExpand(sms.id)}
                  onViewDetails={onViewDetails}
                />
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden">
        {sorted.map((sms) => (
          <MobileSmsCard
            key={sms.id}
            sms={sms}
            isExpanded={expandedId === sms.id}
            onToggle={() => toggleExpand(sms.id)}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>
    </>
  );
};

interface SmsRowProps {
  sms: SmsLog;
  isExpanded: boolean;
  onToggle: () => void;
  onViewDetails: (sms: SmsLog) => void;
}

const SmsRow = ({ sms, isExpanded, onToggle, onViewDetails }: SmsRowProps) => {
  const statusCfg = STATUS_CONFIG[sms.status] || { label: sms.status, style: 'bg-gray-50 text-gray-600' };
  const triggerStyle = TRIGGER_STYLES[sms.triggerSource] || 'bg-gray-50 text-gray-600';

  return (
    <>
      <TableRow
        className={cn(
          'border-b border-default hover:bg-gray-50/50 transition-colors cursor-pointer relative',
          isExpanded && 'bg-white border-b-0 hover:bg-white'
        )}
        onClick={onToggle}
      >
        <TableCell className="py-4 pl-4 pr-1 relative">
          {isExpanded && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#DB475D]" />}
          <ChevronDown className={cn('h-4 w-4 text-subtle transition-transform', isExpanded && 'rotate-180')} />
        </TableCell>
        <TableCell className="py-4 px-3">
          <div className="flex items-center gap-3">
            <SmsAvatar status={sms.status} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-heading truncate max-w-[200px]">
                {sms.ownerName || sms.userName || 'Unknown'}
              </p>
              <p className="text-xs text-subtle font-mono truncate max-w-[160px]">{sms.toPhone}</p>
            </div>
          </div>
        </TableCell>
        <TableCell className="py-4 px-3">
          <span className={cn('inline-flex px-2.5 py-1 text-xs font-medium rounded-lg', statusCfg.style)}>
            {statusCfg.label}
          </span>
        </TableCell>
        <TableCell className="py-4 px-3">
          <span className={cn('inline-flex px-2.5 py-1 text-xs font-medium rounded-lg capitalize', triggerStyle)}>
            {sms.triggerSource.toLowerCase()}
          </span>
        </TableCell>
        <TableCell className="py-4 px-3">
          <div>
            <p className="text-sm font-medium text-heading">{formatRelativeTime(sms.createdAt)}</p>
            <p className="text-xs text-subtle">{formatDate(sms.createdAt)}</p>
          </div>
        </TableCell>
        <TableCell className="py-4 px-3">
          <button
            onClick={(e) => { e.stopPropagation(); onViewDetails(sms); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-body bg-white border border-default rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            View details
            <ArrowRight className="h-3.5 w-3.5 text-subtle" />
          </button>
        </TableCell>
      </TableRow>
      {isExpanded && <ExpandedSmsRow sms={sms} onViewDetails={onViewDetails} />}
    </>
  );
};

export default SmsSentTable;
