import { useState, useMemo } from 'react';
import DealsSearchBar from './DealsSearchBar';
import DealsFilterTabs from './DealsFilterTabs';
import DealsTable from './DealsTable';
import { MOCK_DEALS } from '../data/mockDeals';
import type { V2Deal } from '../data/types';

interface ActiveDealsSectionProps {
  onViewDetails: (deal: V2Deal) => void;
}

const ActiveDealsSection = ({ onViewDetails }: ActiveDealsSectionProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDeals = useMemo(() => {
    if (!searchQuery) return MOCK_DEALS;
    const q = searchQuery.toLowerCase();
    return MOCK_DEALS.filter(
      (d) =>
        d.companyName.toLowerCase().includes(q) ||
        d.companySubtitle.toLowerCase().includes(q) ||
        d.status.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Active Deals</h2>
          <p className="text-sm text-gray-500">
            Manage and track your ongoing opportunities.
          </p>
        </div>
      </div>

      <DealsSearchBar onSearch={setSearchQuery} />
      <DealsFilterTabs />

      <div className="bg-white rounded-b-xl border border-t-0 border-gray-200">
        <DealsTable deals={filteredDeals} onViewDetails={onViewDetails} />
      </div>
    </div>
  );
};

export default ActiveDealsSection;
