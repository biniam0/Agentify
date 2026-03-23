import { useState } from 'react';
import {
  ChevronDown,
  ArrowRight,
  ArrowDown,
  Building2,
  Calendar,
  Clock,
  Users,
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
import type { Meeting } from '@/types';

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-600',
  in_progress: 'bg-amber-50 text-amber-600',
  completed: 'bg-emerald-50 text-emerald-600',
};

const formatDate = (ts: string) =>
  new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const formatTime = (ts: string) =>
  new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

const getDuration = (start: string, end: string) => {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms <= 0) return '--';
  const mins = Math.round(ms / 60000);
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
};

const getTimeUntil = (startTime: string) => {
  const diff = new Date(startTime).getTime() - Date.now();
  const hours = Math.floor(Math.abs(diff) / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (diff < 0) {
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  }
  if (days > 0) return `In ${days}d`;
  if (hours > 0) return `In ${hours}h`;
  return 'Soon';
};

const isMeetingPast = (startTime: string) => new Date(startTime).getTime() < Date.now();

const MeetingAvatar = ({ id }: { id: string }) => {
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const svgIndex = hash % 3;
  return (
    <div className="w-9 h-9 flex items-center justify-center flex-shrink-0">
      {svgIndex === 0 && (
        <svg width="36" height="36" viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="20" fill="#EFF6FF" /><rect x="12" y="14" width="16" height="12" rx="2" fill="#3B82F6" /><path d="M12 18H28" stroke="white" strokeWidth="1.5" /><circle cx="16" cy="12" r="1.5" fill="#3B82F6" /><circle cx="24" cy="12" r="1.5" fill="#3B82F6" /></svg>
      )}
      {svgIndex === 1 && (
        <svg width="36" height="36" viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="20" fill="#F0FDF4" /><circle cx="16" cy="17" r="4" fill="#16A34A" /><circle cx="24" cy="17" r="4" fill="#22C55E" /><path d="M12 28C12 24.6863 14.6863 22 18 22H22C25.3137 22 28 24.6863 28 28" stroke="#16A34A" strokeWidth="2" /></svg>
      )}
      {svgIndex === 2 && (
        <svg width="36" height="36" viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="20" fill="#FEF3C7" /><path d="M20 12L26 18H14L20 12Z" fill="#F59E0B" /><rect x="14" y="18" width="12" height="10" rx="1" fill="#F59E0B" /><circle cx="20" cy="23" r="2" fill="white" /></svg>
      )}
    </div>
  );
};

// ── Expanded Row ────────────────────────────────────────────────

const ExpandedMeetingRow = ({ meeting, onViewDetails }: { meeting: Meeting; onViewDetails: (m: Meeting) => void }) => (
  <TableRow className="bg-white hover:bg-white border-b-0">
    <TableCell colSpan={5} className="p-0 border-b border-default">
      <div className="relative px-5 pb-5 pt-2">
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#DB475D]" />

        <div className="flex items-center justify-between pl-4 border border-default rounded-lg p-5 shadow-sm ml-2">
          <div>
            <p className="text-[11px] font-semibold text-subtle uppercase tracking-wider mb-2">MEETING INFO</p>
            <p className="text-[15px] font-medium text-heading mb-1">{meeting.title}</p>
            {meeting.agenda && (
              <p className="text-xs text-subtle mb-3 line-clamp-2">{meeting.agenda}</p>
            )}
            <div className="flex items-center gap-3 text-xs text-subtle">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(meeting.startTime)}, {formatTime(meeting.startTime)} – {formatTime(meeting.endTime)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {getDuration(meeting.startTime, meeting.endTime)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="h-3 w-3" />
                {meeting.participants?.length || 0} participants
              </span>
            </div>
          </div>

          <button
            onClick={() => onViewDetails(meeting)}
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

// ── Main Table ──────────────────────────────────────────────────

interface ClientsMeetingsTableProps {
  meetings: Meeting[];
  onViewDetails: (meeting: Meeting) => void;
}

const ClientsMeetingsTable = ({ meetings, onViewDetails }: ClientsMeetingsTableProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'time' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const toggleExpand = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  const handleSort = (field: 'time') => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  };

  const sorted = [...meetings].sort((a, b) => {
    if (!sortField) return 0;
    const aTime = new Date(a.startTime).getTime();
    const bTime = new Date(b.startTime).getTime();
    return sortDir === 'asc' ? aTime - bTime : bTime - aTime;
  });

  return (
    <div className="overflow-x-auto">
      <Table className="w-full">
        <TableHeader>
          <TableRow className="border-b border-default bg-[#F9FAFB] hover:bg-[#F9FAFB]">
            <TableHead className="w-10 rounded-tl-xl" />
            <TableHead className="text-left py-3 px-3 text-[11px] font-semibold text-subtle tracking-wider">
              Meeting & Deal
            </TableHead>
            <TableHead className="text-left py-3 px-3 text-[11px] font-semibold text-subtle tracking-wider">
              Status
            </TableHead>
            <TableHead className="text-left py-3 px-3 text-[11px] font-semibold text-subtle tracking-wider">
              <button
                onClick={() => handleSort('time')}
                className="inline-flex items-center gap-1 hover:text-heading transition-colors"
              >
                Time
                <ArrowDown className={cn('h-3 w-3', sortField === 'time' && sortDir === 'desc' && 'rotate-180')} />
              </button>
            </TableHead>
            <TableHead className="text-left py-3 px-3 text-[11px] font-semibold text-subtle tracking-wider rounded-tr-xl">
              Next step
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((meeting) => {
            const isExpanded = expandedId === meeting.id;
            return (
              <MeetingRow
                key={meeting.id}
                meeting={meeting}
                isExpanded={isExpanded}
                onToggle={() => toggleExpand(meeting.id)}
                onViewDetails={onViewDetails}
              />
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

interface MeetingRowProps {
  meeting: Meeting;
  isExpanded: boolean;
  onToggle: () => void;
  onViewDetails: (meeting: Meeting) => void;
}

const MeetingRow = ({ meeting, isExpanded, onToggle, onViewDetails }: MeetingRowProps) => {
  const past = isMeetingPast(meeting.startTime);

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
            <MeetingAvatar id={meeting.id} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-heading truncate max-w-[240px]">{meeting.title}</p>
              <div className="flex items-center gap-1.5 text-xs text-subtle">
                {meeting.dealCompany && (
                  <>
                    <Building2 className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate max-w-[120px]">{meeting.dealCompany}</span>
                    <span className="opacity-40">·</span>
                  </>
                )}
                <span className="truncate max-w-[120px]">{meeting.dealName}</span>
              </div>
            </div>
          </div>
        </TableCell>
        <TableCell className="py-4 px-3">
          <span className={cn(
            'inline-flex px-2.5 py-1 text-xs font-medium rounded-lg capitalize',
            STATUS_STYLES[meeting.status] || 'bg-gray-50 text-gray-600'
          )}>
            {meeting.status.replace('_', ' ')}
          </span>
        </TableCell>
        <TableCell className="py-4 px-3">
          <div>
            <p className={cn('text-sm font-medium', past ? 'text-red-500' : 'text-brand')}>
              {getTimeUntil(meeting.startTime)}
            </p>
            <p className="text-xs text-subtle">{formatDate(meeting.startTime)}</p>
          </div>
        </TableCell>
        <TableCell className="py-4 px-3">
          <button
            onClick={(e) => { e.stopPropagation(); onViewDetails(meeting); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-body bg-white border border-default rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            View details
            <ArrowRight className="h-3.5 w-3.5 text-subtle" />
          </button>
        </TableCell>
      </TableRow>
      {isExpanded && <ExpandedMeetingRow meeting={meeting} onViewDetails={onViewDetails} />}
    </>
  );
};

export default ClientsMeetingsTable;
