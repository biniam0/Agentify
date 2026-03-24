import { useState } from 'react';
import {
  X,
  Clock,
  StickyNote,
  Calendar,
  Users,
  Briefcase,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { CrmActionLog } from '@/services/loggingService';

const ACTION_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  NOTE: { label: 'Note', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', icon: StickyNote },
  MEETING: { label: 'Meeting', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', icon: Calendar },
  CONTACT: { label: 'Contact', color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200', icon: Users },
  DEAL: { label: 'Deal', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', icon: Briefcase },
  TASK: { label: 'Task', color: 'text-cyan-600', bg: 'bg-cyan-50 border-cyan-200', icon: CheckCircle2 },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  SUCCESS: { label: 'Success', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  FAILED: { label: 'Failed', color: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: XCircle },
  PENDING: { label: 'Pending', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: Clock },
  RUNNING: { label: 'Running', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', icon: Clock },
  CANCELLED: { label: 'Cancelled', color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200', icon: AlertCircle },
};

const formatDateTime = (ts: string) =>
  new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const formatRelativeTime = (dateStr: string) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDateTime(dateStr);
};

interface CrmActionDetailModalProps {
  log: CrmActionLog;
  onClose: () => void;
}

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };
  return (
    <button onClick={handleCopy} className="p-1 rounded hover:bg-gray-100 transition-colors" title="Copy">
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 text-subtle" />}
    </button>
  );
};

const InfoRow = ({ icon: Icon, label, value, mono, copyable }: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
  mono?: boolean;
  copyable?: boolean;
}) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon className="h-4 w-4 text-subtle mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-subtle uppercase tracking-wider">{label}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <p className={cn('text-sm text-heading truncate', mono && 'font-mono text-xs')}>{value}</p>
          {copyable && <CopyButton text={value} />}
        </div>
      </div>
    </div>
  );
};

const CrmActionDetailModal = ({ log, onClose }: CrmActionDetailModalProps) => {
  const typeCfg = ACTION_TYPE_CONFIG[log.actionType] || { label: log.actionType, color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200', icon: FileText };
  const TypeIcon = typeCfg.icon;
  const statusCfg = STATUS_CONFIG[log.status] || STATUS_CONFIG.PENDING;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center pt-[5vh] overflow-y-auto pb-10">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 border border-gray-200 animate-in fade-in slide-in-from-bottom-4 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-default">
          <div className="flex items-center gap-3">
            <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center border', typeCfg.bg)}>
              <TypeIcon className={cn('h-5 w-5', typeCfg.color)} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-heading">CRM Action Details</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn('inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-md border', typeCfg.bg, typeCfg.color)}>
                  {typeCfg.label}
                </span>
                <span className={cn('inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-md border', statusCfg.bg, statusCfg.color)}>
                  {statusCfg.label}
                </span>
                <span className="text-xs text-subtle flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatRelativeTime(log.createdAt)}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="h-5 w-5 text-subtle" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">

          {/* Title */}
          {log.title && (
            <div>
              <p className="text-[11px] font-semibold text-subtle uppercase tracking-wider mb-2">TITLE</p>
              <p className="text-base font-medium text-heading">{log.title}</p>
            </div>
          )}

          {/* Body Content */}
          {log.body && (
            <div>
              <p className="text-[11px] font-semibold text-subtle uppercase tracking-wider mb-2">BODY</p>
              <div className="bg-gray-50 border border-default rounded-xl p-4">
                <p className="text-sm text-heading leading-relaxed whitespace-pre-line">{log.body}</p>
              </div>
            </div>
          )}

          {/* Context & IDs */}
          <div>
            <p className="text-[11px] font-semibold text-subtle uppercase tracking-wider mb-1">DETAILS</p>
            <div className="bg-white border border-default rounded-xl divide-y divide-default">
              <div className="px-4">
                <InfoRow icon={Briefcase} label="Tenant" value={log.tenantSlug} />
              </div>
              {log.dealId && (
                <div className="px-4">
                  <InfoRow icon={Briefcase} label="Deal ID" value={log.dealId} mono copyable />
                </div>
              )}
              {log.entityId && (
                <div className="px-4">
                  <InfoRow icon={FileText} label="Entity ID" value={log.entityId} mono copyable />
                </div>
              )}
              {log.conversationId && (
                <div className="px-4">
                  <InfoRow icon={FileText} label="Conversation ID" value={log.conversationId} mono copyable />
                </div>
              )}
              {log.ownerId && (
                <div className="px-4">
                  <InfoRow icon={Users} label="Owner ID" value={log.ownerId} mono copyable />
                </div>
              )}
              {log.completedAt && (
                <div className="px-4">
                  <InfoRow icon={Clock} label="Completed At" value={formatDateTime(log.completedAt)} />
                </div>
              )}
            </div>
          </div>

          {/* Error */}
          {log.errorMessage && (
            <div>
              <p className="text-[11px] font-semibold text-subtle uppercase tracking-wider mb-2">ERROR</p>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 font-medium">{log.errorMessage}</p>
                </div>
              </div>
            </div>
          )}

          {/* Metadata */}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-subtle uppercase tracking-wider mb-2">METADATA</p>
              <div className="bg-gray-50 border border-default rounded-xl p-4">
                <pre className="text-xs font-mono text-heading leading-relaxed whitespace-pre-wrap break-words max-h-40 overflow-auto">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-default flex items-center justify-between">
          <p className="text-xs text-subtle">
            Created <span className="font-medium text-heading">{formatDateTime(log.createdAt)}</span>
            {log.updatedAt && log.updatedAt !== log.createdAt && (
              <> · Updated <span className="font-medium text-heading">{formatDateTime(log.updatedAt)}</span></>
            )}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-subtle bg-white border border-default rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CrmActionDetailModal;
