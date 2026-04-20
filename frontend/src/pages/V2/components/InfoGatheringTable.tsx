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

// Define the type for the API response based on the sample data
export interface BarrierXInfoRecord {
  id: string;
  dealId: string;
  dealName: string;
  tenantSlug: string;
  tenantName: string;
  companyName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  hubspotOwnerId: string | null;
  conversationId: string | null;
  callSid: string | null;
  status: string;
  quantifiedPainPoints: string | null;
  championInfo: string | null;
  economicBuyerInfo: string | null;
  callDuration: number | null;
  transcriptSummary: string | null;
  rawTranscript: string | null;
  initiatedAt: string | null;
  answeredAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  competitorName: string | null;
  gatheringType: string;
  lessonsLearned: string | null;
  lossReason: string | null;
  inactivityBlockers: string | null;
  inactivityNextSteps: string | null;
  inactivityStatus: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: 'bg-emerald-50 text-emerald-600',
  FAILED: 'bg-red-50 text-red-600',
  PENDING: 'bg-yellow-50 text-yellow-600',
  IN_PROGRESS: 'bg-blue-50 text-blue-600',
  SKIPPED: 'bg-gray-50 text-gray-600',
};

const GATHERING_TYPE_STYLES: Record<string, string> = {
  ZERO_SCORE: 'bg-blue-50 text-blue-600',
  LOST_DEAL: 'bg-red-50 text-red-600',
  INACTIVITY: 'bg-orange-50 text-orange-600',
};

const formatDuration = (seconds?: number | null) => {
  if (!seconds) return '--';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
};

const formatTimestamp = (ts?: string | null) => {
  if (!ts) return '--';
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const CompanyAvatar = ({ id }: { id: string }) => {
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const svgIndex = hash % 3;

  return (
    <div className="w-9 h-9 flex items-center justify-center flex-shrink-0">
      {svgIndex === 0 && (
        <svg width="36" height="36" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="20" fill="#F3F0FF" />
          <path d="M20 12V16M20 24V28M12 20H16M24 20H28M14.3431 14.3431L17.1716 17.1716M22.8284 22.8284L25.6569 25.6569M14.3431 25.6569L17.1716 22.8284M22.8284 17.1716L25.6569 14.3431M16 12L18 16M24 28L22 24M12 24L16 22M28 16L24 18M13 17L16.5 18.5M27 23L23.5 21.5M17 27L18.5 23.5M23 13L21.5 16.5" stroke="#6D28D9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="20" cy="20" r="3" fill="#6D28D9" />
        </svg>
      )}
      {svgIndex === 1 && (
        <svg width="36" height="36" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="20" fill="transparent" />
          <circle cx="18" cy="18" r="6" fill="#2563EB" />
          <circle cx="22" cy="22" r="6" fill="#3B82F6" fillOpacity="0.9" />
        </svg>
      )}
      {svgIndex === 2 && (
        <svg width="36" height="36" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="20" fill="#F5F3FF" />
          <path d="M14 14L26 14L26 26L14 26Z" fill="#4F46E5" />
          <path d="M20 12L28 20L20 28L12 20L20 12Z" fill="#4F46E5" />
          <circle cx="20" cy="20" r="4" fill="white" />
        </svg>
      )}
    </div>
  );
};

interface ExpandedRowProps {
  record: BarrierXInfoRecord;
  onViewDetails: (record: BarrierXInfoRecord) => void;
}

const ExpandedRow = ({ record, onViewDetails }: ExpandedRowProps) => (
  <TableRow className="bg-white hover:bg-white border-b-0">
    <TableCell colSpan={6} className="p-0 border-b border-default">
      <div className="relative px-5 pb-5 pt-2">
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#DB475D]" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pl-4 border border-default rounded-lg p-5 shadow-sm ml-2">
          <div className="flex flex-col md:flex-row md:items-start gap-6 md:gap-16 lg:gap-24">
            <div>
              <p className="text-[11px] font-semibold text-subtle uppercase tracking-wider mb-2">
                CONTACT INFO
              </p>
              <p className="text-[15px] font-medium text-heading mb-1">{record.ownerName}</p>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
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
                GATHERING STATUS
              </p>
              <p className="text-[15px] font-medium text-heading mb-3">
                Current: {record.gatheringType.replace('_', ' ')}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {record.completedAt && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-md">
                    <Calendar className="h-3.5 w-3.5 text-subtle" />
                    <span className="text-xs font-medium text-body">
                      Call completed {formatTimestamp(record.completedAt)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => onViewDetails(record)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-brand hover:bg-brand-hover rounded-lg transition-colors shadow-sm self-start lg:self-auto whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            View full details
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

interface MobileInfoCardProps {
  record: BarrierXInfoRecord;
  isExpanded: boolean;
  onToggle: () => void;
  onViewDetails: (record: BarrierXInfoRecord) => void;
}

const MobileInfoCard = ({ record, isExpanded, onToggle, onViewDetails }: MobileInfoCardProps) => (
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
      <CompanyAvatar id={record.id} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-heading truncate">{record.companyName || 'Unknown Company'}</p>
            <p className="text-xs text-subtle truncate">{record.dealName}</p>
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
            <span className={cn('inline-flex px-2 py-0.5 text-xs font-medium rounded-md', STATUS_STYLES[record.status] || 'bg-gray-50 text-gray-600')}>
              {record.status.replace('_', ' ')}
            </span>
          </MobileField>
          <MobileField label="Duration">
            <span className="text-sm font-medium text-heading">{formatDuration(record.callDuration)}</span>
          </MobileField>
          <MobileField label="Type">
            <span className={cn('inline-flex px-2 py-0.5 text-xs font-medium rounded-md', GATHERING_TYPE_STYLES[record.gatheringType] || 'bg-gray-50 text-gray-600')}>
              {record.gatheringType.replace('_', ' ')}
            </span>
          </MobileField>
          <MobileField label="Next step">
            <button
              onClick={(e) => { e.stopPropagation(); onViewDetails(record); }}
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
              CONTACT INFO
            </p>
            <p className="text-[15px] font-medium text-heading mb-2">{record.ownerName}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <button className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-body bg-white border border-default rounded-lg hover:bg-gray-50 transition-colors">
                <Mail className="h-4 w-4 text-subtle" />
                Email
              </button>
              <button className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-body bg-white border border-default rounded-lg hover:bg-gray-50 transition-colors">
                <Phone className="h-4 w-4 text-subtle" />
                Call
              </button>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-subtle uppercase tracking-wider mb-2">
              GATHERING STATUS
            </p>
            <p className="text-[15px] font-medium text-heading mb-2">
              Current: {record.gatheringType.replace('_', ' ')}
            </p>
            {record.completedAt && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-md">
                <Calendar className="h-3.5 w-3.5 text-subtle" />
                <span className="text-xs font-medium text-body">
                  Call completed {formatTimestamp(record.completedAt)}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => onViewDetails(record)}
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-brand hover:bg-brand-hover rounded-lg transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            View full details
          </button>
        </div>
      </div>
    )}
  </div>
);

interface InfoGatheringTableProps {
  records: BarrierXInfoRecord[];
  onViewDetails: (record: BarrierXInfoRecord) => void;
}

const InfoGatheringTable = ({ records, onViewDetails }: InfoGatheringTableProps) => {
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
    <>
      <div className="hidden md:block overflow-x-auto">
        <Table className="w-full min-w-[820px]">
          <TableHeader>
            <TableRow className="border-b border-default bg-[#F9FAFB] hover:bg-[#F9FAFB]">
              <TableHead className="w-10 rounded-tl-xl" />
              <TableHead className="text-left py-3 px-3 text-[11px] font-semibold text-subtle tracking-wider whitespace-nowrap">
                Company & Deal
              </TableHead>
              <TableHead className="text-left py-3 px-3 text-[11px] font-semibold text-subtle tracking-wider whitespace-nowrap">
                <button
                  onClick={() => handleSort('status')}
                  className="inline-flex items-center gap-1 hover:text-heading transition-colors"
                >
                  Status
                  <ArrowDown className={cn('h-3 w-3', sortField === 'status' && sortDir === 'asc' && 'rotate-180')} />
                </button>
              </TableHead>
              <TableHead className="text-left py-3 px-3 text-[11px] font-semibold text-subtle tracking-wider whitespace-nowrap">
                Duration
              </TableHead>
              <TableHead className="text-left py-3 px-3 text-[11px] font-semibold text-subtle tracking-wider whitespace-nowrap">
                Type
              </TableHead>
              <TableHead className="text-left py-3 px-3 text-[11px] font-semibold text-subtle tracking-wider rounded-tr-xl whitespace-nowrap">
                Next step
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => {
              const isExpanded = expandedId === record.id;
              return (
                <InfoGatheringRow
                  key={record.id}
                  record={record}
                  isExpanded={isExpanded}
                  onToggle={() => toggleExpand(record.id)}
                  onViewDetails={onViewDetails}
                />
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden">
        {records.map((record) => (
          <MobileInfoCard
            key={record.id}
            record={record}
            isExpanded={expandedId === record.id}
            onToggle={() => toggleExpand(record.id)}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>
    </>
  );
};

interface InfoGatheringRowProps {
  record: BarrierXInfoRecord;
  isExpanded: boolean;
  onToggle: () => void;
  onViewDetails: (record: BarrierXInfoRecord) => void;
}

const InfoGatheringRow = ({ record, isExpanded, onToggle, onViewDetails }: InfoGatheringRowProps) => (
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
          className={cn(
            'h-4 w-4 text-subtle transition-transform',
            isExpanded && 'rotate-180'
          )}
        />
      </TableCell>
      <TableCell className="py-4 px-3">
        <div className="flex items-center gap-3">
          <CompanyAvatar id={record.id} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-heading truncate">{record.companyName || 'Unknown Company'}</p>
            <p className="text-xs text-subtle truncate">{record.dealName}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="py-4 px-3">
        <span className={cn('inline-flex px-2.5 py-1 text-xs font-medium rounded-lg', STATUS_STYLES[record.status] || 'bg-gray-50 text-gray-600')}>
          {record.status.replace('_', ' ')}
        </span>
      </TableCell>
      <TableCell className="py-4 px-3">
        <span className="text-sm font-medium text-heading">{formatDuration(record.callDuration)}</span>
      </TableCell>
      <TableCell className="py-4 px-3">
        <span className={cn('inline-flex px-2.5 py-1 text-xs font-medium rounded-lg', GATHERING_TYPE_STYLES[record.gatheringType] || 'bg-gray-50 text-gray-600')}>
          {record.gatheringType.replace('_', ' ')}
        </span>
      </TableCell>
      <TableCell className="py-4 px-3">
        <button
          onClick={(e) => { e.stopPropagation(); onViewDetails(record); }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-body bg-white border border-default rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
        >
          View details
          <ArrowRight className="h-3.5 w-3.5 text-subtle" />
        </button>
      </TableCell>
    </TableRow>
    {isExpanded && <ExpandedRow record={record} onViewDetails={onViewDetails} />}
  </>
);

export default InfoGatheringTable;
