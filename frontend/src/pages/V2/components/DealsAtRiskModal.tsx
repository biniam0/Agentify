import { AlertTriangle, ArrowRight, Briefcase, User } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { Deal } from '@/services/dealService';
import { RISK_THRESHOLDS } from '@/utils/dealRisk';

interface DealsAtRiskModalProps {
  open: boolean;
  onClose: () => void;
  deals: Deal[];
  totalDeals: number;
  onViewDeal?: (deal: Deal) => void;
}

const formatAmount = (amount?: number): string => {
  if (!amount) return '--';
  if (amount >= 1_000_000) return `€${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `€${(amount / 1_000).toFixed(1)}K`;
  return `€${amount}`;
};

const riskColorClasses = (risk: number): string => {
  if (risk >= 85) return 'bg-red-100 text-red-700 border-red-200';
  if (risk >= RISK_THRESHOLDS.high) return 'bg-orange-100 text-orange-700 border-orange-200';
  return 'bg-amber-100 text-amber-700 border-amber-200';
};

const DealsAtRiskModal = ({
  open,
  onClose,
  deals,
  totalDeals,
  onViewDeal,
}: DealsAtRiskModalProps) => {
  const handleSelect = (deal: Deal) => {
    onViewDeal?.(deal);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-alert-iconBg flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-alert-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base sm:text-lg">
                {deals.length} deal{deals.length === 1 ? '' : 's'} at risk
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm mt-1">
                Ranked by BarrierX total risk score (&ge; {RISK_THRESHOLDS.high}).
                {totalDeals > 0 && (
                  <> Showing top {deals.length} of {totalDeals} deal{totalDeals === 1 ? '' : 's'} in your tenant.</>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ul className="max-h-[60vh] overflow-y-auto divide-y divide-gray-100">
          {deals.map((deal) => {
            const risk = Math.round(deal.riskScores?.totalDealRisk ?? 0);
            const interactive = Boolean(onViewDeal);
            return (
              <li key={deal.id}>
                <button
                  type="button"
                  disabled={!interactive}
                  onClick={() => handleSelect(deal)}
                  className={cn(
                    'w-full text-left px-6 py-4 flex items-start gap-3 sm:gap-4 transition-colors',
                    interactive ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default',
                  )}
                >
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Briefcase className="h-4 w-4 text-gray-500" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {deal.dealName || 'Unnamed deal'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {deal.company || 'No company'} &middot; {deal.stage || 'No stage'}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {deal.owner?.name || 'Unassigned'}
                      </span>
                      <span className="tabular-nums">{formatAmount(deal.amount)}</span>
                    </div>
                  </div>

                  <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-semibold tabular-nums',
                        riskColorClasses(risk),
                      )}
                    >
                      Risk {risk}
                    </span>
                    {interactive && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-brand">
                        Review <ArrowRight className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="px-6 py-3 border-t bg-gray-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DealsAtRiskModal;
