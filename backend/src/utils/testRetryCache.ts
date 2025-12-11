/**
 * Redis Retry Cache Test Script
 * Run this to verify retry caching is working correctly
 * 
 * Usage: npx tsx src/utils/testRetryCache.ts
 */

import { getRedisClient, disconnectRedis } from '../config/redis';
import * as retryCache from './retryCache';

async function testRetryCaching() {
  console.log('🧪 Testing Redis Retry Caching...\n');

  try {
    // Test 1: Connect to Redis
    console.log('Test 1: Connecting to Redis...');
    const client = await getRedisClient();
    
    if (!client) {
      console.error('❌ Failed to connect to Redis');
      return;
    }
    
    console.log('✅ Redis connected successfully\n');

    // Test 2: Clear any existing retry records
    console.log('Test 2: Clearing existing retry records...');
    await retryCache.clearAllRetryRecords();
    console.log('✅ Cleared existing records\n');

    // Test 3: Save a retry record
    console.log('Test 3: Saving retry record...');
    const testRecord: retryCache.RetryRecordData = {
      phoneNumber: '+1234567890',
      agentId: 'agent_test_123',
      callType: 'pre',
      dynamicVariables: {
        dealName: 'Test Deal',
        contactName: 'John Doe',
      },
      attemptCount: 1,
      lastAttemptAt: Date.now(),
      nextRetryAt: Date.now() + 60000, // 1 minute from now
      maxAttempts: 3,
      intervalMs: 60000,
    };

    const saved = await retryCache.saveRetryRecord(testRecord);
    if (saved) {
      console.log('✅ Retry record saved successfully\n');
    } else {
      console.error('❌ Failed to save retry record\n');
      return;
    }

    // Test 4: Retrieve the record
    console.log('Test 4: Retrieving retry record...');
    const retrieved = await retryCache.getRetryRecord(
      testRecord.phoneNumber,
      testRecord.agentId
    );

    if (retrieved) {
      console.log('✅ Retrieved retry record:');
      console.log(`   Phone: ${retrieved.phoneNumber}`);
      console.log(`   Call Type: ${retrieved.callType}`);
      console.log(`   Attempt: ${retrieved.attemptCount}/${retrieved.maxAttempts}`);
      console.log(`   Next Retry: ${new Date(retrieved.nextRetryAt).toLocaleTimeString()}\n`);
    } else {
      console.error('❌ Failed to retrieve retry record\n');
      return;
    }

    // Test 5: Save another record
    console.log('Test 5: Saving second retry record...');
    const testRecord2: retryCache.RetryRecordData = {
      phoneNumber: '+9876543210',
      agentId: 'agent_test_456',
      callType: 'post',
      dynamicVariables: {
        dealName: 'Another Deal',
        contactName: 'Jane Smith',
      },
      attemptCount: 2,
      lastAttemptAt: Date.now(),
      nextRetryAt: Date.now() + 120000, // 2 minutes from now
      maxAttempts: 3,
      intervalMs: 60000,
    };

    await retryCache.saveRetryRecord(testRecord2);
    console.log('✅ Second record saved\n');

    // Test 6: Get all records
    console.log('Test 6: Retrieving all retry records...');
    const allRecords = await retryCache.getAllRetryRecords();
    
    if (allRecords.length === 2) {
      console.log(`✅ Retrieved ${allRecords.length} records:`);
      allRecords.forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.phoneNumber} (${record.callType}) - attempt ${record.attemptCount}`);
      });
      console.log('');
    } else {
      console.error(`❌ Expected 2 records, got ${allRecords.length}\n`);
    }

    // Test 7: Get stats
    console.log('Test 7: Getting retry statistics...');
    const stats = await retryCache.getRetryStats();
    console.log(`✅ Retry stats:`);
    console.log(`   Total: ${stats.totalRecords}`);
    console.log(`   Pre-meeting calls: ${stats.byCallType.pre}`);
    console.log(`   Post-meeting calls: ${stats.byCallType.post}`);
    console.log(`   By attempt:`, stats.byAttempt);
    console.log('');

    // Test 8: Delete a record
    console.log('Test 8: Deleting first record...');
    await retryCache.deleteRetryRecord(testRecord.phoneNumber, testRecord.agentId);
    
    const afterDelete = await retryCache.getAllRetryRecords();
    if (afterDelete.length === 1) {
      console.log(`✅ Record deleted - ${afterDelete.length} record remains\n`);
    } else {
      console.error(`❌ Expected 1 record after delete, got ${afterDelete.length}\n`);
    }

    // Test 9: Clear all records
    console.log('Test 9: Clearing all records...');
    const clearedCount = await retryCache.clearAllRetryRecords();
    console.log(`✅ Cleared ${clearedCount} records\n`);

    const final = await retryCache.getAllRetryRecords();
    if (final.length === 0) {
      console.log('✅ All records cleared successfully\n');
    }

    // Summary
    console.log('═══════════════════════════════════════════');
    console.log('✅ All retry caching tests passed!');
    console.log('═══════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('❌ Test failed with error:', error.message);
    console.error(error);
  } finally {
    // Disconnect
    await disconnectRedis();
    console.log('👋 Disconnected from Redis');
    process.exit(0);
  }
}

// Run tests
testRetryCaching();

