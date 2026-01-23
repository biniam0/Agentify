/**
 * Info Gathering Service
 * 
 * Handles automated info gathering calls for:
 * - Zero Score: Deals with no BarrierX scores
 * - Lost Deals: Deals marked as "Closed Lost"
 * - Inactivity: Deals with no activity for 2 weeks (Future)
 * 
 * Integrated directly into the backend for better control and easier stopping.
 * 
 * Architecture:
 * - Uses modular gatheringConfig for type-specific settings
 * - Supports both unified agent and independent agent modes
 * - Each type has its own Redis namespace for deduplication
 */

import axios from 'axios';
import { config } from '../config/env';
import prisma from '../config/database';
import { getRedisClient } from '../config/redis';
import {
  GatheringType,
  getAgentIdForType,
  getGatheringConfig,
  buildDynamicVariables,
  getRedisKey,
  GATHERING_CONFIGS,
} from '../config/gatheringConfig';

// Re-export GatheringType for backwards compatibility
export type { GatheringType } from '../config/gatheringConfig';

interface DealOwner {
  name: string;
  email: string;
  phone: string;
  timezone?: string;
  hubspotId?: string;
}

interface DealRiskScores {
  arenaRisk: number;
  controlRoomRisk: number;
  scoreCardRisk: number;
  totalDealRisk: number;
  subCategoryRisk: Record<string, number>;
}

interface Deal {
  id: string;
  dealName: string;
  company: string;
  pipelineName: string;
  stage: string;
  amount: number;
  owner: DealOwner;
  userDealRiskScores: DealRiskScores;
  createdAt?: string;
  updatedAt?: string;
}

interface Tenant {
  id: string;
  slug: string;
  name: string;
}

interface BulkApiResponse {
  ok: boolean;
  tenants: Array<Tenant & { deals: Deal[] }>;
}

export interface JobStatus {
  isRunning: boolean;
  shouldStop: boolean;
  startedAt: Date | null;
  type: GatheringType | null;
  triggeredBy: string | null;

  // Progress
  totalDeals: number;
  processedDeals: number;
  successfulCalls: number;
  failedCalls: number;
  skippedDeals: number;

  // Current batch info
  currentBatch: number;
  totalBatches: number;

  // Recent output for UI
  recentLogs: string[];

  // Error info
  lastError: string | null;
}

// ============================================
// CONFIGURATION
// ============================================

// Redis TTL for tracking called deals (5 days)
const REDIS_TTL_SECONDS = 5 * 24 * 60 * 60;

const BATCH_SIZE = 2;
const POLL_INTERVAL_MS = 15000;
const BATCH_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

const EXCLUDED_PHONE_NUMBERS = [
  '+2347031277833',
  '+251982846075',
  '+251 98 284 6075',
];

const BARRIERX_BULK_API = `${config.barrierx.baseUrl}/api/external/tenants/bulk`;

// ============================================
// JOB STATE (Singleton)
// ============================================

const jobState: JobStatus = {
  isRunning: false,
  shouldStop: false,
  startedAt: null,
  type: null,
  triggeredBy: null,
  totalDeals: 0,
  processedDeals: 0,
  successfulCalls: 0,
  failedCalls: 0,
  skippedDeals: 0,
  currentBatch: 0,
  totalBatches: 0,
  recentLogs: [],
  lastError: null,
};

// ============================================
// LOGGING HELPER
// ============================================

function log(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);

  // Keep last 50 log lines
  jobState.recentLogs.push(message);
  if (jobState.recentLogs.length > 50) {
    jobState.recentLogs.shift();
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function hasNoBarrierXScore(riskScores: DealRiskScores | null | undefined): boolean {
  if (!riskScores) return true;

  if (
    riskScores.arenaRisk !== 0 ||
    riskScores.controlRoomRisk !== 0 ||
    riskScores.scoreCardRisk !== 0 ||
    riskScores.totalDealRisk !== 0
  ) {
    return false;
  }

  const subRisks = riskScores.subCategoryRisk || {};
  for (const key of Object.keys(subRisks)) {
    if (subRisks[key] !== 0) {
      return false;
    }
  }

  return true;
}

function isClosedLost(stage: string): boolean {
  if (!stage) return false;
  const lowerStage = stage.toLowerCase();
  return lowerStage.includes('closed lost') || lowerStage === 'closedlost';
}

/**
 * Check if a deal has had no activity for 2 weeks
 * Uses the deal's updatedAt field to determine inactivity
 */
function hasNoRecentActivity(deal: Deal): boolean {
  // Use updatedAt if available, fallback to createdAt
  const lastActivityStr = deal.updatedAt || deal.createdAt;

  if (!lastActivityStr) {
    // If no date available, skip this deal
    return false;
  }

  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const lastActivity = new Date(lastActivityStr);
  return lastActivity < twoWeeksAgo;
}

/**
 * Check if a deal was created within the specified number of days
 * Used to filter "fresh" deals for Zero Score calling
 */
function isWithinDays(createdAt: string | undefined, days: number): boolean {
  if (!createdAt) return false; // If no createdAt, exclude the deal

  const createdDate = new Date(createdAt);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return createdDate >= cutoffDate;
}

async function wasAlreadyCalled(dealId: string, type: GatheringType): Promise<boolean> {
  const client = await getRedisClient();
  if (!client) return false;

  // Use modular config for Redis key (each type has its own namespace)
  const key = getRedisKey(type, dealId);
  const exists = await client.exists(key);
  return exists === 1;
}

async function markAsCalled(dealId: string, type: GatheringType): Promise<void> {
  const client = await getRedisClient();
  if (!client) return;

  // Use modular config for Redis key (each type has its own namespace)
  const key = getRedisKey(type, dealId);
  await client.setEx(key, REDIS_TTL_SECONDS, new Date().toISOString());
}

// ============================================
// API FUNCTIONS
// ============================================

async function fetchDeals(): Promise<Array<{ tenant: Tenant; deal: Deal }>> {
  log('📡 Fetching deals from BarrierX API...');

  const params = new URLSearchParams({
    include_deals: 'true',
    include_members: 'false',
    sync_engagements: 'true',
  });

  if (config.automation.dealPipelines.length > 0) {
    params.set('deal_pipeline', config.automation.dealPipelines.join(','));
  }

  const dealUpdateSince = new Date();
  dealUpdateSince.setDate(dealUpdateSince.getDate() - config.automation.dealUpdateWindowDays);
  params.set('deal_updated_since', dealUpdateSince.toISOString().split('T')[0] + 'T00:00:00Z');

  const url = `${BARRIERX_BULK_API}?${params.toString()}`;

  const response = await axios.get<BulkApiResponse>(url, {
    headers: {
      'Authorization': `Bearer ${config.barrierx.apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.data.ok) {
    throw new Error('BarrierX API returned error');
  }

  const result: Array<{ tenant: Tenant; deal: Deal }> = [];
  for (const tenant of response.data.tenants) {
    for (const deal of tenant.deals || []) {
      result.push({
        tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
        deal,
      });
    }
  }

  log(`   ✅ Found ${result.length} deals across ${response.data.tenants.length} tenants`);
  return result;
}

async function triggerCall(
  tenant: Tenant,
  deal: Deal,
  type: GatheringType
): Promise<{ conversationId?: string; callSid?: string; error?: string }> {
  const owner = deal.owner;

  if (!owner?.phone) {
    return { error: 'No phone number' };
  }

  // Get agent ID from modular config (supports both unified and independent modes)
  const agentId = getAgentIdForType(type);
  if (!agentId) {
    const typeConfig = getGatheringConfig(type);
    return { error: `Agent ID not configured for ${typeConfig.displayName}` };
  }

  const phoneNumberId = config.elevenlabs.phoneNumberId;
  if (!phoneNumberId) {
    return { error: 'ELEVENLABS_PHONE_NUMBER_ID not configured' };
  }

  // Build base dynamic variables (shared across all gathering types)
  const baseDynamicVariables: Record<string, string> = {
    owner_name: owner.name,
    owner_first_name: owner.name.split(' ')[0],
    owner_email: owner.email,
    deal_id: deal.id,
    deal_name: deal.dealName,
    company_name: deal.company,
    deal_stage: deal.stage,
    deal_amount: deal.amount?.toString() || 'Not specified',
    tenant_slug: tenant.slug,
    tenant_name: tenant.name,
    hubspot_owner_id: owner.hubspotId || '',
  };

  // Build type-specific dynamic variables using modular config
  const dynamicVariables = buildDynamicVariables(
    type,
    baseDynamicVariables,
    { dealName: deal.dealName, stage: deal.stage }
  );

  try {
    const response = await axios.post(
      'https://api.elevenlabs.io/v1/convai/twilio/outbound-call',
      {
        agent_id: agentId,
        agent_phone_number_id: phoneNumberId,
        to_number: owner.phone,
        conversation_initiation_client_data: {
          dynamic_variables: dynamicVariables,
        },
      },
      {
        headers: {
          'xi-api-key': config.elevenlabs.apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      conversationId: response.data.conversation_id,
      callSid: response.data.callSid,
    };
  } catch (error: any) {
    return { error: error.response?.data?.detail || error.message };
  }
}

async function createInfoGatheringRecord(
  tenant: Tenant,
  deal: Deal,
  type: GatheringType,
  conversationId?: string,
  callSid?: string
): Promise<string> {
  const record = await prisma.barrierXInfoGathering.create({
    data: {
      gatheringType: type,
      dealId: deal.id,
      dealName: deal.dealName,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      companyName: deal.company,
      ownerName: deal.owner.name,
      ownerEmail: deal.owner.email,
      ownerPhone: deal.owner.phone,
      hubspotOwnerId: deal.owner.hubspotId,
      conversationId,
      callSid,
      status: conversationId ? 'PENDING' : 'FAILED',
    },
  });

  return record.id;
}

async function waitForBatchCompletion(recordIds: string[]): Promise<void> {
  if (recordIds.length === 0) return;

  const startTime = Date.now();
  log(`⏳ Waiting for ${recordIds.length} call(s) to complete...`);

  while (!jobState.shouldStop) {
    if (Date.now() - startTime > BATCH_TIMEOUT_MS) {
      log(`⚠️ Batch timeout (${BATCH_TIMEOUT_MS / 60000} min) - moving to next batch`);
      return;
    }

    const records = await prisma.barrierXInfoGathering.findMany({
      where: { id: { in: recordIds } },
      select: { id: true, status: true, dealName: true },
    });

    const completed = records.filter(r => r.status === 'COMPLETED' || r.status === 'FAILED');
    const pending = records.filter(r => r.status === 'PENDING' || r.status === 'IN_PROGRESS');

    log(`   📊 Progress: ${completed.length}/${recordIds.length} completed`);

    if (pending.length === 0) {
      log(`   ✅ Batch completed!`);
      for (const record of records) {
        const statusIcon = record.status === 'COMPLETED' ? '✅' : '❌';
        log(`      ${statusIcon} ${record.dealName}: ${record.status}`);
      }
      return;
    }

    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  log('⛔ Job stopped by user');
}

// ============================================
// MAIN EXECUTION FUNCTIONS
// ============================================

async function runZeroScoreGathering(): Promise<void> {
  log('═══════════════════════════════════════════════════════════════');
  log('🎯 Starting Zero Score Info Gathering');
  log('═══════════════════════════════════════════════════════════════');

  // Only call deals created within the last 60 days (fresh deals)
  const FRESHNESS_DAYS = 60;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - FRESHNESS_DAYS);
  log(`📅 Only calling deals created after: ${cutoffDate.toISOString().split('T')[0]}`);

  const allDeals = await fetchDeals();

  // Filter: Zero BarrierX score AND created within 60 days
  const eligibleDeals = allDeals.filter(({ deal }) =>
    hasNoBarrierXScore(deal.userDealRiskScores) && isWithinDays(deal.createdAt, FRESHNESS_DAYS)
  );

  log(`📊 Deals with no BarrierX score AND created within ${FRESHNESS_DAYS} days: ${eligibleDeals.length} / ${allDeals.length}`);

  await processDeals(eligibleDeals, 'ZERO_SCORE');
}

async function runLostDealGathering(): Promise<void> {
  log('═══════════════════════════════════════════════════════════════');
  log('❌ Starting Lost Deal Questionnaire');
  log('═══════════════════════════════════════════════════════════════');

  const allDeals = await fetchDeals();
  const eligibleDeals = allDeals.filter(({ deal }) => isClosedLost(deal.stage));

  log(`📊 Closed Lost deals: ${eligibleDeals.length} / ${allDeals.length}`);

  await processDeals(eligibleDeals, 'LOST_DEAL');
}

async function runInactivityGathering(): Promise<void> {
  log('═══════════════════════════════════════════════════════════════');
  log('⏰ Starting Inactivity Check');
  log('═══════════════════════════════════════════════════════════════');

  const allDeals = await fetchDeals();

  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  log(`📅 Checking for deals not updated since: ${twoWeeksAgo.toISOString()}`);

  const eligibleDeals = allDeals.filter(({ deal }) => {
    // Skip closed deals - we only want active deals
    const lowerStage = deal.stage?.toLowerCase() || '';
    if (lowerStage.includes('closed')) {
      return false;
    }

    // Filter deals with no activity for 2+ weeks
    return hasNoRecentActivity(deal);
  });

  log(`📊 Inactive deals (2+ weeks no activity): ${eligibleDeals.length} / ${allDeals.length}`);

  await processDeals(eligibleDeals, 'INACTIVITY');
}

async function processDeals(
  deals: Array<{ tenant: Tenant; deal: Deal }>,
  type: GatheringType
): Promise<void> {
  if (deals.length === 0) {
    log('✅ No eligible deals found.');
    return;
  }

  // Filter callable deals
  const callableDeals: Array<{ tenant: Tenant; deal: Deal }> = [];

  for (const { tenant, deal } of deals) {
    if (jobState.shouldStop) break;

    const alreadyCalled = await wasAlreadyCalled(deal.id, type);
    if (alreadyCalled) {
      log(`   ⏭️ ${deal.dealName}: Already called - skipping`);
      jobState.skippedDeals++;
      continue;
    }

    if (!deal.owner?.phone) {
      log(`   ⚠️ ${deal.dealName}: No phone number - skipping`);
      jobState.skippedDeals++;
      continue;
    }

    const normalizedPhone = deal.owner.phone.replace(/[\s\-()]/g, '');
    const isExcluded = EXCLUDED_PHONE_NUMBERS.some(excluded =>
      normalizedPhone.includes(excluded.replace(/[\s\-()]/g, ''))
    );
    if (isExcluded) {
      log(`   🚫 ${deal.dealName}: Phone excluded - skipping`);
      jobState.skippedDeals++;
      continue;
    }

    callableDeals.push({ tenant, deal });
  }

  jobState.totalDeals = callableDeals.length;
  jobState.totalBatches = Math.ceil(callableDeals.length / BATCH_SIZE);

  log(`\n📞 Callable deals: ${callableDeals.length} (${jobState.skippedDeals} skipped)`);
  log(`📦 Batch size: ${BATCH_SIZE} calls at a time`);

  if (callableDeals.length === 0) {
    log('✅ No deals to call. All have been called or have no phone numbers.');
    return;
  }

  // Process in batches
  for (let batchIndex = 0; batchIndex < jobState.totalBatches && !jobState.shouldStop; batchIndex++) {
    jobState.currentBatch = batchIndex + 1;

    const batchStart = batchIndex * BATCH_SIZE;
    const batchEnd = Math.min(batchStart + BATCH_SIZE, callableDeals.length);
    const batch = callableDeals.slice(batchStart, batchEnd);

    log(`\n═══════════════════════════════════════════════════════════════`);
    log(`📦 BATCH ${batchIndex + 1}/${jobState.totalBatches} (Deals ${batchStart + 1}-${batchEnd} of ${callableDeals.length})`);
    log(`═══════════════════════════════════════════════════════════════`);

    const batchRecordIds: string[] = [];

    for (const { tenant, deal } of batch) {
      if (jobState.shouldStop) break;

      log(`\n─────────────────────────────────────────`);
      log(`📋 Deal: ${deal.dealName}`);
      log(`   Company: ${deal.company}`);
      log(`   Owner: ${deal.owner?.name} (${deal.owner?.phone})`);
      log(`   Tenant: ${tenant.name}`);

      log(`   📞 Triggering call...`);
      const result = await triggerCall(tenant, deal, type);

      if (result.error) {
        log(`   ❌ Failed to initiate: ${result.error}`);
        jobState.failedCalls++;

        const recordId = await createInfoGatheringRecord(tenant, deal, type);
        batchRecordIds.push(recordId);
        continue;
      }

      log(`   ✅ Call initiated!`);
      log(`      Conversation ID: ${result.conversationId}`);

      const recordId = await createInfoGatheringRecord(
        tenant,
        deal,
        type,
        result.conversationId,
        result.callSid
      );
      batchRecordIds.push(recordId);

      await markAsCalled(deal.id, type);
      jobState.successfulCalls++;
      jobState.processedDeals++;

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (!jobState.shouldStop) {
      await waitForBatchCompletion(batchRecordIds);
    }

    const percentComplete = Math.round((batchEnd / callableDeals.length) * 100);
    log(`\n📈 Overall progress: ${batchEnd}/${callableDeals.length} (${percentComplete}%)`);
  }

  // Summary
  log('\n═══════════════════════════════════════════════════════════════');
  log('📊 FINAL SUMMARY');
  log('═══════════════════════════════════════════════════════════════');
  log(`   Type: ${type}`);
  log(`   📞 Calls initiated: ${jobState.successfulCalls}`);
  log(`   ⏭️ Skipped: ${jobState.skippedDeals}`);
  log(`   ❌ Failed: ${jobState.failedCalls}`);
  log(`   📦 Batches: ${jobState.totalBatches}`);
  log(`   ⏱️ Completed at: ${new Date().toISOString()}`);
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Start zero score info gathering
 */
export async function startZeroScoreGathering(triggeredBy: string): Promise<{ success: boolean; error?: string }> {
  if (jobState.isRunning) {
    return { success: false, error: 'A job is already running' };
  }

  // Check required config
  if (!config.barrierx.apiKey) {
    return { success: false, error: 'BARRIERX_API_KEY not configured' };
  }
  if (!config.elevenlabs.apiKey) {
    return { success: false, error: 'ELEVENLABS_KEY not configured' };
  }
  if (!config.elevenlabs.infoGatheringAgentId) {
    return { success: false, error: 'ELEVENLABS_INFO_GATHERING_AGENT_ID not configured' };
  }

  // Reset state
  jobState.isRunning = true;
  jobState.shouldStop = false;
  jobState.startedAt = new Date();
  jobState.type = 'ZERO_SCORE';
  jobState.triggeredBy = triggeredBy;
  jobState.totalDeals = 0;
  jobState.processedDeals = 0;
  jobState.successfulCalls = 0;
  jobState.failedCalls = 0;
  jobState.skippedDeals = 0;
  jobState.currentBatch = 0;
  jobState.totalBatches = 0;
  jobState.recentLogs = [];
  jobState.lastError = null;

  log(`🎯 Zero Score gathering triggered by: ${triggeredBy}`);

  // Run asynchronously
  runZeroScoreGathering()
    .catch(error => {
      jobState.lastError = error.message;
      log(`❌ Error: ${error.message}`);
    })
    .finally(() => {
      jobState.isRunning = false;
      jobState.shouldStop = false;
      log('🏁 Job finished');
    });

  return { success: true };
}

/**
 * Start lost deal questionnaire
 */
export async function startLostDealGathering(triggeredBy: string): Promise<{ success: boolean; error?: string }> {
  if (jobState.isRunning) {
    return { success: false, error: 'A job is already running' };
  }

  if (!config.barrierx.apiKey) {
    return { success: false, error: 'BARRIERX_API_KEY not configured' };
  }
  if (!config.elevenlabs.apiKey) {
    return { success: false, error: 'ELEVENLABS_KEY not configured' };
  }
  if (!config.elevenlabs.infoGatheringAgentId) {
    return { success: false, error: 'ELEVENLABS_INFO_GATHERING_AGENT_ID not configured' };
  }

  // Reset state
  jobState.isRunning = true;
  jobState.shouldStop = false;
  jobState.startedAt = new Date();
  jobState.type = 'LOST_DEAL';
  jobState.triggeredBy = triggeredBy;
  jobState.totalDeals = 0;
  jobState.processedDeals = 0;
  jobState.successfulCalls = 0;
  jobState.failedCalls = 0;
  jobState.skippedDeals = 0;
  jobState.currentBatch = 0;
  jobState.totalBatches = 0;
  jobState.recentLogs = [];
  jobState.lastError = null;

  log(`❌ Lost Deal gathering triggered by: ${triggeredBy}`);

  // Run asynchronously
  runLostDealGathering()
    .catch(error => {
      jobState.lastError = error.message;
      log(`❌ Error: ${error.message}`);
    })
    .finally(() => {
      jobState.isRunning = false;
      jobState.shouldStop = false;
      log('🏁 Job finished');
    });

  return { success: true };
}

/**
 * Start inactivity check
 */
export async function startInactivityGathering(triggeredBy: string): Promise<{ success: boolean; error?: string }> {
  if (jobState.isRunning) {
    return { success: false, error: 'A job is already running' };
  }

  if (!config.barrierx.apiKey) {
    return { success: false, error: 'BARRIERX_API_KEY not configured' };
  }
  if (!config.elevenlabs.apiKey) {
    return { success: false, error: 'ELEVENLABS_KEY not configured' };
  }

  if (!config.elevenlabs.infoGatheringAgentId) {
    return { success: false, error: 'ELEVENLABS_INFO_GATHERING_AGENT_ID not configured' };
  }

  // Reset state
  jobState.isRunning = true;
  jobState.shouldStop = false;
  jobState.startedAt = new Date();
  jobState.type = 'INACTIVITY';
  jobState.triggeredBy = triggeredBy;
  jobState.totalDeals = 0;
  jobState.processedDeals = 0;
  jobState.successfulCalls = 0;
  jobState.failedCalls = 0;
  jobState.skippedDeals = 0;
  jobState.currentBatch = 0;
  jobState.totalBatches = 0;
  jobState.recentLogs = [];
  jobState.lastError = null;

  log(`⏰ Inactivity Check triggered by: ${triggeredBy}`);

  // Run asynchronously
  runInactivityGathering()
    .catch(error => {
      jobState.lastError = error.message;
      log(`❌ Error: ${error.message}`);
    })
    .finally(() => {
      jobState.isRunning = false;
      jobState.shouldStop = false;
      log('🏁 Job finished');
    });

  return { success: true };
}

/**
 * Stop the current running job
 */
export function stopCurrentJob(): { success: boolean; error?: string } {
  if (!jobState.isRunning) {
    return { success: false, error: 'No job is running' };
  }

  log('⛔ Stop requested by user');
  jobState.shouldStop = true;

  return { success: true };
}

/**
 * Get current job status
 */
export function getJobStatus(): JobStatus {
  return { ...jobState };
}

/**
 * Get database stats for info gathering
 */
export async function getDbStats() {
  const [pendingCount, completedCount, failedCount, inProgressCount] = await Promise.all([
    prisma.barrierXInfoGathering.count({ where: { status: 'PENDING' } }),
    prisma.barrierXInfoGathering.count({ where: { status: 'COMPLETED' } }),
    prisma.barrierXInfoGathering.count({ where: { status: 'FAILED' } }),
    prisma.barrierXInfoGathering.count({ where: { status: 'IN_PROGRESS' } }),
  ]);

  return {
    pending: pendingCount,
    inProgress: inProgressCount,
    completed: completedCount,
    failed: failedCount,
    total: pendingCount + completedCount + failedCount + inProgressCount,
  };
}
