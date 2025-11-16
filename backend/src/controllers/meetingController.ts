import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import * as barrierxService from '../services/barrierxService';
import * as meetingService from '../services/meetingService';
import mockUsersData from '../data/mockUsers.json';

export const getMeetings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    // Get user's deals and meetings from BarrierX
    const deals = await barrierxService.getUserDeals(userId);
    
    // Extract all meetings from all deals
    const meetings = deals.flatMap(deal => 
      deal.meetings.map(meeting => ({
        ...meeting,
        dealId: deal.id,
        dealName: deal.name,
        contact: meeting.participants[0] || null,
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
    
    // Lookup user data from mockUsers.json
    const typedMockUsers = mockUsersData as { [key: string]: any };
    const userData = typedMockUsers[userId];
    
    if (!userData) {
      res.status(404).json({ error: 'User data not found' });
      return;
    }
    
    // Find the specific deal
    const deal = userData.deals?.find((d: any) => d.id === dealId);
    
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
        body: meeting.body,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
      },
      dealData: {
        id: deal.id,
        dealName: deal.dealName,
        company: deal.company,
        stage: deal.stage,
        amount: deal.amount,
        owner: deal.owner,
        userDealRiskScores: deal.userDealRiskScores,
      },
      userData: {
        userId: userData.userId,
        name: userData.name,
        email: userData.email,
      },
      contacts: deal.contacts || [],
    };
    
    console.log(`\n🔧 Manual PRE-CALL trigger by ${userData.name}`);
    console.log(`📋 Meeting: ${meeting.title}`);
    console.log(`💼 Deal: ${deal.dealName}`);
    
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
    
    // Lookup user data from mockUsers.json
    const typedMockUsers = mockUsersData as { [key: string]: any };
    const userData = typedMockUsers[userId];
    
    if (!userData) {
      res.status(404).json({ error: 'User data not found' });
      return;
    }
    
    // Find the specific deal
    const deal = userData.deals?.find((d: any) => d.id === dealId);
    
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
        body: meeting.body,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
      },
      dealData: {
        id: deal.id,
        dealName: deal.dealName,
        company: deal.company,
        stage: deal.stage,
        amount: deal.amount,
        owner: deal.owner,
        userDealRiskScores: deal.userDealRiskScores,
      },
      userData: {
        userId: userData.userId,
        name: userData.name,
        email: userData.email,
      },
      contacts: deal.contacts || [],
    };
    
    console.log(`\n🔧 Manual POST-CALL trigger by ${userData.name}`);
    console.log(`📋 Meeting: ${meeting.title}`);
    console.log(`💼 Deal: ${deal.dealName}`);
    
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
