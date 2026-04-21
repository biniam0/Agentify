import { useState } from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { Deal } from '@/services/dealService';
import { useDealsAtRisk } from '@/hooks/useDealsAtRisk';
import { RISK_THRESHOLDS } from '@/utils/dealRisk';
import DealsAtRiskModal from './DealsAtRiskModal';

interface AlertBannerProps {
  /** Optional: forward a selected at-risk deal to the dashboard's detail modal. */
  onViewDeal?: (deal: Deal) => void;
}

// Visual variants for the two states. Kept side-by-side so it's obvious how
// they differ (only the color tokens + icon change).
const VARIANTS = {
  atRisk: {
    wrapper: 'bg-alert-bg border-alert-border',
    iconBg: 'bg-alert-iconBg',
    iconColor: 'text-alert-primary',
    button: 'bg-alert-primary hover:bg-alert-primaryHover text-white',
  },
  healthy: {
    wrapper: 'bg-emerald-50 border-emerald-100',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    // Disabled styling — explicit so it reads as "not actionable" at a glance.
    button: 'bg-gray-200 text-gray-400 cursor-not-allowed',
  },
} as const;

const AlertBanner = ({ onViewDeal }: AlertBannerProps) => {
  const { atRiskDeals, totalDeals, loading } = useDealsAtRisk();
  const [isOpen, setIsOpen] = useState(false);

  // Suppress during the initial fetch so we don't flash "No deals at risk"
  // and then swap to the orange alert — would look like a bug.
  if (loading) return null;

  const count = atRiskDeals.length;
  const hasRisk = count > 0;
  const variant = hasRisk ? VARIANTS.atRisk : VARIANTS.healthy;

  const title = hasRisk
    ? `Action Required: ${count} deal${count === 1 ? '' : 's'} need${count === 1 ? 's' : ''} immediate follow-up`
    : 'No deals at risk';

  const description = hasRisk
    ? `${count === 1 ? 'This deal has' : 'These deals have'} a high BarrierX risk score (≥ ${RISK_THRESHOLDS.high}). Review and take action now.`
    : `All ${totalDeals} deal${totalDeals === 1 ? '' : 's'} in your tenant have a BarrierX risk score below ${RISK_THRESHOLDS.high}.`;

  return (
    <>
      <div
        className={cn(
          'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 border rounded-xl px-4 sm:px-5 py-4 mb-6 shadow-sm',
          variant.wrapper,
        )}
      >
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className={cn('flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center')}>
            {hasRisk ? (
              <AlertTriangle className={cn('h-5 w-5', variant.iconColor)} />
            ) : (
              <img
                src="/images/greencheckmark.svg"
                alt=""
                aria-hidden="true"
                className="h-6 w-6"
              />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm sm:text-[15px] font-semibold text-gray-900 mb-0.5 sm:truncate">
              {title}
            </p>
            <p className="text-xs sm:text-sm text-gray-500 sm:truncate">{description}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          disabled={!hasRisk}
          aria-disabled={!hasRisk}
          title={hasRisk ? undefined : 'No at-risk deals to review'}
          className={cn(
            'flex items-center justify-center gap-1.5 text-sm font-medium px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap flex-shrink-0 self-start sm:self-auto',
            variant.button,
          )}
        >
          Review now
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {hasRisk && (
        <DealsAtRiskModal
          open={isOpen}
          onClose={() => setIsOpen(false)}
          deals={atRiskDeals}
          totalDeals={totalDeals}
          onViewDeal={onViewDeal}
        />
      )}
    </>
  );
};

export default AlertBanner;
