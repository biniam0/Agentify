import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import * as authService from '@/services/authService';
import HeroSection from './components/HeroSection';
import TopTabs, { type TopTabId } from './components/TopTabs';
import AlertBanner from './components/AlertBanner';
import StatsCards from './components/StatsCards';
import WorkflowActions from './components/WorkflowActions';
import CallsSection from './components/CallsSection';
import CallDetailModal from './components/CallDetailModal';
import InfoGatheringSection from './components/InfoGatheringSection';
import InfoGatheringDetailModal from './components/InfoGatheringDetailModal';
import ClientsDealsSection from './components/ClientsDealsSection';
import ClientsDealDetailModal from './components/ClientsDealDetailModal';
import AddWorkflowModal from './components/AddWorkflowModal';
import type { CallLog } from '@/services/loggingService';
import type { BarrierXInfoRecord } from './components/InfoGatheringTable';
import type { Deal } from '@/services/dealService';

const V2DashboardPage = () => {
  const location = useLocation();
  const [activeTopTab, setActiveTopTab] = useState<TopTabId>('deals-overview');
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);
  const [selectedInfoRecord, setSelectedInfoRecord] = useState<BarrierXInfoRecord | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [isAddWorkflowOpen, setIsAddWorkflowOpen] = useState(false);
  const user = authService.getUser();

  const pathname = location.pathname;
  const isInfoGatheringTab = pathname.includes('/info-gatherings');
  const isClientsDealsTab = pathname.includes('/clients-deals');

  const renderActiveSection = () => {
    if (isClientsDealsTab) {
      return <ClientsDealsSection onViewDetails={setSelectedDeal} />;
    }
    if (isInfoGatheringTab) {
      return <InfoGatheringSection onViewDetails={setSelectedInfoRecord} />;
    }
    return <CallsSection onViewDetails={setSelectedCall} />;
  };

  return (
    <div>
      <HeroSection dealCount={5} userName={user?.name?.split(' ')[0] || 'there'} />
      <TopTabs activeTab={activeTopTab} onTabChange={setActiveTopTab} />
      <AlertBanner />
      <StatsCards />
      <WorkflowActions onAddWorkflow={() => setIsAddWorkflowOpen(true)} />

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

      {isAddWorkflowOpen && (
        <AddWorkflowModal onClose={() => setIsAddWorkflowOpen(false)} />
      )}
    </div>
  );
};

export default V2DashboardPage;
