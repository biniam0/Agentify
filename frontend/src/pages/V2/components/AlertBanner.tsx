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
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 bg-alert-bg border border-alert-border rounded-xl px-4 sm:px-5 py-4 mb-6 shadow-sm">
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-alert-iconBg flex items-center justify-center">
          <AlertTriangle className="h-5 w-5 text-alert-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm sm:text-[15px] font-semibold text-gray-900 mb-0.5 sm:truncate">{title}</p>
          <p className="text-xs sm:text-sm text-gray-500 sm:truncate">{description}</p>
        </div>
      </div>
      <button
        onClick={onAction}
        className="flex items-center justify-center gap-1.5 bg-alert-primary hover:bg-alert-primaryHover text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap flex-shrink-0 self-start sm:self-auto"
      >
        {actionLabel}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
};

export default AlertBanner;
