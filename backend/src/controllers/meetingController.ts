import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import prisma from '../config/database';
import * as barrierxService from '../services/barrierxService';
import * as meetingService from '../services/meetingService';
import * as loggingService from '../services/loggingService';

export const getMeetings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Get user from database to get barrierxUserId
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { barrierxUserId: true, email: true },
    });

    if (!dbUser || !dbUser.barrierxUserId) {
      res.status(404).json({ error: 'BarrierX user ID not found. Please login again.' });
      return;
    }

    // Get user's deals and meetings from BarrierX using barrierxUserId
    const deals = await barrierxService.getUserDeals(dbUser.barrierxUserId);

    // Extract all meetings from all deals
    const meetings = deals.flatMap(deal =>
      deal.meetings.map(meeting => ({
        ...meeting,
        dealId: deal.id,
        dealName: deal.name,
        dealAmount: deal.amount,
        dealStage: deal.stage,
        dealCompany: deal.company,
        dealSummary: deal.summary,
        dealRisks: deal.userDealRiskScores,
        dealCloseDate: deal.closeDate,
        contact: meeting.participants[0] || null,
        owner: deal.ownerPhone ? {
          name: deal.ownerName,
          phone: deal.ownerPhone,
          email: dbUser.email || '',
        } : null,
      }))
    );

    res.json({
      success: true,
      meetings,
    });
  } catch (error) {
    console.error('Get meetings error:', error);
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
};

export const triggerPreMeetingCall = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { meetingId, dealId } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!meetingId || !dealId) {
      res.status(400).json({ error: 'meetingId and dealId are required' });
      return;
    }

    // Get user from database to get barrierxUserId
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { barrierxUserId: true, name: true, email: true, tenantSlug: true },
    });

    if (!dbUser || !dbUser.barrierxUserId) {
      res.status(404).json({ error: 'BarrierX user ID not found. Please login again.' });
      return;
    }

    // Fetch user deals from BarrierX API
    const deals = await barrierxService.getUserDeals(dbUser.barrierxUserId);

    if (!deals || deals.length === 0) {
      res.status(404).json({ error: 'No deals found for user' });
      return;
    }

    // Find the specific deal
    const deal = deals.find((d: any) => d.id === dealId);

    if (!deal) {
      res.status(404).json({ error: 'Deal not found' });
      return;
    }

    // Find the specific meeting in the deal
    const meeting = deal.meetings?.find((m: any) => m.id === meetingId);

    if (!meeting) {
      res.status(404).json({ error: 'Meeting not found' });
      return;
    }

    // Build the payload for meetingService
    const payload = {
      meetingData: {
        id: meeting.id,
        title: meeting.title,
        body: meeting.agenda || '',
        startTime: meeting.startTime,
        endTime: meeting.endTime,
      },
      dealData: {
        id: deal.id,
        dealName: deal.name,
        company: deal.company || 'Unknown Company',
        stage: deal.stage,
        amount: deal.amount,
        owner: {
          id: deal.ownerId,
          hubspotId: deal.ownerHubspotId,
          name: deal.ownerName,
          phone: deal.ownerPhone || '',
          email: dbUser.email,
          avatar: '',
          timezone: deal.ownerTimezone,
        },
        userDealRiskScores: deal.userDealRiskScores,
        recommendations: deal.recommendations,
        risks: deal.risks,
      },
      userData: {
        userId: dbUser.barrierxUserId,
        name: dbUser.name,
        email: dbUser.email,
        tenantSlug: dbUser.tenantSlug,
      },
      contacts: deal.contacts || [],
    };

    console.log(`\n🔧 Manual PRE-CALL trigger by ${dbUser.name}`);
    console.log(`📋 Meeting: ${meeting.title}`);
    console.log(`💼 Deal: ${deal.name}`);

    // Call the meeting service
    const result = await meetingService.triggerPreMeetingCall(payload);

    // Log the call initiation
    if (result.conversation_id || result.callSid) {
      await loggingService.logCallInitiation({
        callType: 'PRE_CALL',
        userId: userId,
        userName: dbUser.name,
        userEmail: dbUser.email,
        dealId: deal.id,
        dealName: deal.name,
        meetingId: meeting.id,
        meetingTitle: meeting.title,
        phoneNumber: deal.ownerPhone || '',
        ownerName: deal.ownerName,
        agentId: result.agent_id,
        triggerSource: 'MANUAL',
        triggerUserId: userId,
        conversationId: result.conversation_id,
        callSid: result.callSid,
        dynamicVariables: result.dynamicVariables,
      });

      // Log activity
      await loggingService.logActivity({
        activityType: 'PRE_CALL_TRIGGER',
        status: 'SUCCESS',
        userId: userId,
        userName: dbUser.name,
        userEmail: dbUser.email,
        dealId: deal.id,
        dealName: deal.name,
        meetingId: meeting.id,
        meetingTitle: meeting.title,
        conversationId: result.conversation_id,
        callSid: result.callSid,
        metadata: { triggerSource: 'MANUAL' },
      });
    }

    res.json({
      success: true,
      message: 'Pre-meeting call triggered successfully',
      conversationId: result.conversation_id,
      callSid: result.callSid,
    });
  } catch (error: any) {
    console.error('Pre-meeting call error:', error);

    // Log the error
    await loggingService.logError({
      errorType: 'EXTERNAL_SERVICE',
      severity: 'HIGH',
      source: 'meetingController.triggerPreMeetingCall',
      message: error.message || 'Failed to trigger pre-meeting call',
      stack: error.stack,
      userId: req.user?.userId,
      dealId: req.body.dealId,
      endpoint: '/api/meetings/trigger/pre-call',
      method: 'POST',
      requestData: req.body,
      responseData: error.response?.data,
    });

    res.status(500).json({
      error: 'Failed to trigger pre-meeting call',
      details: error.response?.data || error.message,
    });
  }
};

export const triggerPostMeetingCall = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { meetingId, dealId } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!meetingId || !dealId) {
      res.status(400).json({ error: 'meetingId and dealId are required' });
      return;
    }

    // Get user from database to get barrierxUserId
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { barrierxUserId: true, name: true, email: true, tenantSlug: true },
    });

    if (!dbUser || !dbUser.barrierxUserId) {
      res.status(404).json({ error: 'BarrierX user ID not found. Please login again.' });
      return;
    }

    // Fetch user deals from BarrierX API
    const deals = await barrierxService.getUserDeals(dbUser.barrierxUserId);

    if (!deals || deals.length === 0) {
      res.status(404).json({ error: 'No deals found for user' });
      return;
    }

    // Find the specific deal
    const deal = deals.find((d: any) => d.id === dealId);

    if (!deal) {
      res.status(404).json({ error: 'Deal not found' });
      return;
    }

    // Find the specific meeting in the deal
    const meeting = deal.meetings?.find((m: any) => m.id === meetingId);

    if (!meeting) {
      res.status(404).json({ error: 'Meeting not found' });
      return;
    }

    // Build the payload for meetingService
    const payload = {
      meetingData: {
        id: meeting.id,
        title: meeting.title,
        body: meeting.agenda || '',
        startTime: meeting.startTime,
        endTime: meeting.endTime,
      },
      dealData: {
        id: deal.id,
        dealName: deal.name,
        company: deal.company || 'Unknown Company',
        stage: deal.stage,
        amount: deal.amount,
        owner: {
          id: deal.ownerId,
          hubspotId: deal.ownerHubspotId,
          name: deal.ownerName,
          phone: deal.ownerPhone || '',
          email: dbUser.email,
          avatar: '',
          timezone: deal.ownerTimezone,
        },
        userDealRiskScores: deal.userDealRiskScores,
      },
      userData: {
        userId: dbUser.barrierxUserId,
        name: dbUser.name,
        email: dbUser.email,
        tenantSlug: dbUser.tenantSlug,
      },
      contacts: deal.contacts || [],
    };

    console.log(`\n🔧 Manual POST-CALL trigger by ${dbUser.name}`);
    console.log(`📋 Meeting: ${meeting.title}`);
    console.log(`💼 Deal: ${deal.name}`);

    // Call the meeting service
    const result = await meetingService.triggerPostMeetingCall(payload);

    // Log the call initiation
    if (result.conversation_id || result.callSid) {
      await loggingService.logCallInitiation({
        callType: 'POST_CALL',
        userId: userId,
        userName: dbUser.name,
        userEmail: dbUser.email,
        dealId: deal.id,
        dealName: deal.name,
        meetingId: meeting.id,
        meetingTitle: meeting.title,
        phoneNumber: deal.ownerPhone || '',
        ownerName: deal.ownerName,
        agentId: result.agent_id,
        triggerSource: 'MANUAL',
        triggerUserId: userId,
        conversationId: result.conversation_id,
        callSid: result.callSid,
        dynamicVariables: result.dynamicVariables,
      });

      // Log activity
      await loggingService.logActivity({
        activityType: 'POST_CALL_TRIGGER',
        status: 'SUCCESS',
        userId: userId,
        userName: dbUser.name,
        userEmail: dbUser.email,
        dealId: deal.id,
        dealName: deal.name,
        meetingId: meeting.id,
        meetingTitle: meeting.title,
        conversationId: result.conversation_id,
        callSid: result.callSid,
        metadata: { triggerSource: 'MANUAL' },
      });
    }

    res.json({
      success: true,
      message: 'Post-meeting call triggered successfully',
      conversationId: result.conversation_id,
      callSid: result.callSid,
    });
  } catch (error: any) {
    console.error('Post-meeting call error:', error);

    // Log the error
    await loggingService.logError({
      errorType: 'EXTERNAL_SERVICE',
      severity: 'HIGH',
      source: 'meetingController.triggerPostMeetingCall',
      message: error.message || 'Failed to trigger post-meeting call',
      stack: error.stack,
      userId: req.user?.userId,
      dealId: req.body.dealId,
      endpoint: '/api/meetings/trigger/post-call',
      method: 'POST',
      requestData: req.body,
      responseData: error.response?.data,
    });

    res.status(500).json({
      error: 'Failed to trigger post-meeting call',
      details: error.response?.data || error.message,
    });
  }
};

export const getAdminMeetings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Get user from database to verify admin access
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, barrierxUserId: true, name: true },
    });

    if (!dbUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Check if user is admin
    if (dbUser.email !== 'tamiratkebede120@gmail.com') {
      res.status(403).json({ error: 'Access denied. Admin only.' });
      return;
    }

    // ✅ ADMIN FETCH LOGGING START
    console.log('\n👑 =============================================');
    console.log('👑 ADMIN DASHBOARD: Fetching all users meetings');
    console.log(`👑 Requested by: ${dbUser.name} (${dbUser.email})`);
    console.log(`👑 Time: ${new Date().toISOString()}`);
    console.log('👑 =============================================');

    const startTime = Date.now();

    // Fetch all users' deals using the wildcard bulk API
    const allUsersDealsMap = await barrierxService.getAllDealsWildcard();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Extract all meetings from all users' deals
    const allMeetings: any[] = [];
    let totalDeals = 0;

    allUsersDealsMap.forEach((deals, barrierxUserId) => {
      totalDeals += deals.length;
      deals.forEach(deal => {
        deal.meetings.forEach(meeting => {
          allMeetings.push({
            ...meeting,
            dealId: deal.id,
            dealName: deal.name,
            dealAmount: deal.amount,
            dealStage: deal.stage,
            dealCompany: deal.company,
            dealSummary: deal.summary,
            dealRisks: deal.userDealRiskScores,
            dealCloseDate: deal.closeDate,
            contact: meeting.participants[0] || null,
            owner: deal.ownerPhone ? {
              name: deal.ownerName,
              phone: deal.ownerPhone,
              email: deal.ownerEmail || '',
            } : null,
            // IMPORTANT: Store the actual deal owner's info for triggering calls
            ownerBarrierxUserId: deal.ownerId,
            ownerHubspotId: deal.ownerHubspotId,
            ownerTenantSlug: deal.tenantSlug,
          });
        });
      });
    });

    // ✅ ADMIN FETCH LOGGING END
    console.log('👑 =============================================');
    console.log(`👑 ADMIN DASHBOARD: Fetch completed in ${duration}s`);
    console.log(`👑 Results: ${allMeetings.length} meetings from ${totalDeals} deals across ${allUsersDealsMap.size} users`);
    console.log('👑 =============================================\n');

    res.json({
      success: true,
      meetings: allMeetings,
      totalUsers: allUsersDealsMap.size,
    });
  } catch (error) {
    console.error('👑 ❌ ADMIN DASHBOARD: Failed to fetch meetings:', error);
    res.status(500).json({ error: 'Failed to fetch admin meetings' });
  }
};

export const adminTriggerPreMeetingCall = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { meeting, deal } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Verify admin access
    const adminUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!adminUser || adminUser.email !== 'tamiratkebede120@gmail.com') {
      res.status(403).json({ error: 'Access denied. Admin only.' });
      return;
    }

    if (!meeting || !deal) {
      res.status(400).json({ error: 'meeting and deal data are required' });
      return;
    }

    // Build payload directly from provided data (no re-fetching needed!)
    const payload = {
      meetingData: {
        id: meeting.id,
        title: meeting.title,
        body: meeting.agenda || meeting.body || '',
        startTime: meeting.startTime,
        endTime: meeting.endTime,
      },
      dealData: {
        id: deal.id,
        dealName: deal.name,
        company: deal.company || 'Unknown Company',
        stage: deal.stage,
        amount: deal.amount,
        owner: deal.owner || {
          id: deal.ownerId,
          hubspotId: deal.ownerHubspotId,
          name: deal.ownerName,
          phone: deal.ownerPhone || '',
          email: deal.ownerEmail || '',
          avatar: '',
          timezone: deal.ownerTimezone || deal.owner?.timezone,
        },
        userDealRiskScores: deal.userDealRiskScores,
        recommendations: deal.recommendations,
        risks: deal.risks,
        tenantSlug: deal.tenantSlug,
      },
      userData: {
        userId: deal.ownerBarrierxUserId || deal.ownerId,
        name: deal.ownerName,
        email: deal.ownerEmail || '',
        tenantSlug: deal.tenantSlug,
      },
      contacts: deal.contacts || [],
    };

    console.log(`\n👑 🔧 ADMIN MANUAL PRE-CALL trigger by ${adminUser.name}`);
    console.log(`   📋 Meeting: ${meeting.title}`);
    console.log(`   💼 Deal: ${deal.name} (Owner: ${deal.ownerName})`);

    const result = await meetingService.triggerPreMeetingCall(payload);

    // Log the call
    if (result.conversation_id || result.callSid) {
      await loggingService.logCallInitiation({
        callType: 'PRE_CALL',
        userId: adminUser.email,
        userName: adminUser.name,
        userEmail: adminUser.email,
        dealId: deal.id,
        dealName: deal.name,
        meetingId: meeting.id,
        meetingTitle: meeting.title,
        phoneNumber: deal.ownerPhone || '',
        ownerName: deal.ownerName,
        triggerSource: 'MANUAL',
        triggerUserId: userId,
        conversationId: result.conversation_id,
        callSid: result.callSid,
        dynamicVariables: result.dynamicVariables,
      });
    }

    res.json({
      success: true,
      message: 'Pre-meeting call triggered successfully by admin',
      conversationId: result.conversation_id,
      callSid: result.callSid,
    });
  } catch (error: any) {
    console.error('👑 ❌ ADMIN PRE-CALL error:', error);

    await loggingService.logError({
      errorType: 'EXTERNAL_SERVICE',
      severity: 'HIGH',
      source: 'meetingController.adminTriggerPreMeetingCall',
      message: error.message || 'Failed to trigger admin pre-meeting call',
      stack: error.stack,
      userId: req.user?.userId,
      endpoint: '/api/meetings/admin/trigger/pre-call',
      method: 'POST',
    });

    res.status(500).json({
      error: 'Failed to trigger pre-meeting call',
      details: error.response?.data || error.message,
    });
  }
};

export const adminTriggerPostMeetingCall = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { meeting, deal } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Verify admin access
    const adminUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!adminUser || adminUser.email !== 'tamiratkebede120@gmail.com') {
      res.status(403).json({ error: 'Access denied. Admin only.' });
      return;
    }

    if (!meeting || !deal) {
      res.status(400).json({ error: 'meeting and deal data are required' });
      return;
    }

    // Build payload directly from provided data (no re-fetching needed!)
    const payload = {
      meetingData: {
        id: meeting.id,
        title: meeting.title,
        body: meeting.agenda || meeting.body || '',
        startTime: meeting.startTime,
        endTime: meeting.endTime,
      },
      dealData: {
        id: deal.id,
        dealName: deal.name,
        company: deal.company || 'Unknown Company',
        stage: deal.stage,
        amount: deal.amount,
        owner: deal.owner || {
          id: deal.ownerId,
          hubspotId: deal.ownerHubspotId,
          name: deal.ownerName,
          phone: deal.ownerPhone || '',
          email: deal.ownerEmail || '',
          avatar: '',
          timezone: deal.ownerTimezone || deal.owner?.timezone,
        },
        userDealRiskScores: deal.userDealRiskScores,
        tenantSlug: deal.tenantSlug,
      },
      userData: {
        userId: deal.ownerBarrierxUserId || deal.ownerId,
        name: deal.ownerName,
        email: deal.ownerEmail || '',
        tenantSlug: deal.tenantSlug,
      },
      contacts: deal.contacts || [],
    };

    console.log(`\n👑 🔧 ADMIN MANUAL POST-CALL trigger by ${adminUser.name}`);
    console.log(`   📋 Meeting: ${meeting.title}`);
    console.log(`   💼 Deal: ${deal.name} (Owner: ${deal.ownerName})`);

    const result = await meetingService.triggerPostMeetingCall(payload);

    // Log the call
    if (result.conversation_id || result.callSid) {
      await loggingService.logCallInitiation({
        callType: 'POST_CALL',
        userId: adminUser.email,
        userName: adminUser.name,
        userEmail: adminUser.email,
        dealId: deal.id,
        dealName: deal.name,
        meetingId: meeting.id,
        meetingTitle: meeting.title,
        phoneNumber: deal.ownerPhone || '',
        ownerName: deal.ownerName,
        triggerSource: 'MANUAL',
        triggerUserId: userId,
        conversationId: result.conversation_id,
        callSid: result.callSid,
        dynamicVariables: result.dynamicVariables,
      });
    }

    res.json({
      success: true,
      message: 'Post-meeting call triggered successfully by admin',
      conversationId: result.conversation_id,
      callSid: result.callSid,
    });
  } catch (error: any) {
    console.error('👑 ❌ ADMIN POST-CALL error:', error);

    await loggingService.logError({
      errorType: 'EXTERNAL_SERVICE',
      severity: 'HIGH',
      source: 'meetingController.adminTriggerPostMeetingCall',
      message: error.message || 'Failed to trigger admin post-meeting call',
      stack: error.stack,
      userId: req.user?.userId,
      endpoint: '/api/meetings/admin/trigger/post-call',
      method: 'POST',
    });

    res.status(500).json({
      error: 'Failed to trigger post-meeting call',
      details: error.response?.data || error.message,
    });
  }
};
