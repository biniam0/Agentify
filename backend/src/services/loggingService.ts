/**
 * Logging Service
 * 
 * Centralized logging for all AgentX backend activities.
 * Provides helper functions to log calls, activities, webhooks, errors, etc.
 */

import prisma from '../config/database';
import { 
  ActivityType, 
  Status, 
  CallType, 
  CallStatus, 
  TriggerSource, 
  CrmActionType, 
  WebhookType, 
  SchedulerJobType,
  ErrorType, 
  Severity 
} from '@prisma/client';

// ============================================
// ACTIVITY LOGGING
// ============================================

export const logActivity = async (data: {
  activityType: ActivityType;
  status?: Status;
  userId?: string;
  userName?: string;
  userEmail?: string;
  dealId?: string;
  dealName?: string;
  meetingId?: string;
  meetingTitle?: string;
  conversationId?: string;
  callSid?: string;
  metadata?: any;
  errorMessage?: string;
  errorStack?: string;
  duration?: number;
}) => {
  try {
    return await prisma.activityLog.create({
      data: {
        ...data,
        status: data.status || 'PENDING',
        metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : undefined,
      },
    });
  } catch (error) {
    console.error('❌ Failed to log activity:', error);
    return null;
  }
};

export const updateActivityLog = async (id: string, data: {
  status?: Status;
  errorMessage?: string;
  errorStack?: string;
  duration?: number;
  completedAt?: Date;
}) => {
  try {
    return await prisma.activityLog.update({
      where: { id },
      data,
    });
  } catch (error) {
    console.error('❌ Failed to update activity log:', error);
    return null;
  }
};

// ============================================
// CALL LOGGING
// ============================================

export const logCallInitiation = async (data: {
  callType: CallType;
  userId: string;
  userName: string;
  userEmail: string;
  dealId: string;
  dealName: string;
  meetingId: string;
  meetingTitle: string;
  phoneNumber: string;
  ownerName?: string;
  agentId?: string;
  triggerSource: TriggerSource;
  triggerUserId?: string;
  dynamicVariables?: any;
  conversationId?: string;
  callSid?: string;
  retryAttempt?: number;
  parentCallId?: string;
}) => {
  try {
    return await prisma.callLog.create({
      data: {
        ...data,
        status: 'INITIATED',
        retryAttempt: data.retryAttempt || 1,
        maxRetries: 3,
        dynamicVariables: data.dynamicVariables ? JSON.parse(JSON.stringify(data.dynamicVariables)) : undefined,
      },
    });
  } catch (error) {
    console.error('❌ Failed to log call initiation:', error);
    return null;
  }
};

export const updateCallLog = async (
  conversationId: string,
  data: {
    status?: CallStatus;
    answeredAt?: Date;
    completedAt?: Date;
    duration?: number;
    callSuccessful?: boolean;
    failureReason?: string;
    transcriptSummary?: string;
    webhookData?: any;
  }
) => {
  try {
    return await prisma.callLog.updateMany({
      where: { conversationId },
      data: {
        ...data,
        webhookData: data.webhookData ? JSON.parse(JSON.stringify(data.webhookData)) : undefined,
      },
    });
  } catch (error) {
    console.error('❌ Failed to update call log:', error);
    return null;
  }
};

export const updateCallLogByCallSid = async (
  callSid: string,
  data: {
    conversationId?: string;
    status?: CallStatus;
    answeredAt?: Date;
    completedAt?: Date;
    duration?: number;
    callSuccessful?: boolean;
    failureReason?: string;
    transcriptSummary?: string;
    webhookData?: any;
  }
) => {
  try {
    return await prisma.callLog.updateMany({
      where: { callSid },
      data: {
        ...data,
        webhookData: data.webhookData ? JSON.parse(JSON.stringify(data.webhookData)) : undefined,
      },
    });
  } catch (error) {
    console.error('❌ Failed to update call log by callSid:', error);
    return null;
  }
};

// ============================================
// CRM ACTION LOGGING
// ============================================

export const logCrmAction = async (data: {
  actionType: CrmActionType;
  conversationId?: string;
  dealId?: string;
  tenantSlug: string;
  ownerId: string;
  entityId?: string;
  title?: string;
  body?: string;
  status?: Status;
  errorMessage?: string;
  metadata?: any;
}) => {
  try {
    return await prisma.crmActionLog.create({
      data: {
        ...data,
        status: data.status || 'PENDING',
        metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : undefined,
      },
    });
  } catch (error) {
    console.error('❌ Failed to log CRM action:', error);
    return null;
  }
};

export const updateCrmActionLog = async (id: string, data: {
  status?: Status;
  entityId?: string;
  errorMessage?: string;
  completedAt?: Date;
}) => {
  try {
    return await prisma.crmActionLog.update({
      where: { id },
      data,
    });
  } catch (error) {
    console.error('❌ Failed to update CRM action log:', error);
    return null;
  }
};

// ============================================
// WEBHOOK LOGGING
// ============================================

export const logWebhook = async (data: {
  webhookType: WebhookType;
  eventType: string;
  conversationId?: string;
  agentId?: string;
  status?: Status;
  processingTime?: number;
  errorMessage?: string;
  payload: any;
  response?: any;
  signature?: string;
  signatureValid?: boolean;
}) => {
  try {
    return await prisma.webhookLog.create({
      data: {
        ...data,
        status: data.status || 'SUCCESS',
        payload: JSON.parse(JSON.stringify(data.payload)),
        response: data.response ? JSON.parse(JSON.stringify(data.response)) : undefined,
      },
    });
  } catch (error) {
    console.error('❌ Failed to log webhook:', error);
    return null;
  }
};

// ============================================
// SCHEDULER LOGGING
// ============================================

export const logSchedulerStart = async (jobType: SchedulerJobType) => {
  try {
    return await prisma.schedulerLog.create({
      data: {
        jobType,
        status: 'RUNNING',
      },
    });
  } catch (error) {
    console.error('❌ Failed to log scheduler start:', error);
    return null;
  }
};

export const logSchedulerComplete = async (
  id: string,
  data: {
    status: Status;
    totalUsers?: number;
    preCallsTriggered?: number;
    postCallsTriggered?: number;
    errorsCount?: number;
    errorMessage?: string;
    metadata?: any;
  }
) => {
  try {
    const startLog = await prisma.schedulerLog.findUnique({ where: { id } });
    const duration = startLog ? Date.now() - startLog.startedAt.getTime() : undefined;

    return await prisma.schedulerLog.update({
      where: { id },
      data: {
        ...data,
        completedAt: new Date(),
        duration,
        metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : undefined,
      },
    });
  } catch (error) {
    console.error('❌ Failed to log scheduler completion:', error);
    return null;
  }
};

// ============================================
// ERROR LOGGING
// ============================================

export const logError = async (data: {
  errorType: ErrorType;
  severity: Severity;
  source: string;
  message: string;
  stack?: string;
  code?: string;
  userId?: string;
  dealId?: string;
  endpoint?: string;
  method?: string;
  requestData?: any;
  responseData?: any;
}) => {
  try {
    return await prisma.errorLog.create({
      data: {
        ...data,
        requestData: data.requestData ? JSON.parse(JSON.stringify(data.requestData)) : undefined,
        responseData: data.responseData ? JSON.parse(JSON.stringify(data.responseData)) : undefined,
      },
    });
  } catch (error) {
    console.error('❌ Failed to log error:', error);
    return null;
  }
};

// ============================================
// QUERY HELPERS
// ============================================

export const getCallLogs = async (filters: {
  userId?: string;
  dealId?: string;
  callType?: CallType;
  status?: CallStatus;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) => {
  try {
    const where: any = {};
    
    if (filters.userId) where.userId = filters.userId;
    if (filters.dealId) where.dealId = filters.dealId;
    if (filters.callType) where.callType = filters.callType;
    if (filters.status) where.status = filters.status;
    if (filters.startDate || filters.endDate) {
      where.initiatedAt = {};
      if (filters.startDate) where.initiatedAt.gte = filters.startDate;
      if (filters.endDate) where.initiatedAt.lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.callLog.findMany({
        where,
        orderBy: { initiatedAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      prisma.callLog.count({ where }),
    ]);

    return { logs, total };
  } catch (error) {
    console.error('❌ Failed to get call logs:', error);
    return { logs: [], total: 0 };
  }
};

export const getActivityLogs = async (filters: {
  userId?: string;
  activityType?: ActivityType;
  status?: Status;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) => {
  try {
    const where: any = {};
    
    if (filters.userId) where.userId = filters.userId;
    if (filters.activityType) where.activityType = filters.activityType;
    if (filters.status) where.status = filters.status;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      prisma.activityLog.count({ where }),
    ]);

    return { logs, total };
  } catch (error) {
    console.error('❌ Failed to get activity logs:', error);
    return { logs: [], total: 0 };
  }
};

export const getErrorLogs = async (filters: {
  errorType?: ErrorType;
  severity?: Severity;
  isResolved?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) => {
  try {
    const where: any = {};
    
    if (filters.errorType) where.errorType = filters.errorType;
    if (filters.severity) where.severity = filters.severity;
    if (filters.isResolved !== undefined) where.isResolved = filters.isResolved;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.errorLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      prisma.errorLog.count({ where }),
    ]);

    return { logs, total };
  } catch (error) {
    console.error('❌ Failed to get error logs:', error);
    return { logs: [], total: 0 };
  }
};

export const getWebhookLogs = async (filters: {
  webhookType?: WebhookType;
  eventType?: string;
  conversationId?: string;
  status?: Status;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) => {
  try {
    const where: any = {};
    
    if (filters.webhookType) where.webhookType = filters.webhookType;
    if (filters.eventType) where.eventType = filters.eventType;
    if (filters.conversationId) where.conversationId = filters.conversationId;
    if (filters.status) where.status = filters.status;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.webhookLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      prisma.webhookLog.count({ where }),
    ]);

    return { logs, total };
  } catch (error) {
    console.error('❌ Failed to get webhook logs:', error);
    return { logs: [], total: 0 };
  }
};

export const getSchedulerLogs = async (filters: {
  jobType?: SchedulerJobType;
  status?: Status;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) => {
  try {
    const where: any = {};
    
    if (filters.jobType) where.jobType = filters.jobType;
    if (filters.status) where.status = filters.status;
    if (filters.startDate || filters.endDate) {
      where.startedAt = {};
      if (filters.startDate) where.startedAt.gte = filters.startDate;
      if (filters.endDate) where.startedAt.lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.schedulerLog.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      prisma.schedulerLog.count({ where }),
    ]);

    return { logs, total };
  } catch (error) {
    console.error('❌ Failed to get scheduler logs:', error);
    return { logs: [], total: 0 };
  }
};

export const getCrmActionLogs = async (filters: {
  actionType?: CrmActionType;
  conversationId?: string;
  dealId?: string;
  status?: Status;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) => {
  try {
    const where: any = {};
    
    if (filters.actionType) where.actionType = filters.actionType;
    if (filters.conversationId) where.conversationId = filters.conversationId;
    if (filters.dealId) where.dealId = filters.dealId;
    if (filters.status) where.status = filters.status;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.crmActionLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      prisma.crmActionLog.count({ where }),
    ]);

    return { logs, total };
  } catch (error) {
    console.error('❌ Failed to get CRM action logs:', error);
    return { logs: [], total: 0 };
  }
};

// ============================================
// ANALYTICS HELPERS
// ============================================

export const getCallAnalytics = async (userId?: string, days: number = 7) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const where: any = {
      initiatedAt: { gte: startDate },
    };
    if (userId) where.userId = userId;

    const calls = await prisma.callLog.findMany({ where });

    const successful = calls.filter(c => c.status === 'COMPLETED').length;
    const failed = calls.filter(c => ['FAILED', 'NO_ANSWER', 'BUSY'].includes(c.status)).length;
    const totalDuration = calls.reduce((sum, c) => sum + (c.duration || 0), 0);

    return {
      total: calls.length,
      successful,
      failed,
      successRate: calls.length > 0 ? (successful / calls.length) * 100 : 0,
      avgDuration: calls.length > 0 ? totalDuration / calls.length : 0,
      byType: {
        preCalls: calls.filter(c => c.callType === 'PRE_CALL').length,
        postCalls: calls.filter(c => c.callType === 'POST_CALL').length,
      },
      byTrigger: {
        manual: calls.filter(c => c.triggerSource === 'MANUAL').length,
        scheduled: calls.filter(c => c.triggerSource === 'SCHEDULED').length,
        retry: calls.filter(c => c.triggerSource === 'RETRY').length,
      },
      byStatus: {
        completed: successful,
        failed,
        pending: calls.filter(c => ['INITIATED', 'RINGING', 'ANSWERED'].includes(c.status)).length,
      },
    };
  } catch (error) {
    console.error('❌ Failed to get call analytics:', error);
    return null;
  }
};

export const getDashboardStats = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalCallsToday,
      callAnalytics,
      criticalErrors,
      recentActivity,
    ] = await Promise.all([
      prisma.callLog.count({
        where: { initiatedAt: { gte: today } },
      }),
      getCallAnalytics(undefined, 1),
      prisma.errorLog.count({
        where: {
          severity: 'CRITICAL',
          isResolved: false,
        },
      }),
      prisma.activityLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      totalCallsToday,
      successRate: callAnalytics?.successRate || 0,
      criticalErrors,
      recentActivity,
    };
  } catch (error) {
    console.error('❌ Failed to get dashboard stats:', error);
    return null;
  }
};

