import { useState } from 'react';
import * as authService from '@/services/authService';
import HeroSection from './components/HeroSection';
import TopTabs, { type TopTabId } from './components/TopTabs';
import AlertBanner from './components/AlertBanner';
import StatsCards from './components/StatsCards';
import WorkflowActions from './components/WorkflowActions';
import ActiveDealsSection from './components/ActiveDealsSection';
import type { V2Deal } from './data/types';

const V2DashboardPage = () => {
  const [activeTopTab, setActiveTopTab] = useState<TopTabId>('deals-overview');
  const [selectedDeal, setSelectedDeal] = useState<V2Deal | null>(null);
  const user = authService.getUser();

  return (
    <div>
      <HeroSection dealCount={5} userName={user?.name?.split(' ')[0] || 'there'} />
      <TopTabs activeTab={activeTopTab} onTabChange={setActiveTopTab} />
      <AlertBanner />
      <StatsCards />
      <WorkflowActions />
      <ActiveDealsSection onViewDetails={setSelectedDeal} />

      {/* Phase 4: Deal Detail Modal */}
      {selectedDeal && (
        <div className="hidden">
          {/* DealDetailModal will replace this placeholder in Phase 4 */}
        </div>
      )}
    </div>
  );
};

export default V2DashboardPage;
