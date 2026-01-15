/**
 * Logging Controller
 * 
 * Handles all logging dashboard API endpoints.
 * Admin-only access required.
 */

import { Request, Response } from 'express';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { AuthRequest } from '../middlewares/auth';
import * as loggingService from '../services/loggingService';
import { CallType, CallStatus, ActivityType, Status, ErrorType, Severity, WebhookType, SchedulerJobType, CrmActionType } from '@prisma/client';
import prisma from '../config/database';

// ============================================
// ZERO SCORE CALLS JOB STATE
// ============================================
interface JobState {
  isRunning: boolean;
  startedAt: Date | null;
  process: ChildProcess | null;
  output: string[];
  eligibleDeals: number;
  completedCalls: number;
  failedCalls: number;
  lastError: string | null;
}

const zeroScoreJobState: JobState = {
  isRunning: false,
  startedAt: null,
  process: null,
  output: [],
  eligibleDeals: 0,
  completedCalls: 0,
  failedCalls: 0,
  lastError: null,
};

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

    // Use service function to group calls by time period
    const timeseries = loggingService.groupCallsByTimePeriod(calls, groupBy as 'day' | 'month');

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

// ============================================
// BARRIERX INFO GATHERING
// ============================================

/**
 * Get all BarrierX info gathering records
 */
export const getBarrierXInfoGathering = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      status,
      tenantSlug,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
    } = req.query;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (tenantSlug) {
      where.tenantSlug = tenantSlug;
    }

    applyDateRange(where, 'createdAt', startDate as string, endDate as string);

    const [records, total] = await Promise.all([
      prisma.barrierXInfoGathering.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.barrierXInfoGathering.count({ where }),
    ]);

    res.json({
      success: true,
      data: records,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error: any) {
    console.error('❌ Get BarrierX info gathering error:', error);
    res.status(500).json({
      error: 'Failed to fetch BarrierX info gathering records',
      details: error.message,
    });
  }
};

/**
 * Get single BarrierX info gathering record by ID
 */
export const getBarrierXInfoGatheringById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const record = await prisma.barrierXInfoGathering.findUnique({
      where: { id },
    });

    if (!record) {
      res.status(404).json({ error: 'Record not found' });
      return;
    }

    res.json({
      success: true,
      data: record,
    });
  } catch (error: any) {
    console.error('❌ Get BarrierX info gathering by ID error:', error);
    res.status(500).json({
      error: 'Failed to fetch record',
      details: error.message,
    });
  }
};

/**
 * Export BarrierX info gathering records as CSV
 */
export const exportBarrierXInfoGathering = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      status,
      tenantSlug,
      startDate,
      endDate,
    } = req.query;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (tenantSlug) {
      where.tenantSlug = tenantSlug;
    }

    applyDateRange(where, 'createdAt', startDate as string, endDate as string);

    const records = await prisma.barrierXInfoGathering.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Build CSV
    const headers = [
      'ID',
      'Deal ID',
      'Deal Name',
      'Company',
      'Tenant',
      'Owner Name',
      'Owner Email',
      'Owner Phone',
      'Status',
      'Quantified Pain Points',
      'Champion Info',
      'Economic Buyer Info',
      'Call Duration (s)',
      'Transcript Summary',
      'Initiated At',
      'Completed At',
    ];

    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = records.map(r => [
      escapeCSV(r.id),
      escapeCSV(r.dealId),
      escapeCSV(r.dealName),
      escapeCSV(r.companyName),
      escapeCSV(r.tenantName || r.tenantSlug),
      escapeCSV(r.ownerName),
      escapeCSV(r.ownerEmail),
      escapeCSV(r.ownerPhone),
      escapeCSV(r.status),
      escapeCSV(r.quantifiedPainPoints),
      escapeCSV(r.championInfo),
      escapeCSV(r.economicBuyerInfo),
      escapeCSV(r.callDuration),
      escapeCSV(r.transcriptSummary),
      escapeCSV(r.initiatedAt?.toISOString()),
      escapeCSV(r.completedAt?.toISOString()),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=barrierx-info-gathering-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error: any) {
    console.error('❌ Export BarrierX info gathering error:', error);
    res.status(500).json({
      error: 'Failed to export records',
      details: error.message,
    });
  }
};

// ============================================
// ZERO SCORE CALLS TRIGGER
// ============================================

/**
 * Trigger zero-score info gathering calls
 * Spawns the script as a background process
 */
export const triggerZeroScoreCalls = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Check if already running
    if (zeroScoreJobState.isRunning) {
      res.status(409).json({
        success: false,
        error: 'Job already running',
        message: 'Zero score calls job is already in progress',
        startedAt: zeroScoreJobState.startedAt,
        eligibleDeals: zeroScoreJobState.eligibleDeals,
        completedCalls: zeroScoreJobState.completedCalls,
      });
      return;
    }

    console.log('\n🎯 ════════════════════════════════════════════════════');
    console.log('🎯 TRIGGERING ZERO SCORE CALLS FROM ADMIN UI');
    console.log('🎯 ════════════════════════════════════════════════════');
    console.log(`⏰ Time: ${new Date().toISOString()}`);
    console.log(`👤 Triggered by: ${req.user?.email || 'Unknown'}`);

    // Reset state
    zeroScoreJobState.isRunning = true;
    zeroScoreJobState.startedAt = new Date();
    zeroScoreJobState.output = [];
    zeroScoreJobState.eligibleDeals = 0;
    zeroScoreJobState.completedCalls = 0;
    zeroScoreJobState.failedCalls = 0;
    zeroScoreJobState.lastError = null;

    // Spawn the script
    const scriptPath = path.join(__dirname, '..', 'scripts', 'triggerMissingBarrierXCalls.ts');
    const childProcess = spawn('npx', ['ts-node', scriptPath], {
      cwd: path.join(__dirname, '..', '..'),
      env: process.env,
      shell: true,
    });

    zeroScoreJobState.process = childProcess;

    // Capture output
    childProcess.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      zeroScoreJobState.output.push(output);

      // Parse output for progress
      const eligibleMatch = output.match(/Callable deals: (\d+)/);
      if (eligibleMatch) {
        zeroScoreJobState.eligibleDeals = parseInt(eligibleMatch[1]);
      }

      const completedMatch = output.match(/Overall progress: (\d+)\/(\d+)/);
      if (completedMatch) {
        zeroScoreJobState.completedCalls = parseInt(completedMatch[1]);
      }

      // Log to console
      process.stdout.write(`[ZeroScore] ${output}`);
    });

    childProcess.stderr?.on('data', (data: Buffer) => {
      const error = data.toString();
      zeroScoreJobState.output.push(`[ERROR] ${error}`);
      zeroScoreJobState.lastError = error;
      process.stderr.write(`[ZeroScore ERROR] ${error}`);
    });

    childProcess.on('close', (code: number | null) => {
      console.log(`\n🎯 Zero score calls script exited with code: ${code}`);
      zeroScoreJobState.isRunning = false;
      zeroScoreJobState.process = null;

      if (code !== 0) {
        zeroScoreJobState.lastError = `Script exited with code ${code}`;
      }
    });

    childProcess.on('error', (err: Error) => {
      console.error('❌ Failed to start zero score calls script:', err);
      zeroScoreJobState.isRunning = false;
      zeroScoreJobState.process = null;
      zeroScoreJobState.lastError = err.message;
    });

    res.json({
      success: true,
      message: 'Zero score calls job started',
      startedAt: zeroScoreJobState.startedAt,
    });
  } catch (error: any) {
    console.error('❌ Trigger zero score calls error:', error);
    zeroScoreJobState.isRunning = false;
    zeroScoreJobState.lastError = error.message;
    res.status(500).json({
      error: 'Failed to trigger zero score calls',
      details: error.message,
    });
  }
};

/**
 * Get status of zero-score calls job
 */
export const getZeroScoreCallsStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Get counts from database for accurate stats
    const [pendingCount, completedCount, failedCount, inProgressCount] = await Promise.all([
      prisma.barrierXInfoGathering.count({ where: { status: 'PENDING' } }),
      prisma.barrierXInfoGathering.count({ where: { status: 'COMPLETED' } }),
      prisma.barrierXInfoGathering.count({ where: { status: 'FAILED' } }),
      prisma.barrierXInfoGathering.count({ where: { status: 'IN_PROGRESS' } }),
    ]);

    res.json({
      success: true,
      isRunning: zeroScoreJobState.isRunning,
      startedAt: zeroScoreJobState.startedAt,
      eligibleDeals: zeroScoreJobState.eligibleDeals,
      completedCalls: zeroScoreJobState.completedCalls,
      failedCalls: zeroScoreJobState.failedCalls,
      lastError: zeroScoreJobState.lastError,
      recentOutput: zeroScoreJobState.output.slice(-20), // Last 20 lines
      dbStats: {
        pending: pendingCount,
        inProgress: inProgressCount,
        completed: completedCount,
        failed: failedCount,
        total: pendingCount + completedCount + failedCount + inProgressCount,
      },
    });
  } catch (error: any) {
    console.error('❌ Get zero score calls status error:', error);
    res.status(500).json({
      error: 'Failed to get job status',
      details: error.message,
    });
  }
};

/**
 * Stop the running zero-score calls job
 */
export const stopZeroScoreCalls = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!zeroScoreJobState.isRunning || !zeroScoreJobState.process) {
      res.status(400).json({
        success: false,
        error: 'No job running',
        message: 'There is no zero score calls job currently running',
      });
      return;
    }

    console.log('\n⛔ Stopping zero score calls job...');
    console.log(`👤 Stopped by: ${req.user?.email || 'Unknown'}`);

    const pid = zeroScoreJobState.process.pid;

    // Kill the process - use platform-specific method
    if (process.platform === 'win32' && pid) {
      // Windows: use taskkill to kill process tree
      console.log(`   🪟 Windows: Using taskkill to terminate PID ${pid}`);
      spawn('taskkill', ['/pid', String(pid), '/T', '/F'], { shell: true });
    } else if (pid) {
      // Unix/Mac: kill process group
      console.log(`   🐧 Unix: Sending SIGTERM to PID ${pid}`);
      try {
        process.kill(-pid, 'SIGTERM'); // Kill process group
      } catch {
        zeroScoreJobState.process.kill('SIGTERM');
      }
    } else {
      zeroScoreJobState.process.kill('SIGTERM');
    }

    zeroScoreJobState.isRunning = false;
    zeroScoreJobState.process = null;

    res.json({
      success: true,
      message: 'Zero score calls job stopped',
    });
  } catch (error: any) {
    console.error('❌ Stop zero score calls error:', error);
    res.status(500).json({
      error: 'Failed to stop job',
      details: error.message,
    });
  }
};