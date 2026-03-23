import { useState } from 'react';
import { ChevronDown, ArrowRight, ArrowDown, Mail, Phone, Calendar, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { V2Deal, DealStatus, RiskLevel } from '../data/types';

const STATUS_STYLES: Record<DealStatus, string> = {
  'Closed Lost': 'bg-red-50 text-red-600',
  'Budgetary Letter': 'bg-orange-50 text-orange-600',
  'Negotiation': 'bg-blue-50 text-blue-600',
  'Proposal': 'bg-purple-50 text-purple-600',
  'Verbal Agreement': 'bg-emerald-50 text-emerald-600',
  'Closed Won': 'bg-green-50 text-green-700',
};

const RISK_BAR_COLOR: Record<RiskLevel, string> = {
  'Low risk': 'bg-emerald-500',
  'Medium risk': 'bg-orange-500',
  'High risk': 'bg-red-600',
};

const RISK_TEXT_COLOR: Record<RiskLevel, string> = {
  'Low risk': 'text-gray-500',
  'Medium risk': 'text-gray-500',
  'High risk': 'text-gray-500',
};

const RISK_SCORE_COLOR: Record<RiskLevel, string> = {
  'Low risk': 'text-emerald-500',
  'Medium risk': 'text-orange-500',
  'High risk': 'text-red-600',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const CompanyAvatar = ({ color }: { name: string; color: string }) => (
  <div
    className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
    style={{ backgroundColor: color }}
  >
    {/* Abstract logo placeholder matching the screenshot */}
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 opacity-90">
      <path d="M12 2L2 12L12 22L22 12L12 2Z" fill="currentColor" fillOpacity="0.8" />
    </svg>
  </div>
);

interface ExpandedRowProps {
  deal: V2Deal;
  onViewDetails: (deal: V2Deal) => void;
}

const ExpandedRow = ({ deal, onViewDetails }: ExpandedRowProps) => (
  <TableRow className="bg-white hover:bg-white border-b-0">
    <TableCell colSpan={6} className="p-0 border-b border-default">
      <div className="relative px-5 pb-5 pt-2">
        {/* Red line indicator for expanded row */}
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#DB475D]" />

        <div className="flex items-center justify-between pl-4 border border-default rounded-lg p-5 shadow-sm ml-2">
          <div className="flex items-center gap-24">
            <div>
              <p className="text-[11px] font-semibold text-subtle uppercase tracking-wider mb-2">
                CONTACT INFO
              </p>
              <p className="text-[15px] font-medium text-heading mb-3">{deal.contact.name}</p>
              <div className="flex items-center gap-2">
                <button className="inline-flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium text-body bg-white border border-default rounded-lg hover:bg-gray-50 transition-colors">
                  <Mail className="h-4 w-4 text-subtle" />
                  Email
                </button>
                <button className="inline-flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium text-body bg-white border border-default rounded-lg hover:bg-gray-50 transition-colors">
                  <Phone className="h-4 w-4 text-subtle" />
                  Call
                </button>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-subtle uppercase tracking-wider mb-2">
                WORKFLOW STATUS
              </p>
              <p className="text-[15px] font-medium text-heading mb-3">
                Current: {deal.workflowStatus.current}
              </p>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-md">
                <Calendar className="h-3.5 w-3.5 text-subtle" />
                <span className="text-xs font-medium text-body">
                  Call completed {deal.workflowStatus.lastCallDate}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onViewDetails(deal)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-brand hover:bg-brand-hover rounded-lg transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            View full details
          </button>
        </div>
      </div>
    </TableCell>
  </TableRow>
);

interface DealsTableProps {
  deals: V2Deal[];
  onViewDetails: (deal: V2Deal) => void;
}

const DealsTable = ({ deals, onViewDetails }: DealsTableProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'status' | null>('status');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleSort = (field: 'status') => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  return (
    <div className="overflow-x-auto">
      <Table className="w-full">
        <TableHeader>
          <TableRow className="border-b border-default bg-[#F9FAFB] hover:bg-[#F9FAFB]">
            <TableHead className="w-10 rounded-tl-xl" />
            <TableHead className="text-left py-3 px-3 text-[11px] font-semibold text-subtle tracking-wider">
              Company & Deal
            </TableHead>
            <TableHead className="text-left py-3 px-3 text-[11px] font-semibold text-subtle tracking-wider">
              <button
                onClick={() => handleSort('status')}
                className="inline-flex items-center gap-1 hover:text-heading transition-colors"
              >
                Status
                <ArrowDown className={cn('h-3 w-3', sortField === 'status' && sortDir === 'asc' && 'rotate-180')} />
              </button>
            </TableHead>
            <TableHead className="text-left py-3 px-3 text-[11px] font-semibold text-subtle tracking-wider">
              Value
            </TableHead>
            <TableHead className="text-left py-3 px-3 text-[11px] font-semibold text-subtle tracking-wider">
              Barrier Score
            </TableHead>
            <TableHead className="text-left py-3 px-3 text-[11px] font-semibold text-subtle tracking-wider rounded-tr-xl">
              Next step
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deals.map((deal) => {
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
  );
};

interface DealRowProps {
  deal: V2Deal;
  isExpanded: boolean;
  onToggle: () => void;
  onViewDetails: (deal: V2Deal) => void;
}

const DealRow = ({ deal, isExpanded, onToggle, onViewDetails }: DealRowProps) => (
  <>
    <TableRow
      className={cn(
        'border-b border-default hover:bg-gray-50/50 transition-colors cursor-pointer relative',
        isExpanded && 'bg-white border-b-0 hover:bg-white'
      )}
      onClick={onToggle}
    >
      <TableCell className="py-4 pl-4 pr-1 relative">
        {/* Red line indicator for expanded row */}
        {isExpanded && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#DB475D]" />}
        <ChevronDown
          className={cn(
            'h-4 w-4 text-subtle transition-transform',
            isExpanded && 'rotate-180'
          )}
        />
      </TableCell>
      <TableCell className="py-4 px-3">
        <div className="flex items-center gap-3">
          <CompanyAvatar name={deal.companyName} color={deal.companyLogoColor} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-heading truncate">{deal.companyName}</p>
            <p className="text-xs text-subtle truncate">{deal.companySubtitle}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="py-4 px-3">
        <span className={cn('inline-flex px-2.5 py-1 text-xs font-medium rounded-lg', STATUS_STYLES[deal.status])}>
          {deal.status}
        </span>
      </TableCell>
      <TableCell className="py-4 px-3">
        <span className="text-sm font-medium text-heading">{formatCurrency(deal.value)}</span>
      </TableCell>
      <TableCell className="py-4 px-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between w-32">
            <span className={cn('text-xs font-medium', RISK_TEXT_COLOR[deal.riskLevel])}>
              {deal.riskLevel}
            </span>
            <span className={cn('text-xs font-semibold text-right', RISK_SCORE_COLOR[deal.riskLevel])}>
              {deal.barrierScore}
            </span>
          </div>
          <div className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full', RISK_BAR_COLOR[deal.riskLevel])}
              style={{ width: `${deal.barrierScore}%` }}
            />
          </div>
        </div>
      </TableCell>
      <TableCell className="py-4 px-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-body bg-white border border-default rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
        >
          {deal.nextStep}
          <ArrowRight className="h-5 w-5 text-bold" />
        </button>
      </TableCell>
    </TableRow>
    {isExpanded && <ExpandedRow deal={deal} onViewDetails={onViewDetails} />}
  </>
);

export default DealsTable;
