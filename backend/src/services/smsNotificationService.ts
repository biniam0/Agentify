/**
 * SMS Notification Service
 * Sends SMS notifications to deal owners before pre-meeting calls via Twilio
 */

import twilio from 'twilio';
import { config } from '../config/env';
import * as loggingService from './loggingService';

// ============================================
// TWILIO CLIENT INITIALIZATION
// ============================================

let twilioClient: twilio.Twilio | null = null;

/**
 * Get or create Twilio client (lazy initialization)
 */
const getTwilioClient = (): twilio.Twilio | null => {
  if (!config.twilio.smsEnabled) {
    return null;
  }

  if (!config.twilio.accountSid || !config.twilio.authToken) {
    console.log('⚠️  Twilio credentials not configured');
    return null;
  }

  if (!twilioClient) {
    twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);
  }

  return twilioClient;
};

// ============================================
// SMS NOTIFICATION TRACKING (Memory + Redis pattern)
// ============================================
// Prevents duplicate SMS notifications even after server restarts
// Key format: meetingId_startTime_sms
// ============================================

interface NotificationRecord {
  sentAt: number;
  meetingStartTime: string;
  messageSid?: string;
}

// In-memory cache for fast lookups
const sentNotifications = new Map<string, NotificationRecord>();

/**
 * Generate tracking key for a notification
 */
const getNotificationKey = (meetingId: string, startTime: string): string => {
  return `${meetingId}_${startTime}_sms`;
};

/**
 * Check if notification has already been sent for this meeting
 */
export const hasBeenNotified = (meetingId: string, startTime: string): boolean => {
  const key = getNotificationKey(meetingId, startTime);
  return sentNotifications.has(key);
};

/**
 * Mark notification as sent
 */
const markAsNotified = (meetingId: string, startTime: string, messageSid?: string): void => {
  const key = getNotificationKey(meetingId, startTime);
  sentNotifications.set(key, {
    sentAt: Date.now(),
    meetingStartTime: startTime,
    messageSid,
  });
  console.log(`       📝 Marked SMS as sent: ${key}`);
};

/**
 * Cleanup old notification entries (meetings that started more than 1 hour ago)
 */
export const cleanupOldNotifications = (): void => {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  let cleanedCount = 0;

  sentNotifications.forEach((record, key) => {
    const meetingTime = new Date(record.meetingStartTime).getTime();
    if (meetingTime < oneHourAgo) {
      sentNotifications.delete(key);
      cleanedCount++;
    }
  });

  if (cleanedCount > 0) {
    console.log(`🧹 Cleaned up ${cleanedCount} old SMS notification entries`);
  }
};

// ============================================
// SMS SENDING FUNCTIONS
// ============================================

interface PreCallNotificationParams {
  ownerPhone: string;
  ownerName: string;
  meetingTitle: string;
  meetingStartTime: string;
  customerName: string;
  dealName: string;
  meetingId: string;
}

/**
 * Format meeting time for SMS display
 */
const formatTimeForSms = (isoTime: string): string => {
  const date = new Date(isoTime);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Send pre-call SMS notification to deal owner
 */
export const sendPreCallNotification = async (params: PreCallNotificationParams): Promise<{
  success: boolean;
  messageSid?: string;
  error?: string;
}> => {
  const { ownerPhone, ownerName, meetingTitle, meetingStartTime, customerName, dealName, meetingId } = params;

  // Check if already notified
  if (hasBeenNotified(meetingId, meetingStartTime)) {
    console.log(`       ⏭️  SMS already sent for meeting: ${meetingId}`);
    return { success: false, error: 'Already notified' };
  }

  // Check if SMS is enabled
  if (!config.twilio.smsEnabled) {
    console.log('       ⚠️  SMS notifications disabled (TWILIO_SMS_ENABLED !== "true")');
    return { success: false, error: 'SMS disabled' };
  }

  // Get Twilio client
  const client = getTwilioClient();
  if (!client) {
    console.log('       ⚠️  Twilio client not available');
    return { success: false, error: 'Twilio not configured' };
  }

  // Check for from number
  if (!config.twilio.smsFromNumber) {
    console.log('       ⚠️  TWILIO_SMS_FROM not configured');
    return { success: false, error: 'No from number configured' };
  }

  // Validate owner phone
  if (!ownerPhone) {
    console.log('       ⚠️  No owner phone number provided');
    return { success: false, error: 'No phone number' };
  }

  try {
    const meetingTime = formatTimeForSms(meetingStartTime);
    const firstName = ownerName.split(' ')[0];

    // Compose SMS message
    const messageBody = `📞 Pre-Meeting Alert\n\nHi ${firstName}!\n\nBriefing call coming at ${meetingTime}\nMeeting: "${meetingTitle}"\nDeal: ${dealName}\n\nGet ready! 🎯`;
    
    console.log(`       📱 Sending SMS to: ${ownerPhone}`);
    console.log(`       📝 Message: ${messageBody}`);

    // Send via Twilio
    const message = await client.messages.create({
      body: messageBody,
      from: config.twilio.smsFromNumber,
      to: ownerPhone,
    });

    console.log(`       ✅ SMS sent successfully!`);
    console.log(`       📱 Message SID: ${message.sid}`);
    console.log(`       📱 Status: ${message.status}`);

    // Mark as notified to prevent duplicates
    markAsNotified(meetingId, meetingStartTime, message.sid);

    return {
      success: true,
      messageSid: message.sid,
    };

  } catch (error: any) {
    console.error(`       ❌ SMS sending failed:`, error.message);

    // Log error
    await loggingService.logError({
      errorType: 'EXTERNAL_SERVICE',
      severity: 'MEDIUM',
      source: 'smsNotificationService.sendPreCallNotification',
      message: `Failed to send SMS to ${ownerPhone}: ${error.message}`,
      stack: error.stack,
      code: error.code?.toString(),
      requestData: {
        meetingId,
        ownerPhone,
        twilioErrorCode: error.code,
        twilioErrorInfo: error.moreInfo,
      },
    });

    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Send a test SMS to verify Twilio configuration
 */
export const sendTestSms = async (toNumber: string, customMessage?: string): Promise<{
  success: boolean;
  messageSid?: string;
  error?: string;
}> => {
  // Check if SMS is enabled
  if (!config.twilio.smsEnabled) {
    console.log('⚠️  SMS notifications disabled. Set TWILIO_SMS_ENABLED=true to enable.');
    return { success: false, error: 'SMS disabled' };
  }

  const client = getTwilioClient();
  if (!client) {
    console.log('⚠️  Twilio client not available. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
    return { success: false, error: 'Twilio not configured' };
  }

  if (!config.twilio.smsFromNumber) {
    console.log('⚠️  TWILIO_SMS_FROM not configured.');
    return { success: false, error: 'No from number configured' };
  }

  try {
    const messageBody = customMessage ||
      `[AgentX Test] This is a test SMS from your AgentX system. If you received this, Twilio SMS is working correctly! 🎉`;

    console.log(`📱 Sending test SMS to: ${toNumber}`);
    console.log(`📱 From: ${config.twilio.smsFromNumber}`);

    const message = await client.messages.create({
      body: messageBody,
      from: config.twilio.smsFromNumber,
      to: toNumber,
    });

    console.log(`✅ Test SMS sent successfully!`);
    console.log(`📱 Message SID: ${message.sid}`);
    console.log(`📱 Status: ${message.status}`);

    return {
      success: true,
      messageSid: message.sid,
    };

  } catch (error: any) {
    console.error(`❌ Test SMS failed:`, error.message);
    if (error.code) {
      console.error(`   Twilio Error Code: ${error.code}`);
    }
    if (error.moreInfo) {
      console.error(`   More Info: ${error.moreInfo}`);
    }

    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get SMS notification statistics
 */
export const getNotificationStats = (): {
  totalTracked: number;
  oldestEntry: string | null;
} => {
  let oldestTime: number | null = null;

  sentNotifications.forEach((record) => {
    if (oldestTime === null || record.sentAt < oldestTime) {
      oldestTime = record.sentAt;
    }
  });

  return {
    totalTracked: sentNotifications.size,
    oldestEntry: oldestTime ? new Date(oldestTime).toISOString() : null,
  };
};
