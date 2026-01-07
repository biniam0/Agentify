/**
 * Logging Controller
 * 
 * Handles all logging dashboard API endpoints.
 * Admin-only access required.
 */

import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import * as loggingService from '../services/loggingService';
import { CallType, CallStatus, ActivityType, Status, ErrorType, Severity, WebhookType, SchedulerJobType, CrmActionType } from '@prisma/client';
import prisma from '../config/database';

const applyDateRange = (
  where: Record<string, any>,
  field: 'initiatedAt' | 'createdAt',
  startDate?: string,
  endDate?: string
) => {
  if (!startDate && !endDate) return;
  where[field] = where[field] || {};
  if (startDate) where[field].gte = new Date(startDate);
  if (endDate) where[field].lte = new Date(endDate);
};

// ============================================
// CALL LOGS
// ============================================

export const getCallLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      userId,
      dealId,
      callType,
      status,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
    } = req.query;

    const result = await loggingService.getCallLogs({
      userId: userId as string,
      dealId: dealId as string,
      callType: callType as CallType,
      status: status as CallStatus,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    res.json({
      success: true,
      data: result.logs,
      total: result.total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error: any) {
    console.error('❌ Get call logs error:', error);
    res.status(500).json({
      error: 'Failed to fetch call logs',
      details: error.message,
    });
  }
};

// ============================================
// ACTIVITY LOGS
// ============================================

export const getActivityLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      userId,
      activityType,
      status,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
    } = req.query;

    const result = await loggingService.getActivityLogs({
      userId: userId as string,
      activityType: activityType as ActivityType,
      status: status as Status,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    res.json({
      success: true,
      data: result.logs,
      total: result.total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error: any) {
    console.error('❌ Get activity logs error:', error);
    res.status(500).json({
      error: 'Failed to fetch activity logs',
      details: error.message,
    });
  }
};

// ============================================
// ERROR LOGS
// ============================================

export const getErrorLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      errorType,
      severity,
      isResolved,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
    } = req.query;

    const result = await loggingService.getErrorLogs({
      errorType: errorType as ErrorType,
      severity: severity as Severity,
      isResolved: isResolved === 'true' ? true : isResolved === 'false' ? false : undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    res.json({
      success: true,
      data: result.logs,
      total: result.total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error: any) {
    console.error('❌ Get error logs error:', error);
    res.status(500).json({
      error: 'Failed to fetch error logs',
      details: error.message,
    });
  }
};

// ============================================
// WEBHOOK LOGS
// ============================================

export const getWebhookLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      webhookType,
      eventType,
      conversationId,
      status,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
    } = req.query;

    const result = await loggingService.getWebhookLogs({
      webhookType: webhookType as WebhookType,
      eventType: eventType as string,
      conversationId: conversationId as string,
      status: status as Status,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    res.json({
      success: true,
      data: result.logs,
      total: result.total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error: any) {
    console.error('❌ Get webhook logs error:', error);
    res.status(500).json({
      error: 'Failed to fetch webhook logs',
      details: error.message,
    });
  }
};

// ============================================
// SCHEDULER LOGS
// ============================================

export const getSchedulerLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      jobType,
      status,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
    } = req.query;

    const result = await loggingService.getSchedulerLogs({
      jobType: jobType as SchedulerJobType,
      status: status as Status,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    res.json({
      success: true,
      data: result.logs,
      total: result.total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error: any) {
    console.error('❌ Get scheduler logs error:', error);
    res.status(500).json({
      error: 'Failed to fetch scheduler logs',
      details: error.message,
    });
  }
};

// ============================================
// CRM ACTION LOGS
// ============================================

export const getCrmActionLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      actionType,
      conversationId,
      dealId,
      status,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
    } = req.query;

    const result = await loggingService.getCrmActionLogs({
      actionType: actionType as CrmActionType,
      conversationId: conversationId as string,
      dealId: dealId as string,
      status: status as Status,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    res.json({
      success: true,
      data: result.logs,
      total: result.total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error: any) {
    console.error('❌ Get CRM action logs error:', error);
    res.status(500).json({
      error: 'Failed to fetch CRM action logs',
      details: error.message,
    });
  }
};

// ============================================
// ANALYTICS
// ============================================

export const getCallAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId, days = 7 } = req.query;

    const analytics = await loggingService.getCallAnalytics(
      userId as string,
      parseInt(days as string)
    );

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error: any) {
    console.error('❌ Get call analytics error:', error);
    res.status(500).json({
      error: 'Failed to fetch call analytics',
      details: error.message,
    });
  }
};

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stats = await loggingService.getDashboardStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('❌ Get dashboard stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard stats',
      details: error.message,
    });
  }
};

// ============================================
// USER-SPECIFIC LOGS (Non-Admin)
// ============================================

/**
 * Get call logs for the authenticated user only
 */
export const getUserCallLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userEmail = req.user?.email;

    if (!userId || !userEmail) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const {
      dealId,
      callType,
      status,
      startDate,
      endDate,
      limit = 20,
      offset = 0,
    } = req.query;

    // IMPORTANT:
    // In production data, CallLog.userId is not always the DB User.id UUID (it may be an external numeric id).
    // CallLog.userEmail is stable, so use it for user-specific filtering.
    const where: Record<string, any> = { userEmail };
    if (dealId) where.dealId = dealId as string;
    if (callType) where.callType = callType as CallType;
    if (status) where.status = status as CallStatus;
    applyDateRange(where, 'initiatedAt', startDate as string | undefined, endDate as string | undefined);

    const take = parseInt(limit as string);
    const skip = parseInt(offset as string);

    const [logs, total] = await Promise.all([
      prisma.callLog.findMany({
        where,
        orderBy: { initiatedAt: 'desc' },
        take,
        skip,
      }),
      prisma.callLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: logs,
      total,
      limit: take,
      offset: skip,
    });
  } catch (error: any) {
    console.error('❌ Get user call logs error:', error);
    res.status(500).json({
      error: 'Failed to fetch your call logs',
      details: error.message,
    });
  }
};

/**
 * Get activity logs for the authenticated user only
 */
export const getUserActivityLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userEmail = req.user?.email;

    if (!userId || !userEmail) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const {
      activityType,
      status,
      startDate,
      endDate,
      limit = 20,
      offset = 0,
    } = req.query;

    // Same rationale as calls: ActivityLog.userEmail is stable in historical data.
    const where: Record<string, any> = { userEmail };
    if (activityType) where.activityType = activityType as ActivityType;
    if (status) where.status = status as Status;
    applyDateRange(where, 'createdAt', startDate as string | undefined, endDate as string | undefined);

    const take = parseInt(limit as string);
    const skip = parseInt(offset as string);

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.activityLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: logs,
      total,
      limit: take,
      offset: skip,
    });
  } catch (error: any) {
    console.error('❌ Get user activity logs error:', error);
    res.status(500).json({
      error: 'Failed to fetch your activity logs',
      details: error.message,
    });
  }
};

/**
 * Get CRM action logs for the authenticated user only
 */
export const getUserCrmActionLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userEmail = req.user?.email;

    if (!userId || !userEmail) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Get user's identifiers from database (some environments use hubspotOwnerId for CRM ownerId)
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { barrierxUserId: true, hubspotOwnerId: true },
    });

    if (!dbUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const {
      actionType,
      conversationId,
      dealId,
      status,
      startDate,
      endDate,
      limit = 20,
      offset = 0,
    } = req.query;

    // Build a set of possible owner IDs for this user:
    // - hubspotOwnerId (numeric string) when available
    // - barrierxUserId (uuid) for backwards compatibility
    // - any distinct CallLog.userId values observed for this user's email (your sample shows numeric ids here)
    const ownerIds = new Set<string>();
    if (dbUser.hubspotOwnerId) ownerIds.add(dbUser.hubspotOwnerId);
    if (dbUser.barrierxUserId) ownerIds.add(dbUser.barrierxUserId);

    const observedCallUserIds = await prisma.callLog.findMany({
      where: { userEmail },
      select: { userId: true },
      distinct: ['userId'],
    });
    observedCallUserIds.forEach(r => ownerIds.add(r.userId));

    const where: Record<string, any> = {
      ownerId: { in: Array.from(ownerIds) },
    };
    if (actionType) where.actionType = actionType as CrmActionType;
    if (conversationId) where.conversationId = conversationId as string;
    if (dealId) where.dealId = dealId as string;
    if (status) where.status = status as Status;
    applyDateRange(where, 'createdAt', startDate as string | undefined, endDate as string | undefined);

    const take = parseInt(limit as string);
    const skip = parseInt(offset as string);

    const [logs, total] = await Promise.all([
      prisma.crmActionLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.crmActionLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: logs,
      total,
      limit: take,
      offset: skip,
    });
  } catch (error: any) {
    console.error('❌ Get user CRM action logs error:', error);
    res.status(500).json({
      error: 'Failed to fetch your CRM action logs',
      details: error.message,
    });
  }
};

/**
 * Get call analytics for the authenticated user only
 */
export const getUserCallAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userEmail = req.user?.email;

    if (!userEmail) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { days = 30 } = req.query;
    const numDays = parseInt(days as string);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - numDays);

    const where: any = {
      userEmail,
      initiatedAt: { gte: startDate },
    };

    // Aggregated analytics for the user
    const [
      total,
      statusCounts,
      typeCounts,
      triggerCounts,
      durationAggregate
    ] = await Promise.all([
      prisma.callLog.count({ where }),
      
      prisma.callLog.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
      }),
      
      prisma.callLog.groupBy({
        by: ['callType'],
        where,
        _count: { id: true },
      }),
      
      prisma.callLog.groupBy({
        by: ['triggerSource'],
        where,
        _count: { id: true },
      }),
      
      prisma.callLog.aggregate({
        where,
        _sum: { duration: true },
        _avg: { duration: true },
      }),
    ]);

    const statusMap = new Map(statusCounts.map(s => [s.status, s._count.id]));
    const typeMap = new Map(typeCounts.map(t => [t.callType, t._count.id]));
    const triggerMap = new Map(triggerCounts.map(t => [t.triggerSource, t._count.id]));

    const successful = statusMap.get('COMPLETED') || 0;
    const failed = (statusMap.get('FAILED') || 0) + 
                   (statusMap.get('NO_ANSWER') || 0) + 
                   (statusMap.get('BUSY') || 0);
    const pending = (statusMap.get('INITIATED') || 0) + 
                    (statusMap.get('RINGING') || 0) + 
                    (statusMap.get('ANSWERED') || 0);

    const analytics = {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      avgDuration: durationAggregate._avg.duration || 0,
      byType: {
        preCalls: typeMap.get('PRE_CALL') || 0,
        postCalls: typeMap.get('POST_CALL') || 0,
      },
      byTrigger: {
        manual: triggerMap.get('MANUAL') || 0,
        scheduled: triggerMap.get('SCHEDULED') || 0,
        retry: triggerMap.get('RETRY') || 0,
      },
      byStatus: {
        completed: successful,
        failed,
        pending,
      },
    };

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error: any) {
    console.error('❌ Get user call analytics error:', error);
    res.status(500).json({
      error: 'Failed to fetch your call analytics',
      details: error.message,
    });
  }
};

/**
 * Get time-series call data for the authenticated user (for charts)
 */
export const getUserCallAnalyticsTimeseries = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userEmail = req.user?.email;

    if (!userEmail) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { days = 30, groupBy = 'day' } = req.query;
    const numDays = parseInt(days as string);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - numDays);

    // Fetch all calls for this user in the time range
    const calls = await prisma.callLog.findMany({
      where: {
        userEmail,
        initiatedAt: { gte: startDate },
      },
      select: {
        initiatedAt: true,
        status: true,
        callType: true,
        duration: true,
      },
      orderBy: { initiatedAt: 'asc' },
    });

    // Group by date
    const timeSeriesMap = new Map<string, any>();

    calls.forEach(call => {
      const date = new Date(call.initiatedAt);
      let key: string;

      if (groupBy === 'month') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else {
        // Default to day
        key = date.toISOString().split('T')[0];
      }

      if (!timeSeriesMap.has(key)) {
        timeSeriesMap.set(key, {
          date: key,
          total: 0,
          successful: 0,
          failed: 0,
          preCalls: 0,
          postCalls: 0,
          totalDuration: 0,
        });
      }

      const entry = timeSeriesMap.get(key);
      entry.total += 1;

      if (call.status === 'COMPLETED') entry.successful += 1;
      if (['FAILED', 'NO_ANSWER', 'BUSY'].includes(call.status)) entry.failed += 1;
      if (call.callType === 'PRE_CALL') entry.preCalls += 1;
      if (call.callType === 'POST_CALL') entry.postCalls += 1;
      if (call.duration) entry.totalDuration += call.duration;
    });

    const timeseries = Array.from(timeSeriesMap.values()).map(entry => ({
      ...entry,
      avgDuration: entry.total > 0 ? Math.round(entry.totalDuration / entry.total) : 0,
    }));

    res.json({
      success: true,
      data: timeseries,
    });
  } catch (error: any) {
    console.error('❌ Get user call analytics timeseries error:', error);
    res.status(500).json({
      error: 'Failed to fetch your call analytics timeseries',
      details: error.message,
    });
  }
};

