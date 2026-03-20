import { useState } from 'react';
import * as authService from '@/services/authService';
import HeroSection from './components/HeroSection';
import TopTabs, { type TopTabId } from './components/TopTabs';
import AlertBanner from './components/AlertBanner';
import StatsCards from './components/StatsCards';
import WorkflowActions from './components/WorkflowActions';
import CallsSection from './components/CallsSection';
import CallDetailModal from './components/CallDetailModal';
import AddWorkflowModal from './components/AddWorkflowModal';
import type { CallLog } from '@/services/loggingService';

const V2DashboardPage = () => {
  const [activeTopTab, setActiveTopTab] = useState<TopTabId>('deals-overview');
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);
  const [isAddWorkflowOpen, setIsAddWorkflowOpen] = useState(false);
  const user = authService.getUser();

  return (
    <div>
      <HeroSection dealCount={5} userName={user?.name?.split(' ')[0] || 'there'} />
      <TopTabs activeTab={activeTopTab} onTabChange={setActiveTopTab} />
      <AlertBanner />
      <StatsCards />
      <WorkflowActions onAddWorkflow={() => setIsAddWorkflowOpen(true)} />
      <CallsSection onViewDetails={setSelectedCall} />

      {selectedCall && (
        <CallDetailModal log={selectedCall} onClose={() => setSelectedCall(null)} />
      )}

      {isAddWorkflowOpen && (
        <AddWorkflowModal onClose={() => setIsAddWorkflowOpen(false)} />
      )}
    </div>
  );
};

export default V2DashboardPage;
