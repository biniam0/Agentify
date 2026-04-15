import { getRedisClient } from '../config/redis';

/**
 * Redis cache keys for SMS notification deduplication
 */
export const SMS_NOTIFICATION_KEYS = {
  NOTIFICATION: (meetingId: string, startTime: string) =>
    `agentx:sms:${meetingId}:${startTime}`,
  ALL_NOTIFICATIONS: 'agentx:sms:*',
} as const;

export interface SmsNotificationRecord {
  sentAt: number;
  meetingStartTime: string;
  messageSid?: string;
}

/**
 * 60-minute TTL — same rationale as calledMeetingsCache:
 * pre-call window is ~20 min before start, so 60 min provides a wide safety buffer.
 */
const SMS_NOTIFICATION_TTL_SECONDS = 60 * 60;

/**
 * Save SMS notification record to Redis
 */
export const saveSmsNotification = async (
  meetingId: string,
  startTime: string,
  messageSid?: string
): Promise<boolean> => {
  const client = await getRedisClient();
  if (!client) return false;

  try {
    const key = SMS_NOTIFICATION_KEYS.NOTIFICATION(meetingId, startTime);
    const record: SmsNotificationRecord = {
      sentAt: Date.now(),
      meetingStartTime: startTime,
      messageSid,
    };
    await client.setEx(key, SMS_NOTIFICATION_TTL_SECONDS, JSON.stringify(record));
    return true;
  } catch (error: any) {
    console.error('❌ Failed to save SMS notification to Redis:', error.message);
    return false;
  }
};

/**
 * Check if an SMS notification exists in Redis for a given meeting
 */
export const getSmsNotification = async (
  meetingId: string,
  startTime: string
): Promise<SmsNotificationRecord | null> => {
  const client = await getRedisClient();
  if (!client) return null;

  try {
    const key = SMS_NOTIFICATION_KEYS.NOTIFICATION(meetingId, startTime);
    const jsonData = await client.get(key);
    if (!jsonData) return null;
    return JSON.parse(jsonData) as SmsNotificationRecord;
  } catch (error: any) {
    console.error('❌ Failed to get SMS notification from Redis:', error.message);
    return null;
  }
};

/**
 * Get all SMS notification records from Redis (for restoration on startup)
 */
export const getAllSmsNotifications = async (): Promise<Array<{
  meetingId: string;
  startTime: string;
  record: SmsNotificationRecord;
}>> => {
  const client = await getRedisClient();
  if (!client) return [];

  try {
    const keys = await client.keys(SMS_NOTIFICATION_KEYS.ALL_NOTIFICATIONS);
    if (keys.length === 0) return [];

    const results: Array<{
      meetingId: string;
      startTime: string;
      record: SmsNotificationRecord;
    }> = [];

    for (const key of keys) {
      const jsonData = await client.get(key);
      if (jsonData) {
        try {
          const record = JSON.parse(jsonData) as SmsNotificationRecord;
          // Parse key: agentx:sms:{meetingId}:{startTime}
          const parts = key.split(':');
          if (parts.length >= 4) {
            results.push({
              meetingId: parts[2],
              startTime: parts[3],
              record,
            });
          }
        } catch {
          console.error(`⚠️  Failed to parse SMS notification record: ${key}`);
        }
      }
    }
    return results;
  } catch (error: any) {
    console.error('❌ Failed to get all SMS notifications from Redis:', error.message);
    return [];
  }
};
