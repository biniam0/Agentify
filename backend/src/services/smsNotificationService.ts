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

interface Recommendation {
  title: string;
  note?: string;
  risk?: string;
  severity?: string;
  isCompleted?: boolean;
}

interface PreCallNotificationParams {
  ownerPhone: string;
  ownerName: string;
  meetingTitle: string;
  meetingStartTime: string;
  customerName: string;
  dealName: string;
  meetingId: string;
  // Deal context for enhanced SMS
  dealAmount?: number;
  dealStage?: string;
  risks?: Record<string, any>;  // userDealRiskScores object
  recommendations?: Recommendation[];
  // Additional context for logging
  userId?: string;          // AgentX database user ID
  barrierxUserId?: string;  // BarrierX user ID
  hubspotOwnerId?: string;  // HubSpot owner ID
  userEmail?: string;
  dealId?: string;
  tenantSlug?: string;  // For AgentX log link (platform.barrierx.ai/{tenantSlug}/agentx)
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
 * Format deal amount for display (e.g., $1,500,000 -> $1.5M)
 */
const formatDealAmount = (amount?: number): string => {
  if (!amount || amount === 0) return '';
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return `$${amount.toLocaleString()}`;
};

// Severity order for sorting (lower index = higher priority)
const SEVERITY_ORDER: Record<string, number> = {
  'critical': 0,
  'high': 1,
  'mid': 2,
  'medium': 2,
};

// Mock risks for when no real data is available
const MOCK_RISKS_SMS = [
  'Decision timeline and approval process are unclear.',
  'Key stakeholders and their influence on the decision are not fully mapped.',
  'Budget availability and approval process are not confirmed.',
  'Success criteria and expected outcomes are not clearly defined.',
];

/**
 * Extract first sentence from text (for SMS brevity)
 * Returns first sentence, truncated if too long
 */
const getFirstSentence = (text: string, maxLength: number = 120): string => {
  if (!text) return '';
  
  const trimmed = text.trim();
  
  // Find first sentence ending (. ! ?)
  const match = trimmed.match(/^[^.!?]+[.!?]/);
  if (match) {
    const sentence = match[0].trim();
    // If first sentence is still too long, truncate with ellipsis
    if (sentence.length > maxLength) {
      return sentence.substring(0, maxLength - 3) + '...';
    }
    return sentence;
  }
  
  // No sentence ending found, truncate
  if (trimmed.length > maxLength) {
    return trimmed.substring(0, maxLength - 3) + '...';
  }
  return trimmed;
};

/**
 * Extract top risks from recommendations array
 * Uses first sentence of rec.risk field with fallback to title
 * Returns array of risk descriptions (max 4)
 */
const extractTopRisks = (recommendations?: Recommendation[], maxRisks: number = 4): string[] => {
  if (!recommendations || recommendations.length === 0) {
    return MOCK_RISKS_SMS.slice(0, maxRisks);
  }

  // Filter out completed, sort by severity
  const activeRecs = recommendations
    .filter(rec => !rec.isCompleted)
    .sort((a, b) => {
      const aSeverity = (a.severity || '').toLowerCase();
      const bSeverity = (b.severity || '').toLowerCase();
      const aIdx = SEVERITY_ORDER[aSeverity] ?? 3;
      const bIdx = SEVERITY_ORDER[bSeverity] ?? 3;
      return aIdx - bIdx;
    })
    .slice(0, maxRisks);

  // If no active recommendations, use mock
  if (activeRecs.length === 0) {
    return MOCK_RISKS_SMS.slice(0, maxRisks);
  }

  // Check if any recommendation has real risk content
  const hasAnyRealRisk = activeRecs.some(rec => {
    const risk = (rec.risk || '').trim();
    return risk.length > 0 && risk !== 'No details available';
  });

  // If no real risks, use mock
  if (!hasAnyRealRisk) {
    return MOCK_RISKS_SMS.slice(0, maxRisks);
  }

  // Extract first sentence of risk with fallback to title
  return activeRecs.map(rec => {
    const risk = (rec.risk || '').trim();
    if (risk && risk !== 'No details available') {
      return getFirstSentence(risk);
    }
    // Fallback to title
    return rec.title || '';
  }).filter(text => text.length > 0);
};

// Mock recommendations for when no real data is available
const MOCK_RECOMMENDATIONS_SMS = [
  'Confirm Decision Timeline and Next Steps',
  'Identify Key Stakeholders and Their Concerns',
  'Validate Budget Availability and Approval Process',
  'Clarify Success Criteria and Expected Outcomes',
  'Document Any Objections or Potential Blockers',
];

/**
 * Extract top recommendation titles prioritized by severity
 * Order: Critical → High → Mid (picks up to maxRecs total)
 * Filters out completed recommendations
 */
const extractRecommendationTitles = (recommendations?: Recommendation[], maxRecs: number = 5): string[] => {
  if (!recommendations || recommendations.length === 0) {
    return MOCK_RECOMMENDATIONS_SMS.slice(0, maxRecs);
  }

  // Filter out completed, sort by severity
  const activeRecs = recommendations
    .filter(rec => !rec.isCompleted)
    .sort((a, b) => {
      const aSeverity = (a.severity || '').toLowerCase();
      const bSeverity = (b.severity || '').toLowerCase();
      const aIdx = SEVERITY_ORDER[aSeverity] ?? 3;
      const bIdx = SEVERITY_ORDER[bSeverity] ?? 3;
      return aIdx - bIdx;
    })
    .slice(0, maxRecs);

  // If no active recommendations, use mock
  if (activeRecs.length === 0) {
    return MOCK_RECOMMENDATIONS_SMS.slice(0, maxRecs);
  }

  // Extract titles
  const titles = activeRecs
    .map(rec => rec.title)
    .filter(title => title && title.trim().length > 0);

  // If no titles, use mock
  if (titles.length === 0) {
    return MOCK_RECOMMENDATIONS_SMS.slice(0, maxRecs);
  }

  return titles;
};

/**
 * Send pre-call SMS notification to deal owner
 */
export const sendPreCallNotification = async (params: PreCallNotificationParams): Promise<{
  success: boolean;
  messageSid?: string;
  error?: string;
}> => {
  const {
    ownerPhone,
    ownerName,
    meetingTitle,
    meetingStartTime,
    customerName,
    dealName,
    meetingId,
    dealAmount,
    dealStage,
    risks,
    recommendations,
    userId,
    barrierxUserId,
    hubspotOwnerId,
    userEmail,
    dealId,
    tenantSlug,
  } = params;

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

    // Extract risks (from recommendations) and recommendation titles
    // Both now use the recommendations array for consistency with phone calls
    const topRisks = extractTopRisks(recommendations, 4);
    const topRecommendations = extractRecommendationTitles(recommendations, 5);

    // Build deal info line
    const dealAmountStr = formatDealAmount(dealAmount);
    const dealInfoParts: string[] = [];
    if (dealAmountStr) dealInfoParts.push(dealAmountStr);
    if (dealStage) dealInfoParts.push(`Stage: ${dealStage}`);
    const dealInfoLine = dealInfoParts.length > 0 ? `${dealInfoParts.join(' | ')}\n` : '';

    // Build risks section
    let risksSection = '';
    if (topRisks.length > 0) {
      risksSection = `\n⚠️ Top Risks:\n${topRisks.map(r => `• ${r}`).join('\n')}\n`;
    }

    // Build recommendations section
    let recommendationsSection = '';
    if (topRecommendations.length > 0) {
      recommendationsSection = `\n✅ Recommendations:\n${topRecommendations.map(r => `• ${r}`).join('\n')}\n`;
    }

    // AgentX log link: with tenant slug -> /{tenantSlug}/agentx, else base URL only
    const baseUrl = config.barrierx.baseUrl.replace(/\/$/, '');
    const agentxLogUrl = tenantSlug ? `${baseUrl}/${tenantSlug}/agentx` : baseUrl;

    // Compose enhanced SMS message
    const messageBody = `📞 Pre-Meeting Brief Alert\n\nHi ${firstName}!\n\nBriefing call coming at ${meetingTime}\nMeeting: "${meetingTitle}"\nDeal: ${dealName}\n${dealInfoLine}${risksSection}${recommendationsSection}\nGet ready! 🎯\n\nView logs: ${agentxLogUrl}`;

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

    // Log to database
    await loggingService.logSmsNotification({
      messageSid: message.sid,
      status: 'SENT',
      toPhone: ownerPhone,
      fromPhone: config.twilio.smsFromNumber,
      messageBody: messageBody,
      userId: userId || 'unknown',
      barrierxUserId,
      hubspotOwnerId,
      userName: ownerName,
      userEmail,
      ownerName,
      dealId,
      dealName,
      meetingId,
      meetingTitle,
      triggerSource: 'SCHEDULED',
    });

    return {
      success: true,
      messageSid: message.sid,
    };

  } catch (error: any) {
    console.error(`       ❌ SMS sending failed:`, error.message);

    // Log failed SMS to database
    await loggingService.logSmsNotification({
      status: 'FAILED',
      toPhone: ownerPhone,
      fromPhone: config.twilio.smsFromNumber || '',
      userId: userId || 'unknown',
      barrierxUserId,
      hubspotOwnerId,
      userName: ownerName,
      userEmail,
      ownerName,
      dealId,
      dealName,
      meetingId,
      meetingTitle,
      errorMessage: error.message,
      twilioErrorCode: error.code?.toString(),
      triggerSource: 'SCHEDULED',
    });

    // Also log error
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
