/**
 * BarrierX Info Gathering Admin Page
 * 
 * Displays all info gathering calls with:
 * - Table view with expandable rows
 * - Filters by status, date range
 * - CSV export functionality
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Download,
  Filter,
  Loader2,
  Phone,
  RefreshCw,
  Search,
  Target,
  User,
  Building,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Square,
  Zap,
  ThumbsDown,
  Swords,
  Lightbulb,
  Activity,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { API_BASE_URL } from '../../config/api';
import { getAuthHeader } from '../../services/authService';

interface BarrierXInfoRecord {
  id: string;
  gatheringType: 'ZERO_SCORE' | 'LOST_DEAL' | 'INACTIVITY';
  dealId: string;
  dealName: string;
  tenantSlug: string;
  tenantName: string | null;
  companyName: string | null;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  hubspotOwnerId: string | null;
  conversationId: string | null;
  callSid: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  // Zero-score fields
  quantifiedPainPoints: string | null;
  championInfo: string | null;
  economicBuyerInfo: string | null;
  // Lost deal fields
  lossReason: string | null;
  competitorName: string | null;
  lessonsLearned: string | null;
  // Inactivity fields
  inactivityStatus: string | null;
  inactivityBlockers: string | null;
  inactivityNextSteps: string | null;
  // Call metadata
  callDuration: number | null;
  transcriptSummary: string | null;
  initiatedAt: string;
  answeredAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface JobStatus {
  isRunning: boolean;
  type?: 'ZERO_SCORE' | 'LOST_DEAL' | 'INACTIVITY' | null;
  startedAt: string | null;
  eligibleDeals: number;
  completedCalls: number;
  failedCalls: number;
  lastError: string | null;
  recentOutput: string[];
  dbStats: {
    pending: number;
    inProgress: number;
    completed: number;
    failed: number;
    total: number;
  };
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: <Clock className="w-3 h-3" />,
  },
  IN_PROGRESS: {
    label: 'In Progress',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    icon: <Phone className="w-3 h-3" />,
  },
  COMPLETED: {
    label: 'Completed',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    icon: <CheckCircle className="w-3 h-3" />,
  },
  FAILED: {
    label: 'Failed',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    icon: <XCircle className="w-3 h-3" />,
  },
  SKIPPED: {
    label: 'Skipped',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    icon: <AlertCircle className="w-3 h-3" />,
  },
};

const BarrierXInfo: React.FC = () => {
  const [records, setRecords] = useState<BarrierXInfoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Job state
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isTriggeringZeroScore, setIsTriggeringZeroScore] = useState(false);
  const [isTriggeringLostDeal, setIsTriggeringLostDeal] = useState(false);
  const [isTriggeringInactivity, setIsTriggeringInactivity] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  const limit = 20;

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: ((page - 1) * limit).toString(),
      });

      if (statusFilter && statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      const response = await fetch(`${API_BASE_URL}/logs/barrierx-info?${params}`, {
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch records');

      const data = await response.json();
      setRecords(data.data || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to fetch BarrierX info records:', error);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  // Fetch job status
  const fetchJobStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/logs/barrierx-info/zero-score-status`, {
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch job status');

      const data = await response.json();
      setJobStatus(data);
    } catch (error) {
      console.error('Failed to fetch job status:', error);
    }
  }, []);

  // Trigger zero-score calls
  const handleTriggerZeroScoreCalls = async () => {
    if (isTriggeringZeroScore || jobStatus?.isRunning) return;

    setIsTriggeringZeroScore(true);

    // Optimistic update - show running state immediately
    setJobStatus(prev => ({
      ...prev,
      isRunning: true,
      type: 'ZERO_SCORE',
      startedAt: new Date().toISOString(),
      eligibleDeals: 0,
      completedCalls: 0,
      failedCalls: 0,
      lastError: null,
      recentOutput: [],
      dbStats: prev?.dbStats || { pending: 0, inProgress: 0, completed: 0, failed: 0, total: 0 },
    }));

    try {
      const response = await fetch(`${API_BASE_URL}/logs/barrierx-info/trigger-zero-score`, {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        setJobStatus(prev => prev ? { ...prev, isRunning: false, lastError: error.message } : null);
        throw new Error(error.message || 'Failed to trigger calls');
      }

      setTimeout(() => fetchJobStatus(), 1000);
    } catch (error) {
      console.error('Failed to trigger calls:', error);
      setJobStatus(prev => prev ? { ...prev, isRunning: false } : null);
    } finally {
      setIsTriggeringZeroScore(false);
    }
  };

  // Trigger lost deal calls
  const handleTriggerLostDealCalls = async () => {
    if (isTriggeringLostDeal || jobStatus?.isRunning) return;

    setIsTriggeringLostDeal(true);

    // Optimistic update
    setJobStatus(prev => ({
      ...prev,
      isRunning: true,
      type: 'LOST_DEAL',
      startedAt: new Date().toISOString(),
      eligibleDeals: 0,
      completedCalls: 0,
      failedCalls: 0,
      lastError: null,
      recentOutput: [],
      dbStats: prev?.dbStats || { pending: 0, inProgress: 0, completed: 0, failed: 0, total: 0 },
    }));

    try {
      const response = await fetch(`${API_BASE_URL}/logs/barrierx-info/trigger-lost-deal`, {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        setJobStatus(prev => prev ? { ...prev, isRunning: false, lastError: error.message } : null);
        throw new Error(error.message || 'Failed to trigger calls');
      }

      setTimeout(() => fetchJobStatus(), 1000);
    } catch (error) {
      console.error('Failed to trigger lost deal calls:', error);
      setJobStatus(prev => prev ? { ...prev, isRunning: false } : null);
    } finally {
      setIsTriggeringLostDeal(false);
    }
  };

  // Trigger inactivity check calls
  const handleTriggerInactivityCalls = async () => {
    if (isTriggeringInactivity || jobStatus?.isRunning) return;

    setIsTriggeringInactivity(true);

    // Optimistic update
    setJobStatus(prev => ({
      ...prev,
      isRunning: true,
      type: 'INACTIVITY',
      startedAt: new Date().toISOString(),
      eligibleDeals: 0,
      completedCalls: 0,
      failedCalls: 0,
      lastError: null,
      recentOutput: [],
      dbStats: prev?.dbStats || { pending: 0, inProgress: 0, completed: 0, failed: 0, total: 0 },
    }));

    try {
      const response = await fetch(`${API_BASE_URL}/logs/barrierx-info/trigger-inactivity`, {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        setJobStatus(prev => prev ? { ...prev, isRunning: false, lastError: error.message } : null);
        throw new Error(error.message || 'Failed to trigger calls');
      }

      setTimeout(() => fetchJobStatus(), 1000);
    } catch (error) {
      console.error('Failed to trigger inactivity calls:', error);
      setJobStatus(prev => prev ? { ...prev, isRunning: false } : null);
    } finally {
      setIsTriggeringInactivity(false);
    }
  };

  // Stop running job
  const handleStopCalls = async () => {
    if (isStopping || !jobStatus?.isRunning) return;

    setIsStopping(true);

    // Optimistic update - show stopped state immediately
    setJobStatus(prev => prev ? { ...prev, isRunning: false } : null);

    try {
      const response = await fetch(`${API_BASE_URL}/logs/barrierx-info/stop-zero-score`, {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Revert if stop failed
        setJobStatus(prev => prev ? { ...prev, isRunning: true } : null);
        throw new Error('Failed to stop job');
      }

      await fetchJobStatus();
    } catch (error) {
      console.error('Failed to stop job:', error);
    } finally {
      setIsStopping(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    fetchJobStatus();
  }, [fetchRecords, fetchJobStatus]);

  // Poll for job status while running
  useEffect(() => {
    if (!jobStatus?.isRunning) return;

    const interval = setInterval(() => {
      fetchJobStatus();
      fetchRecords(); // Also refresh records to see new calls
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [jobStatus?.isRunning, fetchJobStatus, fetchRecords]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      const response = await fetch(`${API_BASE_URL}/logs/barrierx-info/export?${params}`, {
        headers: getAuthHeader(),
      });

      if (!response.ok) throw new Error('Failed to export');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `barrierx-info-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  };

  const filteredRecords = records.filter(record => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      record.dealName.toLowerCase().includes(query) ||
      record.companyName?.toLowerCase().includes(query) ||
      record.ownerName.toLowerCase().includes(query) ||
      record.ownerEmail.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.ceil(total / limit);

  // Stats
  const stats = {
    total: records.length,
    completed: records.filter(r => r.status === 'COMPLETED').length,
    pending: records.filter(r => r.status === 'PENDING').length,
    failed: records.filter(r => r.status === 'FAILED').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Target className="w-6 h-6 text-blue-600" />
            BarrierX Info Gathering
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Information gathering calls for deals missing BarrierX scores
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRecords}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleExport}
            disabled={exporting || records.length === 0}
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Export CSV
          </Button>
        </div>
      </div>

      {/* Campaign Trigger Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Zero Score Card */}
        <Card className="border-2 border-dashed border-blue-300 dark:border-blue-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <Target className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Zero Score Calls
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Gather pain points, champion & economic buyer
                  </p>
                </div>
              </div>

              {/* Status + Button */}
              <div className="flex items-center justify-between">
                {jobStatus?.isRunning && jobStatus.type === 'ZERO_SCORE' ? (
                  <>
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{jobStatus.completedCalls}/{jobStatus.eligibleDeals || '?'}</span>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleStopCalls}
                      disabled={isStopping}
                      className="gap-2"
                    >
                      <Square className="w-4 h-4" />
                      Stop
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="text-sm text-gray-500">
                      {jobStatus?.dbStats?.total || 0} calls logged
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleTriggerZeroScoreCalls}
                      disabled={isTriggeringZeroScore || jobStatus?.isRunning}
                      className="gap-2 bg-blue-600 hover:bg-blue-700"
                    >
                      {isTriggeringZeroScore ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4" />
                      )}
                      Start Calls
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lost Deal Card */}
        <Card className="border-2 border-dashed border-red-300 dark:border-red-700 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-lg">
                  <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Lost Deal Questionnaire
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Gather loss reasons from Lost deals
                  </p>
                </div>
              </div>

              {/* Status + Button */}
              <div className="flex items-center justify-between">
                {jobStatus?.isRunning && jobStatus.type === 'LOST_DEAL' ? (
                  <>
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{jobStatus.completedCalls}/{jobStatus.eligibleDeals || '?'}</span>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleStopCalls}
                      disabled={isStopping}
                      className="gap-2"
                    >
                      <Square className="w-4 h-4" />
                      Stop
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="text-sm text-gray-500">
                      Calls "Lost" deal owners
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleTriggerLostDealCalls}
                      disabled={isTriggeringLostDeal || jobStatus?.isRunning}
                      className="gap-2 bg-red-600 hover:bg-red-700"
                    >
                      {isTriggeringLostDeal ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4" />
                      )}
                      Start Calls
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inactivity Check Card */}
        <Card className="border-2 border-dashed border-orange-300 dark:border-orange-700 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
                  <Clock className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Inactivity Check
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Follow up on stale deals (2+ weeks)
                  </p>
                </div>
              </div>

              {/* Status + Button */}
              <div className="flex items-center justify-between">
                {jobStatus?.isRunning && jobStatus.type === 'INACTIVITY' ? (
                  <>
                    <div className="flex items-center gap-2 text-sm text-orange-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{jobStatus.completedCalls}/{jobStatus.eligibleDeals || '?'}</span>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleStopCalls}
                      disabled={isStopping}
                      className="gap-2"
                    >
                      <Square className="w-4 h-4" />
                      Stop
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="text-sm text-gray-500">
                      Check status & next steps
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleTriggerInactivityCalls}
                      disabled={isTriggeringInactivity || jobStatus?.isRunning}
                      className="gap-2 bg-orange-600 hover:bg-orange-700"
                    >
                      {isTriggeringInactivity ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4" />
                      )}
                      Start Calls
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Running Job Status Bar */}
      {jobStatus?.isRunning && (
        <Card className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30 border-yellow-300 dark:border-yellow-700">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-yellow-600" />
                <div>
                  <span className="font-medium text-yellow-800 dark:text-yellow-200">
                    {jobStatus.type === 'ZERO_SCORE' ? 'Zero Score' : jobStatus.type === 'LOST_DEAL' ? 'Lost Deal' : 'Inactivity'} calls in progress
                  </span>
                  <span className="text-yellow-600 dark:text-yellow-400 ml-2">
                    • {jobStatus.completedCalls}/{jobStatus.eligibleDeals || '?'} completed
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleStopCalls}
                disabled={isStopping}
                className="border-yellow-400 text-yellow-700 hover:bg-yellow-100"
              >
                {isStopping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4 mr-2" />}
                Stop All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Last Error Display */}
      {jobStatus?.lastError && !jobStatus.isRunning && (
        <Card className="border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <XCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Last Error:</span>
              <span className="text-sm">{jobStatus.lastError}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Calls</p>
                <p className="text-2xl font-bold">{total}</p>
              </div>
              <Phone className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Failed</p>
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by deal, company, or owner..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="SKIPPED">Skipped</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Info Gathering Calls</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No records found
            </div>
          ) : (
            <div className="space-y-2">
              {filteredRecords.map((record) => {
                const isExpanded = expandedRows.has(record.id);
                const statusInfo = statusConfig[record.status];

                return (
                  <div
                    key={record.id}
                    className="border rounded-lg overflow-hidden dark:border-gray-700"
                  >
                    {/* Row Header */}
                    <div
                      className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      onClick={() => toggleRow(record.id)}
                    >
                      <button className="text-gray-400">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{record.dealName}</span>
                          {record.companyName && (
                            <span className="text-sm text-gray-500 flex items-center gap-1">
                              <Building className="w-3 h-3" />
                              {record.companyName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {record.ownerName}
                          </span>
                          <span>{record.ownerPhone}</span>
                          <Badge variant="outline" className={
                            record.gatheringType === 'LOST_DEAL'
                              ? 'text-red-600 border-red-300 dark:text-red-400 dark:border-red-700 text-[10px] px-1.5 py-0'
                              : record.gatheringType === 'INACTIVITY'
                                ? 'text-yellow-600 border-yellow-300 dark:text-yellow-400 dark:border-yellow-700 text-[10px] px-1.5 py-0'
                                : 'text-blue-600 border-blue-300 dark:text-blue-400 dark:border-blue-700 text-[10px] px-1.5 py-0'
                          }>
                            {record.gatheringType === 'LOST_DEAL' ? 'Lost Deal' : record.gatheringType === 'INACTIVITY' ? 'Inactivity' : 'Zero Score'}
                          </Badge>
                        </div>
                      </div>

                      <Badge className={`${statusInfo.color} flex items-center gap-1`}>
                        {statusInfo.icon}
                        {statusInfo.label}
                      </Badge>

                      <div className="text-sm text-gray-500 text-right min-w-[120px]">
                        {formatDate(record.initiatedAt)}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="border-t dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/30 space-y-4">
                        {/* Owner & Deal Info Section */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-elevated dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Owner</p>
                            <p className="text-sm font-medium">{record.ownerName}</p>
                            <p className="text-xs text-gray-500">{record.ownerEmail}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                            <p className="text-sm font-medium">{record.ownerPhone || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Company</p>
                            <p className="text-sm font-medium">{record.companyName || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Tenant</p>
                            <p className="text-sm font-medium">{record.tenantName || record.tenantSlug}</p>
                          </div>
                        </div>

                        {/* Gathered Information Section — renders fields based on gathering type */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* ═══ ZERO SCORE fields ═══ */}
                          {record.gatheringType === 'ZERO_SCORE' && (
                            <>
                              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <h4 className="font-medium text-sm text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-2">
                                  <Target className="w-4 h-4" />
                                  Quantified Pain Points
                                </h4>
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                  {record.quantifiedPainPoints || 'Not captured'}
                                </p>
                              </div>
                              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                <h4 className="font-medium text-sm text-green-700 dark:text-green-300 mb-2 flex items-center gap-2">
                                  <User className="w-4 h-4" />
                                  Champion
                                </h4>
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                  {record.championInfo || 'Not captured'}
                                </p>
                              </div>
                              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                                <h4 className="font-medium text-sm text-purple-700 dark:text-purple-300 mb-2 flex items-center gap-2">
                                  <Building className="w-4 h-4" />
                                  Economic Buyer
                                </h4>
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                  {record.economicBuyerInfo || 'Not captured'}
                                </p>
                              </div>
                            </>
                          )}

                          {/* ═══ LOST DEAL fields ═══ */}
                          {record.gatheringType === 'LOST_DEAL' && (
                            <>
                              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                <h4 className="font-medium text-sm text-red-700 dark:text-red-300 mb-2 flex items-center gap-2">
                                  <ThumbsDown className="w-4 h-4" />
                                  Loss Reason
                                </h4>
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                  {record.lossReason || 'Not captured'}
                                </p>
                              </div>
                              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                                <h4 className="font-medium text-sm text-orange-700 dark:text-orange-300 mb-2 flex items-center gap-2">
                                  <Swords className="w-4 h-4" />
                                  Lost To (Competitor)
                                </h4>
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                  {record.competitorName || 'Not captured'}
                                </p>
                              </div>
                              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                <h4 className="font-medium text-sm text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-2">
                                  <Lightbulb className="w-4 h-4" />
                                  Lessons Learned
                                </h4>
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                  {record.lessonsLearned || 'Not captured'}
                                </p>
                              </div>
                            </>
                          )}

                          {/* ═══ INACTIVITY fields ═══ */}
                          {record.gatheringType === 'INACTIVITY' && (
                            <>
                              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                <h4 className="font-medium text-sm text-yellow-700 dark:text-yellow-300 mb-2 flex items-center gap-2">
                                  <Activity className="w-4 h-4" />
                                  Current Status
                                </h4>
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                  {record.inactivityStatus || 'Not captured'}
                                </p>
                              </div>
                              <div className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-lg border border-rose-200 dark:border-rose-800">
                                <h4 className="font-medium text-sm text-rose-700 dark:text-rose-300 mb-2 flex items-center gap-2">
                                  <ShieldAlert className="w-4 h-4" />
                                  Blockers
                                </h4>
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                  {record.inactivityBlockers || 'Not captured'}
                                </p>
                              </div>
                              <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
                                <h4 className="font-medium text-sm text-teal-700 dark:text-teal-300 mb-2 flex items-center gap-2">
                                  <ArrowRight className="w-4 h-4" />
                                  Next Steps
                                </h4>
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                  {record.inactivityNextSteps || 'Not captured'}
                                </p>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Call Summary */}
                        {record.transcriptSummary && (
                          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                            <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">
                              Call Summary
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {record.transcriptSummary}
                            </p>
                          </div>
                        )}

                        {/* Call Metadata Footer */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-3 border-t dark:border-gray-700 text-xs">
                          <div>
                            <p className="text-gray-400">Deal ID</p>
                            <p className="font-mono text-gray-600 dark:text-gray-300">{record.dealId}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Conversation ID</p>
                            <p className="font-mono text-gray-600 dark:text-gray-300">
                              {record.conversationId ? record.conversationId.substring(0, 16) + '...' : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400">Duration</p>
                            <p className="text-gray-600 dark:text-gray-300">
                              {record.callDuration ? `${Math.floor(record.callDuration / 60)}m ${record.callDuration % 60}s` : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400">Initiated</p>
                            <p className="text-gray-600 dark:text-gray-300">{formatDate(record.initiatedAt)}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Completed</p>
                            <p className="text-gray-600 dark:text-gray-300">
                              {record.completedAt ? formatDate(record.completedAt) : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t dark:border-gray-700">
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages} ({total} total records)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BarrierXInfo;
