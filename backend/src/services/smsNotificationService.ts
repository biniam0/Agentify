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
  severity?: string;
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

/**
 * Extract top risks from userDealRiskScores
 * Returns array of risk descriptions (max 3)
 * 
 * BarrierX data structure:
 * userDealRiskScores: {
 *   subCategoryRisk: {
 *     ChampionRisks: 0.04,      // Higher score = higher risk (0-1 scale)
 *     DealVelocity: 0.1,
 *     CompetitionRisks: 0,
 *     ...
 *   }
 * }
 */
const extractTopRisks = (risks?: Record<string, any>, maxRisks: number = 3): string[] => {
  if (!risks) return [];

  // Get subCategoryRisk object (where actual risk scores are stored)
  const subCategoryRisks = risks.subCategoryRisk || risks;

  // Risk category mappings: BarrierX key -> Human readable description
  const riskMappings: Record<string, string> = {
    'ChampionRisks': 'Champion engagement needs attention',
    'DealVelocity': 'Deal velocity tracking behind schedule',
    'CompetitionRisks': 'Competitive activity detected',
    'DecisionProcessRisks': 'Decision process unclear',
    'DecisionCriteriaRisks': 'Decision criteria not established',
    'EconomicBuyerAuthorityRisks': 'Economic buyer authority unclear',
    'EngagementRelationshipRisks': 'Stakeholder engagement needs work',
    'FinancialRisks': 'Financial concerns identified',
    'ContractualLegalRisks': 'Contractual/legal issues pending',
    'InternalSalesProcessRisks': 'Internal sales process gaps',
    'MetricsValueRisks': 'Value metrics not validated',
    'PainPriorityRisks': 'Pain points not prioritized',
    'SolutionFitRisks': 'Solution fit concerns',
    'PaperProcessProcurementRisks': 'Procurement process unclear',
    'ImplementationPostSaleRisks': 'Implementation risks identified',
    'IndustryMarketRisks': 'Industry/market concerns',
    'ExternalOrganizationalStabilityRisks': 'Organizational stability concerns',
    'TouchPoints': 'Insufficient touchpoints',
  };

  // Extract risks with scores > 0, sorted by score descending (higher = more risky)
  const risksWithScores: { key: string; score: number; description: string }[] = [];

  for (const [key, score] of Object.entries(subCategoryRisks)) {
    if (typeof score === 'number' && score > 0 && riskMappings[key]) {
      risksWithScores.push({
        key,
        score,
        description: riskMappings[key],
      });
    }
  }

  // Sort by score descending (highest risk first)
  risksWithScores.sort((a, b) => b.score - a.score);

  // Return top N risk descriptions
  return risksWithScores.slice(0, maxRisks).map(r => r.description);
};

/**
 * Extract top recommendation titles prioritized by severity
 * Order: Critical → High → Mid (picks up to maxRecs total)
 */
const extractRecommendationTitles = (recommendations?: Recommendation[], maxRecs: number = 5): string[] => {
  if (!recommendations || recommendations.length === 0) return [];

  // Define severity priority (case-insensitive matching)
  const severityOrder = ['critical', 'high', 'mid'];

  // Sort recommendations by severity priority
  const sorted = [...recommendations].sort((a, b) => {
    const aSeverity = (a.severity || '').toLowerCase();
    const bSeverity = (b.severity || '').toLowerCase();
    const aIndex = severityOrder.indexOf(aSeverity);
    const bIndex = severityOrder.indexOf(bSeverity);
    // Unknown severities go to the end
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });

  // Take top N by severity, extract titles
  return sorted
    .slice(0, maxRecs)
    .map(rec => rec.title)
    .filter(title => title && title.trim().length > 0);
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

    // Extract risks and recommendations
    const topRisks = extractTopRisks(risks, 4);
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

    // Compose enhanced SMS message
    const messageBody = `📞 Pre-Meeting Brief Alert\n\nHi ${firstName}!\n\nBriefing call coming at ${meetingTime}\nMeeting: "${meetingTitle}"\nDeal: ${dealName}\n${dealInfoLine}${risksSection}${recommendationsSection}\nGet ready! 🎯`;

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
