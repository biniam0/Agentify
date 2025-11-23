import cron from 'node-cron';
import prisma from '../config/database';
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

// Helper function to filter meetings based on T-15 and T+5 logic
const filterMeetingsByTime = (meetings: Meeting[]): { preMeetings: Meeting[]; postMeetings: Meeting[] } => {
  const now = Date.now();
  const preMeetings: Meeting[] = [];
  const postMeetings: Meeting[] = [];

  meetings.forEach(meeting => {
    const startTime = new Date(meeting.startTime).getTime();
    const endTime = new Date(meeting.endTime).getTime();

    // T-15: Meetings starting within next 15 minutes
    const isUpcomingWithin15 = startTime >= now && startTime <= (now + 15 * 60 * 1000);

    // T+5: Meetings that ended within last 5 minutes
    const endedWithin5 = endTime >= (now - 5 * 60 * 1000) && endTime <= now;

    if (isUpcomingWithin15) {
      preMeetings.push(meeting);
    }

    if (endedWithin5) {
      postMeetings.push(meeting);
    }
  });

  return { preMeetings, postMeetings };
};

// Process user data and filter meetings
const processUserMeetings = (userData: any) => {
  const processedUser = JSON.parse(JSON.stringify(userData)); // Deep clone
  let allPreMeetings: any[] = [];
  let allPostMeetings: any[] = [];

  if (processedUser.deals) {
    processedUser.deals.forEach((deal: any) => {
      if (deal.meetings) {
        // Process time templates
        const meetings = deal.meetings.map((meeting: MeetingTemplate) => ({
          ...meeting,
          startTime: processTimeTemplates(meeting.startTime),
          endTime: processTimeTemplates(meeting.endTime),
        }));

        // Filter meetings by T-15 and T+5
        const { preMeetings, postMeetings } = filterMeetingsByTime(meetings);

        // Add deal context to meetings
        preMeetings.forEach(meeting => {
          allPreMeetings.push({
            ...meeting,
            deal: {
              id: deal.id,
              dealName: deal.dealName,
              company: deal.company,
              stage: deal.stage,
              amount: deal.amount,
              owner: deal.owner,  // Include owner in deal object
              userDealRiskScores: deal.userDealRiskScores,  // Include risk scores
              attachments: deal.attachments,  // Include attachments
            },
            contacts: deal.contacts,
            owner: deal.owner,
            user: {
              userId: processedUser.userId,
              name: processedUser.name,
              email: processedUser.email,
            },
          });
        });

        postMeetings.forEach(meeting => {
          allPostMeetings.push({
            ...meeting,
            deal: {
              id: deal.id,
              dealName: deal.dealName,
              company: deal.company,
              stage: deal.stage,
              amount: deal.amount,
              owner: deal.owner,  // Include owner in deal object
              userDealRiskScores: deal.userDealRiskScores,  // Include risk scores
              attachments: deal.attachments,  // Include attachments
            },
            contacts: deal.contacts,
            owner: deal.owner,
            user: {
              userId: processedUser.userId,
              name: processedUser.name,
              email: processedUser.email,
            },
          });
        });
      }
    });
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

    // Fetch authenticated and enabled users from database
    const authenticatedUsers = await prisma.user.findMany({
      where: {
        isAuth: true,
        isEnabled: true,
        barrierxUserId: { not: null }, // Only users with barrierxUserId
      },
      select: {
        id: true,
        name: true,
        email: true,
        barrierxUserId: true,
      },
    });

    console.log(`👥 Found ${authenticatedUsers.length} authenticated and enabled users`);

    if (authenticatedUsers.length === 0) {
      console.log('⚠️  No authenticated users found. Skipping...');
      return;
    }

    let totalPreMeetings = 0;
    let totalPostMeetings = 0;

    // Batch fetch all users' deals at once (more efficient!)
    const userIds = authenticatedUsers
      .map(u => u.barrierxUserId)
      .filter((id): id is string => id !== null);
    
    console.log(`📦 Batch fetching deals for all ${userIds.length} users...`);
    const dealsMap = await barrierxService.getBatchUserDeals(userIds);
    
    // Process each authenticated user
    for (const dbUser of authenticatedUsers) {
      if (!dbUser.barrierxUserId) {
        console.log(`⚠️  No barrierxUserId found for user: ${dbUser.name} (${dbUser.id})`);
        continue;
      }

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
          meetings: deal.meetings.map(m => ({
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
    console.log(`   Next run in 10 minutes\n`);

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
  console.log('⏱️  Schedule: Every 10 minutes');

  // Run every 10 minutes: */10 * * * *
  cron.schedule('*/10 * * * *', () => {
    runAutomationJob();
  });

  console.log('✅ Scheduler started successfully!');
  console.log('💡 Tip: First run will happen in 10 minutes\n');

  // Optionally run immediately on startup for testing
  // Uncomment the line below to run immediately when server starts
  runAutomationJob();
};

// Manual trigger function for testing
export const triggerManualRun = async () => {
  console.log('🔧 Manual trigger activated');
  await runAutomationJob();
};

