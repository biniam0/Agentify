/**
 * Call Retry Service
 * 
 * Handles automatic retry of failed calls when the user doesn't answer.
 * Only retries on "no-answer" failure reason (not "busy" or "unknown").
 * 
 * Features:
 * - Configurable via environment variables
 * - Max 3 retries with 1 minute interval (default)
 * - Redis-backed persistence (survives server restarts)
 * - In-memory cache for performance + timeout management
 * - Automatic cleanup after max attempts or success
 * - Multi-instance coordination via Redis
 */

import axios from 'axios';
import { config } from '../config/env';
import * as loggingService from './loggingService';
import * as retryCache from '../utils/retryCache';

// ============================================
// TYPES
// ============================================

interface RetryRecord {
  phoneNumber: string;
  agentId: string;
  callType: 'pre' | 'post';
  dynamicVariables: Record<string, any>;
  attemptCount: number;
  lastAttemptAt: number;
  timeoutId?: NodeJS.Timeout;
}

interface CallInitiationFailedWebhook {
  type: 'call_initiation_failed';
  event_timestamp: number;
  data: {
    agent_id: string;
    failure_reason: 'busy' | 'no-answer' | 'unknown';
    conversation_initiation_client_data?: {
      dynamic_variables?: Record<string, any>;
    };
    metadata?: {
      phone_call?: {
        external_number?: string;
      };
    };
  };
}

// ============================================
// RETRY QUEUE (In-Memory)
// ============================================

// Key format: phoneNumber_agentId
const retryQueue = new Map<string, RetryRecord>();

// Generate unique key for tracking
const getRetryKey = (phoneNumber: string, agentId: string): string => {
  return `${phoneNumber}_${agentId}`;
};

// ============================================
// CORE RETRY LOGIC
// ============================================

/**
 * Handle call initiation failure webhook
 * Only retries if failure_reason is "no-answer"
 */
export const handleCallInitiationFailure = async (webhookPayload: CallInitiationFailedWebhook): Promise<void> => {
  // Check if retry feature is enabled
  if (!config.callRetry.enabled) {
    console.log('🔄 Call retry feature is DISABLED (set ENABLE_CALL_RETRY=true to enable)');
    return;
  }

  const { data } = webhookPayload;
  const { agent_id, failure_reason } = data;

  // Extract phone number and dynamic variables
  const phoneNumber = data.metadata?.phone_call?.external_number;
  const dynamicVariables = data.conversation_initiation_client_data?.dynamic_variables || {};

  console.log('\n🔄 Processing call initiation failure...');
  console.log(`   📞 Phone: ${phoneNumber || 'Unknown'}`);
  console.log(`   ❌ Failure Reason: ${failure_reason}`);
  console.log(`   🤖 Agent ID: ${agent_id}`);

  // Only retry on "no-answer" - user might become available
  if (failure_reason !== 'no-answer') {
    console.log(`   ⏭️  Skipping retry - failure reason "${failure_reason}" is not retryable`);
    console.log(`      (Only "no-answer" triggers automatic retry)`);
    return;
  }

  // Validate required data
  if (!phoneNumber) {
    console.log('   ⚠️  Cannot retry - phone number not found in webhook payload');
    return;
  }

  if (!agent_id) {
    console.log('   ⚠️  Cannot retry - agent_id not found in webhook payload');
    return;
  }

  // Determine call type based on agent ID
  const callType = agent_id === config.elevenlabs.preAgentId ? 'pre' : 'post';
  const retryKey = getRetryKey(phoneNumber, agent_id);

  // Get or create retry record (check Redis first, then in-memory)
  let record = retryQueue.get(retryKey);
  let redisRecord = await retryCache.getRetryRecord(phoneNumber, agent_id);

  if (!record && !redisRecord) {
    // First failure - create new record
    record = {
      phoneNumber,
      agentId: agent_id,
      callType,
      dynamicVariables,
      attemptCount: 1, // Initial call was attempt 1
      lastAttemptAt: Date.now(),
    };
    retryQueue.set(retryKey, record);
    console.log(`   📝 Created retry record for ${phoneNumber} (${callType}-meeting call)`);
  } else if (!record && redisRecord) {
    // Record exists in Redis but not in memory (server was restarted)
    record = {
      phoneNumber: redisRecord.phoneNumber,
      agentId: redisRecord.agentId,
      callType: redisRecord.callType,
      dynamicVariables: redisRecord.dynamicVariables,
      attemptCount: redisRecord.attemptCount + 1,
      lastAttemptAt: Date.now(),
    };
    retryQueue.set(retryKey, record);
    console.log(`   📝 Restored retry record from Redis - attempt ${record.attemptCount}`);
  } else if (record) {
    // Subsequent failure - increment count
    record.attemptCount++;
    record.lastAttemptAt = Date.now();
    console.log(`   📝 Updated retry record - attempt ${record.attemptCount}`);
  }

  // TypeScript guard: record should always be defined here
  if (!record) {
    console.error('   ❌ Unexpected error: retry record is undefined');
    return;
  }

  const maxAttempts = config.callRetry.maxAttempts;
  const intervalMs = config.callRetry.intervalMs;

  console.log(`   📊 Retry Status: Attempt ${record.attemptCount}/${maxAttempts}`);

  // Check if max retries reached
  if (record.attemptCount >= maxAttempts) {
    console.log(`   ❌ Max retry attempts (${maxAttempts}) reached for ${phoneNumber}`);
    console.log(`   🧹 Removing from retry queue`);

    // Clear any pending timeout
    if (record.timeoutId) {
      clearTimeout(record.timeoutId);
    }
    retryQueue.delete(retryKey);

    // Remove from Redis
    await retryCache.deleteRetryRecord(phoneNumber, agent_id);

    return;
  }

  // Schedule retry
  const nextAttempt = record.attemptCount + 1;
  const nextRetryAt = Date.now() + intervalMs;
  console.log(`   ⏰ Scheduling retry attempt ${nextAttempt} in ${intervalMs / 1000} seconds...`);

  // Clear any existing timeout (safety measure)
  if (record.timeoutId) {
    clearTimeout(record.timeoutId);
  }

  // Schedule the retry call
  record.timeoutId = setTimeout(async () => {
    await executeRetryCall(retryKey);
  }, intervalMs);

  // Save to Redis for persistence across restarts
  await retryCache.saveRetryRecord({
    phoneNumber: record.phoneNumber,
    agentId: record.agentId,
    callType: record.callType,
    dynamicVariables: record.dynamicVariables,
    attemptCount: record.attemptCount,
    lastAttemptAt: record.lastAttemptAt,
    nextRetryAt,
    maxAttempts,
    intervalMs,
  });

  console.log(`   ✅ Retry scheduled successfully\n`);
};

/**
 * Execute a retry call for a queued record
 */
const executeRetryCall = async (retryKey: string): Promise<void> => {
  const record = retryQueue.get(retryKey);

  if (!record) {
    console.log(`🔄 Retry cancelled - record no longer exists for key: ${retryKey}`);
    return;
  }

  const { phoneNumber, agentId, callType, dynamicVariables, attemptCount } = record;
  const nextAttempt = attemptCount + 1;

  console.log(`\n🔄 Executing retry call...`);
  console.log(`   📞 Phone: ${phoneNumber}`);
  console.log(`   🎯 Call Type: ${callType}-meeting`);
  console.log(`   📊 Attempt: ${nextAttempt}/${config.callRetry.maxAttempts}`);

  try {
    // Check if ElevenLabs is properly configured
    if (!config.elevenlabs.apiKey || !config.elevenlabs.phoneNumberId) {
      console.log('   ⚠️  ElevenLabs not configured, cannot retry');
      retryQueue.delete(retryKey);
      return;
    }

    // Make the retry API call directly to ElevenLabs
    const response = await axios.post(
      'https://api.elevenlabs.io/v1/convai/twilio/outbound-call',
      {
        agent_id: agentId,
        agent_phone_number_id: config.elevenlabs.phoneNumberId,
        to_number: phoneNumber,
        conversation_initiation_client_data: {
          dynamic_variables: {
            ...dynamicVariables,
            // Add retry metadata
            _retry_attempt: nextAttempt,
            _is_retry: 'true',
          },
        },
      },
      {
        headers: {
          'xi-api-key': config.elevenlabs.apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    const conversationId = response.data.conversation_id;
    const callSid = response.data.callSid;

    console.log(`   ✅ Retry call initiated successfully!`);
    console.log(`   📞 Conversation ID: ${conversationId}`);
    console.log(`   📞 Twilio Call SID: ${callSid}`);

    // Log the retry activity
    await loggingService.logActivity({
      activityType: 'CALL_RETRY',
      status: 'SUCCESS',
      conversationId: conversationId,
      callSid: callSid,
      metadata: {
        phoneNumber,
        callType,
        retryAttempt: nextAttempt,
        maxAttempts: config.callRetry.maxAttempts,
      },
    });

    // Note: Don't delete from queue yet - if this retry also fails,
    // we'll get another webhook and continue the retry process.
    // The record will be cleaned up when:
    // 1. Max attempts reached (in handleCallInitiationFailure)
    // 2. Call succeeds (via markCallAsSuccessful)
    // 3. Server restarts (in-memory queue cleared)

  } catch (error: any) {
    console.error(`   ❌ Retry call failed:`, error.response?.data || error.message);

    // Log the retry failure
    await loggingService.logError({
      errorType: 'EXTERNAL_SERVICE',
      severity: 'MEDIUM',
      source: 'callRetryService.executeRetryCall',
      message: error.message || 'Retry call failed',
      stack: error.stack,
      code: error.response?.status?.toString(),
      requestData: {
        phoneNumber,
        callType,
        retryAttempt: nextAttempt,
      },
      responseData: error.response?.data,
    });

    // On API error, remove from queue to prevent infinite retries
    // (The webhook system will handle retries for connection issues)
    retryQueue.delete(retryKey);
    await retryCache.deleteRetryRecord(phoneNumber, agentId);
  }
};

/**
 * Mark a call as successful - removes from retry queue
 * Call this when a conversation.ended webhook is received successfully
 */
export const markCallAsSuccessful = async (phoneNumber: string, agentId: string): Promise<void> => {
  const retryKey = getRetryKey(phoneNumber, agentId);
  const record = retryQueue.get(retryKey);

  if (record) {
    console.log(`🔄 Call successful - clearing retry queue for ${phoneNumber}`);

    if (record.timeoutId) {
      clearTimeout(record.timeoutId);
    }
    retryQueue.delete(retryKey);

    // Remove from Redis
    await retryCache.deleteRetryRecord(phoneNumber, agentId);
  }
};

/**
 * Get current retry queue status (for debugging/monitoring)
 */
export const getRetryQueueStatus = (): { size: number; records: Array<{ phone: string; attempts: number; callType: string }> } => {
  const records: Array<{ phone: string; attempts: number; callType: string }> = [];

  retryQueue.forEach((record) => {
    records.push({
      phone: record.phoneNumber,
      attempts: record.attemptCount,
      callType: record.callType,
    });
  });

  return {
    size: retryQueue.size,
    records,
  };
};

/**
 * Restore retry state from Redis on server startup
 * Rebuilds in-memory queue and reschedules pending retries
 */
export const restoreRetryStateFromRedis = async (): Promise<void> => {
  if (!config.callRetry.enabled) {
    return;
  }

  console.log('\n🔄 Restoring retry state from Redis...');

  try {
    const redisRecords = await retryCache.getAllRetryRecords();

    if (redisRecords.length === 0) {
      console.log('✅ No pending retries to restore\n');
      return;
    }

    let restoredCount = 0;
    let scheduledCount = 0;
    const now = Date.now();

    for (const redisRecord of redisRecords) {
      const retryKey = getRetryKey(redisRecord.phoneNumber, redisRecord.agentId);

      // Check if max attempts already reached
      if (redisRecord.attemptCount >= redisRecord.maxAttempts) {
        console.log(`   ⏭️  Skipping ${redisRecord.phoneNumber} - max attempts reached`);
        await retryCache.deleteRetryRecord(redisRecord.phoneNumber, redisRecord.agentId);
        continue;
      }

      // Restore in-memory record
      const record: RetryRecord = {
        phoneNumber: redisRecord.phoneNumber,
        agentId: redisRecord.agentId,
        callType: redisRecord.callType,
        dynamicVariables: redisRecord.dynamicVariables,
        attemptCount: redisRecord.attemptCount,
        lastAttemptAt: redisRecord.lastAttemptAt,
      };

      retryQueue.set(retryKey, record);
      restoredCount++;

      // Calculate when the next retry should happen
      const timeUntilRetry = redisRecord.nextRetryAt - now;

      if (timeUntilRetry > 0) {
        // Future retry - schedule it
        record.timeoutId = setTimeout(async () => {
          await executeRetryCall(retryKey);
        }, timeUntilRetry);
        scheduledCount++;

        console.log(`   ✅ Scheduled retry for ${redisRecord.phoneNumber} in ${(timeUntilRetry / 1000).toFixed(0)}s`);
      } else {
        // Retry time has passed - execute immediately
        console.log(`   🚀 Executing overdue retry for ${redisRecord.phoneNumber} immediately`);

        // Execute in background
        executeRetryCall(retryKey).catch(error => {
          console.error(`   ❌ Failed to execute restored retry:`, error);
        });
        scheduledCount++;
      }
    }

    console.log(`✅ Restored ${restoredCount} retry records, scheduled ${scheduledCount} retries\n`);

  } catch (error: any) {
    console.error('❌ Failed to restore retry state from Redis:', error.message);
  }
};

/**
 * Clear all pending retries (for graceful shutdown)
 */
export const clearAllRetries = async (): Promise<void> => {
  console.log(`🧹 Clearing all pending retries (${retryQueue.size} records)`);

  retryQueue.forEach((record) => {
    if (record.timeoutId) {
      clearTimeout(record.timeoutId);
    }
  });

  retryQueue.clear();

  // Also clear from Redis
  const clearedCount = await retryCache.clearAllRetryRecords();
  console.log(`🧹 Cleared ${clearedCount} records from Redis`);
};

/**
 * Cleanup old retry records (call periodically to prevent memory leaks)
 * Removes records older than 10 minutes (stale)
 */
export const cleanupStaleRecords = (): void => {
  const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
  let cleanedCount = 0;

  retryQueue.forEach((record, key) => {
    if (record.lastAttemptAt < tenMinutesAgo) {
      if (record.timeoutId) {
        clearTimeout(record.timeoutId);
      }
      retryQueue.delete(key);
      cleanedCount++;
    }
  });

  if (cleanedCount > 0) {
    console.log(`🧹 Cleaned up ${cleanedCount} stale retry records`);
  }
};


