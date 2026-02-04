/**
 * Clients Deals Admin Page
 * 
 * Displays all deals from BarrierX bulk API with:
 * - Card view with deal information
 * - Dropdown to trigger info gathering calls (Zero Score, Lost Deal, Inactivity)
 * - Search and filter functionality
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  AlertCircle,
  Briefcase,
  Building,
  Calendar,
  CheckCircle,
  ChevronDown,
  Clock,
  Loader2,
  Phone,
  RefreshCw,
  Search,
  Target,
  TrendingUp,
  User,
  XCircle,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { toast } from 'sonner';
import * as dealService from '../../services/dealService';
import { Deal, GatheringType } from '../../services/dealService';

const gatheringTypeConfig: Record<GatheringType, {
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}> = {
  ZERO_SCORE: {
    label: 'Zero Score',
    description: 'Gather pain points, champion & economic buyer info',
    icon: <Target className="w-4 h-4" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  LOST_DEAL: {
    label: 'Lost Deal',
    description: 'Gather loss reasons and competitor info',
    icon: <XCircle className="w-4 h-4" />,
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  INACTIVITY: {
    label: 'Inactivity Check',
    description: 'Check status and next steps for stale deals',
    icon: <Clock className="w-4 h-4" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
};

const ClientsDeals: React.FC = () => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [triggeringDeal, setTriggeringDeal] = useState<string | null>(null);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    deal: Deal | null;
    type: GatheringType | null;
  }>({ open: false, deal: null, type: null });

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await dealService.getAdminDeals();
      setDeals(response.deals || []);
    } catch (err: any) {
      console.error('Failed to fetch deals:', err);
      setError(err.response?.data?.message || 'Failed to fetch deals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const handleTriggerCall = async () => {
    if (!confirmDialog.deal || !confirmDialog.type) return;

    const deal = confirmDialog.deal;
    const type = confirmDialog.type;

    setConfirmDialog({ open: false, deal: null, type: null });
    setTriggeringDeal(deal.id);

    try {
      const result = await dealService.triggerInfoGatheringCall(deal.id, type, deal);

      if (result.success) {
        toast.success(`${gatheringTypeConfig[type].label} call triggered!`, {
          description: `Calling ${deal.owner?.name || 'owner'} for "${deal.dealName}"`,
        });
      } else {
        toast.error('Failed to trigger call', {
          description: result.error || 'Unknown error',
        });
      }
    } catch (err: any) {
      toast.error('Failed to trigger call', {
        description: err.response?.data?.message || err.message,
      });
    } finally {
      setTriggeringDeal(null);
    }
  };

  const openConfirmDialog = (deal: Deal, type: GatheringType) => {
    setConfirmDialog({ open: true, deal, type });
  };

  // Filter deals
  const filteredDeals = deals.filter((deal) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        deal.dealName.toLowerCase().includes(query) ||
        deal.company?.toLowerCase().includes(query) ||
        deal.owner?.name?.toLowerCase().includes(query) ||
        deal.owner?.email?.toLowerCase().includes(query) ||
        deal.tenantName?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Stage filter
    if (stageFilter && stageFilter !== 'all') {
      if (deal.stage?.toLowerCase() !== stageFilter.toLowerCase()) return false;
    }

    return true;
  });

  // Get unique stages for filter
  const uniqueStages = Array.from(new Set(deals.map((d) => d.stage).filter(Boolean)));

  const formatAmount = (amount?: number) => {
    if (!amount) return 'N/A';
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
    return `$${amount}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeAgo = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const getRiskLevel = (riskScores?: Deal['riskScores']) => {
    if (!riskScores?.totalDealRisk) return null;
    const risk = riskScores.totalDealRisk;
    if (risk >= 70) return { level: 'High', color: 'text-destructive' };
    if (risk >= 40) return { level: 'Medium', color: 'text-warning' };
    if (risk > 0) return { level: 'Low', color: 'text-success' };
    return { level: 'None', color: 'text-muted-foreground' };
  };

  const getStageProgress = (stage?: string) => {
    const stageProgress: Record<string, number> = {
      'qualifiedtobuy': 20,
      'appointmentscheduled': 40,
      'presentationscheduled': 60,
      'decisionmakerboughtin': 80,
      'contractsent': 90,
      'closedwon': 100,
      'closedlost': 0,
      'lost': 0,
    };
    return stageProgress[stage?.toLowerCase().replace(/\s+/g, '') || ''] || 45;
  };

  const formatStageName = (stage?: string) => {
    if (!stage) return 'Unknown';
    return stage
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  const hasZeroScore = (riskScores?: Deal['riskScores']) => {
    if (!riskScores) return true;
    return (
      riskScores.arenaRisk === 0 &&
      riskScores.controlRoomRisk === 0 &&
      riskScores.scoreCardRisk === 0 &&
      riskScores.totalDealRisk === 0
    );
  };

  const isLostDeal = (stage?: string) => {
    return stage?.toLowerCase() === 'lost';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-brand" />
            Clients Deals
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage deals and trigger info gathering calls
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchDeals} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Deals</p>
                <p className="text-2xl font-bold">{deals.length}</p>
              </div>
              <Briefcase className="w-8 h-8 text-brand opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Zero Score</p>
                <p className="text-2xl font-bold text-blue-600">
                  {deals.filter((d) => hasZeroScore(d.riskScores)).length}
                </p>
              </div>
              <Target className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Lost Deals</p>
                <p className="text-2xl font-bold text-red-600">
                  {deals.filter((d) => isLostDeal(d.stage)).length}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">With Scores</p>
                <p className="text-2xl font-bold text-green-600">
                  {deals.filter((d) => !hasZeroScore(d.riskScores)).length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500 opacity-50" />
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
                  placeholder="Search by deal, company, owner, or tenant..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {uniqueStages.map((stage) => (
                  <SelectItem key={stage} value={stage.toLowerCase()}>
                    {stage}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="px-3 py-1">
              {filteredDeals.length} deals
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-red-300 bg-red-50 dark:bg-red-950/30">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
        </div>
      ) : filteredDeals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Briefcase className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No deals found</p>
          </CardContent>
        </Card>
      ) : (
        /* Deal Cards Grid - BarrierX Style */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredDeals.map((deal) => {
            const riskLevel = getRiskLevel(deal.riskScores);
            const isZeroScore = hasZeroScore(deal.riskScores);
            const isLost = isLostDeal(deal.stage);
            const isTriggering = triggeringDeal === deal.id;
            const stageProgress = getStageProgress(deal.stage);

            return (
              <Card
                key={deal.id}
                className="group bg-elevated dark:bg-card border border-default dark:border-border shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col overflow-hidden"
              >
                {/* Header */}
                <CardHeader className="pb-3 border-b border-subtle dark:border-border">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 rounded-lg bg-brand-light dark:bg-primary/10">
                        <Briefcase className="h-4 w-4 text-brand dark:text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm font-semibold text-heading dark:text-foreground line-clamp-2 mb-1">
                          {deal.dealName}
                        </CardTitle>
                        {deal.tenantName && (
                          <p className="text-xs text-subtle line-clamp-1">
                            {deal.tenantName}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs px-2 py-1 ${
                        isLost
                          ? 'border-destructive/30 text-destructive bg-destructive/10'
                          : isZeroScore
                          ? 'border-blue-300 text-blue-700 bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:bg-blue-900/30'
                          : 'border-brand/30 text-brand bg-brand-light'
                      }`}
                    >
                      {isZeroScore ? 'ZERO SCORE' : isLost ? 'LOST' : 'ACTIVE'}
                    </Badge>
                  </div>

                  {/* Time info */}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand bg-brand-light px-2.5 py-1 rounded-full dark:bg-primary/10 dark:text-primary">
                      <Zap className="h-3 w-3" />
                      {getTimeAgo(deal.updatedAt)}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 space-y-3 pt-4">
                  {/* Deal info box */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-page dark:bg-muted/50 border border-subtle dark:border-border">
                    <div className="flex items-center gap-2 min-w-0">
                      <Briefcase className="h-4 w-4 text-subtle flex-shrink-0" />
                      <span className="font-medium text-sm text-heading dark:text-foreground truncate">
                        {deal.dealName}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-brand dark:text-primary flex-shrink-0">
                      {formatAmount(deal.amount)}
                    </span>
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-2 text-xs text-subtle px-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{formatDate(deal.createdAt)}</span>
                  </div>

                  {/* Company */}
                  {deal.company && (
                    <div className="flex items-center gap-2 text-xs px-1">
                      <Building className="h-3.5 w-3.5 text-subtle" />
                      <span className="font-medium text-body dark:text-foreground">
                        {deal.company}
                      </span>
                    </div>
                  )}

                  {/* Owner */}
                  {deal.owner && (
                    <div className="flex items-center gap-2 text-xs px-1">
                      <User className="h-3.5 w-3.5 text-subtle" />
                      <span className="font-medium text-body dark:text-foreground">
                        Owner: {deal.owner.name}
                      </span>
                    </div>
                  )}

                  {/* Stage and progress */}
                  <div className="space-y-1.5 px-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-subtle flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {formatStageName(deal.stage)}
                      </span>
                      <span className="font-semibold text-brand dark:text-primary">
                        {stageProgress}%
                      </span>
                    </div>
                    <div className="w-full bg-[hsl(var(--border-default))] dark:bg-secondary rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-brand h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${stageProgress}%` }}
                      />
                    </div>
                  </div>

                  {/* Risk indicator */}
                  {riskLevel && deal.riskScores?.totalDealRisk !== undefined && (
                    <div className="flex items-center justify-between pt-1 px-1">
                      <span className="text-xs text-subtle">Deal Risk</span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          riskLevel.level === 'High'
                            ? 'bg-destructive/10 text-destructive'
                            : riskLevel.level === 'Medium'
                            ? 'bg-warning/10 text-warning'
                            : riskLevel.level === 'Low'
                            ? 'bg-success/10 text-success'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {riskLevel.level} ({deal.riskScores.totalDealRisk}%)
                      </span>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="flex gap-2 pt-4 border-t border-subtle dark:border-border bg-page dark:bg-muted/20">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        className="flex-1 gap-2 bg-brand hover:bg-brand-hover text-white"
                        size="sm"
                        disabled={isTriggering || !deal.owner?.phone}
                      >
                        {isTriggering ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Phone className="h-4 w-4" />
                        )}
                        Info Call
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-72">
                      {(Object.keys(gatheringTypeConfig) as GatheringType[]).map((type) => {
                        const config = gatheringTypeConfig[type];
                        return (
                          <DropdownMenuItem
                            key={type}
                            onClick={() => openConfirmDialog(deal, type)}
                            className="flex items-start gap-3 p-3 cursor-pointer hover:bg-brand-light focus:bg-brand-light data-[highlighted]:bg-brand-light"
                          >
                            <div className={`p-2 rounded-lg ${config.bgColor}`}>
                              {config.icon}
                            </div>
                            <div className="flex-1">
                              <div className={`font-medium ${config.color}`}>
                                {config.label}
                              </div>
                              <div className="text-xs text-subtle">
                                {config.description}
                              </div>
                            </div>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2 border-default dark:border-border hover:bg-page hover:text-heading dark:hover:bg-muted dark:hover:text-foreground"
                    disabled={!deal.owner?.phone}
                    onClick={() => {
                      toast.info('Coming Soon', {
                        description: 'Direct owner calling will be available soon.',
                      });
                    }}
                  >
                    <Phone className="h-4 w-4" />
                    Call Owner
                  </Button>
                </CardFooter>
                {!deal.owner?.phone && (
                  <div className="px-4 pb-3 bg-page dark:bg-muted/20">
                    <p className="text-xs text-destructive text-center">
                      No phone number available
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => {
          if (!open) setConfirmDialog({ open: false, deal: null, type: null });
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Confirm Info Gathering Call
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to trigger a{' '}
              <strong>
                {confirmDialog.type && gatheringTypeConfig[confirmDialog.type].label}
              </strong>{' '}
              call for this deal?
            </AlertDialogDescription>
          </AlertDialogHeader>

          {confirmDialog.deal && (
            <Card className="bg-gray-50 dark:bg-gray-800">
              <CardContent className="pt-4 space-y-2">
                <div className="font-medium">{confirmDialog.deal.dealName}</div>
                <div className="text-sm text-gray-500">
                  Company: {confirmDialog.deal.company || 'N/A'}
                </div>
                {confirmDialog.deal.owner && (
                  <>
                    <div className="flex items-center gap-2 text-sm pt-2 border-t">
                      <User className="w-4 h-4 text-gray-400" />
                      <span>{confirmDialog.deal.owner.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{confirmDialog.deal.owner.phone}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleTriggerCall}>
              Trigger Call
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClientsDeals;
