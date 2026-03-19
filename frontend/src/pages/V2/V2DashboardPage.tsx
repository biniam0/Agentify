import { useState } from 'react';
import * as authService from '@/services/authService';
import HeroSection from './components/HeroSection';
import TopTabs, { type TopTabId } from './components/TopTabs';
import AlertBanner from './components/AlertBanner';

const V2DashboardPage = () => {
  const [activeTopTab, setActiveTopTab] = useState<TopTabId>('deals-overview');
  const user = authService.getUser();

  return (
    <div>
      <HeroSection dealCount={5} userName={user?.name?.split(' ')[0] || 'there'} />
      <TopTabs activeTab={activeTopTab} onTabChange={setActiveTopTab} />
      <AlertBanner />

      {/* Phase 2: Stats cards + Workflow Actions */}
      {/* Phase 3: Active Deals Table with filter tab routing */}
      {/* Phase 4: Deal Detail Modal */}
    </div>
  );
};

export default V2DashboardPage;
