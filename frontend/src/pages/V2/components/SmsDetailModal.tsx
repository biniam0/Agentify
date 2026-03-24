import { useState } from 'react';
import {
  X,
  Phone,
  User,
  Building2,
  Calendar,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MessageSquare,
  Copy,
  Check,
  Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { SmsLog } from '@/services/loggingService';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  SENT: { label: 'Sent', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', icon: Send },
  DELIVERED: { label: 'Delivered', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  QUEUED: { label: 'Queued', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: Loader2 },
  FAILED: { label: 'Failed', color: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: AlertCircle },
};

const TRIGGER_CONFIG: Record<string, { label: string; style: string }> = {
  SCHEDULED: { label: 'Scheduled', style: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  MANUAL: { label: 'Manual', style: 'bg-blue-50 text-blue-600 border-blue-200' },
  RETRY: { label: 'Retry', style: 'bg-orange-50 text-orange-600 border-orange-200' },
  WEBHOOK: { label: 'Webhook', style: 'bg-purple-50 text-purple-600 border-purple-200' },
};

const formatDateTime = (ts: string) =>
  new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
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

interface SmsDetailModalProps {
  sms: SmsLog;
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

const SmsDetailModal = ({ sms, onClose }: SmsDetailModalProps) => {
  const statusCfg = STATUS_CONFIG[sms.status] || STATUS_CONFIG.SENT;
  const StatusIcon = statusCfg.icon;
  const triggerCfg = TRIGGER_CONFIG[sms.triggerSource] || { label: sms.triggerSource, style: 'bg-gray-50 text-gray-600 border-gray-200' };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center pt-[5vh] overflow-y-auto pb-10">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 border border-gray-200 animate-in fade-in slide-in-from-bottom-4 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-default">
          <div className="flex items-center gap-3">
            <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center border', statusCfg.bg)}>
              <StatusIcon className={cn('h-5 w-5', statusCfg.color)} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-heading">SMS Details</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn('inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-md border', statusCfg.bg, statusCfg.color)}>
                  {statusCfg.label}
                </span>
                <span className={cn('inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-md border', triggerCfg.style)}>
                  {triggerCfg.label}
                </span>
                <span className="text-xs text-subtle flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatRelativeTime(sms.createdAt)}
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

          {/* Message Body */}
          {sms.messageBody && (
            <div>
              <p className="text-[11px] font-semibold text-subtle uppercase tracking-wider mb-2">MESSAGE</p>
              <div className="bg-gray-50 border border-default rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-4 w-4 text-brand mt-0.5 shrink-0" />
                  <p className="text-sm text-heading leading-relaxed whitespace-pre-line">{sms.messageBody}</p>
                </div>
              </div>
            </div>
          )}

          {/* Contact & Context */}
          <div>
            <p className="text-[11px] font-semibold text-subtle uppercase tracking-wider mb-1">CONTACT & CONTEXT</p>
            <div className="bg-white border border-default rounded-xl divide-y divide-default">
              <div className="px-4">
                <InfoRow icon={User} label="Recipient" value={sms.ownerName || sms.userName || 'Unknown'} />
              </div>
              <div className="px-4">
                <InfoRow icon={Phone} label="To Phone" value={sms.toPhone} mono copyable />
              </div>
              <div className="px-4">
                <InfoRow icon={Phone} label="From Phone" value={sms.fromPhone} mono copyable />
              </div>
              {sms.userEmail && (
                <div className="px-4">
                  <InfoRow icon={Mail} label="User Email" value={sms.userEmail} copyable />
                </div>
              )}
              {sms.meetingTitle && (
                <div className="px-4">
                  <InfoRow icon={Calendar} label="Meeting" value={sms.meetingTitle} />
                </div>
              )}
              {sms.dealName && (
                <div className="px-4">
                  <InfoRow icon={Building2} label="Deal" value={sms.dealName} />
                </div>
              )}
            </div>
          </div>

          {/* Error */}
          {sms.errorMessage && (
            <div>
              <p className="text-[11px] font-semibold text-subtle uppercase tracking-wider mb-2">ERROR</p>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-red-700 font-medium">{sms.errorMessage}</p>
                    {sms.twilioErrorCode && (
                      <p className="text-xs text-red-500 font-mono mt-1">Error Code: {sms.twilioErrorCode}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-default flex items-center justify-between">
          <p className="text-xs text-subtle">
            Sent at <span className="font-medium text-heading">{formatDateTime(sms.createdAt)}</span>
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

export default SmsDetailModal;
