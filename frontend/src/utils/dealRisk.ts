import type { Deal } from '@/services/dealService';

/**
 * Buckets for a deal's `riskScores.totalDealRisk` (0 – 100 from BarrierX).
 *
 * Thresholds are kept here so every surface that talks about risk (dashboard
 * alerts, the filter chips in ClientsDealsSection, etc.) stays in sync.
 */
export type RiskBucket = 'zero' | 'low' | 'medium' | 'high';

export const RISK_THRESHOLDS = {
  medium: 40,
  high: 70,
} as const;

/** How many deals to surface in the "at risk" alert / modal at most. */
export const MAX_AT_RISK_DEALS = 5;

export const riskBucket = (totalRisk: number): RiskBucket => {
  if (totalRisk === 0) return 'zero';
  if (totalRisk >= RISK_THRESHOLDS.high) return 'high';
  if (totalRisk >= RISK_THRESHOLDS.medium) return 'medium';
  return 'low';
};

const totalRiskOf = (deal: Deal): number => deal.riskScores?.totalDealRisk ?? 0;

/**
 * A deal is "at risk" when its total BarrierX risk score is in the HIGH bucket
 * (>= 70). The banner/modal treat these as needing immediate follow-up.
 */
export const isDealAtRisk = (deal: Deal): boolean =>
  totalRiskOf(deal) >= RISK_THRESHOLDS.high;

/**
 * Return the top at-risk deals for this tenant, sorted by highest total risk
 * first and capped at `max` (default 5).
 */
export const getDealsAtRisk = (
  deals: Deal[],
  max: number = MAX_AT_RISK_DEALS,
): Deal[] =>
  deals
    .filter(isDealAtRisk)
    .sort((a, b) => totalRiskOf(b) - totalRiskOf(a))
    .slice(0, max);
