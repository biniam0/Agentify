/**
 * Clear BarrierX Info Gathering Redis Cache
 * 
 * This script removes all Redis keys used to track which deals have been called.
 * Run this to start fresh and call all deals again.
 * 
 * Usage:
 *   npx ts-node src/scripts/clearBarrierXInfoCache.ts
 */

import { getRedisClient, disconnectRedis } from '../config/redis';

async function clearCache() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🧹 Clear BarrierX Info Gathering Cache');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const client = await getRedisClient();
  
  if (!client) {
    console.log('❌ Redis not available or not configured');
    process.exit(1);
  }

  try {
    // Find all keys matching the pattern
    const keys = await client.keys('barrierx:info:called:*');
    console.log(`📋 Found ${keys.length} cached deal(s)`);

    if (keys.length === 0) {
      console.log('✅ Cache is already empty');
      return;
    }

    // Show the keys being deleted
    console.log('\n🗑️  Deleting keys:');
    for (const key of keys) {
      const dealId = key.replace('barrierx:info:called:', '');
      console.log(`   - ${dealId}`);
    }

    // Delete all keys
    await client.del(keys);
    console.log(`\n✅ Deleted ${keys.length} key(s) from Redis cache`);
    console.log('📞 Next run will call all eligible deals fresh');

  } catch (error: any) {
    console.error('❌ Error clearing cache:', error.message);
    process.exit(1);
  } finally {
    await disconnectRedis();
  }
}

clearCache().catch(console.error);
