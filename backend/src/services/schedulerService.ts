import cron from 'node-cron';
import prisma from '../config/database';
import { config } from '../config/env';
import * as barrierxService from './barrierxService';
import * as meetingService from './meetingService';

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
const processUserMeetings = (userData: any) => {
  const allPreMeetings: any[] = [];
  const allPostMeetings: any[] = [];

  // Early exit if no deals
  if (!userData.deals || userData.deals.length === 0) {
    return { preMeetings: allPreMeetings, postMeetings: allPostMeetings };
  }

  // ✅ Cache time values - calculate once, reuse for all meetings
  const now = Date.now();
  const fifteenMinutesFromNow = now + 15 * 60 * 1000;
  const fiveMinutesAgo = now - 5 * 60 * 1000;

  // Cache user info to avoid repeated access
  const userInfo = {
    userId: userData.userId,
    name: userData.name,
    email: userData.email,
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

      // Check for pre-meeting (T-15: upcoming within next 15 minutes)
      const isPreMeeting = startTime >= now && startTime <= fifteenMinutesFromNow;

      // Check for post-meeting (T+5: ended within last 5 minutes)
      const isPostMeeting = endTime >= fiveMinutesAgo && endTime <= now;

      // ✅ Filter before building - only create objects for matching meetings
      if (isPreMeeting || isPostMeeting) {
        // Lazy initialization of dealContext (only when we have a match)
        if (!dealContext) {
          dealContext = {
            id: deal.id,
            dealName: deal.dealName,
            company: deal.company,
            stage: deal.stage,
            amount: deal.amount,
            owner: deal.owner,
            userDealRiskScores: deal.userDealRiskScores,
            attachments: deal.attachments,
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

        // Add to appropriate array
        if (isPreMeeting) {
          allPreMeetings.push(meetingObj);
        }
        if (isPostMeeting) {
          allPostMeetings.push(meetingObj);
        }
      }
    }
  }

  return { preMeetings: allPreMeetings, postMeetings: allPostMeetings };
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

  try {
    console.log('\n🔄 Running automated meeting calls job...');
    console.log('⏰ Time:', new Date().toISOString());
    console.log(`🔧 Automation Mode: ${config.automation.mode}`);

    let dealsMap: Map<string, any[]>;
    let usersToProcess: Array<{ id: string; name: string; email: string; barrierxUserId: string; tenantSlug: string }> = [];

    if (config.automation.mode === 'bulk') {
      // 🌟 NEW: Bulk mode - fetch ALL users and deals in ONE call (no user_ids = wildcard)
      console.log('🌐 Bulk mode: Fetching ALL tenants and users...');
      
      dealsMap = await barrierxService.getAllDealsWildcard();
      
      if (dealsMap.size === 0) {
        console.log('⚠️  No deals found in bulk mode. Skipping...');
        return;
      }

      console.log(`👥 Bulk mode: Processing ${dealsMap.size} users from external API`);

      // In bulk mode, we don't have DB users, so create minimal user objects
      // The actual user data will be in the deals (owner info)
      dealsMap.forEach((deals, barrierxUserId) => {
        if (deals.length > 0) {
          // Use deal owner info as user data
          const firstDeal = deals[0];
          usersToProcess.push({
            id: barrierxUserId, // Using barrierxUserId as ID
            name: firstDeal.owner?.name || 'Unknown User',
            email: firstDeal.owner?.email || 'unknown@example.com',
            barrierxUserId: barrierxUserId,
            tenantSlug: 'bulk-mode', // Default tenant slug for bulk mode
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
    
    // Process each user
    for (const dbUser of usersToProcess) {
      const deals = dealsMap.get(dbUser.barrierxUserId);

      if (!deals || deals.length === 0) {
        console.log(`⚠️  No deals found for user: ${dbUser.name} (barrierxUserId: ${dbUser.barrierxUserId})`);
        continue;
      }

      // Convert deals to old format for backward compatibility with existing code
      const userData = {
        userId: dbUser.barrierxUserId,
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
          },
          contacts: deal.contacts,
          meetings: deal.meetings.map((m: any) => ({
            ...m,
            body: m.agenda,
          })),
          summary: deal.summary,
          userDealRiskScores: deal.userDealRiskScores,
        })),
      };

      const { preMeetings, postMeetings } = processUserMeetings(userData);

      if (preMeetings.length > 0 || postMeetings.length > 0) {
        console.log(`\n📋 User: ${dbUser.name} (${dbUser.email})`);
      }

      // Trigger pre-meeting calls (T-15)
      if (preMeetings.length > 0) {
        console.log(`  📞 ${preMeetings.length} pre-meeting call(s) to trigger:`);
        for (const meeting of preMeetings) {
          console.log(`     - ${meeting.title} (starts at ${new Date(meeting.startTime).toLocaleTimeString()})`);

          try {
            // Trigger ElevenLabs pre-meeting call with full data
            await meetingService.triggerPreMeetingCall({
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

            totalPreMeetings++;
          } catch (error) {
            console.error(`       ❌ Failed to trigger call for ${meeting.title}`);
          }
        }
      }

      // Trigger post-meeting calls (T+5)
      if (postMeetings.length > 0) {
        console.log(`  📞 ${postMeetings.length} post-meeting call(s) to trigger:`);
        for (const meeting of postMeetings) {
          console.log(`     - ${meeting.title} (ended at ${new Date(meeting.endTime).toLocaleTimeString()})`);

          try {
            // Trigger ElevenLabs post-meeting call with full data
            await meetingService.triggerPostMeetingCall({
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

            totalPostMeetings++;
          } catch (error) {
            console.error(`       ❌ Failed to trigger call for ${meeting.title}`);
          }
        }
      }
    }

    console.log(`\n✅ Job completed!`);
    console.log(`   Pre-meeting calls triggered: ${totalPreMeetings}`);
    console.log(`   Post-meeting calls triggered: ${totalPostMeetings}`);
    console.log(`   Next run in 5 minutes\n`);

  } catch (error) {
    console.error('❌ Error in automation job:', error);
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

