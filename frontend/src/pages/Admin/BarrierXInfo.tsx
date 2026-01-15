/**
 * BarrierX Info Gathering Admin Page
 * 
 * Displays all info gathering calls with:
 * - Table view with expandable rows
 * - Filters by status, date range
 * - CSV export functionality
 */

import React, { useEffect, useState } from 'react';
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
  quantifiedPainPoints: string | null;
  championInfo: string | null;
  economicBuyerInfo: string | null;
  callDuration: number | null;
  transcriptSummary: string | null;
  initiatedAt: string;
  answeredAt: string | null;
  completedAt: string | null;
  createdAt: string;
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

  const limit = 20;

  const fetchRecords = async () => {
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
  };

  useEffect(() => {
    fetchRecords();
  }, [page, statusFilter]);

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
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
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

                        {/* Gathered Information Section */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Pain Points */}
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <h4 className="font-medium text-sm text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-2">
                              <Target className="w-4 h-4" />
                              Quantified Pain Points
                            </h4>
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                              {record.quantifiedPainPoints || 'Not captured'}
                            </p>
                          </div>

                          {/* Champion */}
                          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                            <h4 className="font-medium text-sm text-green-700 dark:text-green-300 mb-2 flex items-center gap-2">
                              <User className="w-4 h-4" />
                              Champion
                            </h4>
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                              {record.championInfo || 'Not captured'}
                            </p>
                          </div>

                          {/* Economic Buyer */}
                          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                            <h4 className="font-medium text-sm text-purple-700 dark:text-purple-300 mb-2 flex items-center gap-2">
                              <Building className="w-4 h-4" />
                              Economic Buyer
                            </h4>
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                              {record.economicBuyerInfo || 'Not captured'}
                            </p>
                          </div>
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
