import crypto from 'crypto';
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
 * Generate cryptographic hash from deals data
 * Uses SHA256 to detect ANY change in the data structure
 * This will detect changes to:
 * - Meeting start/end times
 * - Deal stages, amounts, close dates
 * - Contact information (emails, phones)
 * - Any other field in the Deal structure
 */
export const generateDealsHash = (dealsMap: Map<string, Deal[]>): string => {
  // Convert Map to sorted array for consistent hashing
  const sortedData = Array.from(dealsMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([userId, deals]) => [
      userId,
      // Sort deals by ID for consistency
      deals
        .sort((a, b) => a.id.localeCompare(b.id))
        // Sort nested arrays for consistency
        .map(deal => ({
          ...deal,
          contacts: deal.contacts.sort((a, b) => a.id.localeCompare(b.id)),
          meetings: deal.meetings.sort((a, b) => a.id.localeCompare(b.id)),
        }))
    ]);
  
  // Serialize to JSON and create SHA256 hash
  const jsonData = JSON.stringify(sortedData);
  const hash = crypto.createHash('sha256').update(jsonData).digest('hex');
  
  return hash;
};

/**
 * Deep comparison of deals data with detailed change tracking
 * Returns information about what changed for better monitoring
 */
export const compareDealsData = (
  data1: Map<string, Deal[]>,
  data2: Map<string, Deal[]>
): { changed: boolean; differences?: string[] } => {
  const differences: string[] = [];
  
  // Check user count
  if (data1.size !== data2.size) {
    differences.push(`User count changed: ${data1.size} → ${data2.size}`);
    return { changed: true, differences };
  }
  
  // Compare each user's deals
  for (const [userId, deals1] of data1) {
    const deals2 = data2.get(userId);
    
    if (!deals2) {
      differences.push(`User ${userId.substring(0, 12)}... removed`);
      continue;
    }
    
    if (deals1.length !== deals2.length) {
      differences.push(`User ${userId.substring(0, 12)}...: ${deals1.length} → ${deals2.length} deals`);
      continue;
    }
    
    // Compare individual deals
    for (const deal1 of deals1) {
      const deal2 = deals2.find(d => d.id === deal1.id);
      
      if (!deal2) {
        differences.push(`Deal ${deal1.id} removed`);
        continue;
      }
      
      // Check deal fields
      if (deal1.stage !== deal2.stage) {
        differences.push(`Deal ${deal1.name}: stage ${deal1.stage} → ${deal2.stage}`);
      }
      if (deal1.amount !== deal2.amount) {
        differences.push(`Deal ${deal1.name}: amount changed`);
      }
      
      // Check meetings
      if (deal1.meetings.length !== deal2.meetings.length) {
        differences.push(`Deal ${deal1.name}: ${deal1.meetings.length} → ${deal2.meetings.length} meetings`);
      } else {
        for (const meeting1 of deal1.meetings) {
          const meeting2 = deal2.meetings.find(m => m.id === meeting1.id);
          if (meeting2) {
            if (meeting1.startTime !== meeting2.startTime) {
              differences.push(`Deal ${deal1.name}: meeting "${meeting1.title}" start time changed`);
            }
            if (meeting1.status !== meeting2.status) {
              differences.push(`Deal ${deal1.name}: meeting "${meeting1.title}" status ${meeting1.status} → ${meeting2.status}`);
            }
          }
        }
      }
    }
  }
  
  return { 
    changed: differences.length > 0, 
    differences: differences.length > 0 ? differences : undefined 
  };
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
 * Refresh cache TTL without updating data
 * Use when data hasn't changed but we want to keep cache alive
 * Much more efficient than rewriting full cache data
 */
export const refreshCacheTTL = async (): Promise<boolean> => {
  const client = await getRedisClient();
  if (!client) {
    console.log('⚠️  Redis not available - skipping TTL refresh');
    return false;
  }

  try {
    await Promise.all([
      client.expire(CACHE_KEYS.BULK_DEALS, CACHE_CONFIG.TTL_SECONDS),
      client.expire(CACHE_KEYS.BULK_DEALS_HASH, CACHE_CONFIG.TTL_SECONDS),
    ]);

    console.log('⏰ Cache TTL refreshed (data unchanged)');
    return true;

  } catch (error: any) {
    console.error('❌ Failed to refresh cache TTL:', error.message);
    return false;
  }
};

/**
 * Check if cached data differs from new data
 * Uses cryptographic hash (SHA256) for accurate change detection
 * Detects ANY change including meeting times, stages, contacts, etc.
 * @param newDealsMap - New deals data to compare
 * @param logDetails - If true, logs what specifically changed (default: false)
 * @returns true if data has changed, false if same
 */
export const hasDataChanged = async (
  newDealsMap: Map<string, Deal[]>,
  logDetails: boolean = false
): Promise<boolean> => {
  const client = await getRedisClient();
  if (!client) {
    return true; // Assume changed if Redis unavailable
  }

  try {
    const cachedHash = await client.get(CACHE_KEYS.BULK_DEALS_HASH);
    
    if (!cachedHash) {
      console.log('🆕 No cached data - this is new data');
      return true; // No cached hash = data is new
    }

    const newHash = generateDealsHash(newDealsMap);
    const changed = cachedHash !== newHash;

    if (changed) {
      console.log('🔄 Data changed - cache will be updated');
      
      // Optionally log detailed changes
      if (logDetails) {
        const cachedData = await getBulkDealsFromCache();
        if (cachedData) {
          const comparison = compareDealsData(cachedData, newDealsMap);
          if (comparison.differences && comparison.differences.length > 0) {
            console.log('📝 Changes detected:');
            // Log first 5 changes
            comparison.differences.slice(0, 5).forEach(diff => {
              console.log(`   - ${diff}`);
            });
            if (comparison.differences.length > 5) {
              console.log(`   ... and ${comparison.differences.length - 5} more changes`);
            }
          }
        }
      }
    } else {
      console.log('✅ Data unchanged - cache is up to date');
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

