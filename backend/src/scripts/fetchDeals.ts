/**
 * Fetch & Filter Deals from BarrierX Bulk API
 *
 * Fetches all deals from the BarrierX bulk endpoint and lets you
 * filter results by owner, meeting date, deal updatedAt, stage,
 * company, pipeline, amount, and more.
 *
 * Usage:
 *   npx ts-node src/scripts/fetchDeals.ts [options]
 *
 * Options:
 *   --owner <name>              Filter deals by owner name (case-insensitive, partial match)
 *   --owner-email <email>       Filter deals by owner email (case-insensitive, partial match)
 *   --stage <stage>             Filter deals by stage (case-insensitive, partial match)
 *   --company <company>         Filter deals by company name (case-insensitive, partial match)
 *   --pipeline <pipeline>       Filter deals by pipeline name (case-insensitive, partial match)
 *   --min-amount <number>       Filter deals with amount >= value
 *   --max-amount <number>       Filter deals with amount <= value
 *   --updated-since <date>      Filter deals updated since date (ISO 8601 or YYYY-MM-DD)
 *   --updated-before <date>     Filter deals updated before date (ISO 8601 or YYYY-MM-DD)
 *   --meeting-since <date>      Filter deals with meetings starting since date
 *   --meeting-before <date>     Filter deals with meetings starting before date
 *   --close-since <date>        Filter deals with close date since date
 *   --close-before <date>       Filter deals with close date before date
 *   --today                     Only deals with meetings today
 *   --tomorrow                  Only deals with meetings tomorrow
 *   --after-tomorrow            Only deals with meetings the day after tomorrow
 *   --this-week                 Only deals with meetings this week (Mon-Sun)
 *   --next-days <n>             Only deals with meetings in the next N days
 *   --future-meetings           Only deals with meetings in the future (from now)
 *   --has-meetings              Only include deals that have at least one meeting
 *   --has-contacts              Only include deals that have at least one contact
 *   --tenant <slug>             Filter by tenant slug (case-insensitive, partial match)
 *   --timeout-ms <n>            API timeout in milliseconds (default: 120000)
 *   --suggest-gathering-type    Suggest info-gathering call type per deal (LOST_DEAL / INACTIVITY / ZERO_SCORE / NONE)
 *   --user-deal-report          Output a per-deal report (suggested call type + key fields)
 *   --report                    Categorized report (Lost / Inactive / Zero Score / Healthy) with emoji bullets
 *   --limit <number>            Limit the number of results printed (default: all)
 *   --json                      Output raw JSON instead of formatted table
 *   --verbose                   Show full deal details (contacts, meetings, etc.)
 *   --summary                   Show only summary stats (no individual deals)
 *   --help                      Show this help message
 *
 * Examples:
 *   npx ts-node src/scripts/fetchDeals.ts
 *   npx ts-node src/scripts/fetchDeals.ts --owner "John"
 *   npx ts-node src/scripts/fetchDeals.ts --stage "Qualified" --min-amount 10000
 *   npx ts-node src/scripts/fetchDeals.ts --owner "Andreja" --today
 *   npx ts-node src/scripts/fetchDeals.ts --owner "Andreja" --tomorrow --verbose
 *   npx ts-node src/scripts/fetchDeals.ts --owner "Andreja" --after-tomorrow
 *   npx ts-node src/scripts/fetchDeals.ts --owner "Andreja" --this-week
 *   npx ts-node src/scripts/fetchDeals.ts --owner "Andreja" --future-meetings
 *   npx ts-node src/scripts/fetchDeals.ts --owner "Andreja Andrejevic" --report
 *   npx ts-node src/scripts/fetchDeals.ts --meeting-since 2025-10-01 --has-meetings
 *   npx ts-node src/scripts/fetchDeals.ts --updated-since 2025-09-26 --json
 *   npx ts-node src/scripts/fetchDeals.ts --summary
 */

import axios from 'axios';
import { config } from '../config/env';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RawDeal {
  id: string;
  dealName: string;
  amount: number;
  stage: string;
  company: string;
  pipeline?: string;
  closeDate?: string;
  updatedAt?: string;
  createdAt?: string;
  summary?: string;
  owner?: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    hubspotId?: string;
    timezone?: string;
  };
  contacts?: Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
  }>;
  meetings?: Array<{
    id: string;
    title?: string;
    name?: string;
    startTime?: string;
    start_time?: string;
    endTime?: string;
    end_time?: string;
    status?: string;
    body?: string;
  }>;
  userDealRiskScores?: any;
  recommendations?: any[];
  [key: string]: any;
}

interface RawTenant {
  id: string;
  slug: string;
  name: string;
  deals?: RawDeal[];
  [key: string]: any;
}

interface BulkResponse {
  ok: boolean;
  tenants: RawTenant[];
  total?: number;
  count?: number;
}

interface FlatDeal extends RawDeal {
  tenantSlug: string;
  tenantName: string;
}

interface Filters {
  owner?: string;
  ownerEmail?: string;
  stage?: string;
  company?: string;
  pipeline?: string;
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
  tenant?: string;
  timeoutMs?: number;
  suggestGatheringType?: boolean;
  userDealReport?: boolean;
  report?: boolean;
  limit?: number;
  json?: boolean;
  verbose?: boolean;
  summary?: boolean;
}

// ─── Date Helpers ────────────────────────────────────────────────────────────

/** Get start of a day (00:00:00.000) in local time */
function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Get end of a day (23:59:59.999) in local time */
function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Add N days to a date */
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Get the Monday of the current week */
function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? 6 : day - 1; // adjust so Monday=0
  d.setDate(d.getDate() - diff);
  return d;
}

// ─── CLI Argument Parsing ────────────────────────────────────────────────────

function parseArgs(args: string[]): Filters {
  const filters: Filters = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case '--help':
        printHelp();
        process.exit(0);
      case '--owner':
        filters.owner = next;
        i++;
        break;
      case '--owner-email':
        filters.ownerEmail = next;
        i++;
        break;
      case '--stage':
        filters.stage = next;
        i++;
        break;
      case '--company':
        filters.company = next;
        i++;
        break;
      case '--pipeline':
        filters.pipeline = next;
        i++;
        break;
      case '--min-amount':
        filters.minAmount = parseFloat(next);
        i++;
        break;
      case '--max-amount':
        filters.maxAmount = parseFloat(next);
        i++;
        break;
      case '--updated-since':
        filters.updatedSince = parseDate(next, '--updated-since');
        i++;
        break;
      case '--updated-before':
        filters.updatedBefore = parseDate(next, '--updated-before');
        i++;
        break;
      case '--meeting-since':
        filters.meetingSince = parseDate(next, '--meeting-since');
        i++;
        break;
      case '--meeting-before':
        filters.meetingBefore = parseDate(next, '--meeting-before');
        i++;
        break;
      case '--close-since':
        filters.closeSince = parseDate(next, '--close-since');
        i++;
        break;
      case '--close-before':
        filters.closeBefore = parseDate(next, '--close-before');
        i++;
        break;
      case '--today':
        filters.meetingToday = true;
        break;
      case '--tomorrow':
        filters.meetingTomorrow = true;
        break;
      case '--after-tomorrow':
        filters.meetingAfterTomorrow = true;
        break;
      case '--this-week':
        filters.meetingThisWeek = true;
        break;
      case '--next-days':
        filters.meetingNextDays = parseInt(next, 10);
        i++;
        break;
      case '--future-meetings':
        filters.futureMeetings = true;
        break;
      case '--has-meetings':
        filters.hasMeetings = true;
        break;
      case '--has-contacts':
        filters.hasContacts = true;
        break;
      case '--tenant':
        filters.tenant = next;
        i++;
        break;
      case '--timeout-ms':
        filters.timeoutMs = parseInt(next, 10);
        i++;
        break;
      case '--suggest-gathering-type':
        filters.suggestGatheringType = true;
        break;
      case '--user-deal-report':
        filters.userDealReport = true;
        break;
      case '--report':
        filters.report = true;
        break;
      case '--limit':
        filters.limit = parseInt(next, 10);
        i++;
        break;
      case '--json':
        filters.json = true;
        break;
      case '--verbose':
        filters.verbose = true;
        break;
      case '--summary':
        filters.summary = true;
        break;
      default:
        if (arg.startsWith('--')) {
          console.error(`Unknown option: ${arg}`);
          console.error('Run with --help to see available options.');
          process.exit(1);
        }
    }
  }

  return filters;
}

function parseDate(value: string, flag: string): Date {
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    console.error(`Invalid date for ${flag}: "${value}". Use ISO 8601 or YYYY-MM-DD format.`);
    process.exit(1);
  }
  return d;
}

function printHelp() {
  console.log(`
Fetch & Filter Deals from BarrierX Bulk API

Usage:
  npx ts-node src/scripts/fetchDeals.ts [options]

Filters:
  --owner <name>              Filter by owner name (partial, case-insensitive)
  --owner-email <email>       Filter by owner email (partial, case-insensitive)
  --stage <stage>             Filter by deal stage (partial, case-insensitive)
  --company <company>         Filter by company name (partial, case-insensitive)
  --pipeline <pipeline>       Filter by pipeline name (partial, case-insensitive)
  --min-amount <number>       Deals with amount >= value
  --max-amount <number>       Deals with amount <= value
  --updated-since <date>      Deals updated since date (ISO 8601 or YYYY-MM-DD)
  --updated-before <date>     Deals updated before date
  --meeting-since <date>      Deals with meetings starting since date
  --meeting-before <date>     Deals with meetings starting before date
  --close-since <date>        Deals with close date since date
  --close-before <date>       Deals with close date before date

Meeting shortcuts:
  --today                     Only deals with meetings today
  --tomorrow                  Only deals with meetings tomorrow
  --after-tomorrow            Only deals with meetings the day after tomorrow
  --this-week                 Only deals with meetings this week (Mon-Sun)
  --next-days <n>             Only deals with meetings in the next N days
  --future-meetings           Only deals with meetings from now onwards

Presence:
  --has-meetings              Only deals with at least one meeting
  --has-contacts              Only deals with at least one contact
  --tenant <slug>             Filter by tenant slug (partial, case-insensitive)
  --timeout-ms <n>            API timeout in milliseconds (default: 120000)
  --suggest-gathering-type    Suggest info-gathering call type per deal
  --user-deal-report          Output a per-deal report (suggested call type + key fields)
  --report                    Categorized report with emoji bullets (Lost/Inactive/Healthy)

Output:
  --limit <number>            Limit number of results printed
  --json                      Output raw JSON
  --verbose                   Show full deal details
  --summary                   Show only summary stats (no individual deals)
  --help                      Show this help
  `);
}

// ─── API Call ────────────────────────────────────────────────────────────────

async function fetchDealsFromAPI(timeoutMs = 120000): Promise<BulkResponse> {
  const baseUrl = config.barrierx.baseUrl;
  const apiKey = config.barrierx.apiKey;

  if (!apiKey) {
    console.error('BARRIERX_API_KEY is not set. Check your .env file.');
    process.exit(1);
  }

  const url = `${baseUrl}/api/external/tenants/bulk`;

  const params = {
    user_ids: '',                                      // empty = wildcard (all users)
    include_deals: true,
    include_members: false,
    sync_engagements: true,
    deal_updated_since: '2025-09-26T00:00:00Z',
    deal_pipeline: '1. Sales Pipeline,Sales Pipeline',
  };

  console.log(`\nFetching deals from: ${url}`);
  console.log(`Parameters:`, JSON.stringify(params, null, 2));
  console.log('');

  const startTime = Date.now();

  const response = await axios.get<BulkResponse>(url, {
    params,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json',
    },
    timeout: timeoutMs,
  });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`API responded in ${durationSec}s`);

  if (!response.data.ok) {
    console.error('API returned ok=false:', JSON.stringify(response.data, null, 2));
    process.exit(1);
  }

  return response.data;
}

// ─── Info-Gathering Suggestion ────────────────────────────────────────────────

type SuggestedGatheringType = 'LOST_DEAL' | 'INACTIVITY' | 'ZERO_SCORE' | 'NONE';

function approxZero(n: unknown): boolean {
  return typeof n === 'number' && Math.abs(n) < 1e-12;
}

function hasNoBarrierXScore(riskScores: any): boolean {
  // Mirrors backend `hasNoBarrierXScore`: if missing => treat as zero-score.
  if (!riskScores) return true;

  if (
    !approxZero(riskScores.arenaRisk) ||
    !approxZero(riskScores.controlRoomRisk) ||
    !approxZero(riskScores.scoreCardRisk) ||
    !approxZero(riskScores.totalDealRisk)
  ) {
    return false;
  }

  const subRisks: Record<string, unknown> = riskScores.subCategoryRisk || {};
  for (const key of Object.keys(subRisks)) {
    if (!approxZero(subRisks[key])) return false;
  }

  return true;
}

function isLostStage(stage: string | undefined | null): boolean {
  const s = (stage || '').toLowerCase();
  return s === 'lost';
}

function isInactiveDeal(deal: FlatDeal, inactivityDays = 14): { inactive: boolean; lastActivityAt?: Date } {
  const lowerStage = (deal.stage || '').toLowerCase();
  if (lowerStage.includes('closed')) return { inactive: false };

  const lastActivityStr = deal.updatedAt || deal.createdAt;
  if (!lastActivityStr) return { inactive: false };

  const lastActivityAt = new Date(lastActivityStr);
  if (isNaN(lastActivityAt.getTime())) return { inactive: false };

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - inactivityDays);
  return { inactive: lastActivityAt < cutoff, lastActivityAt };
}

function suggestGatheringTypeForDeal(deal: FlatDeal): { suggested: SuggestedGatheringType; reason: string } {
  if (isLostStage(deal.stage)) {
    return { suggested: 'LOST_DEAL', reason: `Stage is "Lost"` };
  }

  const inactivity = isInactiveDeal(deal, 14);
  if (inactivity.inactive) {
    return {
      suggested: 'INACTIVITY',
      reason: `No recent activity in 14+ days (last activity: ${inactivity.lastActivityAt?.toISOString() || 'unknown'})`,
    };
  }

  if (hasNoBarrierXScore((deal as any).userDealRiskScores)) {
    return { suggested: 'ZERO_SCORE', reason: 'BarrierX risk scores appear to be all 0 (or missing)' };
  }

  return { suggested: 'NONE', reason: 'Does not match Lost / Inactivity / Zero Score criteria' };
}

function daysSince(date: Date | undefined): number | null {
  if (!date) return null;
  const ms = Date.now() - date.getTime();
  if (isNaN(ms)) return null;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

type UserDealReportRow = {
  dealId: string;
  dealName: string;
  tenantSlug: string;
  stage: string;
  amount: number;
  updatedAt: string | null;
  createdAt: string | null;
  lastActivityAt: string | null;
  daysSinceActivity: number | null;
  meetingsCount: number;
  nextMeeting: string | null;
  suggestedGatheringType: SuggestedGatheringType;
  suggestedReason: string;
  totalDealRisk: number | null;
  topRecommendationTitle: string | null;
  topRecommendationSeverity: string | null;
};

function buildUserDealReportRows(deals: FlatDeal[]): UserDealReportRow[] {
  return deals.map(d => {
    const lastActivityStr = d.updatedAt || d.createdAt || null;
    const lastActivityAt = lastActivityStr ? new Date(lastActivityStr) : undefined;
    const days = lastActivityAt && !isNaN(lastActivityAt.getTime()) ? daysSince(lastActivityAt) : null;
    const meetingsCount = d.meetings?.length || 0;
    const nextMeeting = (d as any).nextMeeting || null;
    const sugg = suggestGatheringTypeForDeal(d);
    const totalDealRisk =
      typeof (d as any).userDealRiskScores?.totalDealRisk === 'number'
        ? (d as any).userDealRiskScores.totalDealRisk
        : null;

    // Prefer the most urgent recommendation if present (Critical > High > Mid > Low)
    const recs: any[] = Array.isArray((d as any).recommendations) ? (d as any).recommendations : [];
    const severityRank = (sev: string | undefined): number => {
      switch ((sev || '').toLowerCase()) {
        case 'critical': return 4;
        case 'high': return 3;
        case 'mid': return 2;
        case 'medium': return 2;
        case 'low': return 1;
        default: return 0;
      }
    };
    const topRec = recs
      .slice()
      .sort((a, b) => severityRank(b?.severity) - severityRank(a?.severity))[0];

    return {
      dealId: d.id,
      dealName: d.dealName || 'Unnamed',
      tenantSlug: d.tenantSlug,
      stage: d.stage || 'Unknown',
      amount: d.amount || 0,
      updatedAt: d.updatedAt || null,
      createdAt: d.createdAt || null,
      lastActivityAt: lastActivityStr,
      daysSinceActivity: days,
      meetingsCount,
      nextMeeting,
      suggestedGatheringType: sugg.suggested,
      suggestedReason: sugg.reason,
      totalDealRisk,
      topRecommendationTitle: topRec?.title || null,
      topRecommendationSeverity: topRec?.severity || null,
    };
  });
}

function printUserDealReport(rows: UserDealReportRow[]) {
  const counts = new Map<SuggestedGatheringType, number>();
  rows.forEach(r => counts.set(r.suggestedGatheringType, (counts.get(r.suggestedGatheringType) || 0) + 1));

  console.log('\n' + '='.repeat(90));
  console.log('  USER DEAL REPORT');
  console.log('='.repeat(90));
  console.log(`  Deals: ${rows.length}`);
  console.log(`  Suggested call types: ` +
    `LOST_DEAL=${counts.get('LOST_DEAL') || 0}, ` +
    `INACTIVITY=${counts.get('INACTIVITY') || 0}, ` +
    `ZERO_SCORE=${counts.get('ZERO_SCORE') || 0}, ` +
    `NONE=${counts.get('NONE') || 0}`
  );

  const sorted = rows
    .slice()
    .sort((a, b) => {
      // Most actionable first: LOST_DEAL > INACTIVITY > ZERO_SCORE > NONE, then by days since activity desc.
      const rank = (t: SuggestedGatheringType) =>
        t === 'LOST_DEAL' ? 4 : t === 'INACTIVITY' ? 3 : t === 'ZERO_SCORE' ? 2 : 1;
      const r = rank(b.suggestedGatheringType) - rank(a.suggestedGatheringType);
      if (r !== 0) return r;
      return (b.daysSinceActivity || 0) - (a.daysSinceActivity || 0);
    });

  console.log('\n' + '-'.repeat(170));
  console.log(
    'Deal Name'.padEnd(44) +
    'Stage'.padEnd(22) +
    'Suggested'.padEnd(12) +
    'DaysSince'.padEnd(10) +
    'Mtgs'.padEnd(6) +
    'NextMeeting'.padEnd(22) +
    'Risk'.padEnd(8) +
    'Top Rec (Severity)'.padEnd(40)
  );
  console.log('-'.repeat(170));

  for (const r of sorted) {
    const dealName = r.dealName.substring(0, 42).padEnd(44);
    const stage = r.stage.substring(0, 20).padEnd(22);
    const sug = r.suggestedGatheringType.padEnd(12);
    const days = (r.daysSinceActivity === null ? 'N/A' : String(r.daysSinceActivity)).padEnd(10);
    const mtgs = String(r.meetingsCount).padEnd(6);
    const next = (r.nextMeeting ? new Date(r.nextMeeting).toISOString().slice(0, 16).replace('T', ' ') : '—').padEnd(22);
    const risk = (r.totalDealRisk === null ? '—' : r.totalDealRisk.toFixed(3)).padEnd(8);
    const rec = `${(r.topRecommendationTitle || '—').substring(0, 28)}${r.topRecommendationTitle && r.topRecommendationTitle.length > 28 ? '…' : ''} (${r.topRecommendationSeverity || '—'})`.padEnd(40);
    console.log(`${dealName}${stage}${sug}${days}${mtgs}${next}${risk}${rec}`);
  }

  console.log('-'.repeat(170));
}

// ─── Flatten ─────────────────────────────────────────────────────────────────

function flattenDeals(data: BulkResponse): FlatDeal[] {
  const flat: FlatDeal[] = [];

  for (const tenant of data.tenants || []) {
    for (const deal of tenant.deals || []) {
      flat.push({
        ...deal,
        tenantSlug: tenant.slug,
        tenantName: tenant.name,
      });
    }
  }

  return flat;
}

// ─── Filters ─────────────────────────────────────────────────────────────────

function applyFilters(deals: FlatDeal[], filters: Filters): FlatDeal[] {
  let result = [...deals];

  // Owner name
  if (filters.owner) {
    const search = filters.owner.toLowerCase();
    result = result.filter(d => d.owner?.name?.toLowerCase().includes(search));
  }

  // Owner email
  if (filters.ownerEmail) {
    const search = filters.ownerEmail.toLowerCase();
    result = result.filter(d => d.owner?.email?.toLowerCase().includes(search));
  }

  // Stage
  if (filters.stage) {
    const search = filters.stage.toLowerCase();
    result = result.filter(d => d.stage?.toLowerCase().includes(search));
  }

  // Company
  if (filters.company) {
    const search = filters.company.toLowerCase();
    result = result.filter(d => d.company?.toLowerCase().includes(search));
  }

  // Pipeline
  if (filters.pipeline) {
    const search = filters.pipeline.toLowerCase();
    result = result.filter(d => d.pipeline?.toLowerCase().includes(search));
  }

  // Amount range
  if (filters.minAmount !== undefined) {
    result = result.filter(d => (d.amount || 0) >= filters.minAmount!);
  }
  if (filters.maxAmount !== undefined) {
    result = result.filter(d => (d.amount || 0) <= filters.maxAmount!);
  }

  // Deal updatedAt
  if (filters.updatedSince) {
    result = result.filter(d => {
      if (!d.updatedAt) return false;
      return new Date(d.updatedAt) >= filters.updatedSince!;
    });
  }
  if (filters.updatedBefore) {
    result = result.filter(d => {
      if (!d.updatedAt) return false;
      return new Date(d.updatedAt) < filters.updatedBefore!;
    });
  }

  // Close date
  if (filters.closeSince) {
    result = result.filter(d => {
      if (!d.closeDate) return false;
      return new Date(d.closeDate) >= filters.closeSince!;
    });
  }
  if (filters.closeBefore) {
    result = result.filter(d => {
      if (!d.closeDate) return false;
      return new Date(d.closeDate) < filters.closeBefore!;
    });
  }

  // Meeting date filters (explicit date range)
  if (filters.meetingSince || filters.meetingBefore) {
    result = result.filter(d => {
      if (!d.meetings || d.meetings.length === 0) return false;
      return d.meetings.some(m => {
        const start = new Date(m.startTime || m.start_time || '');
        if (isNaN(start.getTime())) return false;
        if (filters.meetingSince && start < filters.meetingSince) return false;
        if (filters.meetingBefore && start >= filters.meetingBefore) return false;
        return true;
      });
    });
  }

  // ── Meeting shortcut filters (today / tomorrow / after-tomorrow / this-week / next-days / future) ──
  const hasMeetingInRange = (d: FlatDeal, rangeStart: Date, rangeEnd: Date): boolean => {
    if (!d.meetings || d.meetings.length === 0) return false;
    return d.meetings.some(m => {
      const start = new Date(m.startTime || m.start_time || '');
      if (isNaN(start.getTime())) return false;
      return start >= rangeStart && start < rangeEnd;
    });
  };

  const now = new Date();

  if (filters.meetingToday) {
    const dayStart = startOfDay(now);
    const dayEnd = startOfDay(addDays(now, 1));
    console.log(`  Filter: meetings today (${dayStart.toLocaleDateString()} 00:00 – 23:59)`);
    result = result.filter(d => hasMeetingInRange(d, dayStart, dayEnd));
  }

  if (filters.meetingTomorrow) {
    const dayStart = startOfDay(addDays(now, 1));
    const dayEnd = startOfDay(addDays(now, 2));
    console.log(`  Filter: meetings tomorrow (${dayStart.toLocaleDateString()})`);
    result = result.filter(d => hasMeetingInRange(d, dayStart, dayEnd));
  }

  if (filters.meetingAfterTomorrow) {
    const dayStart = startOfDay(addDays(now, 2));
    const dayEnd = startOfDay(addDays(now, 3));
    console.log(`  Filter: meetings day after tomorrow (${dayStart.toLocaleDateString()})`);
    result = result.filter(d => hasMeetingInRange(d, dayStart, dayEnd));
  }

  if (filters.meetingThisWeek) {
    const weekStart = startOfWeek(now);
    const weekEnd = addDays(weekStart, 7);
    console.log(`  Filter: meetings this week (${weekStart.toLocaleDateString()} – ${addDays(weekEnd, -1).toLocaleDateString()})`);
    result = result.filter(d => hasMeetingInRange(d, weekStart, weekEnd));
  }

  if (filters.meetingNextDays !== undefined) {
    const rangeStart = startOfDay(now);
    const rangeEnd = startOfDay(addDays(now, filters.meetingNextDays + 1));
    console.log(`  Filter: meetings in next ${filters.meetingNextDays} days (until ${addDays(rangeEnd, -1).toLocaleDateString()})`);
    result = result.filter(d => hasMeetingInRange(d, rangeStart, rangeEnd));
  }

  if (filters.futureMeetings) {
    console.log(`  Filter: future meetings only (from ${now.toISOString()})`);
    result = result.filter(d => {
      if (!d.meetings || d.meetings.length === 0) return false;
      return d.meetings.some(m => {
        const start = new Date(m.startTime || m.start_time || '');
        return !isNaN(start.getTime()) && start >= now;
      });
    });
  }

  // Has meetings
  if (filters.hasMeetings) {
    result = result.filter(d => d.meetings && d.meetings.length > 0);
  }

  // Has contacts
  if (filters.hasContacts) {
    result = result.filter(d => d.contacts && d.contacts.length > 0);
  }

  // Tenant slug
  if (filters.tenant) {
    const search = filters.tenant.toLowerCase();
    result = result.filter(d =>
      d.tenantSlug?.toLowerCase().includes(search) ||
      d.tenantName?.toLowerCase().includes(search)
    );
  }

  return result;
}

// ─── Output ──────────────────────────────────────────────────────────────────

function printSummary(allDeals: FlatDeal[], filtered: FlatDeal[], filters: Filters) {
  console.log('\n' + '='.repeat(80));
  console.log('  DEALS SUMMARY');
  console.log('='.repeat(80));

  console.log(`\n  Total deals fetched:    ${allDeals.length}`);
  console.log(`  After filters:          ${filtered.length}`);

  // Unique owners
  const owners = new Map<string, number>();
  filtered.forEach(d => {
    const name = d.owner?.name || 'Unknown';
    owners.set(name, (owners.get(name) || 0) + 1);
  });
  console.log(`  Unique owners:          ${owners.size}`);

  // Stages breakdown
  const stages = new Map<string, number>();
  filtered.forEach(d => {
    const stage = d.stage || 'Unknown';
    stages.set(stage, (stages.get(stage) || 0) + 1);
  });

  console.log(`\n  --- Deals by Stage ---`);
  const sortedStages = [...stages.entries()].sort((a, b) => b[1] - a[1]);
  for (const [stage, count] of sortedStages) {
    console.log(`    ${stage.padEnd(40)} ${count}`);
  }

  // Owners breakdown
  console.log(`\n  --- Deals by Owner ---`);
  const sortedOwners = [...owners.entries()].sort((a, b) => b[1] - a[1]);
  for (const [owner, count] of sortedOwners) {
    console.log(`    ${owner.padEnd(40)} ${count}`);
  }

  // Tenants breakdown
  const tenants = new Map<string, number>();
  filtered.forEach(d => {
    const t = d.tenantName || d.tenantSlug || 'Unknown';
    tenants.set(t, (tenants.get(t) || 0) + 1);
  });
  console.log(`\n  --- Deals by Tenant ---`);
  const sortedTenants = [...tenants.entries()].sort((a, b) => b[1] - a[1]);
  for (const [tenant, count] of sortedTenants) {
    console.log(`    ${tenant.padEnd(40)} ${count}`);
  }

  // Meetings stats
  const withMeetings = filtered.filter(d => d.meetings && d.meetings.length > 0).length;
  const totalMeetings = filtered.reduce((sum, d) => sum + (d.meetings?.length || 0), 0);
  console.log(`\n  --- Meetings ---`);
  console.log(`    Deals with meetings:  ${withMeetings}`);
  console.log(`    Total meetings:       ${totalMeetings}`);

  // Amount stats
  const amounts = filtered.map(d => d.amount || 0).filter(a => a > 0);
  if (amounts.length > 0) {
    const totalAmount = amounts.reduce((a, b) => a + b, 0);
    const avgAmount = totalAmount / amounts.length;
    console.log(`\n  --- Amount ---`);
    console.log(`    Total value:          $${totalAmount.toLocaleString()}`);
    console.log(`    Average deal:         $${Math.round(avgAmount).toLocaleString()}`);
    console.log(`    Min:                  $${Math.min(...amounts).toLocaleString()}`);
    console.log(`    Max:                  $${Math.max(...amounts).toLocaleString()}`);
  }

  // Active filters
  const activeFilters = Object.entries(filters)
    .filter(([_, v]) => v !== undefined && v !== false)
    .map(([k, v]) => `${k}=${v instanceof Date ? v.toISOString().split('T')[0] : v}`);
  if (activeFilters.length > 0) {
    console.log(`\n  Active filters: ${activeFilters.join(', ')}`);
  }

  console.log('\n' + '='.repeat(80));
}

function printDealsTable(deals: FlatDeal[], filters: Filters) {
  if (deals.length === 0) {
    console.log('\n  No deals match the given filters.\n');
    return;
  }

  const display = filters.limit ? deals.slice(0, filters.limit) : deals;

  console.log('\n' + '-'.repeat(140));
  console.log(
    '#'.padEnd(5) +
    'Deal Name'.padEnd(32) +
    'Owner'.padEnd(22) +
    'Stage'.padEnd(20) +
    'Amount'.padStart(12) +
    '  ' +
    'Updated'.padEnd(12) +
    'Mtgs'.padEnd(6) +
    'Next Meeting'.padEnd(28)
  );
  console.log('-'.repeat(140));

  display.forEach((d, i) => {
    const name = (d.dealName || 'Unnamed').substring(0, 30);
    const owner = (d.owner?.name || 'Unknown').substring(0, 20);
    const stage = (d.stage || 'Unknown').substring(0, 18);
    const amount = d.amount ? `$${d.amount.toLocaleString()}` : '$0';
    const updated = d.updatedAt
      ? new Date(d.updatedAt).toISOString().split('T')[0]
      : 'N/A';
    const meetingCount = d.meetings?.length || 0;

    // Find next future meeting
    const futureMeetings = (d.meetings || [])
      .map(m => ({ ...m, _start: new Date(m.startTime || m.start_time || '') }))
      .filter(m => !isNaN(m._start.getTime()) && m._start >= new Date())
      .sort((a, b) => a._start.getTime() - b._start.getTime());

    const nextMeeting = futureMeetings.length > 0
      ? futureMeetings[0]._start.toLocaleString('en-US', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        })
      : 'None upcoming';

    console.log(
      `${(i + 1).toString().padEnd(5)}` +
      `${name.padEnd(32)}` +
      `${owner.padEnd(22)}` +
      `${stage.padEnd(20)}` +
      `${amount.padStart(12)}` +
      '  ' +
      `${updated.padEnd(12)}` +
      `${meetingCount.toString().padEnd(6)}` +
      `${nextMeeting.padEnd(28)}`
    );
  });

  console.log('-'.repeat(120));

  if (filters.limit && deals.length > filters.limit) {
    console.log(`  Showing ${filters.limit} of ${deals.length} deals. Remove --limit to see all.`);
  }
}

function printVerboseDeals(deals: FlatDeal[], filters: Filters) {
  const display = filters.limit ? deals.slice(0, filters.limit) : deals;

  for (const [i, d] of display.entries()) {
    console.log('\n' + '='.repeat(80));
    console.log(`  Deal #${i + 1}: ${d.dealName || 'Unnamed'}`);
    console.log('='.repeat(80));
    console.log(`  ID:           ${d.id}`);
    console.log(`  Company:      ${d.company || 'N/A'}`);
    console.log(`  Stage:        ${d.stage || 'N/A'}`);
    console.log(`  Pipeline:     ${d.pipeline || 'N/A'}`);
    console.log(`  Amount:       ${d.amount ? '$' + d.amount.toLocaleString() : 'N/A'}`);
    console.log(`  Close Date:   ${d.closeDate || 'N/A'}`);
    console.log(`  Updated At:   ${d.updatedAt || 'N/A'}`);
    console.log(`  Created At:   ${d.createdAt || 'N/A'}`);
    console.log(`  Tenant:       ${d.tenantName} (${d.tenantSlug})`);

    if (d.owner) {
      console.log(`\n  --- Owner ---`);
      console.log(`    Name:       ${d.owner.name || 'N/A'}`);
      console.log(`    Email:      ${d.owner.email || 'N/A'}`);
      console.log(`    Phone:      ${d.owner.phone || 'N/A'}`);
      console.log(`    HubSpot ID: ${d.owner.hubspotId || d.owner.id || 'N/A'}`);
      console.log(`    Timezone:   ${d.owner.timezone || 'N/A'}`);
    }

    if (d.contacts && d.contacts.length > 0) {
      console.log(`\n  --- Contacts (${d.contacts.length}) ---`);
      d.contacts.forEach((c, ci) => {
        console.log(`    [${ci + 1}] ${c.name} | ${c.email || 'no email'} | ${c.phone || 'no phone'}`);
      });
    }

    if (d.meetings && d.meetings.length > 0) {
      console.log(`\n  --- Meetings (${d.meetings.length}) ---`);
      d.meetings.forEach((m, mi) => {
        const start = m.startTime || m.start_time || 'N/A';
        const end = m.endTime || m.end_time || 'N/A';
        console.log(`    [${mi + 1}] ${m.title || m.name || 'Untitled'}`);
        console.log(`        Start: ${start}`);
        console.log(`        End:   ${end}`);
        console.log(`        Status: ${m.status || 'N/A'}`);
      });
    }

    if (d.summary) {
      console.log(`\n  Summary: ${d.summary.substring(0, 200)}${d.summary.length > 200 ? '...' : ''}`);
    }
  }
}

// ─── Categorized Report ──────────────────────────────────────────────────────

interface ReportDeal {
  deal: FlatDeal;
  suggested: SuggestedGatheringType;
  reason: string;
  daysSinceActivity: number | null;
}

function buildReportBullet(rd: ReportDeal): string {
  const ownerName = rd.deal.owner?.name || 'Unknown Owner';
  const dealName = rd.deal.dealName || 'Unnamed Deal';
  const company = rd.deal.company && rd.deal.company !== 'Unknown Company'
    ? rd.deal.company
    : '';

  // Format: "Owner Name – Deal Name (Company)" or "Owner Name – Deal Name"
  const companyPart = company ? ` (${company})` : '';
  return `${ownerName} – ${dealName}${companyPart}`;
}

function printReport(deals: FlatDeal[]) {
  const classified: ReportDeal[] = deals.map(d => {
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

  const ownerName = deals.length > 0 ? (deals[0].owner?.name || 'Unknown') : 'Unknown';

  console.log('');
  console.log('='.repeat(70));
  console.log(`  DEAL STATUS REPORT — ${ownerName}`);
  console.log(`  Generated: ${new Date().toLocaleString()}`);
  console.log(`  Total deals: ${deals.length}`);
  console.log('='.repeat(70));

  // ── Lost deals
  if (lost.length > 0) {
    console.log('');
    console.log(`📉 ${lost.length} LOST deal${lost.length > 1 ? 's' : ''} – need Lost Deal Questionnaire call:`);
    for (const r of lost) {
      console.log(`    • ${buildReportBullet(r)}`);
    }
  }

  // ── Inactive deals – group by stage for clarity
  if (inactive.length > 0) {
    const stageGroups = new Map<string, ReportDeal[]>();
    for (const r of inactive) {
      const stage = r.deal.stage || 'Unknown';
      if (!stageGroups.has(stage)) stageGroups.set(stage, []);
      stageGroups.get(stage)!.push(r);
    }

    console.log('');
    const stageLabel = [...stageGroups.keys()].join(', ');
    console.log(`⏳ ${inactive.length} INACTIVE deal${inactive.length > 1 ? 's' : ''} (14+ days, ${stageLabel}):`);
    for (const r of inactive) {
      const days = r.daysSinceActivity !== null ? ` [${r.daysSinceActivity}d inactive]` : '';
      console.log(`    • ${buildReportBullet(r)}${days}`);
    }
  }

  // ── Zero score deals
  if (zeroScore.length > 0) {
    console.log('');
    console.log(`⚠️  ${zeroScore.length} ZERO SCORE deal${zeroScore.length > 1 ? 's' : ''} – missing BarrierX risk assessment:`);
    for (const r of zeroScore) {
      console.log(`    • ${buildReportBullet(r)}`);
    }
  }

  // ── Healthy deals
  if (healthy.length > 0) {
    console.log('');
    console.log(`✅ ${healthy.length} Healthy deal${healthy.length > 1 ? 's' : ''} – no call needed:`);
    for (const r of healthy) {
      console.log(`    • ${buildReportBullet(r)}`);
    }
  }

  // ── Quick totals
  const totalAmount = deals.reduce((sum, d) => sum + (d.amount || 0), 0);
  const withMeetings = deals.filter(d => d.meetings && d.meetings.length > 0).length;

  console.log('');
  console.log('-'.repeat(70));
  console.log(`  Pipeline value:  $${totalAmount.toLocaleString()}`);
  console.log(`  Deals w/ meetings: ${withMeetings} of ${deals.length}`);
  console.log(`  Action needed:     ${lost.length + inactive.length + zeroScore.length} deal${(lost.length + inactive.length + zeroScore.length) !== 1 ? 's' : ''}`);
  console.log('-'.repeat(70));
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  // Skip the first 2 args (node, script path)
  const cliArgs = process.argv.slice(2);
  const filters = parseArgs(cliArgs);

  console.log('\n' + '='.repeat(80));
  console.log('  BarrierX Deals Fetcher');
  console.log('='.repeat(80));

  try {
    // 1. Fetch from API
    const timeoutMs = filters.timeoutMs ?? 120000;
    if (isNaN(timeoutMs) || timeoutMs < 1000) {
      console.error('--timeout-ms must be a number >= 1000');
      process.exit(1);
    }
    const data = await fetchDealsFromAPI(timeoutMs);

    const tenantCount = data.tenants?.length || 0;
    console.log(`\nReceived ${tenantCount} tenant(s)`);

    // 2. Flatten
    const allDeals = flattenDeals(data);
    console.log(`Total deals across all tenants: ${allDeals.length}`);

    // 3. Apply filters
    const filtered = applyFilters(allDeals, filters);
    console.log(`Deals after filtering: ${filtered.length}`);

    // 4. Output
    if (filters.report) {
      printReport(filtered);
    } else if (filters.userDealReport) {
      const rows = buildUserDealReportRows(filtered);
      if (filters.json) {
        console.log(JSON.stringify(rows, null, 2));
      } else {
        printUserDealReport(rows);
      }
    } else if (filters.suggestGatheringType) {
      const suggestions = filtered.map(d => {
        const s = suggestGatheringTypeForDeal(d);
        return {
          dealId: d.id,
          dealName: d.dealName || 'Unnamed',
          stage: d.stage || 'Unknown',
          updatedAt: d.updatedAt || null,
          createdAt: d.createdAt || null,
          tenantSlug: d.tenantSlug,
          ownerName: d.owner?.name || null,
          ownerEmail: d.owner?.email || null,
          suggestedGatheringType: s.suggested,
          reason: s.reason,
        };
      });

      if (filters.json) {
        console.log(JSON.stringify(suggestions, null, 2));
      } else {
        console.log('\n' + '-'.repeat(140));
        console.log(
          'Deal Name'.padEnd(42) +
          'Stage'.padEnd(22) +
          'Suggested'.padEnd(14) +
          'Updated'.padEnd(14) +
          'Reason'
        );
        console.log('-'.repeat(140));
        for (const row of suggestions) {
          const dealName = row.dealName.substring(0, 40).padEnd(42);
          const stage = (row.stage || 'Unknown').substring(0, 20).padEnd(22);
          const suggested = row.suggestedGatheringType.padEnd(14);
          const updated = (row.updatedAt ? new Date(row.updatedAt).toISOString().split('T')[0] : 'N/A').padEnd(14);
          console.log(`${dealName}${stage}${suggested}${updated}${row.reason}`);
        }
        console.log('-'.repeat(140));
      }
    } else if (filters.json) {
      // JSON output
      console.log(JSON.stringify(filtered, null, 2));
    } else if (filters.summary) {
      // Summary only
      printSummary(allDeals, filtered, filters);
    } else if (filters.verbose) {
      // Verbose per-deal output
      printSummary(allDeals, filtered, filters);
      printVerboseDeals(filtered, filters);
    } else {
      // Default: summary + table
      printSummary(allDeals, filtered, filters);
      printDealsTable(filtered, filters);
    }

  } catch (error: any) {
    console.error('\nFailed to fetch deals:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error(`HTTP Status: ${error.response.status}`);
    }
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
