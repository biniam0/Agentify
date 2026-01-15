import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Phone,
  Search,
  Shield,
  Timer,
  TrendingUp,
  Users,
  Webhook,
  Zap
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
import AppHeader from './Layout/AppHeader';
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
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { DropdownMenuItem } from './ui/dropdown-menu';
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
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
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
    // Load saved theme
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      }
    }
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

  const handleThemeToggle = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', newTheme);
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

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive', className: string }> = {
      scheduled: { variant: 'default', className: 'bg-primary/10 text-primary border-primary/20' },
      in_progress: { variant: 'secondary', className: 'bg-warning/10 text-warning border-warning/20' },
      completed: { variant: 'outline', className: 'bg-success/10 text-success border-success/20' },
    };

    const config = statusConfig[status] || { variant: 'default', className: '' };

    return (
      <Badge variant={config.variant} className={config.className}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: 'border-primary',
      in_progress: 'border-warning',
      completed: 'border-success',
    };
    return colors[status] || 'border-primary';
  };

  const getTodayMeetingsCount = () => {
    const today = new Date().toDateString();
    return meetings.filter(m => {
      const meetingDate = new Date(m.startTime).toDateString();
      return meetingDate === today;
    }).length;
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

  const getDealProgressByStage = (stage?: string) => {
    const stageProgress: Record<string, number> = {
      'qualifiedtobuy': 20,
      'appointmentscheduled': 40,
      'presentationscheduled': 60,
      'decisionmakerboughtin': 80,
      'contractsent': 90,
      'closedwon': 100,
      'closedlost': 0,
    };
    return stageProgress[stage?.toLowerCase() || ''] || 45;
  };

  const formatDealStage = (stage?: string) => {
    if (!stage) return 'Unknown';
    // Convert camelCase to Title Case with spaces
    return stage
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  const getRiskLevel = (riskScores?: any) => {
    if (!riskScores || !riskScores.totalDealRisk) return null;
    const totalRisk = riskScores.totalDealRisk;
    if (totalRisk >= 70) return { level: 'High', color: 'text-destructive bg-destructive/10 border-destructive/20' };
    if (totalRisk >= 40) return { level: 'Medium', color: 'text-warning bg-warning/10 border-warning/20' };
    if (totalRisk > 0) return { level: 'Low', color: 'text-success bg-success/10 border-success/20' };
    return { level: 'None', color: 'text-muted-foreground bg-muted/10 border-muted/20' };
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
      <div className="min-h-screen bg-background">
        <header className="bg-card/80 backdrop-blur border-b border-border">
          <div className="container mx-auto px-4 py-4">
            <Skeleton className="h-8 w-32" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-4 mb-8">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Hidden when inside AdminLayout to avoid duplicate headers */}
      {!isInsideAdminLayout && (
      <div className="bg-gradient-to-r from-card/95 via-primary/5 to-card/95 backdrop-blur-xl border-b border-primary/10 sticky top-0 z-50 shadow-lg mb-3">
        <AppHeader
          customTitle={
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                {/* Logo with gradient background */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-primary blur-md opacity-50 rounded-xl" />
                  <div className="relative p-2 rounded-xl bg-gradient-primary shadow-lg">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent leading-tight">
                    AgentX
                  </h1>
                  <p className="text-[10px] text-muted-foreground leading-tight">AI Sales Automation</p>
                </div>
              </div>
              {/* Divider */}
              <div className="h-8 w-px bg-border/50 hidden md:block" />
            </div>
          }
          statsBadge={{
            icon: Calendar,
            label: `${getTodayMeetingsCount()} Today`,
          }}
          showSearch={userView === 'meetings'}
          searchQuery={searchQuery}
          searchPlaceholder="Search meetings..."
          onSearchChange={setSearchQuery}
          showNotifications={true}
          notificationCount={2}
          theme={theme}
          onThemeToggle={handleThemeToggle}
          additionalDropdownItems={
            !isAdminMode ? (
              <DropdownMenuItem onClick={() => setUserView('logs')}>
                <FileText className="mr-2 h-4 w-4" />
                My Logs
              </DropdownMenuItem>
            ) : undefined
          }
        />
      </div>
      )}

      {/* Admin Tabs - Only show when admin mode is active AND not inside AdminLayout */}
      {isAdminMode && !isInsideAdminLayout && (
        <div className="bg-card/50 border-b border-border">
          <div className="container mx-auto px-4">
            <div className="flex gap-2">
              <Button
                variant={adminTab === 'meetings' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setAdminTab('meetings')}
                className="rounded-b-none"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Clients Meetings
              </Button>
              <Button
                variant={adminTab === 'logs' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setAdminTab('logs')}
                className="rounded-b-none"
              >
                <Activity className="w-4 h-4 mr-2" />
                Logs
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Show Meetings Content when viewing meetings (both admin and regular users) */}
        {((!isAdminMode && userView === 'meetings') || (isAdminMode && adminTab === 'meetings')) && (
          <>
            {/* Page Header with Automation Toggle */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
              <div>
                <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent mb-2 flex items-center gap-2">
                  Meetings
                  {isAdminMode && (
                    <Badge className="bg-gradient-primary text-white">
                      <Shield className="h-3 w-3 mr-1" />
                      Admin Mode
                    </Badge>
                  )}
                </h2>
                <p className="text-muted-foreground flex items-center gap-2">
                  <span>
                    {isAdminMode
                      ? `All users' meetings ${totalUsers > 0 ? `(${totalUsers} users)` : ''}`
                      : 'Manage your upcoming and past meetings'
                    }
                  </span>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                    {searchQuery
                      ? `${filteredMeetings.length} of ${meetings.length}`
                      : `${meetings.length} total`}
                  </Badge>
                </p>
              </div>

              {/* Automation Toggle Card */}
              <Card className="md:w-auto border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between space-x-4">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Phone className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          Auto-Dialing
                        </p>
                        <p className="text-xs text-muted-foreground">
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
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {filteredMeetings.length === 0 ? (
              <Card className="text-center py-16 border-2 border-dashed border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
                <CardContent>
                  <div className="inline-block p-4 rounded-full bg-primary/10 mb-4">
                    {searchQuery ? (
                      <Search className="h-12 w-12 text-primary" />
                    ) : (
                      <Calendar className="h-12 w-12 text-primary" />
                    )}
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {searchQuery ? 'No meetings found' : 'No meetings scheduled'}
                  </h3>
                  <p className="text-muted-foreground">
                    {searchQuery
                      ? `No meetings match "${searchQuery}". Try a different search term.`
                      : 'Your upcoming meetings will appear here'}
                  </p>
                  {searchQuery && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSearchQuery('')}
                      className="mt-4"
                    >
                      Clear search
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMeetings.map((meeting) => (
                  <Card
                    key={meeting.id}
                    className={`group hover:shadow-2xl hover-scale shadow-md transition-smooth flex flex-col border-l-4 ${getStatusColor(meeting.status)} overflow-hidden`}
                  >
                    {/* Header with gradient */}
                    <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 pb-3">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                            <Calendar className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base line-clamp-2 mb-1">{meeting.title}</CardTitle>
                            {meeting.agenda && (
                              <CardDescription className="line-clamp-1 text-xs">{meeting.agenda}</CardDescription>
                            )}
                          </div>
                        </div>
                        {getStatusBadge(meeting.status)}
                      </div>

                      {/* Time countdown badge */}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                          <Zap className="h-3 w-3" />
                          <span>{getTimeUntilMeeting(meeting.startTime)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>
                            {new Date(meeting.endTime).getTime() - new Date(meeting.startTime).getTime() > 0
                              ? `${Math.round((new Date(meeting.endTime).getTime() - new Date(meeting.startTime).getTime()) / 60000)} min`
                              : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="flex-1 space-y-3 pt-4">
                      {/* Deal info with visual emphasis */}
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-gradient-to-r from-muted/50 to-muted/30 border border-border/50">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-primary" />
                          <span className="font-semibold text-sm">{meeting.dealName}</span>
                        </div>
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold">
                          <DollarSign className="h-3 w-3 mr-0.5" />
                          ${formatDealAmount(meeting.dealAmount)}
                        </Badge>
                      </div>

                      {/* Meeting date and Company */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{formatDate(meeting.startTime)}</span>
                        </div>
                        {meeting.dealCompany && (
                          <div className="flex items-center gap-2 text-xs px-1">
                            <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-medium text-foreground">{meeting.dealCompany}</span>
                          </div>
                        )}
                        {/* Show owner in admin mode */}
                        {isAdminMode && meeting.owner && (
                          <div className="flex items-center gap-2 text-xs px-1 mt-1">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-medium text-foreground">Owner: {meeting.owner.name}</span>
                          </div>
                        )}
                      </div>

                      {/* Deal stage and progress indicator */}
                      <div className="space-y-1.5 px-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {formatDealStage(meeting.dealStage)}
                          </span>
                          <span className="font-semibold text-primary">
                            {getDealProgressByStage(meeting.dealStage)}%
                          </span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-primary to-accent h-1.5 rounded-full transition-all duration-500"
                            style={{
                              width: `${getDealProgressByStage(meeting.dealStage)}%`
                            }}
                          />
                        </div>
                      </div>

                      {/* Participants preview */}
                      {meeting.participants && meeting.participants.length > 0 && (
                        <div className="flex items-center gap-2 pt-1 px-1">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">
                              {meeting.participants.length} participant{meeting.participants.length > 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Risk indicator */}
                      {meeting.dealRisks && getRiskLevel(meeting.dealRisks) && (
                        <div className="flex items-center justify-between pt-1 px-1">
                          <span className="text-xs text-muted-foreground">Deal Risk</span>
                          <Badge variant="outline" className={`text-[10px] h-5 ${getRiskLevel(meeting.dealRisks)?.color}`}>
                            {getRiskLevel(meeting.dealRisks)?.level} ({meeting.dealRisks.totalDealRisk}%)
                          </Badge>
                        </div>
                      )}
                    </CardContent>

                    <CardFooter className="flex gap-2 pt-4 border-t bg-muted/20">
                      <Button
                        onClick={() => showConfirmation('pre', meeting)}
                        className="flex-1 gap-2 bg-gradient-primary hover:opacity-90 transition-all"
                        size="sm"
                      >
                        <Phone className="h-4 w-4" />
                        Pre-Call
                      </Button>
                      <Button
                        onClick={() => showConfirmation('post', meeting)}
                        className="flex-1 gap-2 border-primary/20 hover:bg-primary/5"
                        variant="outline"
                        size="sm"
                      >
                        <Phone className="h-4 w-4" />
                        Post-Call
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirm {confirmModal.type === 'pre' ? 'Pre-Meeting' : 'Post-Meeting'} Call
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to trigger a {confirmModal.type === 'pre' ? 'pre-meeting' : 'post-meeting'} call for this meeting?
            </AlertDialogDescription>
          </AlertDialogHeader>

          {confirmModal.meeting && (
            <Card className="bg-muted/50">
              <CardContent className="pt-6 space-y-3">
                <div>
                  <p className="font-medium text-foreground">{confirmModal.meeting.title}</p>
                  <p className="text-sm text-muted-foreground">Deal: {confirmModal.meeting.dealName}</p>
                </div>

                {confirmModal.meeting.owner && (
                  <>
                    <div className="flex items-start gap-2 text-sm pt-2 border-t">
                      <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-muted-foreground">Owner</p>
                        <p className="font-medium text-foreground">{confirmModal.meeting.owner.name}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-muted-foreground">Calling</p>
                        <p className="font-medium text-foreground">{confirmModal.meeting.owner.phone}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeConfirmation} disabled={callLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleTriggerCall} disabled={callLoading}>
              {callLoading ? 'Triggering...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MeetingsPage;