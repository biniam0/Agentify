import { useState } from 'react';
import * as authService from '@/services/authService';
import HeroSection from './components/HeroSection';
import TopTabs, { type TopTabId } from './components/TopTabs';
import AlertBanner from './components/AlertBanner';
import StatsCards from './components/StatsCards';
import WorkflowActions from './components/WorkflowActions';
import ActiveDealsSection from './components/ActiveDealsSection';
import DealDetailModal from './components/DealDetailModal';
import AddWorkflowModal from './components/AddWorkflowModal';
import type { V2Deal } from './data/types';

const V2DashboardPage = () => {
  const [activeTopTab, setActiveTopTab] = useState<TopTabId>('deals-overview');
  const [selectedDeal, setSelectedDeal] = useState<V2Deal | null>(null);
  const [isAddWorkflowOpen, setIsAddWorkflowOpen] = useState(false);
  const user = authService.getUser();

  return (
    <div>
      <HeroSection dealCount={5} userName={user?.name?.split(' ')[0] || 'there'} />
      <TopTabs activeTab={activeTopTab} onTabChange={setActiveTopTab} />
      <AlertBanner />
      <StatsCards />
      <WorkflowActions onAddWorkflow={() => setIsAddWorkflowOpen(true)} />
      <ActiveDealsSection onViewDetails={setSelectedDeal} onAddWorkflow={() => setIsAddWorkflowOpen(true)} />

      {selectedDeal && (
        <DealDetailModal deal={selectedDeal} onClose={() => setSelectedDeal(null)} />
      )}

      {isAddWorkflowOpen && (
        <AddWorkflowModal onClose={() => setIsAddWorkflowOpen(false)} />
      )}
    </div>
  );
};

export default V2DashboardPage;
