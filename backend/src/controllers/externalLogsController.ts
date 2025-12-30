/**
 * External Logs Controller
 * 
 * Phase 2: Individual endpoint implementations
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

