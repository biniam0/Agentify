import { getRedisClient } from '../config/redis';
import { Deal } from '../services/barrierxService';

/**
 * Redis cache keys
 */
export const CACHE_KEYS = {
  BULK_DEALS: 'agentx:bulk:deals',
  BULK_DEALS_HASH: 'agentx:bulk:deals:hash',
} as const;

/**
 * Cache configuration
 */
const CACHE_CONFIG = {
  TTL_SECONDS: 7 * 24 * 60 * 60, // 7 days
} as const;

/**
 * Generate a simple hash from deals data for comparison
 * Uses count + sample IDs to detect changes without deep comparison
 */
export const generateDealsHash = (dealsMap: Map<string, Deal[]>): string => {
  const userIds = Array.from(dealsMap.keys()).sort();
  const totalDeals = Array.from(dealsMap.values()).reduce((sum, deals) => sum + deals.length, 0);
  
  // Sample first 3 users and their deal counts for quick comparison
  const sample = userIds.slice(0, 3).map(userId => {
    const deals = dealsMap.get(userId) || [];
    return `${userId}:${deals.length}`;
  }).join('|');

  return `users:${userIds.length}|deals:${totalDeals}|sample:${sample}`;
};

/**
 * Deep comparison of deals data
 * More accurate than hash, but slower
 */
export const compareDealsData = (
  data1: Map<string, Deal[]>,
  data2: Map<string, Deal[]>
): boolean => {
  // Quick checks first
  if (data1.size !== data2.size) return false;

  // Compare each user's deals
  for (const [userId, deals1] of data1) {
    const deals2 = data2.get(userId);
    
    if (!deals2 || deals1.length !== deals2.length) {
      return false;
    }

    // Compare deal IDs (sufficient for detecting changes)
    const ids1 = deals1.map(d => d.id).sort().join(',');
    const ids2 = deals2.map(d => d.id).sort().join(',');
    
    if (ids1 !== ids2) {
      return false;
    }
  }

  return true;
};

/**
 * Save deals data to Redis cache
 * @param dealsMap - Map of user IDs to their deals
 * @returns true if saved successfully, false otherwise
 */
export const saveBulkDealsToCache = async (
  dealsMap: Map<string, Deal[]>
): Promise<boolean> => {
  const client = await getRedisClient();
  if (!client) {
    console.log('⚠️  Redis not available - skipping cache save');
    return false;
  }

  try {
    // Convert Map to JSON-serializable array
    const dataToCache = Array.from(dealsMap.entries());
    const jsonData = JSON.stringify(dataToCache);
    const hash = generateDealsHash(dealsMap);

    // Save both data and hash with TTL
    await Promise.all([
      client.setEx(CACHE_KEYS.BULK_DEALS, CACHE_CONFIG.TTL_SECONDS, jsonData),
      client.setEx(CACHE_KEYS.BULK_DEALS_HASH, CACHE_CONFIG.TTL_SECONDS, hash),
    ]);

    console.log(`💾 Cached ${dealsMap.size} users, ${Array.from(dealsMap.values()).flat().length} deals`);
    return true;

  } catch (error: any) {
    console.error('❌ Failed to save to Redis cache:', error.message);
    return false;
  }
};

/**
 * Get deals data from Redis cache
 * @returns Cached deals map or null if not found/error
 */
export const getBulkDealsFromCache = async (): Promise<Map<string, Deal[]> | null> => {
  const client = await getRedisClient();
  if (!client) {
    console.log('⚠️  Redis not available - skipping cache read');
    return null;
  }

  try {
    const jsonData = await client.get(CACHE_KEYS.BULK_DEALS);
    
    if (!jsonData) {
      console.log('ℹ️  No cached data found in Redis');
      return null;
    }

    // Deserialize back to Map
    const dataArray = JSON.parse(jsonData);
    const dealsMap = new Map<string, Deal[]>(dataArray);

    console.log(`📦 Retrieved cached data: ${dealsMap.size} users`);
    return dealsMap;

  } catch (error: any) {
    console.error('❌ Failed to read from Redis cache:', error.message);
    return null;
  }
};

/**
 * Check if cached data differs from new data
 * Uses hash comparison for speed
 * @returns true if data has changed, false if same
 */
export const hasDataChanged = async (newDealsMap: Map<string, Deal[]>): Promise<boolean> => {
  const client = await getRedisClient();
  if (!client) {
    return true; // Assume changed if Redis unavailable
  }

  try {
    const cachedHash = await client.get(CACHE_KEYS.BULK_DEALS_HASH);
    
    if (!cachedHash) {
      return true; // No cached hash = data is new
    }

    const newHash = generateDealsHash(newDealsMap);
    const changed = cachedHash !== newHash;

    if (changed) {
      console.log('🔄 Data changed - cache will be updated');
    } else {
      console.log('⏭️  Data unchanged - skipping cache write');
    }

    return changed;

  } catch (error: any) {
    console.error('❌ Error comparing cache hash:', error.message);
    return true; // Assume changed on error
  }
};

/**
 * Clear bulk deals cache
 */
export const clearBulkDealsCache = async (): Promise<boolean> => {
  const client = await getRedisClient();
  if (!client) {
    return false;
  }

  try {
    await Promise.all([
      client.del(CACHE_KEYS.BULK_DEALS),
      client.del(CACHE_KEYS.BULK_DEALS_HASH),
    ]);

    console.log('🗑️  Bulk deals cache cleared');
    return true;

  } catch (error: any) {
    console.error('❌ Failed to clear cache:', error.message);
    return false;
  }
};

