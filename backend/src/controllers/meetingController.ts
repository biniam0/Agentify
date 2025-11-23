import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import prisma from '../config/database';
import * as barrierxService from '../services/barrierxService';
import * as meetingService from '../services/meetingService';

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
      select: { barrierxUserId: true, name: true, email: true },
    });

    if (!dbUser || !dbUser.barrierxUserId) {
      res.status(404).json({ error: 'BarrierX user ID not found. Please login again.' });
      return;
    }

    // Fetch user deals from BarrierX API (or mock data)
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
        body: meeting.agenda || meeting.body || '',
        startTime: meeting.startTime,
        endTime: meeting.endTime,
      },
      dealData: {
        id: deal.id,
        dealName: deal.name,
        company: deal.company,
        stage: deal.stage,
        amount: deal.amount,
        owner: {
          name: deal.ownerName,
          phone: deal.ownerPhone,
          email: dbUser.email,
        },
        userDealRiskScores: deal.userDealRiskScores,
      },
      userData: {
        userId: dbUser.barrierxUserId,
        name: dbUser.name,
        email: dbUser.email,
      },
      contacts: deal.contacts || [],
    };

    console.log(`\n🔧 Manual PRE-CALL trigger by ${dbUser.name}`);
    console.log(`📋 Meeting: ${meeting.title}`);
    console.log(`💼 Deal: ${deal.name}`);

    // Call the meeting service
    const result = await meetingService.triggerPreMeetingCall(payload);

    res.json({
      success: true,
      message: 'Pre-meeting call triggered successfully',
      conversationId: result.conversation_id,
      callSid: result.callSid,
    });
  } catch (error: any) {
    console.error('Pre-meeting call error:', error);
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
      select: { barrierxUserId: true, name: true, email: true },
    });

    if (!dbUser || !dbUser.barrierxUserId) {
      res.status(404).json({ error: 'BarrierX user ID not found. Please login again.' });
      return;
    }

    // Fetch user deals from BarrierX API (or mock data)
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
        body: meeting.agenda || meeting.body || '',
        startTime: meeting.startTime,
        endTime: meeting.endTime,
      },
      dealData: {
        id: deal.id,
        dealName: deal.name,
        company: deal.company,
        stage: deal.stage,
        amount: deal.amount,
        owner: {
          name: deal.ownerName,
          phone: deal.ownerPhone,
          email: dbUser.email,
        },
        userDealRiskScores: deal.userDealRiskScores,
      },
      userData: {
        userId: dbUser.barrierxUserId,
        name: dbUser.name,
        email: dbUser.email,
      },
      contacts: deal.contacts || [],
    };

    console.log(`\n🔧 Manual POST-CALL trigger by ${dbUser.name}`);
    console.log(`📋 Meeting: ${meeting.title}`);
    console.log(`💼 Deal: ${deal.name}`);

    // Call the meeting service
    const result = await meetingService.triggerPostMeetingCall(payload);

    res.json({
      success: true,
      message: 'Post-meeting call triggered successfully',
      conversationId: result.conversation_id,
      callSid: result.callSid,
    });
  } catch (error: any) {
    console.error('Post-meeting call error:', error);
    res.status(500).json({
      error: 'Failed to trigger post-meeting call',
      details: error.response?.data || error.message,
    });
  }
};
