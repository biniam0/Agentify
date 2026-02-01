import { getRedisClient } from '../config/redis';

/**
 * Redis cache keys for called meetings tracking
 */
export const CALLED_MEETINGS_KEYS = {
  CALLED_MEETING: (meetingId: string, startTime: string, callType: 'pre' | 'post') => 
    `agentx:called:${meetingId}:${startTime}:${callType}`,
  ALL_CALLED: 'agentx:called:*',
} as const;

/**
 * Called meeting record structure
 */
export interface CalledMeetingRecord {
  calledAt: number;
  meetingStartTime: string;
}

/**
 * Cache configuration
 * 60 minutes is sufficient since:
 * - Pre-call window: T-20 (18-22 min before start)
 * - Post-call window: T+18 (15-21 min after end)
 * - Total exposure: ~45 minutes max
 * - TTL of 60 min provides safety buffer
 */
const CALLED_MEETINGS_TTL_SECONDS = 60 * 60; // 60 minutes

/**
 * Save called meeting record to Redis
 * @param meetingId - Meeting ID
 * @param startTime - Meeting start time (ISO string)
 * @param callType - 'pre' or 'post'
 * @returns true if saved successfully
 */
export const saveCalledMeeting = async (
  meetingId: string,
  startTime: string,
  callType: 'pre' | 'post'
): Promise<boolean> => {
  const client = await getRedisClient();
  if (!client) {
    // Redis not available - continue with in-memory only
    return false;
  }

  try {
    const key = CALLED_MEETINGS_KEYS.CALLED_MEETING(meetingId, startTime, callType);
    const record: CalledMeetingRecord = {
      calledAt: Date.now(),
      meetingStartTime: startTime,
    };

    await client.setEx(key, CALLED_MEETINGS_TTL_SECONDS, JSON.stringify(record));
    
    return true;

  } catch (error: any) {
    console.error('❌ Failed to save called meeting to Redis:', error.message);
    return false;
  }
};

/**
 * Check if a meeting call has been triggered (from Redis)
 * @param meetingId - Meeting ID
 * @param startTime - Meeting start time (ISO string)
 * @param callType - 'pre' or 'post'
 * @returns Called meeting record or null
 */
export const getCalledMeeting = async (
  meetingId: string,
  startTime: string,
  callType: 'pre' | 'post'
): Promise<CalledMeetingRecord | null> => {
  const client = await getRedisClient();
  if (!client) {
    return null;
  }

  try {
    const key = CALLED_MEETINGS_KEYS.CALLED_MEETING(meetingId, startTime, callType);
    const jsonData = await client.get(key);

    if (!jsonData) {
      return null;
    }

    return JSON.parse(jsonData) as CalledMeetingRecord;

  } catch (error: any) {
    console.error('❌ Failed to get called meeting from Redis:', error.message);
    return null;
  }
};

/**
 * Get all called meetings from Redis (for restoration on startup)
 * @returns Array of called meeting records with their keys
 */
export const getAllCalledMeetings = async (): Promise<Array<{
  meetingId: string;
  startTime: string;
  callType: 'pre' | 'post';
  record: CalledMeetingRecord;
}>> => {
  const client = await getRedisClient();
  if (!client) {
    return [];
  }

  try {
    const keys = await client.keys(CALLED_MEETINGS_KEYS.ALL_CALLED);

    if (keys.length === 0) {
      return [];
    }

    const results: Array<{
      meetingId: string;
      startTime: string;
      callType: 'pre' | 'post';
      record: CalledMeetingRecord;
    }> = [];

    for (const key of keys) {
      const jsonData = await client.get(key);
      if (jsonData) {
        try {
          const record = JSON.parse(jsonData) as CalledMeetingRecord;
          
          // Parse key: agentx:called:{meetingId}:{startTime}:{callType}
          const parts = key.split(':');
          if (parts.length >= 5) {
            const meetingId = parts[2];
            const startTime = parts[3];
            const callType = parts[4] as 'pre' | 'post';
            
            results.push({ meetingId, startTime, callType, record });
          }
        } catch (parseError) {
          console.error(`⚠️  Failed to parse called meeting record: ${key}`);
        }
      }
    }

    return results;

  } catch (error: any) {
    console.error('❌ Failed to get all called meetings from Redis:', error.message);
    return [];
  }
};

/**
 * Clear all called meeting records from Redis
 * @returns Number of records cleared
 */
export const clearAllCalledMeetings = async (): Promise<number> => {
  const client = await getRedisClient();
  if (!client) {
    return 0;
  }

  try {
    const keys = await client.keys(CALLED_MEETINGS_KEYS.ALL_CALLED);

    if (keys.length === 0) {
      return 0;
    }

    await Promise.all(keys.map(key => client.del(key)));

    console.log(`🗑️  Cleared ${keys.length} called meeting records from Redis`);
    return keys.length;

  } catch (error: any) {
    console.error('❌ Failed to clear called meetings from Redis:', error.message);
    return 0;
  }
};

/**
 * Get statistics about called meetings
 * @returns Stats object
 */
export const getCalledMeetingsStats = async (): Promise<{
  total: number;
  byType: { pre: number; post: number };
}> => {
  const records = await getAllCalledMeetings();

  const stats = {
    total: records.length,
    byType: { pre: 0, post: 0 },
  };

  records.forEach(({ callType }) => {
    stats.byType[callType]++;
  });

  return stats;
};

