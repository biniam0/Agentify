import { useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { PhoneIncoming, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import HeroSection from './components/HeroSection';
import TopTabs, { type TopTabId } from './components/TopTabs';
import AlertBanner from './components/AlertBanner';
import StatsCards from './components/StatsCards';
import WorkflowActions from './components/WorkflowActions';
import type { JobStatus } from './components/WorkflowActions';
import CallsSection from './components/CallsSection';
import CallDetailModal from './components/CallDetailModal';
import InfoGatheringSection from './components/InfoGatheringSection';
import InfoGatheringDetailModal from './components/InfoGatheringDetailModal';
import ClientsDealsSection from './components/ClientsDealsSection';
import ClientsDealDetailModal from './components/ClientsDealDetailModal';
import ClientsMeetingsSection from './components/ClientsMeetingsSection';
import ClientsMeetingDetailModal from './components/ClientsMeetingDetailModal';
import SmsSentSection from './components/SmsSentSection';
import SmsDetailModal from './components/SmsDetailModal';
import CrmActionsSection from './components/CrmActionsSection';
import CrmActionDetailModal from './components/CrmActionDetailModal';
import AddWorkflowModal from './components/AddWorkflowModal';
import ComingSoon from './components/ComingSoon';
import type { WorkflowExecStatus } from './components/AddWorkflowModal';
import type { CallLog, SmsLog, CrmActionLog } from '@/services/loggingService';
import type { BarrierXInfoRecord } from './components/InfoGatheringTable';
import type { Deal } from '@/services/dealService';
import type { Meeting } from '@/types';

const V2DashboardPage = () => {
  const location = useLocation();
  const [activeTopTab, setActiveTopTab] = useState<TopTabId>('overview');
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);
  const [selectedInfoRecord, setSelectedInfoRecord] = useState<BarrierXInfoRecord | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [selectedSms, setSelectedSms] = useState<SmsLog | null>(null);
  const [selectedCrmAction, setSelectedCrmAction] = useState<CrmActionLog | null>(null);
  const [isAddWorkflowOpen, setIsAddWorkflowOpen] = useState(false);
  const [activeWorkflowExec, setActiveWorkflowExec] = useState<WorkflowExecStatus | null>(null);
  const [wfExecRefreshKey, setWfExecRefreshKey] = useState(0);
  const [jobRunning, setJobRunning] = useState(false);
  const { user } = useAuth();

  const handleJobStatusChange = useCallback((status: JobStatus | null) => {
    setJobRunning(!!status?.isRunning);
  }, []);

  const handleViewWorkflowExec = useCallback((exec: WorkflowExecStatus) => {
    setActiveWorkflowExec(exec);
    setIsAddWorkflowOpen(true);
  }, []);

  const handleWorkflowExecChange = useCallback(() => {
    setWfExecRefreshKey((k) => k + 1);
  }, []);

  const pathname = location.pathname;
  const isInfoGatheringTab = pathname.includes('/info-gatherings');
  const isClientsDealsTab = pathname.includes('/clients-deals');
  const isClientsMeetingsTab = pathname.includes('/clients-meetings');
  const isSmsSentTab = pathname.includes('/sms-sent');
  const isCrmActionsTab = pathname.includes('/crm-actions');

  const renderActiveSection = () => {
    if (isCrmActionsTab) {
      return <CrmActionsSection onViewDetails={setSelectedCrmAction} />;
    }
    if (isSmsSentTab) {
      return <SmsSentSection onViewDetails={setSelectedSms} />;
    }
    if (isClientsMeetingsTab) {
      return <ClientsMeetingsSection onViewDetails={setSelectedMeeting} />;
    }
    if (isClientsDealsTab) {
      return <ClientsDealsSection onViewDetails={setSelectedDeal} />;
    }
    if (isInfoGatheringTab) {
      return <InfoGatheringSection onViewDetails={setSelectedInfoRecord} jobRunning={jobRunning} />;
    }
    return <CallsSection onViewDetails={setSelectedCall} />;
  };

  return (
    <div>
      <HeroSection userName={user?.name?.split(' ')[0] || 'there'} />
      <TopTabs activeTab={activeTopTab} onTabChange={setActiveTopTab} />

      {activeTopTab === 'overview' && (
        <>
          <AlertBanner onViewDeal={setSelectedDeal} />
          <StatsCards />
          <WorkflowActions
            onAddWorkflow={() => { setActiveWorkflowExec(null); setIsAddWorkflowOpen(true); }}
            onJobStatusChange={handleJobStatusChange}
            onViewWorkflowExec={handleViewWorkflowExec}
            workflowExecRefreshKey={wfExecRefreshKey}
          />

          {renderActiveSection()}
        </>
      )}

      {activeTopTab === 'active-calls' && (
        <ComingSoon
          icon={PhoneIncoming}
          title="Active calls"
          description="A live control room for every call in flight — real-time transcripts, sentiment, and the ability to intervene before a conversation goes sideways."
          highlights={[
            'Live transcript with speaker diarization',
            'Sentiment and objection detection as it happens',
            'Whisper to the agent or take over the call',
          ]}
          eta="On the roadmap for an upcoming release"
        />
      )}

      {activeTopTab === 'automations' && (
        <ComingSoon
          icon={Zap}
          title="Automations"
          description="Recurring, scheduled, and trigger-based workflows that run on autopilot — so AgentX keeps your pipeline moving while you focus on closing."
          highlights={[
            'Scheduled cadences (daily, weekly, monthly)',
            'Trigger workflows from CRM events like stage changes',
            'Conditional branching with approval gates',
          ]}
          eta="On the roadmap for an upcoming release"
        />
      )}

      {selectedCall && (
        <CallDetailModal log={selectedCall} onClose={() => setSelectedCall(null)} />
      )}

      {selectedInfoRecord && (
        <InfoGatheringDetailModal record={selectedInfoRecord} onClose={() => setSelectedInfoRecord(null)} />
      )}

      {selectedDeal && (
        <ClientsDealDetailModal deal={selectedDeal} onClose={() => setSelectedDeal(null)} />
      )}

      {selectedMeeting && (
        <ClientsMeetingDetailModal meeting={selectedMeeting} onClose={() => setSelectedMeeting(null)} />
      )}

      {selectedSms && (
        <SmsDetailModal sms={selectedSms} onClose={() => setSelectedSms(null)} />
      )}

      {selectedCrmAction && (
        <CrmActionDetailModal log={selectedCrmAction} onClose={() => setSelectedCrmAction(null)} />
      )}

      {isAddWorkflowOpen && (
        <AddWorkflowModal
          onClose={() => { setIsAddWorkflowOpen(false); setActiveWorkflowExec(null); }}
          activeExecution={activeWorkflowExec}
          onExecutionChange={handleWorkflowExecChange}
        />
      )}
    </div>
  );
};

export default V2DashboardPage;
