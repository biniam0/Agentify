/**
 * External Logs Controller
 * 
 * Phase 2: Individual endpoint implementations
 * Phase 3: Batch endpoint with time-based filtering
 * Handles log requests from external services via API key authentication
 */

import { Response } from 'express';
import { ServiceAuthRequest } from '../middlewares/serviceAuth';
import * as loggingService from '../services/loggingService';
import prisma from '../config/database';
import { CallType, CallStatus, ActivityType, Status, ErrorType, Severity, WebhookType, SchedulerJobType, CrmActionType } from '@prisma/client';

// Helper to verify user exists
const verifyUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, barrierxUserId: true }
  });
  return user;
};

// ============================================
// 1. ACTIVITY LOGS
// ============================================

export const getUserActivityLogs = async (req: ServiceAuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { activityType, status, startDate, endDate, limit = 50, offset = 0 } = req.query;

    const user = await verifyUser(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found', userId });
      return;
    }

    const result = await loggingService.getActivityLogs({
      userId: userId,
      activityType: activityType as ActivityType,
      status: status as Status,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    res.json({
      success: true,
      logType: 'activity',
      data: result.logs,
      user: { id: user.id, name: user.name, email: user.email },
      pagination: {
        total: result.total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: result.total > parseInt(offset as string) + result.logs.length,
      },
      requestedBy: req.service?.name,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ getUserActivityLogs error:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs', details: error.message });
  }
};

// ============================================
// 2. CALL LOGS
// ============================================

export const getUserCallLogs = async (req: ServiceAuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { dealId, callType, status, startDate, endDate, limit = 50, offset = 0 } = req.query;

    const user = await verifyUser(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found', userId });
      return;
    }

    const result = await loggingService.getCallLogs({
      userId: userId,
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
      logType: 'call',
      data: result.logs,
      user: { id: user.id, name: user.name, email: user.email },
      pagination: {
        total: result.total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: result.total > parseInt(offset as string) + result.logs.length,
      },
      requestedBy: req.service?.name,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ getUserCallLogs error:', error);
    res.status(500).json({ error: 'Failed to fetch call logs', details: error.message });
  }
};

// ============================================
// 3. CRM ACTION LOGS
// ============================================

export const getUserCrmActionLogs = async (req: ServiceAuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { actionType, conversationId, dealId, status, startDate, endDate, limit = 50, offset = 0 } = req.query;

    const user = await verifyUser(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found', userId });
      return;
    }

    // Get all CRM logs and filter by ownerId (barrierxUserId)
    const result = await loggingService.getCrmActionLogs({
      actionType: actionType as CrmActionType,
      conversationId: conversationId as string,
      dealId: dealId as string,
      status: status as Status,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: 1000,
      offset: 0,
    });

    // Filter by user's barrierxUserId
    const userLogs = result.logs.filter((log: any) => log.ownerId === user.barrierxUserId);
    
    // Paginate after filtering
    const paginatedLogs = userLogs.slice(
      parseInt(offset as string),
      parseInt(offset as string) + parseInt(limit as string)
    );

    res.json({
      success: true,
      logType: 'crm_action',
      data: paginatedLogs,
      user: { id: user.id, name: user.name, email: user.email },
      pagination: {
        total: userLogs.length,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: userLogs.length > parseInt(offset as string) + paginatedLogs.length,
      },
      requestedBy: req.service?.name,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ getUserCrmActionLogs error:', error);
    res.status(500).json({ error: 'Failed to fetch CRM action logs', details: error.message });
  }
};

// ============================================
// 4. WEBHOOK LOGS
// ============================================

export const getUserWebhookLogs = async (req: ServiceAuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { webhookType, eventType, startDate, endDate, limit = 50, offset = 0 } = req.query;

    const user = await verifyUser(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found', userId });
      return;
    }

    // Get user's conversationIds from their call logs
    const userCalls = await prisma.callLog.findMany({
      where: { userId: userId },
      select: { conversationId: true },
      distinct: ['conversationId'],
    });
    
    const conversationIds = userCalls
      .map(c => c.conversationId)
      .filter(Boolean) as string[];

    if (conversationIds.length === 0) {
      res.json({
        success: true,
        logType: 'webhook',
        data: [],
        user: { id: user.id, name: user.name, email: user.email },
        pagination: { total: 0, limit: parseInt(limit as string), offset: 0, hasMore: false },
        message: 'No webhooks found for this user',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Get webhooks for user's conversations
    const result = await loggingService.getWebhookLogs({
      webhookType: webhookType as WebhookType,
      eventType: eventType as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: 1000,
      offset: 0,
    });

    // Filter to only user's conversations
    const userWebhooks = result.logs.filter((log: any) => 
      conversationIds.includes(log.conversationId)
    );

    // Paginate after filtering
    const paginatedLogs = userWebhooks.slice(
      parseInt(offset as string),
      parseInt(offset as string) + parseInt(limit as string)
    );

    res.json({
      success: true,
      logType: 'webhook',
      data: paginatedLogs,
      user: { id: user.id, name: user.name, email: user.email },
      pagination: {
        total: userWebhooks.length,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: userWebhooks.length > parseInt(offset as string) + paginatedLogs.length,
      },
      requestedBy: req.service?.name,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ getUserWebhookLogs error:', error);
    res.status(500).json({ error: 'Failed to fetch webhook logs', details: error.message });
  }
};

// ============================================
// 5. SCHEDULER LOGS
// ============================================

export const getUserSchedulerLogs = async (req: ServiceAuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { jobType, status, startDate, endDate, limit = 50, offset = 0 } = req.query;

    const user = await verifyUser(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found', userId });
      return;
    }

    // Scheduler logs are system-wide
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
      logType: 'scheduler',
      data: result.logs,
      note: 'Scheduler logs are system-wide, not user-specific',
      pagination: {
        total: result.total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: result.total > parseInt(offset as string) + result.logs.length,
      },
      requestedBy: req.service?.name,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ getUserSchedulerLogs error:', error);
    res.status(500).json({ error: 'Failed to fetch scheduler logs', details: error.message });
  }
};

// ============================================
// 6. ERROR LOGS
// ============================================

export const getUserErrorLogs = async (req: ServiceAuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { errorType, severity, startDate, endDate, limit = 50, offset = 0 } = req.query;

    const user = await verifyUser(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found', userId });
      return;
    }

    // Get all error logs and filter by userId
    const result = await loggingService.getErrorLogs({
      errorType: errorType as ErrorType,
      severity: severity as Severity,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: 1000,
      offset: 0,
    });

    // Filter by userId
    const userErrors = result.logs.filter((log: any) => log.userId === userId);
    
    // Paginate
    const paginatedErrors = userErrors.slice(
      parseInt(offset as string),
      parseInt(offset as string) + parseInt(limit as string)
    );

    res.json({
      success: true,
      logType: 'error',
      data: paginatedErrors,
      user: { id: user.id, name: user.name, email: user.email },
      pagination: {
        total: userErrors.length,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: userErrors.length > parseInt(offset as string) + paginatedErrors.length,
      },
      requestedBy: req.service?.name,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ getUserErrorLogs error:', error);
    res.status(500).json({ error: 'Failed to fetch error logs', details: error.message });
  }
};

// ============================================
// PHASE 3: BATCH ENDPOINT - ALL LOGS
// ============================================

/**
 * Helper: Calculate date range based on days parameter
 */
const getDateRange = (days: number) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  return { startDate, endDate };
};

/**
 * Helper: Fetch activity logs for a user within date range
 */
const fetchUserActivityLogs = async (userId: string, startDate: Date, limit: number = 100) => {
  return await loggingService.getActivityLogs({
    userId,
    startDate,
    limit,
  });
};

/**
 * Helper: Fetch call logs for a user within date range
 */
const fetchUserCallLogs = async (userId: string, startDate: Date, limit: number = 100) => {
  return await loggingService.getCallLogs({
    userId,
    startDate,
    limit,
  });
};

/**
 * Helper: Fetch CRM action logs for a user within date range
 */
const fetchUserCrmLogs = async (barrierxUserId: string, startDate: Date, limit: number = 100) => {
  const result = await loggingService.getCrmActionLogs({
    startDate,
    limit,
  });
  // Filter by barrierxUserId
  return result.logs.filter((log: any) => log.ownerId === barrierxUserId);
};

/**
 * Helper: Fetch webhook logs for a user within date range
 */
const fetchUserWebhookLogs = async (userId: string, startDate: Date, limit: number = 100) => {
  // Get user's conversation IDs
  const userCalls = await prisma.callLog.findMany({
    where: { userId },
    select: { conversationId: true },
    distinct: ['conversationId'],
  });
  
  const conversationIds = userCalls
    .map(c => c.conversationId)
    .filter(Boolean) as string[];

  if (conversationIds.length === 0) {
    return [];
  }

  const result = await loggingService.getWebhookLogs({
    startDate,
    limit,
  });

  // Filter to user's conversations
  return result.logs.filter((log: any) => 
    conversationIds.includes(log.conversationId)
  );
};

/**
 * Helper: Fetch error logs for a user within date range
 */
const fetchUserErrorLogs = async (userId: string, startDate: Date, limit: number = 100) => {
  const result = await loggingService.getErrorLogs({
    startDate,
    limit,
  });
  // Filter by userId
  return result.logs.filter((log: any) => log.userId === userId);
};

/**
 * Helper: Fetch scheduler logs within date range (system-wide)
 */
const fetchSchedulerLogs = async (startDate: Date, limit: number = 50) => {
  return await loggingService.getSchedulerLogs({
    startDate,
    limit,
  });
};

/**
 * Main Batch Endpoint: Get all logs for a single user
 * 
 * GET /users/:userId/all?days=7
 * 
 * Returns all 6 log types in a single response
 */
export const getAllUserLogs = async (req: ServiceAuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { days = 7 } = req.query;

    // Validate days parameter
    const daysNum = parseInt(days as string);
    if (isNaN(daysNum) || daysNum < 1 || daysNum > 365) {
      res.status(400).json({
        error: 'Invalid days parameter',
        message: 'days must be between 1 and 365'
      });
      return;
    }

    // Verify user exists
    const user = await verifyUser(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found', userId });
      return;
    }

    // Calculate date range
    const { startDate, endDate } = getDateRange(daysNum);

    // Fetch all log types in parallel for efficiency
    const [
      activityResult,
      callResult,
      crmLogs,
      webhookLogs,
      errorLogs,
      schedulerResult,
    ] = await Promise.all([
      fetchUserActivityLogs(userId, startDate),
      fetchUserCallLogs(userId, startDate),
      fetchUserCrmLogs(user.barrierxUserId, startDate),
      fetchUserWebhookLogs(userId, startDate),
      fetchUserErrorLogs(userId, startDate),
      fetchSchedulerLogs(startDate),
    ]);

    // Build response
    res.json({
      success: true,
      logType: 'batch_all',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      data: {
        activity: activityResult.logs,
        calls: callResult.logs,
        crmActions: crmLogs,
        webhooks: webhookLogs,
        errors: errorLogs,
        scheduler: schedulerResult.logs,
      },
      summary: {
        totalActivity: activityResult.total,
        totalCalls: callResult.total,
        totalCrmActions: crmLogs.length,
        totalWebhooks: webhookLogs.length,
        totalErrors: errorLogs.length,
        totalScheduler: schedulerResult.total,
        grandTotal: activityResult.total + callResult.total + crmLogs.length + 
                    webhookLogs.length + errorLogs.length + schedulerResult.total,
      },
      filters: {
        days: daysNum,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      requestedBy: req.service?.name,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ getAllUserLogs error:', error);
    res.status(500).json({
      error: 'Failed to fetch all user logs',
      details: error.message,
    });
  }
};

