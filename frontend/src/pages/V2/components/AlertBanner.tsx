import { AlertTriangle, ArrowRight } from 'lucide-react';

interface AlertBannerProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const AlertBanner = ({
  title = 'Action Required: 5 deals need immediate follow-up',
  description = "These deals have been in the 'Negotiation' stage for over 7 days without activity.",
  actionLabel = 'Review now',
  onAction,
}: AlertBannerProps) => {
  return (
    <div className="flex items-center justify-between bg-alert-bg border border-alert-border rounded-xl px-5 py-4 mb-6 shadow-sm">
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-alert-iconBg flex items-center justify-center">
          <AlertTriangle className="h-5 w-5 text-alert-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-gray-900 truncate mb-0.5">{title}</p>
          <p className="text-sm text-gray-500 truncate">{description}</p>
        </div>
      </div>
      <button
        onClick={onAction}
        className="flex items-center gap-1.5 bg-alert-primary hover:bg-alert-primaryHover text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap ml-4 flex-shrink-0"
      >
        {actionLabel}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
};

export default AlertBanner;
