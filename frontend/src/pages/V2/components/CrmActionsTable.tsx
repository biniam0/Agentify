import { useState } from 'react';
import {
  ChevronDown,
  ArrowRight,
  ArrowDown,
  StickyNote,
  Calendar,
  Users,
  Briefcase,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
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
import type { CrmActionLog } from '@/services/loggingService';

const ACTION_TYPE_CONFIG: Record<string, { style: string; bg: string; color: string; icon: React.ElementType }> = {
  NOTE: { style: 'bg-blue-50 text-blue-600', bg: 'bg-blue-50', color: 'text-blue-500', icon: StickyNote },
  MEETING: { style: 'bg-emerald-50 text-emerald-600', bg: 'bg-emerald-50', color: 'text-emerald-500', icon: Calendar },
  CONTACT: { style: 'bg-purple-50 text-purple-600', bg: 'bg-purple-50', color: 'text-purple-500', icon: Users },
  DEAL: { style: 'bg-orange-50 text-orange-600', bg: 'bg-orange-50', color: 'text-orange-500', icon: Briefcase },
  TASK: { style: 'bg-cyan-50 text-cyan-600', bg: 'bg-cyan-50', color: 'text-cyan-500', icon: CheckCircle2 },
};

const STATUS_CONFIG: Record<string, { label: string; style: string; icon: React.ElementType }> = {
  SUCCESS: { label: 'Success', style: 'bg-emerald-50 text-emerald-600', icon: CheckCircle2 },
  FAILED: { label: 'Failed', style: 'bg-red-50 text-red-600', icon: XCircle },
  PENDING: { label: 'Pending', style: 'bg-amber-50 text-amber-600', icon: Clock },
  RUNNING: { label: 'Running', style: 'bg-blue-50 text-blue-600', icon: Clock },
  CANCELLED: { label: 'Cancelled', style: 'bg-gray-50 text-gray-600', icon: AlertCircle },
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

const getTypeCfg = (type: string) =>
  ACTION_TYPE_CONFIG[type] || { style: 'bg-gray-50 text-gray-600', bg: 'bg-gray-50', color: 'text-gray-500', icon: FileText };

const getStatusCfg = (status: string) =>
  STATUS_CONFIG[status] || { label: status, style: 'bg-gray-50 text-gray-600', icon: AlertCircle };

const CrmAvatar = ({ actionType }: { actionType: string }) => {
  const cfg = getTypeCfg(actionType);
  const Icon = cfg.icon;
  return (
    <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', cfg.bg)}>
      <Icon className={cn('h-4 w-4', cfg.color)} />
    </div>
  );
};

const ExpandedCrmRow = ({ log, onViewDetails }: { log: CrmActionLog; onViewDetails: (l: CrmActionLog) => void }) => (
  <TableRow className="bg-white hover:bg-white border-b-0">
    <TableCell colSpan={6} className="p-0 border-b border-default">
      <div className="relative px-5 pb-5 pt-2">
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#DB475D]" />

        <div className="flex items-start justify-between pl-4 border border-default rounded-lg p-5 shadow-sm ml-2">
          <div className="flex-1 min-w-0 mr-4">
            <p className="text-[11px] font-semibold text-subtle uppercase tracking-wider mb-2">ACTION DETAILS</p>

            {log.title && (
              <p className="text-[15px] font-medium text-heading mb-2">{log.title}</p>
            )}

            {log.body && (
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <p className="text-sm text-heading whitespace-pre-line line-clamp-4">{log.body}</p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 text-xs text-subtle">
              <span className="font-medium text-heading">{log.tenantSlug}</span>
              {log.dealId && (
                <span className="inline-flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  Deal: <span className="font-mono text-heading">{log.dealId.slice(0, 12)}...</span>
                </span>
              )}
              {log.entityId && (
                <span className="inline-flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Entity: <span className="font-mono text-heading">{log.entityId.slice(0, 12)}...</span>
                </span>
              )}
            </div>

            {log.errorMessage && (
              <div className="mt-3 flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-600">{log.errorMessage}</p>
              </div>
            )}
          </div>

          <button
            onClick={() => onViewDetails(log)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-brand hover:bg-brand-hover rounded-lg transition-colors shadow-sm whitespace-nowrap"
          >
            View full details
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </TableCell>
  </TableRow>
);

interface CrmActionsTableProps {
  logs: CrmActionLog[];
  onViewDetails: (log: CrmActionLog) => void;
}

const CrmActionsTable = ({ logs, onViewDetails }: CrmActionsTableProps) => {
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
    return sortDir === 'asc'
      ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="overflow-x-auto">
      <Table className="w-full">
        <TableHeader>
          <TableRow className="border-b border-default bg-[#F9FAFB] hover:bg-[#F9FAFB]">
            <TableHead className="w-10 rounded-tl-xl" />
            <TableHead className="text-left py-3 px-3 text-[11px] font-semibold text-subtle tracking-wider">
              Action
            </TableHead>
            <TableHead className="text-left py-3 px-3 text-[11px] font-semibold text-subtle tracking-wider">
              Type
            </TableHead>
            <TableHead className="text-left py-3 px-3 text-[11px] font-semibold text-subtle tracking-wider">
              Status
            </TableHead>
            <TableHead className="text-left py-3 px-3 text-[11px] font-semibold text-subtle tracking-wider">
              <button
                onClick={() => handleSort('date')}
                className="inline-flex items-center gap-1 hover:text-heading transition-colors"
              >
                Date
                <ArrowDown className={cn('h-3 w-3', sortField === 'date' && sortDir === 'asc' && 'rotate-180')} />
              </button>
            </TableHead>
            <TableHead className="text-left py-3 px-3 text-[11px] font-semibold text-subtle tracking-wider rounded-tr-xl">
              Action
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((log) => {
            const isExpanded = expandedId === log.id;
            return (
              <CrmRow
                key={log.id}
                log={log}
                isExpanded={isExpanded}
                onToggle={() => toggleExpand(log.id)}
                onViewDetails={onViewDetails}
              />
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

interface CrmRowProps {
  log: CrmActionLog;
  isExpanded: boolean;
  onToggle: () => void;
  onViewDetails: (log: CrmActionLog) => void;
}

const CrmRow = ({ log, isExpanded, onToggle, onViewDetails }: CrmRowProps) => {
  const typeCfg = getTypeCfg(log.actionType);
  const statusCfg = getStatusCfg(log.status);

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
            <CrmAvatar actionType={log.actionType} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-heading truncate max-w-[220px]">
                {log.title || `${log.actionType} action`}
              </p>
              <p className="text-xs text-subtle truncate max-w-[180px]">{log.tenantSlug}</p>
            </div>
          </div>
        </TableCell>
        <TableCell className="py-4 px-3">
          <span className={cn('inline-flex px-2.5 py-1 text-xs font-medium rounded-lg', typeCfg.style)}>
            {log.actionType}
          </span>
        </TableCell>
        <TableCell className="py-4 px-3">
          <span className={cn('inline-flex px-2.5 py-1 text-xs font-medium rounded-lg', statusCfg.style)}>
            {statusCfg.label}
          </span>
        </TableCell>
        <TableCell className="py-4 px-3">
          <div>
            <p className="text-sm font-medium text-heading">{formatRelativeTime(log.createdAt)}</p>
            <p className="text-xs text-subtle">{formatDate(log.createdAt)}</p>
          </div>
        </TableCell>
        <TableCell className="py-4 px-3">
          <button
            onClick={(e) => { e.stopPropagation(); onViewDetails(log); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-body bg-white border border-default rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            View details
            <ArrowRight className="h-3.5 w-3.5 text-subtle" />
          </button>
        </TableCell>
      </TableRow>
      {isExpanded && <ExpandedCrmRow log={log} onViewDetails={onViewDetails} />}
    </>
  );
};

export default CrmActionsTable;
