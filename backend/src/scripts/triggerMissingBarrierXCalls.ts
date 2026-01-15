/**
 * BarrierX Info Gathering Script
 * 
 * Calls deal owners for deals with no BarrierX score (all zeros).
 * Asks 3 questions:
 * 1. What are the quantified pain points for the client?
 * 2. Who is the champion?
 * 3. Who is the economic buyer?
 * 
 * Features:
 * - Fetches deals from BarrierX API
 * - Filters for deals with all-zero risk scores
 * - Uses Redis cache to skip already-called deals (5-day TTL)
 * - Logs all calls to BarrierXInfoGathering table
 * - Safe to restart - picks up where it left off
 * 
 * Usage:
 *   npx ts-node src/scripts/triggerMissingBarrierXCalls.ts
 */

import axios from 'axios';
import { config } from '../config/env';
import prisma from '../config/database';
import { getRedisClient, disconnectRedis } from '../config/redis';

// Redis key prefix for tracking called deals
const REDIS_KEY_PREFIX = 'barrierx:info:called:';
const REDIS_TTL_SECONDS = 5 * 24 * 60 * 60; // 5 days

// Batch processing configuration
const BATCH_SIZE = 2; // Number of calls to trigger at once
const POLL_INTERVAL_MS = 15000; // Check every 15 seconds
const BATCH_TIMEOUT_MS = 10 * 60 * 1000; // 10 minute timeout per batch

// Phone numbers to exclude from calling
const EXCLUDED_PHONE_NUMBERS = [
  '+2347031277833',
  '+251982846075',
  '+251 98 284 6075', // Also match with spaces
];

// BarrierX API endpoint
const BARRIERX_BULK_API = `${config.barrierx.baseUrl}/api/external/tenants/bulk`;

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

/**
 * Check if a deal has no BarrierX score (all risk values are zero)
 */
function hasNoBarrierXScore(riskScores: DealRiskScores | null | undefined): boolean {
  if (!riskScores) return true;

  // Check top-level risks
  if (
    riskScores.arenaRisk !== 0 ||
    riskScores.controlRoomRisk !== 0 ||
    riskScores.scoreCardRisk !== 0 ||
    riskScores.totalDealRisk !== 0
  ) {
    return false;
  }

  // Check all subcategory risks
  const subRisks = riskScores.subCategoryRisk || {};
  for (const key of Object.keys(subRisks)) {
    if (subRisks[key] !== 0) {
      return false;
    }
  }

  return true;
}

/**
 * Check if deal was already called (exists in Redis)
 */
async function wasAlreadyCalled(dealId: string): Promise<boolean> {
  const client = await getRedisClient();
  if (!client) {
    console.log('⚠️  Redis not available - will proceed with call');
    return false;
  }

  const exists = await client.exists(`${REDIS_KEY_PREFIX}${dealId}`);
  return exists === 1;
}

/**
 * Mark deal as called in Redis
 */
async function markAsCalled(dealId: string): Promise<void> {
  const client = await getRedisClient();
  if (!client) return;

  await client.setEx(
    `${REDIS_KEY_PREFIX}${dealId}`,
    REDIS_TTL_SECONDS,
    new Date().toISOString()
  );
}

/**
 * Fetch all deals from BarrierX bulk API
 */
async function fetchDeals(): Promise<Array<{ tenant: Tenant; deal: Deal }>> {
  console.log('\n📡 Fetching deals from BarrierX API...');

  // Build query parameters
  const params = new URLSearchParams({
    include_deals: 'true',
    include_members: 'false',
    sync_engagements: 'false',
  });

  // Add pipeline filter if configured
  if (config.automation.dealPipelines.length > 0) {
    params.set('deal_pipeline', config.automation.dealPipelines.join(','));
  }

  // Add date filter for recent deals
  const dealUpdateSince = new Date();
  dealUpdateSince.setDate(dealUpdateSince.getDate() - config.automation.dealUpdateWindowDays);
  params.set('deal_updated_since', dealUpdateSince.toISOString().split('T')[0] + 'T00:00:00Z');

  const url = `${BARRIERX_BULK_API}?${params.toString()}`;
  console.log(`   URL: ${url}`);

  const response = await axios.get<BulkApiResponse>(url, {
    headers: {
      'Authorization': `Bearer ${config.barrierx.apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.data.ok) {
    throw new Error('BarrierX API returned error');
  }

  // Flatten tenants + deals
  const result: Array<{ tenant: Tenant; deal: Deal }> = [];
  for (const tenant of response.data.tenants) {
    for (const deal of tenant.deals || []) {
      result.push({
        tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
        deal,
      });
    }
  }

  console.log(`   ✅ Found ${result.length} deals across ${response.data.tenants.length} tenants`);
  return result;
}

/**
 * Trigger ElevenLabs call for info gathering
 */
async function triggerInfoGatheringCall(
  tenant: Tenant,
  deal: Deal
): Promise<{ conversationId?: string; callSid?: string; error?: string }> {
  const owner = deal.owner;

  if (!owner?.phone) {
    return { error: 'No phone number' };
  }

  // Get the BarrierX info gathering agent ID from env
  const agentId = process.env.ELEVENLABS_BARRIERX_INFO_AGENT_ID;
  if (!agentId) {
    return { error: 'ELEVENLABS_BARRIERX_INFO_AGENT_ID not configured' };
  }

  const phoneNumberId = config.elevenlabs.phoneNumberId;
  if (!phoneNumberId) {
    return { error: 'ELEVENLABS_PHONE_NUMBER_ID not configured' };
  }

  // Prepare dynamic variables for the ElevenLabs agent
  const dynamicVariables = {
    // Owner info
    owner_name: owner.name,
    owner_first_name: owner.name.split(' ')[0],
    owner_email: owner.email,

    // Deal info
    deal_id: deal.id,
    deal_name: deal.dealName,
    company_name: deal.company,
    deal_stage: deal.stage,
    deal_amount: deal.amount?.toString() || 'Not specified',

    // Tenant info
    tenant_slug: tenant.slug,
    tenant_name: tenant.name,

    // CRM identifiers
    hubspot_owner_id: owner.hubspotId || '',

    // Call type identifier
    call_type: 'BARRIERX_INFO_GATHERING',
  };

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

/**
 * Create initial record in database
 */
async function createInfoGatheringRecord(
  tenant: Tenant,
  deal: Deal,
  conversationId?: string,
  callSid?: string
): Promise<string> {
  const record = await prisma.barrierXInfoGathering.create({
    data: {
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

/**
 * Wait for a batch of calls to complete
 * Polls the database until all records have status COMPLETED or FAILED
 */
async function waitForBatchCompletion(recordIds: string[]): Promise<void> {
  if (recordIds.length === 0) return;

  const startTime = Date.now();
  console.log(`\n⏳ Waiting for ${recordIds.length} call(s) to complete...`);

  while (true) {
    // Check if timeout exceeded
    if (Date.now() - startTime > BATCH_TIMEOUT_MS) {
      console.log(`   ⚠️  Batch timeout (${BATCH_TIMEOUT_MS / 60000} min) - moving to next batch`);
      return;
    }

    // Check status of all records in batch
    const records = await prisma.barrierXInfoGathering.findMany({
      where: { id: { in: recordIds } },
      select: { id: true, status: true, dealName: true },
    });

    const completed = records.filter(r => r.status === 'COMPLETED' || r.status === 'FAILED');
    const pending = records.filter(r => r.status === 'PENDING' || r.status === 'IN_PROGRESS');

    console.log(`   📊 Progress: ${completed.length}/${recordIds.length} completed`);

    if (pending.length === 0) {
      // All calls in batch are done
      console.log(`   ✅ Batch completed!`);
      for (const record of records) {
        const statusIcon = record.status === 'COMPLETED' ? '✅' : '❌';
        console.log(`      ${statusIcon} ${record.dealName}: ${record.status}`);
      }
      return;
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🎯 BarrierX Info Gathering Script');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`⏰ Started at: ${new Date().toISOString()}`);

  // Check required config
  if (!config.barrierx.apiKey) {
    console.error('❌ BARRIERX_API_KEY not configured');
    process.exit(1);
  }

  if (!config.elevenlabs.apiKey) {
    console.error('❌ ELEVENLABS_KEY not configured');
    process.exit(1);
  }

  if (!process.env.ELEVENLABS_BARRIERX_INFO_AGENT_ID) {
    console.error('❌ ELEVENLABS_BARRIERX_INFO_AGENT_ID not configured');
    process.exit(1);
  }

  try {
    // Step 1: Fetch all deals
    const allDeals = await fetchDeals();

    // Step 2: Filter for deals with no BarrierX score
    const dealsWithNoScore = allDeals.filter(({ deal }) =>
      hasNoBarrierXScore(deal.userDealRiskScores)
    );

    console.log(`\n📊 Deals with no BarrierX score: ${dealsWithNoScore.length} / ${allDeals.length}`);

    if (dealsWithNoScore.length === 0) {
      console.log('✅ All deals have BarrierX scores. Nothing to do.');
      return;
    }

    // Step 3: Filter deals that can be called
    const callableDeals: Array<{ tenant: Tenant; deal: Deal }> = [];
    let skipped = 0;

    for (const { tenant, deal } of dealsWithNoScore) {
      // Check Redis cache
      const alreadyCalled = await wasAlreadyCalled(deal.id);
      if (alreadyCalled) {
        console.log(`   ⏭️  ${deal.dealName}: Already called - skipping`);
        skipped++;
        continue;
      }

      // Skip if no phone
      if (!deal.owner?.phone) {
        console.log(`   ⚠️  ${deal.dealName}: No phone number - skipping`);
        skipped++;
        continue;
      }

      // Skip excluded phone numbers
      const normalizedPhone = deal.owner.phone.replace(/[\s\-()]/g, '');
      const isExcluded = EXCLUDED_PHONE_NUMBERS.some(excluded =>
        normalizedPhone.includes(excluded.replace(/[\s\-()]/g, ''))
      );
      if (isExcluded) {
        console.log(`   🚫 ${deal.dealName}: Phone ${deal.owner.phone} is excluded - skipping`);
        skipped++;
        continue;
      }

      callableDeals.push({ tenant, deal });
    }

    console.log(`\n📞 Callable deals: ${callableDeals.length} (${skipped} skipped)`);
    console.log(`📦 Batch size: ${BATCH_SIZE} calls at a time`);

    if (callableDeals.length === 0) {
      console.log('✅ No deals to call. All have been called or have no phone numbers.');
      return;
    }

    // Step 4: Process in batches
    let called = 0;
    let failed = 0;
    const totalBatches = Math.ceil(callableDeals.length / BATCH_SIZE);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batchStart = batchIndex * BATCH_SIZE;
      const batchEnd = Math.min(batchStart + BATCH_SIZE, callableDeals.length);
      const batch = callableDeals.slice(batchStart, batchEnd);

      console.log(`\n═══════════════════════════════════════════════════════════════`);
      console.log(`📦 BATCH ${batchIndex + 1}/${totalBatches} (Deals ${batchStart + 1}-${batchEnd} of ${callableDeals.length})`);
      console.log(`═══════════════════════════════════════════════════════════════`);

      const batchRecordIds: string[] = [];

      // Trigger all calls in this batch
      for (const { tenant, deal } of batch) {
        console.log(`\n─────────────────────────────────────────`);
        console.log(`📋 Deal: ${deal.dealName}`);
        console.log(`   Company: ${deal.company}`);
        console.log(`   Owner: ${deal.owner?.name} (${deal.owner?.phone})`);
        console.log(`   Tenant: ${tenant.name}`);

        // Trigger call
        console.log(`   📞 Triggering call...`);
        const result = await triggerInfoGatheringCall(tenant, deal);

        if (result.error) {
          console.log(`   ❌ Failed to initiate: ${result.error}`);
          failed++;

          // Still create a record for tracking
          const recordId = await createInfoGatheringRecord(tenant, deal);
          batchRecordIds.push(recordId);
          continue;
        }

        console.log(`   ✅ Call initiated!`);
        console.log(`      Conversation ID: ${result.conversationId}`);

        // Save to database
        const recordId = await createInfoGatheringRecord(
          tenant,
          deal,
          result.conversationId,
          result.callSid
        );
        batchRecordIds.push(recordId);

        // Mark as called in Redis
        await markAsCalled(deal.id);

        called++;

        // Small delay between call initiations
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Wait for all calls in this batch to complete
      await waitForBatchCompletion(batchRecordIds);

      // Progress update
      const processedSoFar = Math.min(batchEnd, callableDeals.length);
      const percentComplete = Math.round((processedSoFar / callableDeals.length) * 100);
      console.log(`\n📈 Overall progress: ${processedSoFar}/${callableDeals.length} (${percentComplete}%)`);
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 FINAL SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`   Total deals with no score: ${dealsWithNoScore.length}`);
    console.log(`   📞 Calls initiated: ${called}`);
    console.log(`   ⏭️  Skipped (already called or no phone): ${skipped}`);
    console.log(`   ❌ Failed to initiate: ${failed}`);
    console.log(`   📦 Batches processed: ${totalBatches}`);
    console.log(`⏰ Completed at: ${new Date().toISOString()}`);

  } catch (error: any) {
    console.error('\n❌ Script error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Cleanup
    await disconnectRedis();
    await prisma.$disconnect();
  }
}

// Run the script
main().catch(console.error);
