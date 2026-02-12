import cron from 'node-cron';
import prisma from '../config/database';
import { config } from '../config/env';
import * as barrierxService from './barrierxService';
import * as meetingService from './meetingService';
import * as loggingService from './loggingService';
import * as calledMeetingsCache from '../utils/calledMeetingsCache';
import * as smsNotificationService from './smsNotificationService';

interface MeetingTemplate {
  id: string;
  title: string;
  body: string;
  startTime: string;
  duration: string;
  endTime: string;
}

interface Meeting extends Omit<MeetingTemplate, 'startTime' | 'endTime'> {
  startTime: string;
  endTime: string;
}

// ============================================
// HYBRID CALL TRACKING (Memory + Redis)
// ============================================
// Prevents duplicate calls even after server restarts
// Key format: meetingId_startTime_callType
// This ensures:
// - Same meeting + same time = SKIP (duplicate)
// - Same meeting + different time (rescheduled) = ALLOW
// ============================================

interface CalledMeetingRecord {
  calledAt: number;       // Timestamp when call was triggered
  meetingStartTime: string; // Original meeting start time
}

// In-memory cache for fast lookups (primary)
const calledMeetings = new Map<string, CalledMeetingRecord>();

// Generate tracking key for a meeting call
const getCallTrackingKey = (meetingId: string, startTime: string, callType: 'pre' | 'post'): string => {
  return `${meetingId}_${startTime}_${callType}`;
};

// Check if a meeting call has already been triggered (checks memory + Redis)
const hasBeenCalled = async (meetingId: string, startTime: string, callType: 'pre' | 'post'): Promise<boolean> => {
  const key = getCallTrackingKey(meetingId, startTime, callType);

  // Check in-memory first (fast)
  if (calledMeetings.has(key)) {
    return true;
  }

  // Check Redis as fallback (survives restarts)
  const redisRecord = await calledMeetingsCache.getCalledMeeting(meetingId, startTime, callType);

  if (redisRecord) {
    // Found in Redis but not in memory - restore to memory
    calledMeetings.set(key, redisRecord);
    return true;
  }

  return false;
};

// Mark a meeting call as triggered (saves to both memory + Redis)
const markAsCalled = async (meetingId: string, startTime: string, callType: 'pre' | 'post'): Promise<void> => {
  const key = getCallTrackingKey(meetingId, startTime, callType);

  const record: CalledMeetingRecord = {
    calledAt: Date.now(),
    meetingStartTime: startTime,
  };

  // Save to in-memory (fast access)
  calledMeetings.set(key, record);

  // Save to Redis (persistence)
  await calledMeetingsCache.saveCalledMeeting(meetingId, startTime, callType);

  console.log(`       📝 Marked as called: ${key}`);
};

// Cleanup old entries (meetings that started more than 1 hour ago)
const cleanupOldEntries = (): void => {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  let cleanedCount = 0;

  calledMeetings.forEach((record, key) => {
    const meetingTime = new Date(record.meetingStartTime).getTime();
    // Remove if meeting started more than 1 hour ago
    if (meetingTime < oneHourAgo) {
      calledMeetings.delete(key);
      cleanedCount++;
    }
  });

  if (cleanedCount > 0) {
    console.log(`🧹 Cleaned up ${cleanedCount} old call tracking entries`);
  }
};

/**
 * Restore called meetings state from Redis on server startup
 * Prevents duplicate calls after server restarts
 */
export const restoreCalledMeetingsFromRedis = async (): Promise<void> => {
  console.log('🔄 Restoring called meetings from Redis...');

  try {
    const redisRecords = await calledMeetingsCache.getAllCalledMeetings();

    if (redisRecords.length === 0) {
      console.log('✅ No called meetings to restore\n');
      return;
    }

    let restoredCount = 0;

    for (const { meetingId, startTime, callType, record } of redisRecords) {
      const key = getCallTrackingKey(meetingId, startTime, callType);
      calledMeetings.set(key, record);
      restoredCount++;
    }

    console.log(`✅ Restored ${restoredCount} called meeting records from Redis\n`);

  } catch (error: any) {
    console.error('❌ Failed to restore called meetings from Redis:', error.message);
  }
};

// Helper function to replace time placeholders with actual timestamps
const processTimeTemplates = (timeStr: string): string => {
  const now = Date.now();

  // Match {{T+X}} or {{T-X}} patterns
  const match = timeStr.match(/\{\{T([+-])(\d+)\}\}/);

  if (match) {
    const operator = match[1];
    const minutes = parseInt(match[2], 10);
    const milliseconds = minutes * 60 * 1000;

    const targetTime = operator === '+'
      ? new Date(now + milliseconds)
      : new Date(now - milliseconds);

    return targetTime.toISOString();
  }

  // If no template, return as is
  return timeStr;
};


// Process user data and filter meetings (OPTIMIZED)
// Now also returns meetings that need SMS notifications
const processUserMeetings = (userData: any) => {
  const allPreMeetings: any[] = [];
  const allPostMeetings: any[] = [];
  const allSmsNotifications: any[] = []; // NEW: Meetings needing SMS notification

  // Early exit if no deals
  if (!userData.deals || userData.deals.length === 0) {
    return { preMeetings: allPreMeetings, postMeetings: allPostMeetings, smsNotifications: allSmsNotifications };
  }

  // ✅ Cache time values - calculate once, reuse for all meetings
  const now = Date.now();
  const twentyMinutesFromNow = now + 20 * 60 * 1000;
  
  // Post-call timing: 18 minutes after meeting end (with ±3 min tolerance)
  // Window: 15-21 minutes after meeting ended (ensures >15 min delay)
  const twentyOneMinutesAgo = now - 21 * 60 * 1000;  // 18 min + 3 min tolerance
  const fifteenMinutesAgo = now - 15 * 60 * 1000;    // 18 min - 3 min tolerance
  
  // SMS notification window: configurable minutes before meeting (default 30 min)
  // We check for meetings starting between notificationMinutesBefore and (notificationMinutesBefore - 10) minutes
  // This creates a 10-minute window to catch meetings in the scheduler's 5-minute cycles
  const smsNotifyMinutes = config.twilio.notificationMinutesBefore;
  const smsWindowStart = now + (smsNotifyMinutes - 5) * 60 * 1000;  // e.g., T-25 min
  const smsWindowEnd = now + (smsNotifyMinutes + 5) * 60 * 1000;    // e.g., T-35 min

  // Cache user info to avoid repeated access
  const userInfo = {
    userId: userData.userId,                    // BarrierX ID (for external APIs)
    databaseUserId: userData.databaseUserId,    // AgentX DB UUID (for logging)
    name: userData.name,
    email: userData.email,
    tenantSlug: userData.tenantSlug, // Include tenant slug for ElevenLabs
  };

  // ✅ Use for loop for better performance (faster than forEach)
  for (let i = 0; i < userData.deals.length; i++) {
    const deal = userData.deals[i];

    // ✅ Early exit - skip deals with no meetings
    if (!deal.meetings || deal.meetings.length === 0) {
      continue;
    }

    // Pre-build deal context once for this deal (if needed)
    let dealContext: any = null;

    // ✅ Single-pass filtering - check conditions as we iterate
    for (let j = 0; j < deal.meetings.length; j++) {
      const meeting = deal.meetings[j];

      // Process time templates
      const startTimeStr = processTimeTemplates(meeting.startTime);
      const endTimeStr = processTimeTemplates(meeting.endTime);
      const startTime = new Date(startTimeStr).getTime();
      const endTime = new Date(endTimeStr).getTime();

      // Check for pre-meeting (T-20: upcoming within next 20 minutes)
      const isPreMeeting = startTime >= now && startTime <= twentyMinutesFromNow;

      // Check for post-meeting (T+18: ended 15-21 minutes ago)
      const isPostMeeting = endTime >= twentyOneMinutesAgo && endTime <= fifteenMinutesAgo;

      // NEW: Check for SMS notification window (e.g., T-25 to T-35 for 30-min notification)
      const needsSmsNotification = config.twilio.smsEnabled && 
        startTime >= smsWindowStart && startTime <= smsWindowEnd;

      // ✅ Filter before building - only create objects for matching meetings
      if (isPreMeeting || isPostMeeting || needsSmsNotification) {
        // Lazy initialization of dealContext (only when we have a match)
        if (!dealContext) {
          dealContext = {
            id: deal.id,
            dealName: deal.dealName,
            company: deal.company,
            stage: deal.stage,
            amount: deal.amount,
            owner: deal.owner,
            tenantSlug: deal.tenantSlug,  // Include tenant slug for ElevenLabs webhook
            userDealRiskScores: deal.userDealRiskScores,
            attachments: deal.attachments,
            recommendations: deal.recommendations,
          };
        }

        // Build meeting object
        const meetingObj = {
          ...meeting,
          startTime: startTimeStr,
          endTime: endTimeStr,
          deal: dealContext,
          contacts: deal.contacts,
          owner: deal.owner,
          user: userInfo,
        };

        // Add to appropriate arrays
        if (isPreMeeting) {
          allPreMeetings.push(meetingObj);
        }
        if (isPostMeeting) {
          allPostMeetings.push(meetingObj);
        }
        if (needsSmsNotification) {
          allSmsNotifications.push(meetingObj);
        }
      }
    }
  }

  return { preMeetings: allPreMeetings, postMeetings: allPostMeetings, smsNotifications: allSmsNotifications };
};

// Lock to prevent concurrent executions
let isJobRunning = false;

// Main automation job
const runAutomationJob = async () => {
  // Check if previous job is still running
  if (isJobRunning) {
    console.log('\n⏭️  Previous automation job still running, skipping this run');
    console.log('⏰ Time:', new Date().toISOString());
    return;
  }

  // Set lock
  isJobRunning = true;

  // Log scheduler start
  const schedulerLogId = await loggingService.logSchedulerStart('MEETING_AUTOMATION');

  try {
    console.log('\n🔄 Running automated meeting calls job...');
    console.log('⏰ Time:', new Date().toISOString());
    console.log(`🔧 Automation Mode: ${config.automation.mode}`);
    console.log(`📊 Tracked calls in memory: ${calledMeetings.size}`);

    // Cleanup old call tracking entries
    cleanupOldEntries();
    
    // Cleanup old SMS notification entries
    smsNotificationService.cleanupOldNotifications();
    
    // Log SMS notification status
    if (config.twilio.smsEnabled) {
      console.log(`📱 SMS notifications: ENABLED (${config.twilio.notificationMinutesBefore} min before)`);
      const smsStats = smsNotificationService.getNotificationStats();
      console.log(`📊 Tracked SMS notifications: ${smsStats.totalTracked}`);
    } else {
      console.log(`📱 SMS notifications: DISABLED`);
    }

    let dealsMap: Map<string, any[]>;
    let usersToProcess: Array<{ id: string; name: string; email: string; barrierxUserId: string; hubspotOwnerId?: string | null; tenantSlug: string }> = [];

    if (config.automation.mode === 'bulk') {
      // 🌟 NEW: Bulk mode - fetch ALL users and deals in ONE call (no user_ids = wildcard)
      console.log('🌐 Bulk mode: Fetching ALL tenants and users...');

      dealsMap = await barrierxService.getAllDealsWildcard();

      if (dealsMap.size === 0) {
        console.log('⚠️  No deals found in bulk mode. Skipping...');
        return;
      }

      console.log(`👥 Bulk mode: Processing ${dealsMap.size} users from external API`);

      // Look up real User records from DB so we can log correct userId/barrierxUserId
      // The dealsMap key is deal.owner.hubspotId (HubSpot owner ID), NOT barrierxUserId
      const hubspotOwnerIds = Array.from(dealsMap.keys());
      const ownerEmails: string[] = [];
      dealsMap.forEach((deals) => {
        if (deals.length > 0 && deals[0].ownerEmail) {
          ownerEmails.push(deals[0].ownerEmail);
        }
      });

      const dbUsersForBulk = await prisma.user.findMany({
        where: {
          OR: [
            { hubspotOwnerId: { in: hubspotOwnerIds } },
            ...(ownerEmails.length > 0 ? [{ email: { in: ownerEmails } }] : []),
          ],
        },
        select: { id: true, name: true, email: true, barrierxUserId: true, hubspotOwnerId: true, tenantSlug: true },
      });

      const userByHubspotId = new Map<string, (typeof dbUsersForBulk)[0]>();
      const userByEmail = new Map<string, (typeof dbUsersForBulk)[0]>();
      dbUsersForBulk.forEach(u => {
        if (u.hubspotOwnerId) userByHubspotId.set(u.hubspotOwnerId, u);
        if (u.email) userByEmail.set(u.email, u);
      });

      console.log(`🔍 Matched ${dbUsersForBulk.length} DB users for ${hubspotOwnerIds.length} HubSpot owners`);

      dealsMap.forEach((deals, hubspotOwnerId) => {
        if (deals.length > 0) {
          const firstDeal = deals[0];
          // Match by hubspotOwnerId first, fallback to email
          const matchedUser = userByHubspotId.get(hubspotOwnerId) ||
                              (firstDeal.ownerEmail ? userByEmail.get(firstDeal.ownerEmail) : undefined);

          usersToProcess.push({
            id: matchedUser?.id || hubspotOwnerId,
            name: matchedUser?.name || firstDeal.ownerName || 'Unknown User',
            email: matchedUser?.email || firstDeal.ownerEmail || 'unknown@example.com',
            barrierxUserId: matchedUser?.barrierxUserId || hubspotOwnerId,
            hubspotOwnerId: hubspotOwnerId,
            tenantSlug: matchedUser?.tenantSlug || firstDeal.tenantSlug || 'unknown',
          });
        }
      });

    } else {
      // EXISTING: Authenticated mode - use database users
      console.log('👥 Authenticated mode: Fetching users from database...');

      const authenticatedUsers = await prisma.user.findMany({
        where: {
          isAuth: true,
          isEnabled: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          barrierxUserId: true,
          hubspotOwnerId: true,
          tenantSlug: true,
        },
      });

      console.log(`👥 Found ${authenticatedUsers.length} authenticated and enabled users`);

      if (authenticatedUsers.length === 0) {
        console.log('⚠️  No authenticated users found. Skipping...');
        return;
      }

      usersToProcess = authenticatedUsers;

      // Batch fetch all users' deals
      const userIds = authenticatedUsers.map(u => u.barrierxUserId);

      console.log(`📦 Batch fetching deals for ${userIds.length} users...`);
      dealsMap = await barrierxService.getBatchUserDeals(userIds);
    }

    let totalPreMeetings = 0;
    let totalPostMeetings = 0;
    let totalSmsNotifications = 0;

    // Process each user
    for (const dbUser of usersToProcess) {
      // In bulk mode dealsMap is keyed by hubspotOwnerId; in auth mode by barrierxUserId
      const deals = (dbUser.hubspotOwnerId ? dealsMap.get(dbUser.hubspotOwnerId) : undefined)
                    || dealsMap.get(dbUser.barrierxUserId);

      if (!deals || deals.length === 0) {
        console.log(`⚠️  No deals found for user: ${dbUser.name} (barrierxUserId: ${dbUser.barrierxUserId})`);
        continue;
      }

      // Convert deals to old format for backward compatibility with existing code
      const userData = {
        userId: dbUser.barrierxUserId,          // For BarrierX API calls
        databaseUserId: dbUser.id,              // For AgentX database logging (CallLog.userId)
        name: dbUser.name,
        email: dbUser.email,
        tenantSlug: dbUser.tenantSlug,
        deals: deals.map(deal => ({
          id: deal.id,
          dealName: deal.name,
          company: deal.company,
          stage: deal.stage,
          amount: deal.amount,
          owner: {
            name: deal.ownerName,
            phone: deal.ownerPhone,
            email: deal.ownerEmail,
            id: deal.ownerHubspotId,        // HubSpot owner ID for webhook
            hubspotId: deal.ownerHubspotId, // Alias for compatibility
            timezone: deal.ownerTimezone,
          },
          tenantSlug: deal.tenantSlug,      // Pass tenant slug for each deal
          contacts: deal.contacts,
          meetings: deal.meetings.map((m: any) => ({
            ...m,
            body: m.agenda,
          })),
          summary: deal.summary,
          userDealRiskScores: deal.userDealRiskScores,
          recommendations: deal.recommendations,
        })),
      };

      const { preMeetings, postMeetings, smsNotifications } = processUserMeetings(userData);

      if (preMeetings.length > 0 || postMeetings.length > 0 || smsNotifications.length > 0) {
        console.log(`\n📋 User: ${dbUser.name} (${dbUser.email})`);
      }

      // ============================================
      // SEND SMS NOTIFICATIONS (before voice calls)
      // ============================================
      if (smsNotifications.length > 0 && config.twilio.smsEnabled) {
        console.log(`  📱 ${smsNotifications.length} SMS notification(s) to send:`);
        for (const meeting of smsNotifications) {
          // Get customer name from contacts
          const customer = meeting.contacts && meeting.contacts.length > 0 
            ? meeting.contacts[0] 
            : null;
          const customerName = customer?.name || meeting.deal.company || 'the prospect';

          console.log(`     - ${meeting.title} (starts at ${new Date(meeting.startTime).toLocaleTimeString()})`);

          const smsResult = await smsNotificationService.sendPreCallNotification({
            ownerPhone: meeting.deal.owner?.phone || '',
            ownerName: meeting.deal.owner?.name || meeting.user.name || 'Sales Rep',
            meetingTitle: meeting.title,
            meetingStartTime: meeting.startTime,
            customerName: customerName,
            dealName: meeting.deal.dealName,
            meetingId: meeting.id,
            // Deal context for enhanced SMS
            dealAmount: meeting.deal.amount,
            dealStage: meeting.deal.stage,
            risks: meeting.deal.userDealRiskScores,
            recommendations: meeting.deal.recommendations,
            // Additional context for logging
            userId: meeting.user.databaseUserId || meeting.user.userId,
            barrierxUserId: meeting.user.userId,
            hubspotOwnerId: meeting.deal.owner?.hubspotId || meeting.deal.owner?.id,
            userEmail: meeting.user.email,
            dealId: meeting.deal.id,
            tenantSlug: meeting.deal.tenantSlug,
          });

          if (smsResult.success) {
            totalSmsNotifications++;
          }
        }
      }

      // Trigger pre-meeting calls (T-20)
      if (preMeetings.length > 0) {
        console.log(`  📞 ${preMeetings.length} pre-meeting call(s) to trigger:`);
        for (const meeting of preMeetings) {
          // Check if this meeting has already been called (checks memory + Redis)
          if (await hasBeenCalled(meeting.id, meeting.startTime, 'pre')) {
            console.log(`     ⏭️  SKIP: ${meeting.title} (already called for this time slot)`);
            continue;
          }

          console.log(`     - ${meeting.title} (starts at ${new Date(meeting.startTime).toLocaleTimeString()})`);

          try {
            // Trigger ElevenLabs pre-meeting call with full data
            const result = await meetingService.triggerPreMeetingCall({
              meetingData: {
                id: meeting.id,
                title: meeting.title,
                body: meeting.body,
                startTime: meeting.startTime,
                endTime: meeting.endTime,
              },
              dealData: meeting.deal,
              userData: meeting.user,
              contacts: meeting.contacts,
            });

            // Log call initiation if successful
            if (result?.conversation_id || result?.callSid) {
              await loggingService.logCallInitiation({
                callType: 'PRE_CALL',
                userId: meeting.user.databaseUserId || meeting.user.userId, // Use AgentX DB UUID for proper user filtering
                userName: meeting.user.name,
                userEmail: meeting.user.email,
                dealId: meeting.deal.id,
                dealName: meeting.deal.dealName,
                meetingId: meeting.id,
                meetingTitle: meeting.title,
                phoneNumber: meeting.deal.owner?.phone || '',
                ownerName: meeting.deal.owner?.name || '',
                agentId: result.agent_id,
                triggerSource: 'SCHEDULED',
                conversationId: result.conversation_id,
                callSid: result.callSid,
              });
            }

            // Mark as called to prevent duplicates (saves to memory + Redis)
            await markAsCalled(meeting.id, meeting.startTime, 'pre');
            totalPreMeetings++;
          } catch (error) {
            console.error(`       ❌ Failed to trigger call for ${meeting.title}`);
          }
        }
      }

      // Trigger post-meeting calls (T+18: 18 minutes after meeting ends, minimum 15 min)
      if (postMeetings.length > 0) {
        console.log(`  📞 ${postMeetings.length} post-meeting call(s) to trigger:`);
        for (const meeting of postMeetings) {
          // Check if this meeting has already been called (checks memory + Redis)
          if (await hasBeenCalled(meeting.id, meeting.startTime, 'post')) {
            console.log(`     ⏭️  SKIP: ${meeting.title} (already called for this time slot)`);
            continue;
          }

          console.log(`     - ${meeting.title} (ended at ${new Date(meeting.endTime).toLocaleTimeString()})`);

          try {
            // Trigger ElevenLabs post-meeting call with full data
            const result = await meetingService.triggerPostMeetingCall({
              meetingData: {
                id: meeting.id,
                title: meeting.title,
                body: meeting.body,
                startTime: meeting.startTime,
                endTime: meeting.endTime,
              },
              dealData: meeting.deal,
              userData: meeting.user,
              contacts: meeting.contacts,
            });

            // Log call initiation if successful
            if (result?.conversation_id || result?.callSid) {
              await loggingService.logCallInitiation({
                callType: 'POST_CALL',
                userId: meeting.user.databaseUserId || meeting.user.userId, // Use AgentX DB UUID for proper user filtering
                userName: meeting.user.name,
                userEmail: meeting.user.email,
                dealId: meeting.deal.id,
                dealName: meeting.deal.dealName,
                meetingId: meeting.id,
                meetingTitle: meeting.title,
                phoneNumber: meeting.deal.owner?.phone || '',
                ownerName: meeting.deal.owner?.name || '',
                agentId: result.agent_id,
                triggerSource: 'SCHEDULED',
                conversationId: result.conversation_id,
                callSid: result.callSid,
                dynamicVariables: result.conversation_initiation_client_data?.dynamic_variables,
              });
            }

            // Mark as called to prevent duplicates (saves to memory + Redis)
            await markAsCalled(meeting.id, meeting.startTime, 'post');
            totalPostMeetings++;
          } catch (error) {
            console.error(`       ❌ Failed to trigger call for ${meeting.title}`);
          }
        }
      }
    }

    console.log(`\n✅ Job completed!`);
    console.log(`   SMS notifications sent: ${totalSmsNotifications}`);
    console.log(`   Pre-meeting calls triggered: ${totalPreMeetings}`);
    console.log(`   Post-meeting calls triggered: ${totalPostMeetings}`);
    console.log(`   Next run in 5 minutes\n`);

    // Log scheduler completion - ONLY if calls or SMS were triggered (Phase 1 optimization)
    const totalCalls = totalPreMeetings + totalPostMeetings;
    const totalActivity = totalCalls + totalSmsNotifications;
    if (schedulerLogId && totalActivity > 0) {
      await loggingService.logSchedulerComplete(schedulerLogId.id, {
        status: 'SUCCESS',
        totalUsers: usersToProcess.length,
        preCallsTriggered: totalPreMeetings,
        postCallsTriggered: totalPostMeetings,
        errorsCount: 0,
        metadata: { smsNotificationsSent: totalSmsNotifications },
      });
      console.log(`📊 Scheduler run logged (${totalCalls} calls, ${totalSmsNotifications} SMS)`);
    } else if (schedulerLogId) {
      // Delete the initial log entry since nothing happened
      await loggingService.deleteSchedulerLog(schedulerLogId.id);
      console.log(`🔇 Scheduler run not logged (0 calls, 0 SMS, no activity)`);
    }

  } catch (error: any) {
    console.error('❌ Error in automation job:', error);

    // Log scheduler error
    if (schedulerLogId) {
      await loggingService.logSchedulerComplete(schedulerLogId.id, {
        status: 'FAILED',
        errorMessage: error.message || 'Unknown error in automation job',
      });
    }

    // Log error
    await loggingService.logError({
      errorType: 'EXTERNAL_SERVICE',
      severity: 'HIGH',
      source: 'schedulerService.runAutomationJob',
      message: error.message || 'Error in automation job',
      stack: error.stack,
    });
  } finally {
    // Always release the lock when job finishes (success or error)
    isJobRunning = false;
  }
};

// Initialize scheduler
export const startScheduler = () => {
  console.log('🚀 Starting automated meeting calls scheduler...');
  console.log('⏱️  Schedule: Every 5 minutes');

  // Run every 5 minutes: */5 * * * *
  cron.schedule('*/5 * * * *', () => {
    runAutomationJob();
  });

  console.log('✅ Scheduler started successfully!');
  console.log('💡 Tip: First run will happen in 5 minutes\n');

  // Optionally run immediately on startup for testing
  // Uncomment the line below to run immediately when server starts
  runAutomationJob();
};

// Manual trigger function for testing
export const triggerManualRun = async () => {
  console.log('🔧 Manual trigger activated');
  await runAutomationJob();
};

