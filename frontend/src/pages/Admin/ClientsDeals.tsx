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
  XCircle,
  PhoneOutgoing,
  Mail,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
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
import { MetricCard } from '../User/Logs/components/AnalyticsCharts';

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
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-500/15',
  },
  LOST_DEAL: {
    label: 'Lost Deal',
    description: 'Gather loss reasons and competitor info',
    icon: <XCircle className="w-4 h-4" />,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-500/15',
  },
  INACTIVITY: {
    label: 'Inactivity Check',
    description: 'Check status and next steps for stale deals',
    icon: <Clock className="w-4 h-4" />,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-500/15',
  },
};

const ClientsDeals: React.FC = () => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [triggeringDeal, setTriggeringDeal] = useState<string | null>(null);

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
        toast.error('Failed to trigger call', { description: result.error || 'Unknown error' });
      }
    } catch (err: any) {
      toast.error('Failed to trigger call', { description: err.response?.data?.message || err.message });
    } finally {
      setTriggeringDeal(null);
    }
  };

  const openConfirmDialog = (deal: Deal, type: GatheringType) => {
    setConfirmDialog({ open: true, deal, type });
  };

  const filteredDeals = deals.filter((deal) => {
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
    if (stageFilter && stageFilter !== 'all') {
      if (deal.stage?.toLowerCase() !== stageFilter.toLowerCase()) return false;
    }
    return true;
  });

  const uniqueStages = Array.from(new Set(deals.map((d) => d.stage).filter(Boolean)));

  const formatAmount = (amount?: number) => {
    if (!amount) return 'N/A';
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
    return `$${amount}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getTimeAgo = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const formatStageName = (stage?: string) => {
    if (!stage) return 'Unknown';
    return stage.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()).trim();
  };

  const getStageBadgeStyle = (stage?: string) => {
    const s = stage?.toLowerCase().replace(/\s+/g, '') || '';
    if (s.includes('appointment')) return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20';
    if (s.includes('qualified')) return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
    if (s.includes('presentation')) return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20';
    if (s.includes('decision')) return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
    if (s.includes('contract')) return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20';
    if (s.includes('closedwon')) return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20';
    if (s.includes('closedlost') || s.includes('lost')) return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20';
    return 'bg-brand-light text-brand border-[hsl(var(--app-brand-muted))]';
  };

  const hasZeroScore = (riskScores?: Deal['riskScores']) => {
    if (!riskScores) return true;
    return riskScores.arenaRisk === 0 && riskScores.controlRoomRisk === 0 && riskScores.scoreCardRisk === 0 && riskScores.totalDealRisk === 0;
  };

  const isLostDeal = (stage?: string) => stage?.toLowerCase() === 'lost';

  const zeroCount = deals.filter((d) => hasZeroScore(d.riskScores)).length;
  const lostCount = deals.filter((d) => isLostDeal(d.stage)).length;
  const scoredCount = deals.filter((d) => !hasZeroScore(d.riskScores)).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-brand-light dark:bg-primary/15 flex items-center justify-center shadow-sm border border-[hsl(var(--app-brand-muted)/0.3)] dark:border-primary/20">
            <Briefcase className="w-4 h-4 text-brand dark:text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-heading dark:text-foreground">Clients Deals</h1>
            <p className="text-sm text-subtle dark:text-muted-foreground">Manage deals and trigger info gathering calls</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchDeals}
          disabled={loading}
          className="border-default dark:border-border text-subtle dark:text-muted-foreground hover:text-heading dark:hover:text-foreground rounded-lg h-9 text-xs font-medium"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Total Deals" value={deals.length.toString()} icon={Briefcase} accentColor="bg-brand-light dark:bg-primary/10" iconColor="text-brand dark:text-primary" />
        <MetricCard label="Zero Score" value={zeroCount.toString()} icon={Target} accentColor="bg-blue-500/10" iconColor="text-blue-600 dark:text-blue-400" />
        <MetricCard label="Lost Deals" value={lostCount.toString()} icon={XCircle} accentColor="bg-red-500/10" iconColor="text-red-600 dark:text-red-400" />
        <MetricCard label="With Scores" value={scoredCount.toString()} icon={CheckCircle} accentColor="bg-green-500/10" iconColor="text-green-600 dark:text-green-400" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-subtle dark:text-muted-foreground" />
          <Input
            placeholder="Search by deal, company, owner, or tenant..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm rounded-lg border-default dark:border-border bg-elevated dark:bg-card focus-visible:ring-[hsl(var(--app-brand))]"
          />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-48 h-9 text-xs rounded-lg border-default dark:border-border bg-elevated dark:bg-card">
            <SelectValue placeholder="All Stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {uniqueStages.map((stage) => (
              <SelectItem key={stage} value={stage.toLowerCase()}>{stage}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-light text-brand border border-[hsl(var(--app-brand-muted)/0.3)] dark:bg-primary/10 dark:text-primary dark:border-primary/20">
          {filteredDeals.length} deals
        </span>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-500/20 bg-red-50/50 dark:bg-red-950/10 p-4">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-brand dark:text-primary" />
        </div>
      ) : filteredDeals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-12 w-12 rounded-full bg-[hsl(var(--page-bg))] flex items-center justify-center mb-3">
            <Briefcase className="h-6 w-6 text-subtle" />
          </div>
          <p className="text-sm font-medium text-heading dark:text-foreground">No deals found</p>
          <p className="text-xs text-subtle dark:text-muted-foreground mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredDeals.map((deal) => {
            const isZeroScore = hasZeroScore(deal.riskScores);
            const isLost = isLostDeal(deal.stage);
            const isTriggering = triggeringDeal === deal.id;

            return (
              <div
                key={deal.id}
                className="group rounded-lg border border-subtle dark:border-border hover:border-[hsl(var(--text-muted)/0.3)] dark:hover:border-border bg-elevated dark:bg-card shadow-sm hover:shadow-card transition-all duration-150 overflow-hidden flex flex-col"
              >
                {/* Stage Badge + Status */}
                <div className="px-5 pt-5 flex items-center justify-between">
                  <span className={`inline-block px-2.5 py-1 text-[11px] font-semibold rounded-md border truncate max-w-[180px] ${getStageBadgeStyle(deal.stage)}`}>
                    {formatStageName(deal.stage)}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${isLost
                      ? 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30'
                      : isZeroScore
                        ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30'
                        : 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30'
                    }`}>
                    {isZeroScore ? 'ZERO SCORE' : isLost ? 'LOST' : 'ACTIVE'}
                  </span>
                </div>

                {/* Title + Meta */}
                <div className="px-5 pt-3 pb-4">
                  <h3 className="font-semibold text-[15px] text-heading dark:text-foreground leading-snug line-clamp-2">
                    {deal.dealName}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-subtle dark:text-muted-foreground mt-1.5 flex-wrap">
                    {deal.company && (
                      <>
                        <Building className="h-3 w-3 flex-shrink-0" />
                        <span>{deal.company}</span>
                        <span className="mx-0.5 opacity-40">·</span>
                      </>
                    )}
                    <Calendar className="h-3 w-3 flex-shrink-0" />
                    <span>{formatDate(deal.createdAt)}</span>
                  </div>
                </div>

                {/* Risk Bar */}
                <div className="mx-5 py-3 border-t border-subtle dark:border-border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium text-heading dark:text-foreground">Deal Risk</span>
                    <span className="text-xs text-subtle dark:text-muted-foreground">{Math.round((deal.riskScores?.totalDealRisk || 0) * 100) / 100}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full flex-shrink-0 ${(deal.riskScores?.totalDealRisk || 0) >= 70 ? 'bg-red-500' :
                        (deal.riskScores?.totalDealRisk || 0) >= 40 ? 'bg-amber-500' :
                          (deal.riskScores?.totalDealRisk || 0) > 0 ? 'bg-red-400' : 'bg-gray-300 dark:bg-gray-600'
                      }`} />
                    <div className="flex-1 bg-red-100/60 dark:bg-red-500/10 rounded-full h-[6px] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-red-400 to-red-200 dark:from-red-500 dark:to-red-400/40"
                        style={{ width: `${Math.max(deal.riskScores?.totalDealRisk || 0, 1)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="mx-5 py-3 border-t border-subtle dark:border-border grid grid-cols-2 gap-y-4 gap-x-4 flex-1">
                  {/* Amount */}
                  <div>
                    <p className="text-[11px] text-subtle dark:text-muted-foreground mb-0.5">Amount</p>
                    <p className="text-sm font-semibold text-heading dark:text-foreground">{formatAmount(deal.amount)}</p>
                  </div>
                  {/* Owner */}
                  <div>
                    <p className="text-[11px] text-subtle dark:text-muted-foreground mb-1.5">Owner</p>
                    {deal.owner ? (
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-pink-100 dark:bg-pink-500/20 flex items-center justify-center flex-shrink-0 ring-1 ring-pink-200/60 dark:ring-pink-500/30">
                          <span className="text-[10px] font-bold text-pink-700 dark:text-pink-300 leading-none">
                            {deal.owner.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-heading dark:text-foreground truncate">{deal.owner.name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-subtle dark:text-muted-foreground">—</span>
                    )}
                  </div>
                  {/* Updated */}
                  <div>
                    <p className="text-[11px] text-subtle dark:text-muted-foreground mb-0.5">Updated</p>
                    <p className="text-sm font-medium text-accent-orange">{getTimeAgo(deal.updatedAt)}</p>
                  </div>
                  {/* Tenant */}
                  <div>
                    <p className="text-[11px] text-subtle dark:text-muted-foreground mb-0.5">Tenant</p>
                    <p className="text-sm text-body dark:text-foreground truncate">{deal.tenantName || '—'}</p>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-auto p-4 border-t border-subtle dark:border-border flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        className="flex-1 gap-1.5 bg-brand hover:bg-brand-hover text-white shadow-sm"
                        size="sm"
                        disabled={isTriggering || !deal.owner?.phone}
                      >
                        {isTriggering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Phone className="h-3.5 w-3.5" />}
                        Info Call
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-72">
                      {(Object.keys(gatheringTypeConfig) as GatheringType[]).map((type) => {
                        const config = gatheringTypeConfig[type];
                        return (
                          <DropdownMenuItem
                            key={type}
                            onClick={() => openConfirmDialog(deal, type)}
                            className="flex items-start gap-3 p-3 cursor-pointer"
                          >
                            <div className={`p-2 rounded-lg ${config.bgColor}`}>{config.icon}</div>
                            <div className="flex-1">
                              <div className={`font-medium text-sm ${config.color}`}>{config.label}</div>
                              <div className="text-xs text-subtle dark:text-muted-foreground">{config.description}</div>
                            </div>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5 border-default dark:border-border hover:bg-page hover:text-heading dark:hover:bg-muted dark:hover:text-foreground text-body dark:text-foreground"
                    disabled={!deal.owner?.phone}
                    onClick={() => toast.info('Coming Soon', { description: 'Direct owner calling will be available soon.' })}
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Call Owner
                  </Button>
                </div>
                {!deal.owner?.phone && (
                  <div className="px-4 pb-3">
                    <p className="text-[11px] text-red-600 dark:text-red-400 text-center">No phone number available</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => { if (!open) setConfirmDialog({ open: false, deal: null, type: null }); }}
      >
        <AlertDialogContent className="sm:max-w-[480px] p-0 overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 bg-brand-light dark:bg-primary/5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-brand dark:bg-primary">
                <PhoneOutgoing className="h-5 w-5 text-white" />
              </div>
              <AlertDialogHeader className="space-y-1 flex-1 text-left">
                <AlertDialogTitle className="text-base font-semibold">
                  {confirmDialog.type && gatheringTypeConfig[confirmDialog.type].label} Call
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm">
                  This will trigger an info gathering call to the deal owner.
                </AlertDialogDescription>
              </AlertDialogHeader>
            </div>
          </div>

          {confirmDialog.deal && (
            <div className="px-6 py-4 space-y-4">
              {/* Deal Info */}
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Deal Details</p>
                <div className="rounded-lg border border-border bg-muted/30 p-3.5 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm leading-snug">{confirmDialog.deal.dealName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{confirmDialog.deal.company || 'N/A'}</p>
                    </div>
                  </div>
                  {confirmDialog.deal.amount && (
                    <div className="flex items-center gap-2 pl-[26px] text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      <span className="font-medium text-foreground">{formatAmount(confirmDialog.deal.amount)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Owner / Call Target */}
              {confirmDialog.deal.owner && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Call Target</p>
                  <div className="rounded-lg border border-border bg-muted/30 p-3.5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-9 w-9 rounded-full bg-pink-100 dark:bg-pink-500/20 flex items-center justify-center flex-shrink-0 ring-1 ring-pink-200/60 dark:ring-pink-500/30">
                        <span className="text-xs font-bold text-pink-700 dark:text-pink-300 leading-none">
                          {confirmDialog.deal.owner.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{confirmDialog.deal.owner.name}</p>
                        <p className="text-xs text-muted-foreground">Deal Owner</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pl-12">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{confirmDialog.deal.owner.phone}</span>
                      </div>
                      {confirmDialog.deal.owner.email && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{confirmDialog.deal.owner.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <AlertDialogFooter className="px-6 py-4 border-t border-border bg-muted/20">
            <AlertDialogCancel className="flex-1 sm:flex-none">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTriggerCall}
              className="flex-1 sm:flex-none gap-1.5 bg-brand hover:bg-brand-hover text-white"
            >
              <PhoneOutgoing className="h-3.5 w-3.5" />
              Trigger Call
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClientsDeals;
