/**
 * Logging Service - API calls for admin logging dashboard
 */

import api from './api';

// ============================================
// TYPES
// ============================================

export interface CallLog {
    id: string;
    conversationId?: string;
    callSid?: string;
    callType: 'PRE_CALL' | 'POST_CALL';
    callDirection?: 'INBOUND' | 'OUTBOUND';
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
    triggerSource: 'MANUAL' | 'SCHEDULED' | 'RETRY' | 'WEBHOOK';
    triggerUserId?: string;
    status: 'INITIATED' | 'RINGING' | 'ANSWERED' | 'COMPLETED' | 'FAILED' | 'NO_ANSWER' | 'BUSY';
    initiatedAt: string;
    answeredAt?: string;
    completedAt?: string;
    duration?: number;
    callSuccessful?: boolean;
    failureReason?: string;
    transcriptSummary?: string;
    retryAttempt: number;
    maxRetries: number;
    parentCallId?: string;
    dynamicVariables?: any;
    webhookData?: any;
    createdAt: string;
    updatedAt: string;
}

export interface ActivityLog {
    id: string;
    activityType: string;
    status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
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
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
}

export interface ErrorLog {
    id: string;
    errorType: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
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
    isResolved: boolean;
    resolvedAt?: string;
    resolvedBy?: string;
    resolution?: string;
    createdAt: string;
}

export interface WebhookLog {
    id: string;
    webhookType: 'ELEVENLABS_CALL' | 'ELEVENLABS_TOOL' | 'BARRIERX';
    eventType: string;
    conversationId?: string;
    agentId?: string;
    status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
    processingTime?: number;
    errorMessage?: string;
    payload: any;
    response?: any;
    signature?: string;
    signatureValid?: boolean;
    createdAt: string;
}

export interface SchedulerLog {
    id: string;
    jobType: 'MEETING_AUTOMATION' | 'CLEANUP' | 'RETRY' | 'HEALTH_CHECK';
    status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
    totalUsers?: number;
    preCallsTriggered?: number;
    postCallsTriggered?: number;
    errorsCount?: number;
    startedAt: string;
    completedAt?: string;
    duration?: number;
    errorMessage?: string;
    metadata?: any;
}

export interface CrmActionLog {
    id: string;
    actionType: 'NOTE' | 'MEETING' | 'CONTACT' | 'DEAL';
    conversationId?: string;
    dealId?: string;
    tenantSlug: string;
    ownerId: string;
    entityId?: string;
    title?: string;
    body?: string;
    status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
    errorMessage?: string;
    metadata?: any;
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
}

export interface SmsLog {
    id: string;
    messageSid?: string;
    status: 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED';
    toPhone: string;
    fromPhone: string;
    messageBody?: string;
    userId: string;
    barrierxUserId?: string;
    hubspotOwnerId?: string;
    userName?: string;
    userEmail?: string;
    ownerName?: string;
    dealId?: string;
    dealName?: string;
    meetingId?: string;
    meetingTitle?: string;
    errorMessage?: string;
    twilioErrorCode?: string;
    triggerSource: 'MANUAL' | 'SCHEDULED' | 'RETRY' | 'WEBHOOK';
    createdAt: string;
}

export interface DashboardStats {
    totalCallsToday: number;
    successRate: number;
    criticalErrors: number;
    recentActivity: ActivityLog[];
}

export interface CallAnalytics {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
    avgDuration: number;
    byType: {
        preCalls: number;
        postCalls: number;
    };
    byTrigger: {
        manual: number;
        scheduled: number;
        retry: number;
    };
    byStatus: {
        completed: number;
        failed: number;
        pending: number;
    };
}

interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    total: number;
    limit: number;
    offset: number;
}

// ============================================
// API CALLS
// ============================================

export const getCallLogs = async (filters?: {
    userId?: string;
    dealId?: string;
    callType?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}): Promise<PaginatedResponse<CallLog>> => {
    const params = new URLSearchParams();
    if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                params.append(key, value.toString());
            }
        });
    }
    const response = await api.get(`/logs/calls?${params.toString()}`);
    return response.data;
};

export const getActivityLogs = async (filters?: {
    userId?: string;
    activityType?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}): Promise<PaginatedResponse<ActivityLog>> => {
    const params = new URLSearchParams();
    if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                params.append(key, value.toString());
            }
        });
    }
    const response = await api.get(`/logs/activity?${params.toString()}`);
    return response.data;
};

export const getErrorLogs = async (filters?: {
    errorType?: string;
    severity?: string;
    isResolved?: boolean;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}): Promise<PaginatedResponse<ErrorLog>> => {
    const params = new URLSearchParams();
    if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                params.append(key, value.toString());
            }
        });
    }
    const response = await api.get(`/logs/errors?${params.toString()}`);
    return response.data;
};

export const getWebhookLogs = async (filters?: {
    webhookType?: string;
    eventType?: string;
    conversationId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}): Promise<PaginatedResponse<WebhookLog>> => {
    const params = new URLSearchParams();
    if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                params.append(key, value.toString());
            }
        });
    }
    const response = await api.get(`/logs/webhooks?${params.toString()}`);
    return response.data;
};

export const getSchedulerLogs = async (filters?: {
    jobType?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}): Promise<PaginatedResponse<SchedulerLog>> => {
    const params = new URLSearchParams();
    if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                params.append(key, value.toString());
            }
        });
    }
    const response = await api.get(`/logs/scheduler?${params.toString()}`);
    return response.data;
};

export const getCrmActionLogs = async (filters?: {
    actionType?: string;
    conversationId?: string;
    dealId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}): Promise<PaginatedResponse<CrmActionLog>> => {
    const params = new URLSearchParams();
    if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                params.append(key, value.toString());
            }
        });
    }
    const response = await api.get(`/logs/crm-actions?${params.toString()}`);
    return response.data;
};

export const getSmsLogs = async (filters?: {
    userId?: string;
    userEmail?: string;
    status?: string;
    meetingId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}): Promise<PaginatedResponse<SmsLog>> => {
    const params = new URLSearchParams();
    if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                params.append(key, value.toString());
            }
        });
    }
    const response = await api.get(`/logs/sms?${params.toString()}`);
    return response.data;
};

export const getCallAnalytics = async (userId?: string, days: number = 7): Promise<{ success: boolean; data: CallAnalytics }> => {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    params.append('days', days.toString());
    const response = await api.get(`/logs/analytics/calls?${params.toString()}`);
    return response.data;
};

export const getDashboardStats = async (): Promise<{ success: boolean; data: DashboardStats }> => {
    const response = await api.get('/logs/analytics/dashboard');
    return response.data;
};

// ============================================
// USER-SPECIFIC API CALLS (Non-Admin)
// ============================================

/**
 * Get call logs for the current authenticated user only
 */
export const getUserCallLogs = async (filters?: {
    dealId?: string;
    callType?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}): Promise<PaginatedResponse<CallLog>> => {
    const params = new URLSearchParams();
    if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                params.append(key, value.toString());
            }
        });
    }
    const response = await api.get(`/logs/user/calls?${params.toString()}`);
    return response.data;
};

/**
 * Get activity logs for the current authenticated user only
 */
export const getUserActivityLogs = async (filters?: {
    activityType?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}): Promise<PaginatedResponse<ActivityLog>> => {
    const params = new URLSearchParams();
    if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                params.append(key, value.toString());
            }
        });
    }
    const response = await api.get(`/logs/user/activity?${params.toString()}`);
    return response.data;
};

/**
 * Get CRM action logs for the current authenticated user only
 */
export const getUserCrmActionLogs = async (filters?: {
    actionType?: string;
    conversationId?: string;
    dealId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}): Promise<PaginatedResponse<CrmActionLog>> => {
    const params = new URLSearchParams();
    if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                params.append(key, value.toString());
            }
        });
    }
    const response = await api.get(`/logs/user/crm-actions?${params.toString()}`);
    return response.data;
};

/**
 * Get call analytics for the current authenticated user only
 */
export const getUserCallAnalytics = async (days: number = 30): Promise<{ success: boolean; data: CallAnalytics }> => {
    const params = new URLSearchParams();
    params.append('days', days.toString());
    const response = await api.get(`/logs/user/analytics/calls?${params.toString()}`);
    return response.data;
};

/**
 * Get call analytics timeseries for the current authenticated user (for charts)
 */
export interface TimeseriesDataPoint {
    date: string;
    total: number;
    successful: number;
    failed: number;
    preCalls: number;
    postCalls: number;
    totalDuration: number;
    avgDuration: number;
}

export const getUserCallAnalyticsTimeseries = async (days: number = 30, groupBy: 'day' | 'month' = 'day'): Promise<{ success: boolean; data: TimeseriesDataPoint[] }> => {
    const params = new URLSearchParams();
    params.append('days', days.toString());
    params.append('groupBy', groupBy);
    const response = await api.get(`/logs/user/analytics/calls/timeseries?${params.toString()}`);
    return response.data;
};

