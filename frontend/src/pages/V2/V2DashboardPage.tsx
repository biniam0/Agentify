import { useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import * as authService from '@/services/authService';
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
import AddWorkflowModal from './components/AddWorkflowModal';
import type { CallLog } from '@/services/loggingService';
import type { BarrierXInfoRecord } from './components/InfoGatheringTable';
import type { Deal } from '@/services/dealService';
import type { Meeting } from '@/types';

const V2DashboardPage = () => {
  const location = useLocation();
  const [activeTopTab, setActiveTopTab] = useState<TopTabId>('deals-overview');
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);
  const [selectedInfoRecord, setSelectedInfoRecord] = useState<BarrierXInfoRecord | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [isAddWorkflowOpen, setIsAddWorkflowOpen] = useState(false);
  const [jobRunning, setJobRunning] = useState(false);
  const user = authService.getUser();

  const handleJobStatusChange = useCallback((status: JobStatus | null) => {
    setJobRunning(!!status?.isRunning);
  }, []);

  const pathname = location.pathname;
  const isInfoGatheringTab = pathname.includes('/info-gatherings');
  const isClientsDealsTab = pathname.includes('/clients-deals');
  const isClientsMeetingsTab = pathname.includes('/clients-meetings');

  const renderActiveSection = () => {
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
      <HeroSection dealCount={5} userName={user?.name?.split(' ')[0] || 'there'} />
      <TopTabs activeTab={activeTopTab} onTabChange={setActiveTopTab} />
      <AlertBanner />
      <StatsCards />
      <WorkflowActions onAddWorkflow={() => setIsAddWorkflowOpen(true)} onJobStatusChange={handleJobStatusChange} />

      {renderActiveSection()}

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

      {isAddWorkflowOpen && (
        <AddWorkflowModal onClose={() => setIsAddWorkflowOpen(false)} />
      )}
    </div>
  );
};

export default V2DashboardPage;
