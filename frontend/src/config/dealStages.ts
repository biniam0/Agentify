/**
 * Canonical deal stage list used across the workflow UI.
 *
 * Kept in sync with the 14 stages recognised by the backend LLM intent
 * parser (see `backend/src/services/llm/promptParserService.ts` system
 * prompt — "Deal Stage Filtering Rules"). If stages change server-side,
 * update this list too.
 *
 * Keep the array order: it mirrors the natural sales funnel, which is the
 * order we want the dropdown to show by default.
 */

export interface DealStageOption {
  /** Exact value sent to the backend (do not normalise). */
  value: string;
  /** Short UI label (keep close to `value`; only shortened when long). */
  label: string;
  /** High-level group for visual clustering in the picker. */
  group: 'Pipeline' | 'Negotiation' | 'Closed';
}

export const DEAL_STAGES: DealStageOption[] = [
  { value: 'Prospect', label: 'Prospect', group: 'Pipeline' },
  { value: 'Outreach', label: 'Outreach', group: 'Pipeline' },
  { value: 'Appointment Scheduled', label: 'Appointment Scheduled', group: 'Pipeline' },
  { value: 'Qualified To Buy', label: 'Qualified To Buy', group: 'Pipeline' },
  { value: 'Presentation Scheduled', label: 'Presentation Scheduled', group: 'Pipeline' },
  { value: 'Demo meeting scheduled', label: 'Demo Meeting Scheduled', group: 'Pipeline' },
  { value: 'Proposal made', label: 'Proposal Made', group: 'Negotiation' },
  { value: 'Decision Maker Bought-In', label: 'Decision Maker Bought-In', group: 'Negotiation' },
  { value: 'Budgetary letter signed', label: 'Budgetary Letter Signed', group: 'Negotiation' },
  { value: 'Negotiation', label: 'Negotiation', group: 'Negotiation' },
  { value: 'Contract Sent', label: 'Contract Sent', group: 'Negotiation' },
  { value: 'Closed Won', label: 'Closed Won', group: 'Closed' },
  { value: 'Lost', label: 'Lost', group: 'Closed' },
  { value: 'Closed Lost', label: 'Closed Lost', group: 'Closed' },
];

export const DEAL_STAGE_VALUES: string[] = DEAL_STAGES.map((s) => s.value);

export function findStageOption(value: string): DealStageOption | undefined {
  return DEAL_STAGES.find((s) => s.value === value);
}
