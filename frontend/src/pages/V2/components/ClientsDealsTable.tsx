import { useState } from 'react';
import {
  ChevronDown,
  ArrowRight,
  ArrowDown,
  Mail,
  Phone,
  Building2,
  Calendar,
  TrendingUp,
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
import type { Deal } from '@/services/dealService';

const STAGE_STYLES: Record<string, string> = {
  appointment: 'bg-orange-50 text-orange-600',
  qualified: 'bg-blue-50 text-blue-600',
  presentation: 'bg-purple-50 text-purple-600',
  decision: 'bg-amber-50 text-amber-600',
  contract: 'bg-teal-50 text-teal-600',
  closedwon: 'bg-emerald-50 text-emerald-600',
  closedlost: 'bg-red-50 text-red-600',
  lost: 'bg-red-50 text-red-600',
};

const getStageBadge = (stage?: string): string => {
  if (!stage) return 'bg-gray-50 text-gray-600';
  const key = stage.toLowerCase().replace(/\s+/g, '');
  for (const [match, style] of Object.entries(STAGE_STYLES)) {
    if (key.includes(match)) return style;
  }
  return 'bg-brand-light text-brand';
};

const formatStageName = (stage?: string) => {
  if (!stage) return 'Unknown';
  return stage
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
};

const formatAmount = (amount?: number) => {
  if (!amount) return '--';
  if (amount >= 1_000_000) return `€${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `€${(amount / 1_000).toFixed(1)}K`;
  return `€${amount}`;
};

const formatDate = (ts?: string) => {
  if (!ts) return '--';
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getRiskLabel = (deal: Deal): { text: string; style: string } => {
  const total = deal.riskScores?.totalDealRisk || 0;
  if (total === 0) return { text: 'Zero Score', style: 'bg-blue-50 text-blue-600' };
  if (total >= 70) return { text: 'High Risk', style: 'bg-red-50 text-red-600' };
  if (total >= 40) return { text: 'Medium Risk', style: 'bg-amber-50 text-amber-600' };
  return { text: 'Low Risk', style: 'bg-emerald-50 text-emerald-600' };
};

const DealAvatar = ({ id }: { id: string }) => {
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const svgIndex = hash % 3;
  return (
    <div className="w-9 h-9 flex items-center justify-center flex-shrink-0">
      {svgIndex === 0 && (
        <svg width="36" height="36" viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="20" fill="#F0FDF4" /><path d="M14 14L26 14L26 26L14 26Z" fill="#16A34A" /><circle cx="20" cy="20" r="4" fill="white" /></svg>
      )}
      {svgIndex === 1 && (
        <svg width="36" height="36" viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="20" fill="#EFF6FF" /><circle cx="18" cy="18" r="6" fill="#2563EB" /><circle cx="22" cy="22" r="6" fill="#3B82F6" fillOpacity="0.9" /></svg>
      )}
      {svgIndex === 2 && (
        <svg width="36" height="36" viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="20" fill="#FFF7ED" /><path d="M20 12L28 20L20 28L12 20L20 12Z" fill="#EA580C" /><circle cx="20" cy="20" r="3.5" fill="white" /></svg>
      )}
    </div>
  );
};

interface ExpandedDealRowProps {
  deal: Deal;
  onViewDetails: (deal: Deal) => void;
}

const ExpandedDealRow = ({ deal, onViewDetails }: ExpandedDealRowProps) => (
  <TableRow className="bg-white hover:bg-white border-b-0">
    <TableCell colSpan={6} className="p-0 border-b border-default">
      <div className="relative px-5 pb-5 pt-2">
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#DB475D]" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pl-4 border border-default rounded-lg p-5 shadow-sm ml-2">
          <div>
            <p className="text-[11px] font-semibold text-subtle uppercase tracking-wider mb-2">
              DEAL OWNER
            </p>
            <p className="text-[15px] font-medium text-heading mb-1">
              {deal.owner?.name || 'Unknown'}
            </p>
            <p className="text-xs text-subtle mb-3 truncate">{deal.owner?.email || '--'}</p>
            <div className="flex items-center gap-2 flex-wrap">
              {deal.owner?.email && (
                <button className="inline-flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium text-body bg-white border border-default rounded-lg hover:bg-gray-50 transition-colors">
                  <Mail className="h-4 w-4 text-subtle" />
                  Email
                </button>
              )}
              {deal.owner?.phone && (
                <button className="inline-flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium text-body bg-white border border-default rounded-lg hover:bg-gray-50 transition-colors">
                  <Phone className="h-4 w-4 text-subtle" />
                  Call
                </button>
              )}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-subtle uppercase tracking-wider mb-2">
              RISK SCORES
            </p>
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
              <RiskMiniBar label="Arena" value={deal.riskScores?.arenaRisk || 0} />
              <RiskMiniBar label="Control" value={deal.riskScores?.controlRoomRisk || 0} />
              <RiskMiniBar label="Scorecard" value={deal.riskScores?.scoreCardRisk || 0} />
              <RiskMiniBar label="Total" value={deal.riskScores?.totalDealRisk || 0} bold />
            </div>
          </div>

          <button
            onClick={() => onViewDetails(deal)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-brand hover:bg-brand-hover rounded-lg transition-colors shadow-sm self-start lg:self-auto whitespace-nowrap"
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

interface MobileDealCardProps {
  deal: Deal;
  isExpanded: boolean;
  onToggle: () => void;
  onViewDetails: (deal: Deal) => void;
}

const MobileDealCard = ({ deal, isExpanded, onToggle, onViewDetails }: MobileDealCardProps) => {
  const risk = getRiskLabel(deal);
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
        <DealAvatar id={deal.id} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-heading truncate">{deal.dealName}</p>
              <div className="flex items-center gap-1.5 text-xs text-subtle min-w-0">
                {deal.company && (
                  <>
                    <Building2 className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{deal.company}</span>
                  </>
                )}
              </div>
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-subtle transition-transform flex-shrink-0 mt-0.5',
                isExpanded && 'rotate-180'
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-3">
            <MobileField label="Stage">
              <span className={cn('inline-flex px-2 py-0.5 text-xs font-medium rounded-md', getStageBadge(deal.stage))}>
                {formatStageName(deal.stage)}
              </span>
            </MobileField>
            <MobileField label="Deal Risk">
              <span className={cn('inline-flex px-2 py-0.5 text-xs font-medium rounded-md', risk.style)}>
                {risk.text}
              </span>
            </MobileField>
            <MobileField label="Amount">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3 text-subtle flex-shrink-0" />
                <span className="text-sm font-medium text-heading">{formatAmount(deal.amount)}</span>
              </div>
            </MobileField>
            <MobileField label="Next step">
              <button
                onClick={(e) => { e.stopPropagation(); onViewDetails(deal); }}
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
          <div className="border border-default rounded-lg p-4 shadow-sm space-y-4 ml-2">
            <div>
              <p className="text-[11px] font-semibold text-subtle uppercase tracking-wider mb-2">
                DEAL OWNER
              </p>
              <p className="text-[15px] font-medium text-heading mb-1">
                {deal.owner?.name || 'Unknown'}
              </p>
              <p className="text-xs text-subtle mb-2 truncate">{deal.owner?.email || '--'}</p>
              <div className="flex items-center gap-2 flex-wrap">
                {deal.owner?.email && (
                  <button className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-body bg-white border border-default rounded-lg hover:bg-gray-50 transition-colors">
                    <Mail className="h-4 w-4 text-subtle" />
                    Email
                  </button>
                )}
                {deal.owner?.phone && (
                  <button className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-body bg-white border border-default rounded-lg hover:bg-gray-50 transition-colors">
                    <Phone className="h-4 w-4 text-subtle" />
                    Call
                  </button>
                )}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-subtle uppercase tracking-wider mb-2">
                RISK SCORES
              </p>
              <div className="grid grid-cols-4 gap-2">
                <RiskMiniBar label="Arena" value={deal.riskScores?.arenaRisk || 0} />
                <RiskMiniBar label="Control" value={deal.riskScores?.controlRoomRisk || 0} />
                <RiskMiniBar label="Score" value={deal.riskScores?.scoreCardRisk || 0} />
                <RiskMiniBar label="Total" value={deal.riskScores?.totalDealRisk || 0} bold />
              </div>
            </div>

            <button
              onClick={() => onViewDetails(deal)}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-brand hover:bg-brand-hover rounded-lg transition-colors shadow-sm"
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

const RiskMiniBar = ({ label, value, bold }: { label: string; value: number; bold?: boolean }) => (
  <div className="text-center">
    <p className="text-[10px] text-subtle mb-1">{label}</p>
    <div className={cn(
      'text-sm rounded-md px-2 py-0.5',
      bold ? 'font-bold' : 'font-medium',
      value === 0 ? 'bg-gray-100 text-gray-500' :
      value >= 70 ? 'bg-red-50 text-red-600' :
      value >= 40 ? 'bg-amber-50 text-amber-600' :
      'bg-emerald-50 text-emerald-600'
    )}>
      {Math.round(value * 100) / 100}%
    </div>
  </div>
);

interface ClientsDealsTableProps {
  deals: Deal[];
  onViewDetails: (deal: Deal) => void;
}

const ClientsDealsTable = ({ deals, onViewDetails }: ClientsDealsTableProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'risk' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleSort = (field: 'risk') => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sorted = [...deals].sort((a, b) => {
    if (!sortField) return 0;
    const aVal = a.riskScores?.totalDealRisk || 0;
    const bVal = b.riskScores?.totalDealRisk || 0;
    return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
  });

  return (
    <>
      <div className="hidden md:block overflow-x-auto">
        <Table className="w-full min-w-[900px]">
          <TableHeader>
            <TableRow className="border-b border-default bg-[#F9FAFB] hover:bg-[#F9FAFB]">
              <TableHead className="w-10 rounded-tl-xl" />
              <TableHead className="text-left py-3 px-3 text-[11px] font-semibold text-subtle tracking-wider whitespace-nowrap">
                Deal & Company
              </TableHead>
              <TableHead className="text-left py-3 px-3 text-[11px] font-semibold text-subtle tracking-wider whitespace-nowrap">
                Stage
              </TableHead>
              <TableHead className="text-left py-3 px-3 text-[11px] font-semibold text-subtle tracking-wider whitespace-nowrap">
                <button
                  onClick={() => handleSort('risk')}
                  className="inline-flex items-center gap-1 hover:text-heading transition-colors"
                >
                  Deal Risk
                  <ArrowDown className={cn('h-3 w-3', sortField === 'risk' && sortDir === 'asc' && 'rotate-180')} />
                </button>
              </TableHead>
              <TableHead className="text-left py-3 px-3 text-[11px] font-semibold text-subtle tracking-wider whitespace-nowrap">
                Amount
              </TableHead>
              <TableHead className="text-left py-3 px-3 text-[11px] font-semibold text-subtle tracking-wider rounded-tr-xl whitespace-nowrap">
                Next step
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((deal) => {
              const isExpanded = expandedId === deal.id;
              return (
                <DealRow
                  key={deal.id}
                  deal={deal}
                  isExpanded={isExpanded}
                  onToggle={() => toggleExpand(deal.id)}
                  onViewDetails={onViewDetails}
                />
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden">
        {sorted.map((deal) => (
          <MobileDealCard
            key={deal.id}
            deal={deal}
            isExpanded={expandedId === deal.id}
            onToggle={() => toggleExpand(deal.id)}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>
    </>
  );
};

interface DealRowProps {
  deal: Deal;
  isExpanded: boolean;
  onToggle: () => void;
  onViewDetails: (deal: Deal) => void;
}

const DealRow = ({ deal, isExpanded, onToggle, onViewDetails }: DealRowProps) => {
  const risk = getRiskLabel(deal);

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
          <ChevronDown
            className={cn('h-4 w-4 text-subtle transition-transform', isExpanded && 'rotate-180')}
          />
        </TableCell>
        <TableCell className="py-4 px-3">
          <div className="flex items-center gap-3">
            <DealAvatar id={deal.id} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-heading truncate max-w-[260px]">{deal.dealName}</p>
              <div className="flex items-center gap-1.5 text-xs text-subtle">
                {deal.company && (
                  <>
                    <Building2 className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate max-w-[140px]">{deal.company}</span>
                    <span className="opacity-40">·</span>
                  </>
                )}
                <Calendar className="h-3 w-3 flex-shrink-0" />
                <span>{formatDate(deal.createdAt)}</span>
              </div>
            </div>
          </div>
        </TableCell>
        <TableCell className="py-4 px-3">
          <span className={cn('inline-flex px-2.5 py-1 text-xs font-medium rounded-lg', getStageBadge(deal.stage))}>
            {formatStageName(deal.stage)}
          </span>
        </TableCell>
        <TableCell className="py-4 px-3">
          <div className="flex items-center gap-2">
            <span className={cn('inline-flex px-2.5 py-1 text-xs font-medium rounded-lg', risk.style)}>
              {risk.text}
            </span>
            <span className="text-xs text-subtle">
              {Math.round((deal.riskScores?.totalDealRisk || 0) * 100) / 100}%
            </span>
          </div>
        </TableCell>
        <TableCell className="py-4 px-3">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-subtle" />
            <span className="text-sm font-medium text-heading">{formatAmount(deal.amount)}</span>
          </div>
        </TableCell>
        <TableCell className="py-4 px-3">
          <button
            onClick={(e) => { e.stopPropagation(); onViewDetails(deal); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-body bg-white border border-default rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            View details
            <ArrowRight className="h-3.5 w-3.5 text-subtle" />
          </button>
        </TableCell>
      </TableRow>
      {isExpanded && <ExpandedDealRow deal={deal} onViewDetails={onViewDetails} />}
    </>
  );
};

export default ClientsDealsTable;
