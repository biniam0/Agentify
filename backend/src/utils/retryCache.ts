import { getRedisClient } from '../config/redis';

/**
 * Redis cache keys for call retry mechanism
 */
export const RETRY_CACHE_KEYS = {
  RETRY_RECORD: (phoneNumber: string, agentId: string) => 
    `agentx:retry:${phoneNumber}:${agentId}`,
  ALL_RETRIES: 'agentx:retry:*',
} as const;

/**
 * Retry record structure stored in Redis
 */
export interface RetryRecordData {
  phoneNumber: string;
  agentId: string;
  callType: 'pre' | 'post';
  dynamicVariables: Record<string, any>;
  attemptCount: number;
  lastAttemptAt: number;
  nextRetryAt: number; // When the next retry should happen
  maxAttempts: number;
  intervalMs: number;
}

/**
 * Cache configuration
 */
const RETRY_CACHE_CONFIG = {
  TTL_SECONDS: 24 * 60 * 60, // 24 hours - retries don't live longer than this
} as const;

/**
 * Save retry record to Redis cache
 * @param record - Retry record data
 * @returns true if saved successfully, false otherwise
 */
export const saveRetryRecord = async (
  record: RetryRecordData
): Promise<boolean> => {
  const client = await getRedisClient();
  if (!client) {
    console.log('⚠️  Redis not available - retry state not persisted');
    return false;
  }

  try {
    const key = RETRY_CACHE_KEYS.RETRY_RECORD(record.phoneNumber, record.agentId);
    const jsonData = JSON.stringify(record);

    await client.setEx(key, RETRY_CACHE_CONFIG.TTL_SECONDS, jsonData);

    console.log(`💾 Saved retry record to Redis: ${record.phoneNumber} (attempt ${record.attemptCount})`);
    return true;

  } catch (error: any) {
    console.error('❌ Failed to save retry record to Redis:', error.message);
    return false;
  }
};

/**
 * Get retry record from Redis cache
 * @param phoneNumber - Phone number
 * @param agentId - Agent ID
 * @returns Retry record or null if not found
 */
export const getRetryRecord = async (
  phoneNumber: string,
  agentId: string
): Promise<RetryRecordData | null> => {
  const client = await getRedisClient();
  if (!client) {
    return null;
  }

  try {
    const key = RETRY_CACHE_KEYS.RETRY_RECORD(phoneNumber, agentId);
    const jsonData = await client.get(key);

    if (!jsonData) {
      return null;
    }

    const record = JSON.parse(jsonData) as RetryRecordData;
    return record;

  } catch (error: any) {
    console.error('❌ Failed to read retry record from Redis:', error.message);
    return null;
  }
};

/**
 * Delete retry record from Redis cache
 * @param phoneNumber - Phone number
 * @param agentId - Agent ID
 * @returns true if deleted, false otherwise
 */
export const deleteRetryRecord = async (
  phoneNumber: string,
  agentId: string
): Promise<boolean> => {
  const client = await getRedisClient();
  if (!client) {
    return false;
  }

  try {
    const key = RETRY_CACHE_KEYS.RETRY_RECORD(phoneNumber, agentId);
    await client.del(key);

    console.log(`🗑️  Deleted retry record from Redis: ${phoneNumber}`);
    return true;

  } catch (error: any) {
    console.error('❌ Failed to delete retry record from Redis:', error.message);
    return false;
  }
};

/**
 * Get all active retry records from Redis
 * Used for restoring retry state on server startup
 * @returns Array of retry records
 */
export const getAllRetryRecords = async (): Promise<RetryRecordData[]> => {
  const client = await getRedisClient();
  if (!client) {
    console.log('ℹ️  Redis not available - no retry records to restore');
    return [];
  }

  try {
    // Get all retry keys
    const keys = await client.keys(RETRY_CACHE_KEYS.ALL_RETRIES);

    if (keys.length === 0) {
      console.log('ℹ️  No active retry records found in Redis');
      return [];
    }

    console.log(`📦 Found ${keys.length} retry records in Redis`);

    // Fetch all records
    const records: RetryRecordData[] = [];
    for (const key of keys) {
      const jsonData = await client.get(key);
      if (jsonData) {
        try {
          const record = JSON.parse(jsonData) as RetryRecordData;
          records.push(record);
        } catch (parseError) {
          console.error(`⚠️  Failed to parse retry record: ${key}`);
        }
      }
    }

    console.log(`✅ Restored ${records.length} retry records from Redis`);
    return records;

  } catch (error: any) {
    console.error('❌ Failed to get all retry records from Redis:', error.message);
    return [];
  }
};

/**
 * Clear all retry records from Redis
 * Used for cleanup or testing
 * @returns Number of records cleared
 */
export const clearAllRetryRecords = async (): Promise<number> => {
  const client = await getRedisClient();
  if (!client) {
    return 0;
  }

  try {
    const keys = await client.keys(RETRY_CACHE_KEYS.ALL_RETRIES);

    if (keys.length === 0) {
      return 0;
    }

    await Promise.all(keys.map(key => client.del(key)));

    console.log(`🗑️  Cleared ${keys.length} retry records from Redis`);
    return keys.length;

  } catch (error: any) {
    console.error('❌ Failed to clear retry records from Redis:', error.message);
    return 0;
  }
};

/**
 * Get retry statistics from Redis
 * @returns Stats object
 */
export const getRetryStats = async (): Promise<{
  totalRecords: number;
  byCallType: { pre: number; post: number };
  byAttempt: Record<number, number>;
}> => {
  const records = await getAllRetryRecords();

  const stats = {
    totalRecords: records.length,
    byCallType: { pre: 0, post: 0 },
    byAttempt: {} as Record<number, number>,
  };

  records.forEach(record => {
    // Count by call type
    stats.byCallType[record.callType]++;

    // Count by attempt number
    const attempt = record.attemptCount;
    stats.byAttempt[attempt] = (stats.byAttempt[attempt] || 0) + 1;
  });

  return stats;
};

