import { useState } from 'react';
import { ChevronDown, ArrowRight, ArrowDown, Mail, Phone, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  'Medium risk': 'bg-orange-400',
  'High risk': 'bg-red-500',
};

const RISK_TEXT_COLOR: Record<RiskLevel, string> = {
  'Low risk': 'text-emerald-700',
  'Medium risk': 'text-orange-600',
  'High risk': 'text-red-600',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const CompanyAvatar = ({ name, color }: { name: string; color: string }) => (
  <div
    className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
    style={{ backgroundColor: color }}
  >
    {name.charAt(0)}
  </div>
);

interface ExpandedRowProps {
  deal: V2Deal;
  onViewDetails: (deal: V2Deal) => void;
}

const ExpandedRow = ({ deal, onViewDetails }: ExpandedRowProps) => (
  <tr className="bg-gray-50 border-b border-gray-100">
    <td colSpan={6} className="px-5 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-12">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Contact Info
            </p>
            <p className="text-sm font-medium text-gray-900 mb-2">{deal.contact.name}</p>
            <div className="flex items-center gap-2">
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
                <Mail className="h-3 w-3" />
                Email
              </button>
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
                <Phone className="h-3 w-3" />
                Call
              </button>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Workflow Status
            </p>
            <p className="text-sm font-medium text-gray-900 mb-1">
              Current: {deal.workflowStatus.current}
            </p>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Call completed {deal.workflowStatus.lastCallDate}
            </p>
          </div>
        </div>

        <button
          onClick={() => onViewDetails(deal)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
        >
          + View full details
        </button>
      </div>
    </td>
  </tr>
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
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="w-10" />
            <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Company & Deal
            </th>
            <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <button
                onClick={() => handleSort('status')}
                className="inline-flex items-center gap-1 hover:text-gray-700 transition-colors"
              >
                Status
                <ArrowDown className={cn('h-3 w-3', sortField === 'status' && sortDir === 'asc' && 'rotate-180')} />
              </button>
            </th>
            <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Value
            </th>
            <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Barrier Score
            </th>
            <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Next step
            </th>
          </tr>
        </thead>
        <tbody>
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
        </tbody>
      </table>
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
    <tr
      className={cn(
        'border-b border-gray-100 hover:bg-gray-50/50 transition-colors cursor-pointer',
        isExpanded && 'bg-gray-50/50'
      )}
      onClick={onToggle}
    >
      <td className="py-3.5 pl-4 pr-1">
        <ChevronDown
          className={cn(
            'h-4 w-4 text-gray-400 transition-transform',
            isExpanded && 'rotate-180'
          )}
        />
      </td>
      <td className="py-3.5 px-3">
        <div className="flex items-center gap-3">
          <CompanyAvatar name={deal.companyName} color={deal.companyLogoColor} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{deal.companyName}</p>
            <p className="text-xs text-gray-500 truncate">{deal.companySubtitle}</p>
          </div>
        </div>
      </td>
      <td className="py-3.5 px-3">
        <span className={cn('inline-flex px-2.5 py-1 text-xs font-medium rounded-full', STATUS_STYLES[deal.status])}>
          {deal.status}
        </span>
      </td>
      <td className="py-3.5 px-3">
        <span className="text-sm font-medium text-gray-900">{formatCurrency(deal.value)}</span>
      </td>
      <td className="py-3.5 px-3">
        <div className="flex items-center gap-3">
          <div>
            <span className={cn('text-xs font-medium', RISK_TEXT_COLOR[deal.riskLevel])}>
              {deal.riskLevel}
            </span>
          </div>
          <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full', RISK_BAR_COLOR[deal.riskLevel])}
              style={{ width: `${deal.barrierScore}%` }}
            />
          </div>
          <span className={cn('text-sm font-semibold min-w-[2ch] text-right', RISK_TEXT_COLOR[deal.riskLevel])}>
            {deal.barrierScore}
          </span>
        </div>
      </td>
      <td className="py-3.5 px-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors group"
        >
          {deal.nextStep}
          <ArrowRight className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-600 transition-colors" />
        </button>
      </td>
    </tr>
    {isExpanded && <ExpandedRow deal={deal} onViewDetails={onViewDetails} />}
  </>
);

export default DealsTable;
