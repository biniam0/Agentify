import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Calendar,
  Clock,
  FileText,
  Mail,
  Phone,
  PhoneOutgoing,
  Search,
  Shield,
  Timer,
  Users,
  Webhook,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import * as meetingService from '../services/meetingService';
import * as userService from '../services/userService';
import { Meeting } from '../types';
import LogsOverview from './Admin/LogsOverview';
import CallsLog from './Admin/CallsLog';
import WebhooksLog from './Admin/WebhooksLog';
import CrmActionsLog from './Admin/CrmActionsLog';
import SchedulerLog from './Admin/SchedulerLog';
import ErrorsLog from './Admin/ErrorsLog';
import UserLogsOverview from '../pages/User/Logs/Overview';
import UserCallsLog from '../pages/User/Logs/UserCallsLog';
import UserActivityLog from '../pages/User/Logs/UserActivityLog';
import UserCrmActionsLog from '../pages/User/Logs/UserCrmActionsLog';
import { Alert, AlertDescription } from './ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Skeleton } from './ui/skeleton';
import { Switch } from './ui/switch';
const MeetingsPage: React.FC = () => {
  const location = useLocation();
  // Detect if rendered inside AdminLayout to hide duplicate header/tabs
  // Note: router uses basename '/app', so pathname is '/admin/...' not '/app/admin/...'
  const isInsideAdminLayout = location.pathname.startsWith('/admin');

  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    type: 'pre' | 'post' | null;
    meeting: Meeting | null;
  }>({ show: false, type: null, meeting: null });
  const [callLoading, setCallLoading] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [adminTab, setAdminTab] = useState<'meetings' | 'logs'>('meetings'); // NEW: Admin tab state
  const [activeLogSection, setActiveLogSection] = useState<'overview' | 'calls' | 'webhooks' | 'crm-actions' | 'scheduler' | 'errors'>('overview'); // NEW: Active log section
  const [userView, setUserView] = useState<'meetings' | 'logs'>('meetings'); // NEW: User view state
  const [activeUserLogSection, setActiveUserLogSection] = useState<'overview' | 'calls' | 'activity' | 'crm-actions'>('overview'); // NEW: Active user log section

  useEffect(() => {
    // Auto-enable admin mode when inside AdminLayout
    if (isInsideAdminLayout && !isAdminMode) {
      setIsAdminMode(true);
      return; // Will re-run with isAdminMode = true
    }

    fetchMeetings(isAdminMode || isInsideAdminLayout);
    fetchUserStatus();
  }, [isAdminMode, isInsideAdminLayout]);

  const fetchMeetings = async (adminMode: boolean = false) => {
    try {
      setLoading(true);
      setError('');
      const response = adminMode
        ? await meetingService.getAdminMeetings()
        : await meetingService.getMeetings();
      setMeetings(response.meetings);
      if (response.totalUsers) {
        setTotalUsers(response.totalUsers);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStatus = async () => {
    try {
      const response = await userService.getCurrentUser();
      setIsEnabled(response.user.isEnabled);
    } catch (err: any) {
      console.error('Failed to fetch user status:', err);
    }
  };

  const handleToggleAutomation = async (checked: boolean) => {
    setToggleLoading(true);
    try {
      const response = await userService.toggleAutomation(checked);
      setIsEnabled(response.isEnabled);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update automation settings');
    } finally {
      setToggleLoading(false);
    }
  };

  const showConfirmation = (type: 'pre' | 'post', meeting: Meeting) => {
    setConfirmModal({ show: true, type, meeting });
  };

  const closeConfirmation = () => {
    setConfirmModal({ show: false, type: null, meeting: null });
  };

  const handleTriggerCall = async () => {
    if (!confirmModal.meeting || !confirmModal.type) return;

    setCallLoading(true);
    try {
      const meetingId = confirmModal.meeting.id;
      const dealId = confirmModal.meeting.dealId;

      // Use admin endpoints if in admin mode
      if (isAdminMode) {
        // Build meeting and deal objects from the meeting data
        const meetingData = {
          id: confirmModal.meeting.id,
          title: confirmModal.meeting.title,
          agenda: confirmModal.meeting.agenda,
          startTime: confirmModal.meeting.startTime,
          endTime: confirmModal.meeting.endTime,
        };

        const dealData = {
          id: confirmModal.meeting.dealId,
          name: confirmModal.meeting.dealName,
          company: confirmModal.meeting.dealCompany,
          stage: confirmModal.meeting.dealStage,
          amount: confirmModal.meeting.dealAmount,
          summary: confirmModal.meeting.dealSummary,
          userDealRiskScores: confirmModal.meeting.dealRisks,
          ownerName: confirmModal.meeting.owner?.name,
          ownerPhone: confirmModal.meeting.owner?.phone,
          ownerEmail: confirmModal.meeting.owner?.email,
          ownerBarrierxUserId: confirmModal.meeting.ownerBarrierxUserId,
          ownerId: confirmModal.meeting.ownerBarrierxUserId,
          ownerHubspotId: confirmModal.meeting.ownerHubspotId,
          tenantSlug: confirmModal.meeting.ownerTenantSlug,
          contacts: confirmModal.meeting.participants || [],
          owner: confirmModal.meeting.owner,
        };

        if (confirmModal.type === 'pre') {
          const result = await meetingService.adminTriggerPreCall(meetingData, dealData);
          toast.success('Pre-meeting call triggered!', {
            description: result.message,
          });
        } else {
          const result = await meetingService.adminTriggerPostCall(meetingData, dealData);
          toast.success('Post-meeting call triggered!', {
            description: result.message,
          });
        }
      } else {
        // Regular user trigger
        if (confirmModal.type === 'pre') {
          const result = await meetingService.triggerPreCall(meetingId, dealId);
          toast.success('Pre-meeting call triggered!', {
            description: result.message,
          });
        } else {
          const result = await meetingService.triggerPostCall(meetingId, dealId);
          toast.success('Post-meeting call triggered!', {
            description: result.message,
          });
        }
      }

      closeConfirmation();
    } catch (err: any) {
      toast.error('Failed to trigger call', {
        description: err.response?.data?.error || 'An unexpected error occurred',
      });
    } finally {
      setCallLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeUntilMeeting = (startTime: string) => {
    const now = new Date();
    const meetingTime = new Date(startTime);
    const diff = meetingTime.getTime() - now.getTime();

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (diff < 0) {
      const pastHours = Math.abs(hours);
      const pastDays = Math.abs(days);
      if (pastDays > 0) return `${pastDays} day${pastDays > 1 ? 's' : ''} ago`;
      if (pastHours > 0) return `${pastHours} hour${pastHours > 1 ? 's' : ''} ago`;
      return 'Just now';
    }

    if (days > 0) return `In ${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `In ${hours} hour${hours > 1 ? 's' : ''}`;
    return 'Soon';
  };

  const isMeetingPast = (startTime: string) => {
    return new Date(startTime).getTime() < Date.now();
  };

  const formatDealAmount = (amount?: number) => {
    if (!amount) return 'N/A';
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return `${amount}`;
  };

  const formatDealStage = (stage?: string) => {
    if (!stage) return 'Unknown';
    // Convert camelCase to Title Case with spaces
    return stage
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  const getStageBadgeStyle = (stage?: string) => {
    const s = stage?.toLowerCase() || '';
    if (s.includes('appointment')) return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20';
    if (s.includes('qualified')) return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
    if (s.includes('presentation')) return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20';
    if (s.includes('decision')) return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
    if (s.includes('contract')) return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20';
    if (s.includes('closedwon')) return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20';
    if (s.includes('closedlost')) return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20';
    return 'bg-brand-light text-brand border-[hsl(var(--app-brand-muted))]';
  };

  // Filter meetings based on search query
  const filteredMeetings = meetings.filter(meeting => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      meeting.title.toLowerCase().includes(query) ||
      meeting.dealName.toLowerCase().includes(query) ||
      meeting.dealCompany?.toLowerCase().includes(query) ||
      meeting.participants.some(p => p.name.toLowerCase().includes(query))
    );
  });

  if (loading) {
    return (
      <div className={isInsideAdminLayout ? "min-h-screen bg-white dark:bg-background" : "page-container py-8"}>
        {/* No header skeleton needed - header is in UserLayout (for user pages) or AdminLayout (for admin pages) */}
        <main className={isInsideAdminLayout ? "py-8" : ""}>
          <div className="space-y-8 content-container">
            {/* Page Header Skeleton */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="space-y-2.5 pl-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-7 w-40" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-72" />
              </div>
              <Skeleton className="h-[60px] w-64 rounded-xl" />
            </div>

            {/* Meeting Cards Skeleton Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="bg-elevated dark:bg-card border border-default dark:border-border shadow-card overflow-hidden rounded-lg">
                  {/* Stage badge skeleton */}
                  <div className="px-5 pt-5">
                    <Skeleton className="h-6 w-28 rounded-md" />
                  </div>
                  {/* Title + Meta skeleton */}
                  <div className="px-5 pt-3 pb-4 space-y-2">
                    <Skeleton className="h-5 w-4/5" />
                    <Skeleton className="h-3.5 w-3/5" />
                  </div>
                  {/* Risk bar skeleton */}
                  <div className="mx-5 py-3 border-t border-subtle dark:border-border space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-3.5 w-16" />
                      <Skeleton className="h-3.5 w-8" />
                    </div>
                    <Skeleton className="h-[5px] w-full rounded-full" />
                  </div>
                  {/* Info grid skeleton */}
                  <div className="mx-5 py-3 border-t border-subtle dark:border-border grid grid-cols-2 gap-y-4 gap-x-4">
                    {[1, 2, 3, 4, 5, 6].map((j) => (
                      <div key={j} className="space-y-1">
                        <Skeleton className="h-3 w-12" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    ))}
                  </div>
                  {/* Footer skeleton */}
                  <div className="p-4 border-t border-subtle dark:border-border flex gap-2 mt-auto">
                    <Skeleton className="flex-1 h-8 rounded-md" />
                    <Skeleton className="flex-1 h-8 rounded-md" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={isInsideAdminLayout ? "min-h-screen dark:bg-background" : "page-container py-8"}>
      {/* Admin Tabs - Only show when admin mode is active AND not inside AdminLayout */}
      {isAdminMode && !isInsideAdminLayout && (
        <div className="bg-elevated dark:bg-card border-b border-subtle dark:border-border">
          <div className="content-container">
            <div className="flex gap-0">
              <button
                onClick={() => setAdminTab('meetings')}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors duration-150 border-b-2 ${adminTab === 'meetings'
                    ? 'border-[hsl(var(--app-brand))] text-heading dark:text-foreground'
                    : 'border-transparent text-subtle hover:text-heading dark:hover:text-foreground'
                  }`}
              >
                <Calendar className="w-4 h-4" />
                Clients Meetings
              </button>
              <button
                onClick={() => setAdminTab('logs')}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors duration-150 border-b-2 ${adminTab === 'logs'
                    ? 'border-[hsl(var(--app-brand))] text-heading dark:text-foreground'
                    : 'border-transparent text-subtle hover:text-heading dark:hover:text-foreground'
                  }`}
              >
                <Activity className="w-4 h-4" />
                Logs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main>
        {/* Show Meetings Content when viewing meetings (both admin and regular users) */}
        {((!isAdminMode && userView === 'meetings') || (isAdminMode && adminTab === 'meetings')) && (
          <>
            {/* Page Header */}
            <div className="space-y-8 content-container">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                <div className="flex flex-col gap-2 pl-2">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold tracking-tight text-heading dark:text-foreground">
                      {isAdminMode ? 'Clients Meetings' : 'My Meetings'}
                    </h2>
                    {isAdminMode && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium bg-brand-light text-brand rounded-full border border-[hsl(var(--app-brand-muted))]">
                        <Shield className="h-3 w-3" />
                        Admin
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 text-xs font-medium bg-orange-50 text-orange-600 rounded-full border border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20">
                      {searchQuery
                        ? `${filteredMeetings.length} of ${meetings.length}`
                        : `${meetings.length} total`}
                    </span>
                  </div>
                  <p className="text-sm text-body dark:text-muted-foreground leading-relaxed">
                    {isAdminMode
                      ? `Manage all users' meetings${totalUsers > 0 ? ` across ${totalUsers} users` : ''}`
                      : 'Track your upcoming meetings and trigger pre/post meeting calls'
                    }
                  </p>
                </div>

                {/* Automation Toggle Card */}
                <Card className="md:w-auto bg-elevated dark:bg-card border border-default dark:border-border shadow-card rounded-xl">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-brand-light dark:bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Phone className="h-4 w-4 text-brand dark:text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-heading dark:text-foreground leading-tight">
                            Auto-Dialing
                          </p>
                          <p className="text-xs text-subtle dark:text-muted-foreground mt-0.5">
                            {isEnabled ? 'System operational' : 'Currently disabled'}
                          </p>
                        </div>
                      </div>
                      <Switch
                        id="automation-toggle"
                        checked={isEnabled}
                        onCheckedChange={handleToggleAutomation}
                        disabled={toggleLoading}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {error && (
                <Alert variant="destructive" className="mb-6 bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700">{error}</AlertDescription>
                </Alert>
              )}

              {/* Search Bar */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-subtle dark:text-muted-foreground" />
                  <Input
                    placeholder="Search by meeting title, deal, company, or participant..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-sm rounded-lg border-default dark:border-border bg-elevated dark:bg-card focus-visible:ring-[hsl(var(--app-brand))]"
                  />
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-light text-brand border border-[hsl(var(--app-brand-muted)/0.3)] dark:bg-primary/10 dark:text-primary dark:border-primary/20">
                  {filteredMeetings.length} meeting{filteredMeetings.length === 1 ? '' : 's'}
                </span>
              </div>

              {filteredMeetings.length === 0 ? (
                <Card className="text-center py-16 bg-elevated dark:bg-card border border-default dark:border-border shadow-card rounded-xl">
                  <CardContent>
                    <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-[hsl(var(--page-bg))] dark:bg-muted mb-5">
                      {searchQuery ? (
                        <Search className="h-7 w-7 text-subtle" />
                      ) : (
                        <Calendar className="h-7 w-7 text-subtle" />
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-heading dark:text-foreground mb-1.5">
                      {searchQuery ? 'No meetings found' : 'No meetings scheduled'}
                    </h3>
                    <p className="text-sm text-subtle dark:text-muted-foreground max-w-sm mx-auto">
                      {searchQuery
                        ? `No meetings match "${searchQuery}". Try a different search term.`
                        : 'Your upcoming meetings will appear here'}
                    </p>
                    {searchQuery && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSearchQuery('')}
                        className="mt-5 border-default hover:bg-page dark:border-border dark:hover:bg-muted"
                      >
                        Clear search
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredMeetings.map((meeting) => (
                    <Card
                      key={meeting.id}
                      className="group glass-card border border-default dark:border-border shadow-card hover:shadow-card-hover hover:border-[hsl(var(--text-muted)/0.3)] transition-[box-shadow,border-color] duration-200 flex flex-col overflow-hidden rounded-lg"
                    >
                      {/* Stage Badge */}
                      <div className="px-5 pt-5">
                        <span className={`inline-block px-2.5 py-1 text-[11px] font-semibold rounded-md border truncate max-w-[180px] ${getStageBadgeStyle(meeting.dealStage)}`}>
                          {formatDealStage(meeting.dealStage)}
                        </span>
                      </div>

                      {/* Title + Meta */}
                      <div className="px-5 pt-3 pb-4">
                        <h3 className="font-semibold text-[15px] text-heading dark:text-foreground leading-snug line-clamp-2">
                          {meeting.title}
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-subtle mt-1.5 flex-wrap">
                          {meeting.dealCompany && (
                            <>
                              <Briefcase className="h-3 w-3 flex-shrink-0" />
                              <span>{meeting.dealCompany}</span>
                              <span className="mx-0.5 opacity-40">·</span>
                            </>
                          )}
                          <Calendar className="h-3 w-3 flex-shrink-0" />
                          <span>{formatDate(meeting.startTime)}</span>
                        </div>
                      </div>

                      {/* Deal Risk Bar */}
                      <div className="mx-5 py-3 border-t border-subtle dark:border-border">
                        <div className="flex justify-between items-center mb-2.5">
                          <span className="text-xs font-medium text-heading dark:text-foreground">Deal Risk</span>
                          <span className="text-xs text-subtle">{Math.round((meeting.dealRisks?.totalDealRisk || 0) * 100) / 100}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                            (meeting.dealRisks?.totalDealRisk || 0) >= 70
                              ? 'bg-red-500'
                              : (meeting.dealRisks?.totalDealRisk || 0) >= 40
                                ? 'bg-amber-500'
                                : (meeting.dealRisks?.totalDealRisk || 0) > 0
                                  ? 'bg-red-400'
                                  : 'bg-gray-300 dark:bg-gray-600'
                          }`} />
                          <div className="flex-1 bg-red-100/60 dark:bg-red-500/10 rounded-full h-[6px] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-red-400 to-red-200 dark:from-red-500 dark:to-red-400/40"
                              style={{ width: `${Math.max(meeting.dealRisks?.totalDealRisk || 0, 1)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Info Grid */}
                      <div className="mx-5 py-3 border-t border-subtle dark:border-border grid grid-cols-2 gap-y-4 gap-x-4 flex-1">
                        {/* Amount */}
                        <div>
                          <p className="text-[11px] text-subtle mb-0.5">Amount</p>
                          <p className="text-sm font-semibold text-heading dark:text-foreground">
                            ${formatDealAmount(meeting.dealAmount)}
                          </p>
                        </div>
                        {/* Owner */}
                        <div>
                          <p className="text-[11px] text-subtle mb-1.5">Owner</p>
                          {meeting.owner ? (
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-pink-100 dark:bg-pink-500/20 flex items-center justify-center flex-shrink-0 ring-1 ring-pink-200/60 dark:ring-pink-500/30">
                                <span className="text-[10px] font-bold text-pink-700 dark:text-pink-300 leading-none">
                                  {meeting.owner.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                </span>
                              </div>
                              <span className="text-sm font-medium text-heading dark:text-foreground truncate">{meeting.owner.name}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-subtle">—</span>
                          )}
                        </div>
                        {/* Time Until */}
                        <div>
                          <p className="text-[11px] text-subtle mb-0.5">Time</p>
                          <p className={`text-sm font-medium ${isMeetingPast(meeting.startTime) ? 'text-accent-red' : 'text-brand dark:text-primary'}`}>
                            {getTimeUntilMeeting(meeting.startTime)}
                          </p>
                        </div>
                        {/* Duration */}
                        <div>
                          <p className="text-[11px] text-subtle mb-0.5">Duration</p>
                          <p className="text-sm font-medium text-accent-orange">
                            {new Date(meeting.endTime).getTime() - new Date(meeting.startTime).getTime() > 0
                              ? `${Math.round((new Date(meeting.endTime).getTime() - new Date(meeting.startTime).getTime()) / 60000)} min`
                              : 'N/A'}
                          </p>
                        </div>
                        {/* Deal */}
                        <div>
                          <p className="text-[11px] text-subtle mb-0.5">Deal</p>
                          <p className="text-sm text-body dark:text-foreground truncate">{meeting.dealName}</p>
                        </div>
                        {/* Participants */}
                        <div>
                          <p className="text-[11px] text-subtle mb-0.5">Participants</p>
                          <p className="text-sm text-body dark:text-foreground">
                            {meeting.participants?.length || 0} {(meeting.participants?.length || 0) === 1 ? 'person' : 'people'}
                          </p>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="mt-auto p-4 border-t border-subtle dark:border-border flex gap-2">
                        <Button
                          onClick={() => showConfirmation('pre', meeting)}
                          className="flex-1 gap-1.5 bg-brand hover:bg-brand-hover text-white shadow-sm"
                          size="sm"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          Pre-Call
                        </Button>
                        <Button
                          onClick={() => showConfirmation('post', meeting)}
                          className="flex-1 gap-1.5 border-default dark:border-border hover:bg-page hover:text-heading dark:hover:bg-muted dark:hover:text-foreground text-body dark:text-foreground"
                          variant="outline"
                          size="sm"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          Post-Call
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Show Admin Logs Content when admin mode is active AND adminTab is 'logs' */}
        {isAdminMode && adminTab === 'logs' && (
          <div className="flex gap-6">
            {/* Logs Sidebar */}
            <aside className="w-64 flex-shrink-0">
              <Card className="p-4 sticky top-24">
                <h2 className="text-lg font-semibold mb-4 px-2">Log Sections</h2>
                <nav className="space-y-1">
                  <Button
                    variant={activeLogSection === 'overview' ? 'default' : 'ghost'}
                    className="w-full justify-start gap-3"
                    onClick={() => setActiveLogSection('overview')}
                  >
                    <Activity className="w-4 h-4" />
                    Overview
                  </Button>
                  <Button
                    variant={activeLogSection === 'calls' ? 'default' : 'ghost'}
                    className="w-full justify-start gap-3"
                    onClick={() => setActiveLogSection('calls')}
                  >
                    <Phone className="w-4 h-4" />
                    Calls
                  </Button>
                  <Button
                    variant={activeLogSection === 'webhooks' ? 'default' : 'ghost'}
                    className="w-full justify-start gap-3"
                    onClick={() => setActiveLogSection('webhooks')}
                  >
                    <Webhook className="w-4 h-4" />
                    Webhooks
                  </Button>
                  <Button
                    variant={activeLogSection === 'crm-actions' ? 'default' : 'ghost'}
                    className="w-full justify-start gap-3"
                    onClick={() => setActiveLogSection('crm-actions')}
                  >
                    <FileText className="w-4 h-4" />
                    CRM Actions
                  </Button>
                  <Button
                    variant={activeLogSection === 'scheduler' ? 'default' : 'ghost'}
                    className="w-full justify-start gap-3"
                    onClick={() => setActiveLogSection('scheduler')}
                  >
                    <Timer className="w-4 h-4" />
                    Scheduler
                  </Button>
                  <Button
                    variant={activeLogSection === 'errors' ? 'default' : 'ghost'}
                    className="w-full justify-start gap-3"
                    onClick={() => setActiveLogSection('errors')}
                  >
                    <AlertCircle className="w-4 h-4" />
                    Errors
                  </Button>
                </nav>
              </Card>
            </aside>

            {/* Logs Main Content */}
            <div className="flex-1 min-w-0">
              {activeLogSection === 'overview' && <LogsOverview />}
              {activeLogSection === 'calls' && <CallsLog />}
              {activeLogSection === 'webhooks' && <WebhooksLog />}
              {activeLogSection === 'crm-actions' && <CrmActionsLog />}
              {activeLogSection === 'scheduler' && <SchedulerLog />}
              {activeLogSection === 'errors' && <ErrorsLog />}
            </div>
          </div>
        )}

        {/* Show User Logs Content when NOT in admin mode AND userView is 'logs' */}
        {!isAdminMode && userView === 'logs' && (
          <div className="flex gap-6">
            {/* Logs Sidebar */}
            <aside className="w-64 flex-shrink-0">
              <Card className="p-4 sticky top-24">
                <div className="flex items-center gap-2 mb-4 px-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setUserView('meetings')}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <h2 className="text-lg font-semibold">My Logs</h2>
                </div>
                <nav className="space-y-1">
                  <Button
                    variant={activeUserLogSection === 'overview' ? 'default' : 'ghost'}
                    className="w-full justify-start gap-3"
                    onClick={() => setActiveUserLogSection('overview')}
                  >
                    <Activity className="w-4 h-4" />
                    Overview
                  </Button>
                  <Button
                    variant={activeUserLogSection === 'calls' ? 'default' : 'ghost'}
                    className="w-full justify-start gap-3"
                    onClick={() => setActiveUserLogSection('calls')}
                  >
                    <Phone className="w-4 h-4" />
                    Calls
                  </Button>
                  <Button
                    variant={activeUserLogSection === 'activity' ? 'default' : 'ghost'}
                    className="w-full justify-start gap-3"
                    onClick={() => setActiveUserLogSection('activity')}
                  >
                    <Activity className="w-4 h-4" />
                    Activity
                  </Button>
                  <Button
                    variant={activeUserLogSection === 'crm-actions' ? 'default' : 'ghost'}
                    className="w-full justify-start gap-3"
                    onClick={() => setActiveUserLogSection('crm-actions')}
                  >
                    <FileText className="w-4 h-4" />
                    CRM Actions
                  </Button>
                </nav>
              </Card>
            </aside>

            {/* Logs Main Content */}
            <div className="flex-1 min-w-0">
              {activeUserLogSection === 'overview' && <UserLogsOverview />}
              {activeUserLogSection === 'calls' && <UserCallsLog />}
              {activeUserLogSection === 'activity' && <UserActivityLog />}
              {activeUserLogSection === 'crm-actions' && <UserCrmActionsLog />}
            </div>
          </div>
        )}
      </main>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmModal.show} onOpenChange={(open) => {
        if (!open) {
          closeConfirmation();
        }
      }}>
        <AlertDialogContent className="sm:max-w-[480px] p-0 overflow-hidden">
          {/* Header with colored accent */}
          <div className="px-6 pt-6 pb-4 bg-brand-light dark:bg-primary/5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-brand dark:bg-primary">
                <PhoneOutgoing className="h-5 w-5 text-white" />
              </div>
              <AlertDialogHeader className="space-y-1 flex-1 text-left">
                <AlertDialogTitle className="text-base font-semibold">
                  {confirmModal.type === 'pre' ? 'Pre-Meeting' : 'Post-Meeting'} Call
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm">
                  This will trigger an automated {confirmModal.type === 'pre' ? 'pre-meeting' : 'post-meeting'} call to the deal owner.
                </AlertDialogDescription>
              </AlertDialogHeader>
            </div>
          </div>

          {confirmModal.meeting && (
            <div className="px-6 py-4 space-y-4">
              {/* Meeting Info */}
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Meeting Details</p>
                <div className="rounded-lg border border-border bg-muted/30 p-3.5 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm leading-snug">{confirmModal.meeting.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDate(confirmModal.meeting.startTime)}</p>
                    </div>
                  </div>
                  {confirmModal.meeting.agenda && (
                    <p className="text-xs text-muted-foreground pl-[26px] line-clamp-2">{confirmModal.meeting.agenda}</p>
                  )}
                  <div className="flex items-center gap-4 pl-[26px] text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(confirmModal.meeting.endTime).getTime() - new Date(confirmModal.meeting.startTime).getTime() > 0
                        ? `${Math.round((new Date(confirmModal.meeting.endTime).getTime() - new Date(confirmModal.meeting.startTime).getTime()) / 60000)} min`
                        : 'N/A'}
                    </span>
                    {confirmModal.meeting.participants && confirmModal.meeting.participants.length > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {confirmModal.meeting.participants.length} participant{confirmModal.meeting.participants.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Deal Info */}
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Deal Info</p>
                <div className="rounded-lg border border-border bg-muted/30 p-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-0.5">Deal Name</p>
                      <p className="text-sm font-medium text-foreground truncate">{confirmModal.meeting.dealName}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-0.5">Amount</p>
                      <p className="text-sm font-semibold text-foreground">${formatDealAmount(confirmModal.meeting.dealAmount)}</p>
                    </div>
                    {confirmModal.meeting.dealCompany && (
                      <div>
                        <p className="text-[11px] text-muted-foreground mb-0.5">Company</p>
                        <p className="text-sm text-foreground">{confirmModal.meeting.dealCompany}</p>
                      </div>
                    )}
                    {confirmModal.meeting.dealStage && (
                      <div>
                        <p className="text-[11px] text-muted-foreground mb-0.5">Stage</p>
                        <p className="text-sm text-foreground">{formatDealStage(confirmModal.meeting.dealStage)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Owner / Call Target */}
              {confirmModal.meeting.owner && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Call Target</p>
                  <div className="rounded-lg border border-border bg-muted/30 p-3.5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-9 w-9 rounded-full bg-pink-100 dark:bg-pink-500/20 flex items-center justify-center flex-shrink-0 ring-1 ring-pink-200/60 dark:ring-pink-500/30">
                        <span className="text-xs font-bold text-pink-700 dark:text-pink-300 leading-none">
                          {confirmModal.meeting.owner.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{confirmModal.meeting.owner.name}</p>
                        <p className="text-xs text-muted-foreground">Deal Owner</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pl-12">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{confirmModal.meeting.owner.phone}</span>
                      </div>
                      {confirmModal.meeting.owner.email && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{confirmModal.meeting.owner.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <AlertDialogFooter className="px-6 py-4 border-t border-border bg-muted/20">
            <AlertDialogCancel onClick={closeConfirmation} disabled={callLoading} className="flex-1 sm:flex-none">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTriggerCall}
              disabled={callLoading}
              className="flex-1 sm:flex-none gap-1.5 bg-brand hover:bg-brand-hover text-white"
            >
              <PhoneOutgoing className="h-3.5 w-3.5" />
              {callLoading ? 'Triggering...' : `Trigger ${confirmModal.type === 'pre' ? 'Pre' : 'Post'}-Call`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MeetingsPage;