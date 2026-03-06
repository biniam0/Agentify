import type { Deal } from '../services/dealService';

export interface DealMeeting {
  id: string;
  title?: string;
  name?: string;
  startTime?: string;
  start_time?: string;
  endTime?: string;
  end_time?: string;
  status?: string;
  body?: string;
}

export interface DealContact {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface InvestigationDeal extends Deal {
  closeDate?: string;
  summary?: string;
  meetings?: DealMeeting[];
  contacts?: DealContact[];
  recommendations?: Array<{ title?: string; severity?: string; [key: string]: unknown }>;
}

// ─── Filter Configuration ────────────────────────────────────────────

export type FilterFieldKey =
  | 'owner' | 'ownerEmail' | 'stage' | 'company' | 'pipeline' | 'tenant'
  | 'minAmount' | 'maxAmount'
  | 'updatedSince' | 'updatedBefore'
  | 'meetingSince' | 'meetingBefore'
  | 'closeSince' | 'closeBefore'
  | 'meetingToday' | 'meetingTomorrow' | 'meetingAfterTomorrow' | 'meetingThisWeek'
  | 'meetingNextDays' | 'futureMeetings'
  | 'hasMeetings' | 'hasContacts'
  | 'suggestGatheringType' | 'userDealReport' | 'report'
  | 'limit';

export type FilterInputType = 'text' | 'number' | 'date' | 'boolean';

export interface FilterFieldConfig {
  key: FilterFieldKey;
  label: string;
  inputType: FilterInputType;
  cliFlag: string;
  placeholder?: string;
  category: string;
}

export const FILTER_FIELDS: FilterFieldConfig[] = [
  { key: 'owner', label: 'Owner Name', inputType: 'text', cliFlag: '--owner', placeholder: 'e.g. John', category: 'Text Filters' },
  { key: 'ownerEmail', label: 'Owner Email', inputType: 'text', cliFlag: '--owner-email', placeholder: 'e.g. john@co.com', category: 'Text Filters' },
  { key: 'stage', label: 'Stage', inputType: 'text', cliFlag: '--stage', placeholder: 'e.g. Qualified', category: 'Text Filters' },
  { key: 'company', label: 'Company', inputType: 'text', cliFlag: '--company', placeholder: 'e.g. Acme', category: 'Text Filters' },
  { key: 'pipeline', label: 'Pipeline', inputType: 'text', cliFlag: '--pipeline', placeholder: 'e.g. Sales Pipeline', category: 'Text Filters' },
  { key: 'tenant', label: 'Tenant', inputType: 'text', cliFlag: '--tenant', placeholder: 'e.g. tenant-slug', category: 'Text Filters' },
  { key: 'minAmount', label: 'Min Amount', inputType: 'number', cliFlag: '--min-amount', placeholder: '10000', category: 'Amount' },
  { key: 'maxAmount', label: 'Max Amount', inputType: 'number', cliFlag: '--max-amount', placeholder: '100000', category: 'Amount' },
  { key: 'updatedSince', label: 'Updated Since', inputType: 'date', cliFlag: '--updated-since', category: 'Date Filters' },
  { key: 'updatedBefore', label: 'Updated Before', inputType: 'date', cliFlag: '--updated-before', category: 'Date Filters' },
  { key: 'meetingSince', label: 'Meeting Since', inputType: 'date', cliFlag: '--meeting-since', category: 'Date Filters' },
  { key: 'meetingBefore', label: 'Meeting Before', inputType: 'date', cliFlag: '--meeting-before', category: 'Date Filters' },
  { key: 'closeSince', label: 'Close Since', inputType: 'date', cliFlag: '--close-since', category: 'Date Filters' },
  { key: 'closeBefore', label: 'Close Before', inputType: 'date', cliFlag: '--close-before', category: 'Date Filters' },
  { key: 'meetingToday', label: 'Meetings Today', inputType: 'boolean', cliFlag: '--today', category: 'Meeting Shortcuts' },
  { key: 'meetingTomorrow', label: 'Meetings Tomorrow', inputType: 'boolean', cliFlag: '--tomorrow', category: 'Meeting Shortcuts' },
  { key: 'meetingAfterTomorrow', label: 'Meetings After Tomorrow', inputType: 'boolean', cliFlag: '--after-tomorrow', category: 'Meeting Shortcuts' },
  { key: 'meetingThisWeek', label: 'Meetings This Week', inputType: 'boolean', cliFlag: '--this-week', category: 'Meeting Shortcuts' },
  { key: 'meetingNextDays', label: 'Meetings Next N Days', inputType: 'number', cliFlag: '--next-days', placeholder: '7', category: 'Meeting Shortcuts' },
  { key: 'futureMeetings', label: 'Future Meetings Only', inputType: 'boolean', cliFlag: '--future-meetings', category: 'Meeting Shortcuts' },
  { key: 'hasMeetings', label: 'Has Meetings', inputType: 'boolean', cliFlag: '--has-meetings', category: 'Presence' },
  { key: 'hasContacts', label: 'Has Contacts', inputType: 'boolean', cliFlag: '--has-contacts', category: 'Presence' },
  { key: 'suggestGatheringType', label: 'Suggest Gathering Type', inputType: 'boolean', cliFlag: '--suggest-gathering-type', category: 'Output' },
  { key: 'userDealReport', label: 'User Deal Report', inputType: 'boolean', cliFlag: '--user-deal-report', category: 'Output' },
  { key: 'report', label: 'Categorized Report', inputType: 'boolean', cliFlag: '--report', category: 'Output' },
  { key: 'limit', label: 'Limit Results', inputType: 'number', cliFlag: '--limit', placeholder: '50', category: 'Output' },
];

export interface FilterRow {
  id: string;
  field: FilterFieldKey;
  value: string;
}

interface Filters {
  owner?: string;
  ownerEmail?: string;
  stage?: string;
  company?: string;
  pipeline?: string;
  tenant?: string;
  minAmount?: number;
  maxAmount?: number;
  updatedSince?: Date;
  updatedBefore?: Date;
  meetingSince?: Date;
  meetingBefore?: Date;
  closeSince?: Date;
  closeBefore?: Date;
  meetingToday?: boolean;
  meetingTomorrow?: boolean;
  meetingAfterTomorrow?: boolean;
  meetingThisWeek?: boolean;
  meetingNextDays?: number;
  futureMeetings?: boolean;
  hasMeetings?: boolean;
  hasContacts?: boolean;
  suggestGatheringType?: boolean;
  userDealReport?: boolean;
  report?: boolean;
  limit?: number;
}

// ─── Date Helpers ────────────────────────────────────────────────────

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

// ─── Build Filters from Query Builder Rows ───────────────────────────

export function buildFiltersFromRows(rows: FilterRow[]): Filters {
  const filters: Filters = {};

  for (const row of rows) {
    const config = FILTER_FIELDS.find(f => f.key === row.field);
    if (!config) continue;
    if (config.inputType !== 'boolean' && !row.value) continue;

    switch (config.inputType) {
      case 'text':
        (filters as Record<string, unknown>)[row.field] = row.value;
        break;
      case 'number': {
        const num = parseFloat(row.value);
        if (!isNaN(num)) (filters as Record<string, unknown>)[row.field] = num;
        break;
      }
      case 'date': {
        const d = new Date(row.value);
        if (!isNaN(d.getTime())) (filters as Record<string, unknown>)[row.field] = d;
        break;
      }
      case 'boolean':
        (filters as Record<string, unknown>)[row.field] = true;
        break;
    }
  }

  return filters;
}

// ─── Apply Filters (ported from CLI fetchDeals.ts) ───────────────────

export function applyFilters(deals: InvestigationDeal[], filters: Filters): InvestigationDeal[] {
  let result = [...deals];

  if (filters.owner) {
    const s = filters.owner.toLowerCase();
    result = result.filter(d => d.owner?.name?.toLowerCase().includes(s));
  }
  if (filters.ownerEmail) {
    const s = filters.ownerEmail.toLowerCase();
    result = result.filter(d => d.owner?.email?.toLowerCase().includes(s));
  }
  if (filters.stage) {
    const s = filters.stage.toLowerCase();
    result = result.filter(d => d.stage?.toLowerCase().includes(s));
  }
  if (filters.company) {
    const s = filters.company.toLowerCase();
    result = result.filter(d => d.company?.toLowerCase().includes(s));
  }
  if (filters.pipeline) {
    const s = filters.pipeline.toLowerCase();
    result = result.filter(d => d.pipelineName?.toLowerCase().includes(s));
  }
  if (filters.tenant) {
    const s = filters.tenant.toLowerCase();
    result = result.filter(d =>
      d.tenantSlug?.toLowerCase().includes(s) ||
      d.tenantName?.toLowerCase().includes(s)
    );
  }
  if (filters.minAmount !== undefined) {
    result = result.filter(d => (d.amount || 0) >= filters.minAmount!);
  }
  if (filters.maxAmount !== undefined) {
    result = result.filter(d => (d.amount || 0) <= filters.maxAmount!);
  }
  if (filters.updatedSince) {
    result = result.filter(d => d.updatedAt && new Date(d.updatedAt) >= filters.updatedSince!);
  }
  if (filters.updatedBefore) {
    result = result.filter(d => d.updatedAt && new Date(d.updatedAt) < filters.updatedBefore!);
  }
  if (filters.closeSince) {
    result = result.filter(d => d.closeDate && new Date(d.closeDate) >= filters.closeSince!);
  }
  if (filters.closeBefore) {
    result = result.filter(d => d.closeDate && new Date(d.closeDate) < filters.closeBefore!);
  }

  if (filters.meetingSince || filters.meetingBefore) {
    result = result.filter(d => {
      if (!d.meetings?.length) return false;
      return d.meetings.some(m => {
        const start = new Date(m.startTime || m.start_time || '');
        if (isNaN(start.getTime())) return false;
        if (filters.meetingSince && start < filters.meetingSince) return false;
        if (filters.meetingBefore && start >= filters.meetingBefore) return false;
        return true;
      });
    });
  }

  const hasMeetingInRange = (d: InvestigationDeal, rangeStart: Date, rangeEnd: Date): boolean => {
    if (!d.meetings?.length) return false;
    return d.meetings.some(m => {
      const start = new Date(m.startTime || m.start_time || '');
      if (isNaN(start.getTime())) return false;
      return start >= rangeStart && start < rangeEnd;
    });
  };

  const now = new Date();

  if (filters.meetingToday) {
    result = result.filter(d => hasMeetingInRange(d, startOfDay(now), startOfDay(addDays(now, 1))));
  }
  if (filters.meetingTomorrow) {
    result = result.filter(d => hasMeetingInRange(d, startOfDay(addDays(now, 1)), startOfDay(addDays(now, 2))));
  }
  if (filters.meetingAfterTomorrow) {
    result = result.filter(d => hasMeetingInRange(d, startOfDay(addDays(now, 2)), startOfDay(addDays(now, 3))));
  }
  if (filters.meetingThisWeek) {
    const weekStart = startOfWeek(now);
    result = result.filter(d => hasMeetingInRange(d, weekStart, addDays(weekStart, 7)));
  }
  if (filters.meetingNextDays !== undefined) {
    result = result.filter(d => hasMeetingInRange(d, startOfDay(now), startOfDay(addDays(now, filters.meetingNextDays! + 1))));
  }
  if (filters.futureMeetings) {
    result = result.filter(d => {
      if (!d.meetings?.length) return false;
      return d.meetings.some(m => {
        const start = new Date(m.startTime || m.start_time || '');
        return !isNaN(start.getTime()) && start >= now;
      });
    });
  }
  if (filters.hasMeetings) {
    result = result.filter(d => d.meetings && d.meetings.length > 0);
  }
  if (filters.hasContacts) {
    result = result.filter(d => d.contacts && d.contacts.length > 0);
  }
  if (filters.limit && filters.limit > 0) {
    result = result.slice(0, filters.limit);
  }

  return result;
}

// ─── Classification (ported from CLI fetchDeals.ts) ──────────────────

export type SuggestedGatheringType = 'LOST_DEAL' | 'INACTIVITY' | 'ZERO_SCORE' | 'NONE';

function approxZero(n: unknown): boolean {
  return typeof n === 'number' && Math.abs(n) < 1e-12;
}

function hasNoBarrierXScore(riskScores: Deal['riskScores'] | undefined): boolean {
  if (!riskScores) return true;
  if (
    !approxZero(riskScores.arenaRisk) ||
    !approxZero(riskScores.controlRoomRisk) ||
    !approxZero(riskScores.scoreCardRisk) ||
    !approxZero(riskScores.totalDealRisk)
  ) return false;
  const subRisks: Record<string, unknown> = riskScores.subCategoryRisk || {};
  for (const key of Object.keys(subRisks)) {
    if (!approxZero(subRisks[key])) return false;
  }
  return true;
}

function isInactiveDeal(deal: InvestigationDeal, inactivityDays = 14): { inactive: boolean; lastActivityAt?: Date } {
  const lower = (deal.stage || '').toLowerCase();
  if (lower.includes('closed')) return { inactive: false };
  const lastStr = deal.updatedAt || deal.createdAt;
  if (!lastStr) return { inactive: false };
  const lastActivityAt = new Date(lastStr);
  if (isNaN(lastActivityAt.getTime())) return { inactive: false };
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - inactivityDays);
  return { inactive: lastActivityAt < cutoff, lastActivityAt };
}

export function suggestGatheringTypeForDeal(deal: InvestigationDeal): { suggested: SuggestedGatheringType; reason: string } {
  const stageLower = (deal.stage || '').toLowerCase();
  if (stageLower === 'lost' || stageLower === 'closed lost') {
    return { suggested: 'LOST_DEAL', reason: `Stage is "${deal.stage}"` };
  }
  const inactivity = isInactiveDeal(deal, 14);
  if (inactivity.inactive) {
    return {
      suggested: 'INACTIVITY',
      reason: `No activity in 14+ days (last: ${inactivity.lastActivityAt?.toISOString() || 'unknown'})`,
    };
  }
  if (hasNoBarrierXScore(deal.riskScores)) {
    return { suggested: 'ZERO_SCORE', reason: 'Risk scores are all 0 or missing' };
  }
  return { suggested: 'NONE', reason: 'Does not match Lost / Inactivity / Zero Score criteria' };
}

function daysSince(date: Date | undefined): number | null {
  if (!date) return null;
  const ms = Date.now() - date.getTime();
  if (isNaN(ms)) return null;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

// ─── Output Enrichment ───────────────────────────────────────────────

export function enrichDeals(deals: InvestigationDeal[], filters: Filters): unknown {
  if (filters.report) {
    return buildCategorizedReport(deals);
  }
  if (filters.userDealReport) {
    return buildUserDealReport(deals);
  }
  if (filters.suggestGatheringType) {
    return deals.map(d => {
      const { suggested, reason } = suggestGatheringTypeForDeal(d);
      const lastStr = d.updatedAt || d.createdAt || null;
      const lastAt = lastStr ? new Date(lastStr) : undefined;
      return {
        ...d,
        _suggestedGatheringType: suggested,
        _suggestedReason: reason,
        _daysSinceActivity: lastAt && !isNaN(lastAt.getTime()) ? daysSince(lastAt) : null,
      };
    });
  }
  return deals;
}

function formatReportDeal(r: { deal: InvestigationDeal; suggested: string; reason: string; daysSinceActivity: number | null }) {
  return {
    dealId: r.deal.id,
    dealName: r.deal.dealName,
    company: r.deal.company,
    stage: r.deal.stage,
    amount: r.deal.amount,
    ownerName: r.deal.owner?.name || null,
    ownerEmail: r.deal.owner?.email || null,
    tenantSlug: r.deal.tenantSlug,
    suggestedType: r.suggested,
    reason: r.reason,
    daysSinceActivity: r.daysSinceActivity,
  };
}

function buildCategorizedReport(deals: InvestigationDeal[]) {
  const classified = deals.map(d => {
    const { suggested, reason } = suggestGatheringTypeForDeal(d);
    const lastStr = d.updatedAt || d.createdAt;
    const lastDate = lastStr ? new Date(lastStr) : undefined;
    const days = lastDate && !isNaN(lastDate.getTime()) ? daysSince(lastDate) : null;
    return { deal: d, suggested, reason, daysSinceActivity: days };
  });

  const lost = classified.filter(r => r.suggested === 'LOST_DEAL');
  const inactive = classified.filter(r => r.suggested === 'INACTIVITY');
  const zeroScore = classified.filter(r => r.suggested === 'ZERO_SCORE');
  const healthy = classified.filter(r => r.suggested === 'NONE');

  return {
    summary: {
      totalDeals: deals.length,
      lostDeals: lost.length,
      inactiveDeals: inactive.length,
      zeroScoreDeals: zeroScore.length,
      healthyDeals: healthy.length,
      actionNeeded: lost.length + inactive.length + zeroScore.length,
      pipelineValue: deals.reduce((s, d) => s + (d.amount || 0), 0),
      dealsWithMeetings: deals.filter(d => d.meetings && d.meetings.length > 0).length,
    },
    categories: {
      LOST_DEAL: lost.map(formatReportDeal),
      INACTIVITY: inactive.map(formatReportDeal),
      ZERO_SCORE: zeroScore.map(formatReportDeal),
      HEALTHY: healthy.map(formatReportDeal),
    },
  };
}

function getNextFutureMeeting(deal: InvestigationDeal): string | null {
  if (!deal.meetings?.length) return null;
  const now = new Date();
  const future = deal.meetings
    .map(m => new Date(m.startTime || m.start_time || ''))
    .filter(d => !isNaN(d.getTime()) && d >= now)
    .sort((a, b) => a.getTime() - b.getTime());
  return future.length > 0 ? future[0].toISOString() : null;
}

function urgencyRank(t: SuggestedGatheringType): number {
  switch (t) {
    case 'LOST_DEAL': return 4;
    case 'INACTIVITY': return 3;
    case 'ZERO_SCORE': return 2;
    case 'NONE': return 1;
  }
}

function buildUserDealReport(deals: InvestigationDeal[]) {
  const severityRank = (sev: string | undefined): number => {
    switch ((sev || '').toLowerCase()) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'mid': case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  };

  const rows = deals.map(d => {
    const lastStr = d.updatedAt || d.createdAt || null;
    const lastAt = lastStr ? new Date(lastStr) : undefined;
    const days = lastAt && !isNaN(lastAt.getTime()) ? daysSince(lastAt) : null;
    const { suggested, reason } = suggestGatheringTypeForDeal(d);
    const totalRisk = typeof d.riskScores?.totalDealRisk === 'number' ? d.riskScores.totalDealRisk : null;
    const recs = Array.isArray(d.recommendations) ? d.recommendations : [];
    const topRec = recs.slice().sort((a, b) => severityRank(b?.severity) - severityRank(a?.severity))[0];

    return {
      dealId: d.id,
      dealName: d.dealName || 'Unnamed',
      tenantSlug: d.tenantSlug,
      stage: d.stage || 'Unknown',
      amount: d.amount || 0,
      updatedAt: d.updatedAt || null,
      createdAt: d.createdAt || null,
      lastActivityAt: lastStr,
      daysSinceActivity: days,
      meetingsCount: d.meetings?.length || 0,
      nextMeeting: getNextFutureMeeting(d),
      suggestedGatheringType: suggested,
      suggestedReason: reason,
      totalDealRisk: totalRisk,
      topRecommendationTitle: topRec?.title || null,
      topRecommendationSeverity: topRec?.severity || null,
    };
  });

  rows.sort((a, b) => {
    const r = urgencyRank(b.suggestedGatheringType as SuggestedGatheringType) - urgencyRank(a.suggestedGatheringType as SuggestedGatheringType);
    if (r !== 0) return r;
    return (b.daysSinceActivity || 0) - (a.daysSinceActivity || 0);
  });

  return rows;
}

// ─── Run full pipeline: filter + enrich ──────────────────────────────

export function runInvestigationQuery(deals: InvestigationDeal[], rows: FilterRow[]): { result: unknown; filtered: InvestigationDeal[]; count: number; filters: Filters } {
  const filters = buildFiltersFromRows(rows);
  const filtered = applyFilters(deals, filters);
  const result = enrichDeals(filtered, filters);
  const count = Array.isArray(result) ? result.length : (filtered.length);
  return { result, filtered, count, filters };
}

