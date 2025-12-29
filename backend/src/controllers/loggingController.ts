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

import prisma from '../config/database';

/**
 * Get call logs for the authenticated user only
 */
export const getUserCallLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
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

    // Filter by database userId (CallLog.userId stores database User.id, not barrierxUserId)
    const result = await loggingService.getCallLogs({
      userId: userId, // Use database userId directly
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

    if (!userId) {
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

    // Filter by database userId (ActivityLog.userId stores database User.id, not barrierxUserId)
    const result = await loggingService.getActivityLogs({
      userId: userId, // Use database userId directly
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

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Get user's barrierxUserId from database
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { barrierxUserId: true },
    });

    if (!dbUser || !dbUser.barrierxUserId) {
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

    // For CRM actions, use ownerId field which maps to barrierxUserId
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

    // Filter by ownerId on the backend
    const userLogs = result.logs.filter((log: any) => log.ownerId === dbUser.barrierxUserId);
    
    res.json({
      success: true,
      data: userLogs,
      total: userLogs.length,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error: any) {
    console.error('❌ Get user CRM action logs error:', error);
    res.status(500).json({
      error: 'Failed to fetch your CRM action logs',
      details: error.message,
    });
  }
};

